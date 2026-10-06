const { Op, fn, col, literal } = require('sequelize');
const AppError = require('../utils/AppError');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { numbered } = require('../utils/codeGenerator');
const { roleNameOf } = require('../utils/accessControl');
const { TRIAGE_LEVELS, EMERGENCY_STATUS, MEDICAL_RECORD_TYPES } = require('../config/constants');
const { EVENTS } = require('../realtime/events');
const realtime = require('../realtime/socket');
const notificationService = require('./notification.service');
const medicalRecordService = require('./medicalRecord.service');
const admissionService = require('./admission.service');
const consultationService = require('./consultation.service');
const { sameId } = require('../utils/ids');
const {
  EmergencyCase,
  VitalSign,
  Patient,
  Department,
  Doctor,
  User,
  Admission,
} = require('../models');

/**
 * Emergency department: walk-in registration, triage, treatment and either
 * discharge or conversion into a formal admission.
 *
 * The patient record is optional on purpose: emergency cases can be registered
 * before the patient has ever been to the hospital (walk-in), and are merged
 * into the patient registry later by `linkPatient()`.
 */

const ACTIVE_CASE_STATUSES = [
  EMERGENCY_STATUS.ARRIVED,
  EMERGENCY_STATUS.TRIAGED,
  EMERGENCY_STATUS.WAITING,
  EMERGENCY_STATUS.IN_TREATMENT,
  EMERGENCY_STATUS.OBSERVATION,
];

const TRIAGE_CATEGORY = {
  [TRIAGE_LEVELS.CRITICAL]: 'RESUSCITATION',
  [TRIAGE_LEVELS.URGENT]: 'EMERGENT',
  [TRIAGE_LEVELS.MODERATE]: 'URGENT',
  [TRIAGE_LEVELS.LOW]: 'NON_URGENT',
};

const WAIT_TARGET_MINUTES = {
  [TRIAGE_LEVELS.CRITICAL]: 0,
  [TRIAGE_LEVELS.URGENT]: 10,
  [TRIAGE_LEVELS.MODERATE]: 60,
  [TRIAGE_LEVELS.LOW]: 240,
};

function presentCase(row) {
  const plain = row.get({ plain: true });
  return {
    ...plain,
    patientName: plain.patient
      ? `${plain.patient.firstName} ${plain.patient.lastName || ''}`.trim()
      : plain.walkInName || 'Walk-in',
    waitMinutes: plain.arrivalAt ? Math.round((Date.now() - new Date(plain.arrivalAt).getTime()) / 60000) : null,
    waitTargetMinutes: plain.triageLevel ? WAIT_TARGET_MINUTES[plain.triageLevel] : null,
  };
}

const CASE_INCLUDES = [
  { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName', 'bloodGroup', 'allergySummary'] },
  { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
  { model: Doctor, as: 'assignedDoctor', attributes: ['id'], include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }] },
];

async function nextCaseNumber({ transaction }) {
  const last = await EmergencyCase.findOne({ order: [['id', 'DESC']], attributes: ['caseNumber'], transaction });
  let sequence = 1;
  if (last && typeof last.caseNumber === 'string') {
    const parsed = Number.parseInt(last.caseNumber.split('-').pop(), 10);
    if (Number.isFinite(parsed)) sequence = parsed + 1;
  }
  return numbered('EMG', sequence);
}

/** Registers a walk-in or an existing patient. */
async function register({ user, data }) {
  let patient = null;
  if (data.patientId) {
    patient = await Patient.findByPk(data.patientId);
    if (!patient) throw AppError.notFound('Patient not found');
  }

  if (!patient && !data.walkInName) {
    throw AppError.badRequest('Provide patientId or walkInName for walk-in registration');
  }

  const emergencyCase = await EmergencyCase.create({
    caseNumber: await nextCaseNumber({}),
    patientId: patient?.id ?? null,
    isWalkIn: !patient,
    walkInName: patient ? null : data.walkInName,
    walkInAge: patient ? null : data.walkInAge ?? null,
    walkInGender: patient ? null : data.walkInGender ?? null,
    walkInPhone: patient ? patient.phone : data.walkInPhone ?? null,
    chiefComplaint: data.chiefComplaint,
    presentingVitals: data.presentingVitals ?? null,
    departmentId: data.departmentId ?? null,
    registeredBy: user.id,
    status: EMERGENCY_STATUS.ARRIVED,
    arrivalAt: data.arrivalAt || new Date(),
    notes: data.notes ?? null,
  });

  if (data.presentingVitals) {
    // eslint-disable-next-line no-await-in-loop
    await recordVitals({ user, caseId: emergencyCase.id, data: data.presentingVitals });
  }

  realtime.emitToDepartment(emergencyCase.departmentId, EVENTS.EMERGENCY_CREATED, {
    caseId: emergencyCase.id,
    caseNumber: emergencyCase.caseNumber,
    departmentId: emergencyCase.departmentId,
  });
  await broadcastWaitingRoom(emergencyCase.departmentId);

  return getCase({ user, id: emergencyCase.id });
}

/**
 * The ED waiting room is derived from the emergency cases themselves
 * (priority = triage level, FIFO within a level) instead of the OPD
 * `queue_entries` table, which has no emergency-case foreign key.
 */
async function waitingRoom({ departmentId }) {
  const cases = await EmergencyCase.findAll({
    where: combineWhere(
      { status: { [Op.in]: [EMERGENCY_STATUS.TRIAGED, EMERGENCY_STATUS.WAITING] } },
      departmentId ? { departmentId: departmentId } : undefined,
    ),
    include: CASE_INCLUDES,
  });

  // Priority order is triage level first, then arrival time. Sorting in JS keeps
  // the untriaged cases at the end without relying on SQL NULL ordering.
  cases.sort((a, b) => {
    const levelA = a.triageLevel ? Number(a.triageLevel) : Number.MAX_SAFE_INTEGER;
    const levelB = b.triageLevel ? Number(b.triageLevel) : Number.MAX_SAFE_INTEGER;
    if (levelA !== levelB) return levelA - levelB;
    return new Date(a.arrivalAt) - new Date(b.arrivalAt);
  });

  const entries = cases.map((row, index) => {
    const presented = presentCase(row);
    return {
      caseId: row.id,
      caseNumber: row.caseNumber,
      ticketNumber: `ED-${String(index + 1).padStart(3, '0')}`,
      position: index + 1,
      patientId: row.patientId,
      patientName: presented.patientName,
      triageLevel: row.triageLevel,
      triageCategory: presented.triageCategory,
      chiefComplaint: row.chiefComplaint,
      arrivalAt: row.arrivalAt,
      waitMinutes: presented.waitMinutes,
      waitTargetMinutes: presented.waitTargetMinutes,
      overdue: presented.waitTargetMinutes !== null && presented.waitMinutes > presented.waitTargetMinutes,
    };
  });

  return { departmentId: departmentId ? departmentId : null, entries, total: entries.length };
}

async function broadcastWaitingRoom(departmentId) {
  const snapshot = await waitingRoom({ departmentId });
  if (departmentId) {
    realtime.emitToDepartment(departmentId, EVENTS.QUEUE_UPDATED, snapshot);
  }
  realtime.emitToHospital(EVENTS.QUEUE_UPDATED, snapshot);
}

/**
 * Records triage. Sets the triage level/category, timestamps the triage and
 * recalculates queue priority so critical patients jump the waiting list.
 */
async function triage({ user, id, data }) {
  const emergencyCase = await EmergencyCase.findByPk(id);
  if (!emergencyCase) throw AppError.notFound('Emergency case not found');
  if (![EMERGENCY_STATUS.ARRIVED, EMERGENCY_STATUS.TRIAGED].includes(emergencyCase.status)) {
    throw AppError.conflict(`Cannot triage a case in status ${emergencyCase.status}`);
  }

  const level = Number(data.triageLevel);
  if (!Object.values(TRIAGE_LEVELS).includes(level)) {
    throw AppError.badRequest('triageLevel must be 1 (critical) to 4 (low)');
  }

  await emergencyCase.update({
    triageLevel: level,
    triageCategory: TRIAGE_CATEGORY[level],
    status: EMERGENCY_STATUS.TRIAGED,
    triagedAt: new Date(),
    triagedBy: user.id,
    departmentId: data.departmentId ?? emergencyCase.departmentId,
    notes: data.notes ?? emergencyCase.notes,
  });

  if (data.vitals) {
    // eslint-disable-next-line no-await-in-loop
    await recordVitals({ user, caseId: emergencyCase.id, data: data.vitals });
  }

  if (emergencyCase.status === EMERGENCY_STATUS.TRIAGED) {
    // eslint-disable-next-line no-await-in-loop
    await emergencyCase.update({ status: EMERGENCY_STATUS.WAITING });
  }

  if (level <= TRIAGE_LEVELS.URGENT) {
    await notificationService.notify({
      role: 'DOCTOR',
      type: 'SYSTEM',
      title: `${level === TRIAGE_LEVELS.CRITICAL ? 'CRITICAL' : 'Urgent'} emergency case`,
      message: `${emergencyCase.caseNumber}: ${emergencyCase.chiefComplaint}`,
      data: { caseId: emergencyCase.id },
      priority: level === TRIAGE_LEVELS.CRITICAL ? 'CRITICAL' : 'URGENT',
    });
  }

  realtime.emitToDepartment(emergencyCase.departmentId, EVENTS.EMERGENCY_TRIAGED, {
    caseId: emergencyCase.id,
    triageLevel: level,
    triageCategory: TRIAGE_CATEGORY[level],
  });
  await broadcastWaitingRoom(emergencyCase.departmentId);

  return getCase({ user, id: emergencyCase.id });
}

/** Attaches the case to a doctor and moves it into treatment. */
async function assignDoctor({ user, id, doctorId, departmentId }) {
  const emergencyCase = await EmergencyCase.findByPk(id);
  if (!emergencyCase) throw AppError.notFound('Emergency case not found');
  if (!ACTIVE_CASE_STATUSES.includes(emergencyCase.status)) {
    throw AppError.conflict(`Cannot assign a doctor to a ${emergencyCase.status} case`);
  }

  const doctor = await Doctor.findByPk(doctorId);
  if (!doctor) throw AppError.notFound('Doctor not found');

  await emergencyCase.update({
    assignedDoctorId: doctor.id,
    departmentId: departmentId ?? emergencyCase.departmentId ?? doctor.departmentId,
    status: EMERGENCY_STATUS.IN_TREATMENT,
    treatmentStartedAt: emergencyCase.treatmentStartedAt || new Date(),
  });

  await notificationService.notify({
    userId: doctor.userId,
    type: 'SYSTEM',
    title: `Emergency case ${emergencyCase.caseNumber}`,
    message: emergencyCase.chiefComplaint,
    data: { caseId: emergencyCase.id },
    priority: emergencyCase.triageLevel === TRIAGE_LEVELS.CRITICAL ? 'CRITICAL' : 'URGENT',
  });

  realtime.emitToDepartment(emergencyCase.departmentId, EVENTS.EMERGENCY_UPDATED, {
    caseId: emergencyCase.id,
    status: emergencyCase.status,
    assignedDoctorId: emergencyCase.assignedDoctorId,
  });
  await broadcastWaitingRoom(emergencyCase.departmentId);
  return getCase({ user, id: emergencyCase.id });
}

/**
 * Calls the next waiting patient into a treatment bay. Returns the case that
 * was called so the front desk can announce it.
 */
async function callNext({ user, data }) {
  const room = await waitingRoom({ departmentId: data.departmentId });
  const next = room.entries[0];
  if (!next) throw AppError.conflict('No patients are waiting in the emergency department');

  const emergencyCase = await EmergencyCase.findByPk(next.caseId);
  if (!emergencyCase) throw AppError.notFound('Emergency case not found');

  await emergencyCase.update({
    status: EMERGENCY_STATUS.IN_TREATMENT,
    treatmentStartedAt: new Date(),
    assignedDoctorId: data.doctorId ?? emergencyCase.assignedDoctorId,
    departmentId: data.departmentId ?? emergencyCase.departmentId,
  });

  const payload = {
    caseId: emergencyCase.id,
    caseNumber: emergencyCase.caseNumber,
    ticketNumber: next.ticketNumber,
    patientName: next.patientName,
    triageCategory: next.triageCategory,
    room: data.room ?? null,
    calledBy: user.id,
  };

  realtime.emitToDepartment(emergencyCase.departmentId, EVENTS.QUEUE_CALLED, payload);
  realtime.emitToHospital(EVENTS.QUEUE_CALLED, payload);
  await broadcastWaitingRoom(emergencyCase.departmentId);

  return payload;
}

/** Observation-stage vital signs. */
async function recordVitals({ user, caseId, data }) {
  const emergencyCase = caseId
    ? await EmergencyCase.findByPk(caseId)
    : await EmergencyCase.findOne({ where: { patientId: data.patientId }, order: [['id', 'DESC']] });
  if (!emergencyCase) throw AppError.notFound('Emergency case not found');

  const vitals = await VitalSign.create({
    patientId: emergencyCase.patientId,
    emergencyCaseId: emergencyCase.id,
    temperature: data.temperature ?? null,
    pulse: data.pulse ?? null,
    respiratoryRate: data.respiratoryRate ?? null,
    bloodPressureSystolic: data.bloodPressureSystolic ?? null,
    bloodPressureDiastolic: data.bloodPressureDiastolic ?? null,
    spo2: data.spo2 ?? null,
    bloodGlucose: data.bloodGlucose ?? null,
    weight: data.weight ?? null,
    height: data.height ?? null,
    bmi: consultationService.computeBmi(data.weight, data.height),
    painScore: data.painScore ?? null,
    notes: data.notes ?? null,
    recordedAt: data.recordedAt || new Date(),
    recordedBy: user.id,
  });

  if (emergencyCase.patientId) {
    realtime.emitToPatient(emergencyCase.patientId, EVENTS.VITAL_SIGNS_RECORDED, {
      patientId: emergencyCase.patientId,
      emergencyCaseId: emergencyCase.id,
      recordedAt: vitals.recordedAt,
    });
  }

  return vitals.get({ plain: true });
}

async function getCase({ user, id }) {
  const emergencyCase = await EmergencyCase.findByPk(id, {
    include: [
      ...CASE_INCLUDES,
      { model: Admission, as: 'admission', attributes: ['id', 'admissionNumber', 'bedId'] },
      { model: VitalSign, as: 'vitalSigns', order: [['recordedAt', 'DESC']], limit: 20 },
    ],
  });
  if (!emergencyCase) throw AppError.notFound('Emergency case not found');
  if (roleNameOf(user) === 'PATIENT' && !sameId(emergencyCase.patientId, user.patientId)) {
    throw AppError.forbidden('You are not authorised to view this emergency case');
  }

  return presentCase(emergencyCase);
}

async function list({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const statuses = query.status ? String(query.status).split(',').map((s) => s.trim()) : null;

  const where = combineWhere(
    roleNameOf(user) === 'PATIENT' ? { patientId: user.patientId ?? -1 } : undefined,
    query.active === true ? { status: { [Op.in]: ACTIVE_CASE_STATUSES } } : undefined,
    statuses ? { status: { [Op.in]: statuses } } : undefined,
    query.patientId ? { patientId: query.patientId } : undefined,
    query.departmentId ? { departmentId: query.departmentId } : undefined,
    query.triageLevel ? { triageLevel: Number(query.triageLevel) } : undefined,
    query.assignedDoctorId ? { assignedDoctorId: query.assignedDoctorId } : undefined,
    query.date
      ? { arrivalAt: { [Op.between]: [new Date(`${query.date}T00:00:00Z`), new Date(`${query.date}T23:59:59Z`)] } }
      : undefined,
    searchWhere(query.search, [['caseNumber', 'string'], ['chiefComplaint', 'string'], ['walkInName', 'string']]),
  );

  const { rows, count } = await EmergencyCase.findAndCountAll({
    where,
    include: CASE_INCLUDES,
    order: query.orderBy === 'arrivalAt' ? [['arrivalAt', 'ASC']] : [['id', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return { cases: rows.map(presentCase), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

/** The ED board, grouped by triage level. */
async function board({ query = {} }) {
  const where = combineWhere(
    query.departmentId ? { departmentId: query.departmentId } : undefined,
    { status: { [Op.in]: ACTIVE_CASE_STATUSES } },
  );

  const cases = await EmergencyCase.findAll({ where, include: CASE_INCLUDES, order: [['arrivalAt', 'ASC']] });

  const groups = Object.values(TRIAGE_LEVELS).map((level) => ({
    triageLevel: level,
    category: TRIAGE_CATEGORY[level],
    waitTargetMinutes: WAIT_TARGET_MINUTES[level],
    cases: [],
  }));

  cases.forEach((row) => {
    const presented = presentCase(row);
    const group = groups.find((g) => g.triageLevel === presented.triageLevel) || groups[groups.length - 1];
    group.cases.push(presented);
  });

  return {
    groups,
    totals: {
      waiting: cases.length,
      untriaged: cases.filter((row) => !row.triageLevel).length,
      critical: cases.filter((row) => Number(row.triageLevel) === TRIAGE_LEVELS.CRITICAL).length,
    },
  };
}

/** Files a consultation for the case (for billable treatment documentation). */
async function startConsultation({ user, id, data }) {
  const emergencyCase = await EmergencyCase.findByPk(id);
  if (!emergencyCase) throw AppError.notFound('Emergency case not found');
  if (!emergencyCase.patientId) throw AppError.conflict('Link the case to a patient before starting a consultation');

  const doctor = emergencyCase.assignedDoctorId
    ? await Doctor.findByPk(emergencyCase.assignedDoctorId)
    : await Doctor.findOne({ where: { userId: user.id } });
  if (!doctor) throw AppError.forbidden('Only an assigned doctor may start an emergency consultation');

  const consultation = await consultationService.start({
    user,
    data: {
      patientId: emergencyCase.patientId,
      appointmentId: null,
      admissionId: emergencyCase.admissionId ?? null,
      chiefComplaint: emergencyCase.chiefComplaint,
      history: data?.history ?? emergencyCase.presentingVitals,
      diagnosisSummary: data?.diagnosisSummary ?? null,
      ...(data || {}),
    },
  });

  await emergencyCase.update({
    consultationId: consultation.id,
    status: EMERGENCY_STATUS.IN_TREATMENT,
    treatmentStartedAt: emergencyCase.treatmentStartedAt || new Date(),
    treatmentNotes: data?.treatmentNotes ?? emergencyCase.treatmentNotes,
  });

  return consultation;
}

/**
 * Converts an emergency case into an inpatient admission (reuses the inpatient
 * transaction so bed locking behaves identically in both paths).
 */
async function admit({ user, id, data }) {
  const emergencyCase = await EmergencyCase.findByPk(id);
  if (!emergencyCase) throw AppError.notFound('Emergency case not found');
  if (emergencyCase.admissionId) throw AppError.conflict('This case is already linked to an admission');
  if (!emergencyCase.patientId) throw AppError.conflict('Link the case to a patient before admitting');

  const admission = await admissionService.admit({
    user,
    data: {
      patientId: emergencyCase.patientId,
      bedId: data.bedId,
      wardId: data.wardId,
      roomType: data.roomType,
      attendingDoctorId: emergencyCase.assignedDoctorId ?? data.attendingDoctorId,
      emergencyCaseId: emergencyCase.id,
      consultationId: emergencyCase.consultationId ?? null,
      admittedFrom: 'EMERGENCY',
      reasonForAdmission: data.reasonForAdmission ?? emergencyCase.chiefComplaint,
      diagnosis: data.diagnosis ?? null,
      conditionOnAdmission: data.conditionOnAdmission || 'STABLE',
      dailyRate: data.dailyRate,
      expectedDischargeAt: data.expectedDischargeAt ?? null,
      notes: data.notes ?? null,
    },
  });

  await emergencyCase.update({
    admissionId: admission.id,
    status: EMERGENCY_STATUS.ADMITTED,
    treatmentNotes: data?.treatmentNotes ?? emergencyCase.treatmentNotes,
  });

  await medicalRecordService.append({
    user,
    patientId: emergencyCase.patientId,
    recordType: MEDICAL_RECORD_TYPES.ADMISSION,
    title: `Emergency admission (${emergencyCase.caseNumber})`,
    summary: data?.reasonForAdmission ?? emergencyCase.chiefComplaint,
    referenceType: 'emergency_case',
    referenceId: emergencyCase.id,
    admissionId: admission.id,
    occurredAt: admission.admittedAt,
  });

  return admission;
}

/** Attaches a walk-in case to an existing (or newly created) patient record. */
async function linkPatient({ user, id, data }) {
  const emergencyCase = await EmergencyCase.findByPk(id);
  if (!emergencyCase) throw AppError.notFound('Emergency case not found');

  const patient = await Patient.findByPk(data.patientId);
  if (!patient) throw AppError.notFound('Patient not found');

  await emergencyCase.update({
    patientId: patient.id,
    isWalkIn: false,
    walkInName: null,
    walkInPhone: patient.phone,
  });

  return getCase({ user, id: emergencyCase.id });
}

/** Discharges from the ED (either home or transferred out). */
async function discharge({ user, id, data }) {
  const emergencyCase = await EmergencyCase.findByPk(id);
  if (!emergencyCase) throw AppError.notFound('Emergency case not found');
  if (emergencyCase.status === EMERGENCY_STATUS.ADMITTED) {
    throw AppError.conflict('Discharge the inpatient admission instead of the emergency case');
  }

  await emergencyCase.update({
    status: data.outcome === 'TRANSFERRED_OUT' ? EMERGENCY_STATUS.TRANSFERRED : EMERGENCY_STATUS.DISCHARGED,
    dischargedAt: new Date(),
    outcome: data.outcome || 'DISCHARGED_HOME',
    treatmentNotes: data.treatmentNotes ?? emergencyCase.treatmentNotes,
    notes: [emergencyCase.notes, `Outcome: ${data.outcome || 'DISCHARGED_HOME'}`].filter(Boolean).join('\n'),
  });

  await broadcastWaitingRoom(emergencyCase.departmentId);

  if (emergencyCase.patientId) {
    await medicalRecordService.append({
      user,
      patientId: emergencyCase.patientId,
      recordType: MEDICAL_RECORD_TYPES.DISCHARGE,
      title: `Emergency visit ${emergencyCase.caseNumber}`,
      summary: data?.treatmentNotes ?? `Outcome: ${data?.outcome || 'DISCHARGED_HOME'}`,
      referenceType: 'emergency_case',
      referenceId: emergencyCase.id,
      occurredAt: emergencyCase.dischargedAt,
    });

    await notificationService.notify({
      patientId: emergencyCase.patientId,
      type: 'DISCHARGE',
      title: 'Emergency visit completed',
      message: `Outcome: ${data?.outcome || 'Discharged home'}.`,
      data: { caseId: emergencyCase.id },
    });
  }

  return getCase({ user, id: emergencyCase.id });
}

/** ED counters for the dashboard. */
async function statistics({ query = {} }) {
  const day = query.date || new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${day}T00:00:00Z`);
  const dayEnd = new Date(`${day}T23:59:59Z`);

  const [arrived, active, admitted, discharged, byLevel] = await Promise.all([
    EmergencyCase.count({ where: { arrivalAt: { [Op.between]: [dayStart, dayEnd] } } }),
    EmergencyCase.count({ where: { status: { [Op.in]: ACTIVE_CASE_STATUSES } } }),
    EmergencyCase.count({ where: { admissionId: { [Op.ne]: null }, status: EMERGENCY_STATUS.ADMITTED } }),
    EmergencyCase.count({ where: { dischargedAt: { [Op.between]: [dayStart, dayEnd] } } }),
    EmergencyCase.findAll({
      attributes: ['triageLevel', [fn('COUNT', col('id')), 'count']],
      where: { arrivalAt: { [Op.between]: [dayStart, dayEnd] }, triageLevel: { [Op.ne]: null } },
      group: ['triageLevel'],
      raw: true,
    }),
  ]);

  const averageWait = await EmergencyCase.findOne({
    attributes: [[literal('AVG(EXTRACT(EPOCH FROM (triaged_at - arrival_at))) / 60'), 'avgMinutes']],
    where: { triagedAt: { [Op.ne]: null }, arrivalAt: { [Op.between]: [dayStart, dayEnd] } },
    raw: true,
  });

  return {
    date: day,
    arrived,
    active,
    admitted,
    discharged,
    averageWaitMinutes: averageWait?.avgMinutes ? Number(Number(averageWait.avgMinutes)).toFixed(1) : null,
    byTriageLevel: byLevel.map((row) => ({
      triageLevel: row.triageLevel,
      category: TRIAGE_CATEGORY[row.triageLevel],
      count: Number(row.count),
    })),
  };
}

module.exports = {
  register,
  triage,
  assignDoctor,
  callNext,
  waitingRoom,
  board,
  recordVitals,
  getCase,
  list,
  board,
  startConsultation,
  admit,
  linkPatient,
  discharge,
  statistics,
  presentCase,
  TRIAGE_CATEGORY,
  WAIT_TARGET_MINUTES,
  ACTIVE_CASE_STATUSES,
};
