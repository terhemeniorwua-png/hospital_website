const { Op, fn, col } = require('sequelize');
const AppError = require('../utils/AppError');
const { sequelize } = require('../config/database');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { numbered } = require('../utils/codeGenerator');
const { round2 } = require('../utils/money');
const { toDateOnly, daysBetween } = require('../utils/dates');
const { roleNameOf, isClinicalStaff } = require('../utils/accessControl');
const { BED_STATUS, ADMISSION_STATUS, MEDICAL_RECORD_TYPES } = require('../config/constants');
const { EVENTS } = require('../realtime/events');
const realtime = require('../realtime/socket');
const notificationService = require('./notification.service');
const medicalRecordService = require('./medicalRecord.service');
const {
  Ward,
  Room,
  Bed,
  Admission,
  Patient,
  Doctor,
  Department,
  User,
  Consultation,
  Diagnosis,
  Prescription,
  LaboratoryOrder,
  ImagingOrder,
  NursingNote,
} = require('../models');

/**
 * Inpatient care: wards -> rooms -> beds -> admissions.
 *
 * Placing a patient in a bed is the reference multi-step transaction of this
 * codebase. `admit()` takes a row lock on the bed, flips it to OCCUPIED and
 * writes the admission in one transaction; the database also enforces
 * `admissions_unique_active_bed` (a bed can hold one live admission) and
 * `admissions_unique_active_patient`.
 */

const ACTIVE_ADMISSION_STATUSES = [ADMISSION_STATUS.ADMITTED, ADMISSION_STATUS.TRANSFERRED];

function presentBed(bed) {
  const plain = bed.get({ plain: true });
  return {
    ...plain,
    currentAdmission: plain.Admission ? plain.Admission.get({ plain: true }) : null,
  };
}

/* ------------------------------------------------------------------ *
 * Wards / rooms / beds
 * ------------------------------------------------------------------ */

async function listWards({ query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    query.isActive === undefined ? { isActive: true } : { isActive: query.isActive },
    searchWhere(query.search, [['name', 'string'], ['code', 'string']]),
  );

  const { rows, count } = await Ward.findAndCountAll({
    where,
    include: [
      { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
      { model: Room, as: 'rooms', attributes: ['id', 'roomNumber', 'roomType', 'capacity', 'isActive'] },
    ],
    order: [['name', 'ASC']],
    limit,
    offset,
    distinct: true,
  });

  const wards = await Promise.all(
    rows.map(async (ward) => {
      const plain = ward.get({ plain: true });
      const occupancy = await bedCounts(ward.id);
      return { ...plain, occupancy };
    }),
  );

  return { wards, pagination: buildPaginationMeta({ page, limit, total: count }) };
}

async function getWard({ id }) {
  const ward = await Ward.findByPk(id, {
    include: [
      { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
      {
        model: Room,
        as: 'rooms',
        include: [{ model: Bed, as: 'beds', order: [['bedNumber', 'ASC']] }],
        order: [['roomNumber', 'ASC']],
      },
    ],
  });
  if (!ward) throw AppError.notFound('Ward not found');

  const plain = ward.get({ plain: true });
  return { ...plain, occupancy: await bedCounts(ward.id) };
}

/** Bed counters used by the ward board and the admin dashboard. */
async function bedCounts(wardId) {
  const where = wardId ? { wardId } : undefined;

  const [total, occupied, reserved, cleaning, maintenance, available] = await Promise.all([
    Bed.count({ where: { ...where, isActive: true } }),
    Bed.count({ where: { ...where, isActive: true, status: BED_STATUS.OCCUPIED } }),
    Bed.count({ where: { ...where, isActive: true, status: BED_STATUS.RESERVED } }),
    Bed.count({ where: { ...where, isActive: true, status: BED_STATUS.CLEANING } }),
    Bed.count({ where: { ...where, isActive: true, status: BED_STATUS.MAINTENANCE } }),
    Bed.count({ where: { ...where, isActive: true, status: BED_STATUS.AVAILABLE } }),
  ]);

  return {
    total,
    occupied,
    available,
    reserved,
    cleaning,
    maintenance,
    occupancyRate: total ? Number(((occupied / total) * 100).toFixed(1)) : 0,
  };
}

async function listBeds({ query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    query.wardId ? { wardId: Number(query.wardId) } : undefined,
    query.roomId ? { roomId: Number(query.roomId) } : undefined,
    query.status ? { status: query.status } : undefined,
    query.availableOnly === true ? { status: BED_STATUS.AVAILABLE, isActive: true } : undefined,
    searchWhere(query.search, [['bedNumber', 'string'], ['shelfLocation', 'string']]),
  );

  const { rows, count } = await Bed.findAndCountAll({
    where,
    include: [
      { model: Room, as: 'room', attributes: ['id', 'roomNumber', 'roomType'] },
      { model: Ward, as: 'ward', attributes: ['id', 'name', 'code'] },
      {
        model: Admission,
        as: 'admissions',
        required: false,
        where: { status: { [Op.in]: ACTIVE_ADMISSION_STATUSES } },
        include: [{ model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] }],
      },
    ],
    order: [['wardId', 'ASC'], ['bedNumber', 'ASC']],
    limit,
    offset,
    distinct: true,
  });

  const beds = rows.map((row) => {
    const plain = row.get({ plain: true });
    const admission = (plain.admissions || [])[0] || null;
    const { admissions, ...rest } = plain;
    return { ...rest, admission: admission ? { ...admission, patient: admission.patient } : null };
  });

  return { beds, pagination: buildPaginationMeta({ page, limit, total: count }) };
}

/** First free bed in a ward (optionally of a given type). */
async function findAvailableBed({ wardId, roomType }) {
  const beds = await Bed.findAll({
    where: combineWhere(
      { wardId: Number(wardId), status: BED_STATUS.AVAILABLE, isActive: true },
      roomType ? { room: { roomType } } : undefined,
    ),
    include: [{ model: Room, as: 'room', attributes: ['id', 'roomNumber', 'roomType'] }],
    order: [['bedNumber', 'ASC']],
  });
  return beds[0] || null;
}

async function setBedStatus({ user, id, status, notes }) {
  const bed = await Bed.findByPk(id);
  if (!bed) throw AppError.notFound('Bed not found');

  if (status === BED_STATUS.AVAILABLE) {
    const live = await Admission.count({
      where: { bedId: bed.id, status: { [Op.in]: ACTIVE_ADMISSION_STATUSES } },
    });
    if (live > 0) throw AppError.conflict('Discharge the patient occupying this bed first');
  }

  await bed.update({ status, notes: notes ?? bed.notes });

  const payload = { bedId: bed.id, status, wardId: bed.wardId };
  realtime.emitToDepartment(bed.wardId, EVENTS.BED_UPDATED, payload);
  realtime.emitToHospital(EVENTS.BED_UPDATED, payload);

  return bed.get({ plain: true });
}

/* ------------------------------------------------------------------ *
 * Admissions
 * ------------------------------------------------------------------ */

async function listAdmissions({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const statuses = query.status ? String(query.status).split(',').map((s) => s.trim()) : null;

  const where = combineWhere(
    roleNameOf(user) === 'PATIENT' ? { patientId: user.patientId ?? -1 } : undefined,
    statuses ? { status: { [Op.in]: statuses } } : undefined,
    query.patientId ? { patientId: Number(query.patientId) } : undefined,
    query.wardId ? { wardId: Number(query.wardId) } : undefined,
    query.bedId ? { bedId: Number(query.bedId) } : undefined,
    query.active === true ? { status: { [Op.in]: ACTIVE_ADMISSION_STATUSES } } : undefined,
    query.date ? { admittedAt: { [Op.gte]: new Date(`${query.date}T00:00:00Z`) } } : undefined,
    searchWhere(query.search, [['admissionNumber', 'string'], ['diagnosis', 'string']]),
  );

  const { rows, count } = await Admission.findAndCountAll({
    where,
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName', 'bloodGroup'] },
      { model: Ward, as: 'ward', attributes: ['id', 'name', 'code', 'wardType'] },
      { model: Room, as: 'room', attributes: ['id', 'roomNumber', 'roomType'] },
      { model: Bed, as: 'bed', attributes: ['id', 'bedNumber', 'status'] },
      { model: Doctor, as: 'attendingDoctor', attributes: ['id'], include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }] },
    ],
    order: [['admittedAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return { admissions: rows.map(present), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

function present(admission) {
  if (!admission) return null;
  const plain = admission.get({ plain: true });
  return {
    ...plain,
    patientName: plain.patient ? `${plain.patient.firstName} ${plain.patient.lastName || ''}`.trim() : null,
    location: [plain.ward?.name, plain.room?.roomNumber, plain.bed?.bedNumber].filter(Boolean).join(' / ') || null,
    doctorName:
      plain.attendingDoctor?.user ? `Dr ${plain.attendingDoctor.user.firstName} ${plain.attendingDoctor.user.lastName}` : null,
  };
}

async function getAdmission({ user, id }) {
  const admission = await Admission.findByPk(id, {
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName', 'bloodGroup', 'allergySummary'] },
      { model: Ward, as: 'ward', attributes: ['id', 'name', 'code', 'wardType', 'floor'] },
      { model: Room, as: 'room', attributes: ['id', 'roomNumber', 'roomType', 'dailyRate'] },
      { model: Bed, as: 'bed', attributes: ['id', 'bedNumber', 'status', 'dailyRate'] },
      { model: Doctor, as: 'attendingDoctor', attributes: ['id'], include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }] },
    ],
  });
  if (!admission) throw AppError.notFound('Admission not found');
  if (roleNameOf(user) === 'PATIENT' && Number(admission.patientId) !== Number(user.patientId)) {
    throw AppError.forbidden('You are not authorised to view this admission');
  }
  return present(admission);
}

async function nextAdmissionNumber({ transaction }) {
  const last = await Admission.findOne({ order: [['id', 'DESC']], attributes: ['admissionNumber'], transaction });
  let sequence = 1;
  if (last && typeof last.admissionNumber === 'string') {
    const parsed = Number.parseInt(last.admissionNumber.split('-').pop(), 10);
    if (Number.isFinite(parsed)) sequence = parsed + 1;
  }
  return numbered('ADM', sequence);
}

/**
 * Admits a patient into a bed.
 *
 * Transaction scope: bed lock -> bed OCCUPIED -> admission row. Any failure
 * (bed taken, patient already admitted) rolls the whole thing back so the ward
 * board can never show a half-completed admission.
 */
async function admit({ user, data }) {
  if (!isClinicalStaff(user) && !['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST'].includes(roleNameOf(user))) {
    throw AppError.forbidden('You are not authorised to admit patients');
  }

  const patient = await Patient.findByPk(data.patientId);
  if (!patient) throw AppError.notFound('Patient not found');

  let bed = null;
  if (data.bedId) {
    bed = await Bed.findByPk(data.bedId);
    if (!bed) throw AppError.notFound('Bed not found');
  } else if (data.wardId) {
    bed = await findAvailableBed({ wardId: data.wardId, roomType: data.roomType });
    if (!bed) throw AppError.conflict('No free bed is available in that ward');
  } else {
    throw AppError.badRequest('Provide either bedId or wardId');
  }

  const result = await sequelize.transaction(async (transaction) => {
    // Row lock: two admissions racing for the same bed are serialised here.
    // eslint-disable-next-line no-await-in-loop
    const lockedBed = await Bed.findByPk(bed.id, { transaction, lock: transaction.LOCK.UPDATE });

    if (lockedBed.status !== BED_STATUS.AVAILABLE) {
      throw AppError.conflict(`Bed ${lockedBed.bedNumber} is no longer available`);
    }

    // eslint-disable-next-line no-await-in-loop
    const existingAdmission = await Admission.findOne({
      where: { patientId: patient.id, status: { [Op.in]: ACTIVE_ADMISSION_STATUSES } },
      transaction,
    });
    if (existingAdmission) {
      throw AppError.conflict(`${patient.getFullName()} is already admitted (${existingAdmission.admissionNumber})`);
    }

    // eslint-disable-next-line no-await-in-loop
    const admission = await Admission.create(
      {
        admissionNumber: await nextAdmissionNumber({ transaction }),
        patientId: patient.id,
        wardId: lockedBed.wardId,
        roomId: lockedBed.roomId,
        bedId: lockedBed.id,
        admittedBy: user.id,
        attendingDoctorId: data.attendingDoctorId ?? null,
        emergencyCaseId: data.emergencyCaseId ?? null,
        consultationId: data.consultationId ?? null,
        status: ADMISSION_STATUS.ADMITTED,
        admittedFrom: data.admittedFrom || 'OPD',
        reasonForAdmission: data.reasonForAdmission ?? null,
        diagnosis: data.diagnosis ?? null,
        conditionOnAdmission: data.conditionOnAdmission || 'STABLE',
        dailyRate: data.dailyRate ?? Number(lockedBed.dailyRate || 0),
        admittedAt: new Date(),
        expectedDischargeAt: data.expectedDischargeAt ?? null,
        notes: data.notes ?? null,
      },
      { transaction },
    );

    // eslint-disable-next-line no-await-in-loop
    await lockedBed.update({ status: BED_STATUS.OCCUPIED, notes: `Occupied by ${patient.getFullName()}` }, { transaction });

    return admission;
  });

  await medicalRecordService.append({
    user,
    patientId: patient.id,
    recordType: MEDICAL_RECORD_TYPES.ADMISSION,
    title: `Admitted to ${bed.wardId ? 'ward' : 'inpatient ward'}`,
    summary: `Admission ${result.admissionNumber}: ${data.reasonForAdmission || 'admitted'}`,
    referenceType: 'admission',
    referenceId: result.id,
    admissionId: result.id,
    occurredAt: result.admittedAt,
  });

  await notificationService.notify({
    patientId: patient.id,
    role: 'NURSE',
    type: 'ADMISSION',
    title: `New admission ${result.admissionNumber}`,
    message: `${patient.getFullName()} was admitted to bed ${bed.bedNumber}.`,
    data: { admissionId: result.id, bedId: bed.id, wardId: bed.wardId },
    priority: data.conditionOnAdmission === 'CRITICAL' ? 'URGENT' : 'HIGH',
  });

  const payload = { admissionId: result.id, patientId: patient.id, bedId: bed.id, wardId: bed.wardId };
  realtime.emitToDepartment(bed.wardId, EVENTS.ADMISSION_CREATED, payload);
  realtime.emitToHospital(EVENTS.ADMISSION_CREATED, payload);

  return getAdmission({ user, id: result.id });
}

/** Moves a patient to another bed (transfer within or between wards). */
async function transfer({ user, id, data }) {
  const admission = await Admission.findByPk(id);
  if (!admission) throw AppError.notFound('Admission not found');
  if (!ACTIVE_ADMISSION_STATUSES.includes(admission.status)) {
    throw AppError.conflict(`A ${admission.status.toLowerCase()} admission cannot be transferred`);
  }

  let bed = null;
  if (data.bedId) {
    bed = await Bed.findByPk(data.bedId);
    if (!bed) throw AppError.notFound('Bed not found');
  } else {
    bed = await findAvailableBed({ wardId: data.wardId ?? admission.wardId });
    if (!bed) throw AppError.conflict('No free bed is available in the destination ward');
  }

  if (Number(bed.id) === Number(admission.bedId)) {
    throw AppError.badRequest('The patient is already in that bed');
  }

  await sequelize.transaction(async (transaction) => {
    // eslint-disable-next-line no-await-in-loop
    const newBed = await Bed.findByPk(bed.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (newBed.status !== BED_STATUS.AVAILABLE) {
      throw AppError.conflict(`Bed ${newBed.bedNumber} is no longer available`);
    }

    if (admission.bedId) {
      // eslint-disable-next-line no-await-in-loop
      const oldBed = await Bed.findByPk(admission.bedId, { transaction, lock: transaction.LOCK.UPDATE });
      if (oldBed) {
        // eslint-disable-next-line no-await-in-loop
        await oldBed.update({ status: BED_STATUS.CLEANING, notes: 'Needs turnover cleaning' }, { transaction });
      }
    }

    // eslint-disable-next-line no-await-in-loop
    await admission.update(
      {
        bedId: newBed.id,
        roomId: newBed.roomId,
        wardId: newBed.wardId,
        status: ADMISSION_STATUS.TRANSFERRED,
        notes: [admission.notes, `Transferred on ${new Date().toISOString()}${data.reason ? `: ${data.reason}` : ''}`]
          .filter(Boolean)
          .join('\n'),
      },
      { transaction },
    );

    // eslint-disable-next-line no-await-in-loop
    await newBed.update({ status: BED_STATUS.OCCUPIED }, { transaction });
  });

  const payload = { admissionId: admission.id, fromBedId: admission.bedId, toBedId: bed.id, wardId: bed.wardId };
  realtime.emitToDepartment(admission.wardId, EVENTS.BED_UPDATED, payload);
  realtime.emitToDepartment(bed.wardId, EVENTS.BED_UPDATED, payload);

  await notificationService.notify({
    patientId: admission.patientId,
    role: 'NURSE',
    type: 'ADMISSION',
    title: 'Patient transferred',
    message: `Transfer to bed ${bed.bedNumber}.`,
    data: { admissionId: admission.id, bedId: bed.id },
  });

  return getAdmission({ user, id: admission.id });
}

/**
 * Discharges a patient, frees the bed (into CLEANING) and generates the
 * discharge summary.
 */
async function discharge({ user, id, data }) {
  const admission = await Admission.findByPk(id, { include: [{ model: Patient, as: 'patient' }] });
  if (!admission) throw AppError.notFound('Admission not found');
  if (admission.status === ADMISSION_STATUS.DISCHARGED) {
    throw AppError.conflict('This patient has already been discharged');
  }

  const dischargedAt = new Date();
  const nights = Math.max(1, daysBetween(admission.admittedAt, dischargedAt) || 1);

  const summary = await buildDischargeSummary(admission, data);

  await sequelize.transaction(async (transaction) => {
    // eslint-disable-next-line no-await-in-loop
    await admission.update(
      {
        status: ADMISSION_STATUS.DISCHARGED,
        dischargedAt,
        dischargedBy: user.id,
        dischargeSummary: summary.summary,
        dischargeType: data.dischargeType || 'NORMAL',
        dischargedTo: data.dischargedTo ?? null,
        daysAdmitted: nights,
      },
      { transaction },
    );

    if (admission.bedId) {
      // eslint-disable-next-line no-await-in-loop
      const bed = await Bed.findByPk(admission.bedId, { transaction, lock: transaction.LOCK.UPDATE });
      if (bed) {
        // eslint-disable-next-line no-await-in-loop
        await bed.update({ status: BED_STATUS.CLEANING, notes: 'Turnover cleaning required' }, { transaction });
      }
    }
  });

  await medicalRecordService.append({
    user,
    patientId: admission.patientId,
    recordType: MEDICAL_RECORD_TYPES.DISCHARGE,
    title: `Discharged from admission ${admission.admissionNumber}`,
    summary: data.dischargeSummary ?? summary.summary?.slice(0, 500),
    referenceType: 'admission',
    referenceId: admission.id,
    admissionId: admission.id,
    occurredAt: dischargedAt,
  });

  await notificationService.notify({
    patientId: admission.patientId,
    role: 'ACCOUNTANT',
    type: 'DISCHARGE',
    title: `Patient discharged (${admission.admissionNumber})`,
    message: `${nights} day(s) stay. Bed charges are ready for billing.`,
    data: { admissionId: admission.id, nights },
  });

  realtime.emitToDepartment(admission.wardId, EVENTS.PATIENT_DISCHARGED, {
    admissionId: admission.id,
    patientId: admission.patientId,
    bedId: admission.bedId,
  });

  return { ...(await getAdmission({ user, id: admission.id })), summary };
}

/** Builds a structured discharge summary from the admission's own records. */
async function buildDischargeSummary(admission, data = {}) {
  const [
    consultations,
    diagnoses,
    prescriptions,
    labOrders,
    imagingOrders,
    notes,
  ] = await Promise.all([
    require('../models').Consultation.findAll({
      where: { admissionId: admission.id },
      order: [['startedAt', 'ASC']],
    }),
    require('../models').Diagnosis.findAll({ where: { patientId: admission.patientId, status: 'ACTIVE' } }),
    require('../models').Prescription.findAll({ where: { patientId: admission.patientId }, order: [['createdAt', 'DESC']], limit: 20 }),
    require('../models').LaboratoryOrder.findAll({ where: { admissionId: admission.id }, order: [['orderedAt', 'ASC']] }),
    require('../models').ImagingOrder.findAll({ where: { admissionId: admission.id }, order: [['orderedAt', 'ASC']] }),
    require('../models').NursingNote.findAll({ where: { admissionId: admission.id }, order: [['recordedAt', 'ASC']] }),
  ]);

  const patient = admission.patient || (await Patient.findByPk(admission.patientId));

  const parts = [
    `PATIENT: ${patient ? patient.getFullName() : 'Unknown'} (${patient?.hospitalNumber || ''})`,
    `ADMISSION: ${admission.admissionNumber}`,
    `ADMITTED: ${new Date(admission.admittedAt).toISOString()}`,
    `DURATION: ${Math.max(1, daysBetween(admission.admittedAt) || 1)} day(s)`,
    `ADMITTED FROM: ${admission.admittedFrom}`,
    `PRESENTING REASON: ${admission.reasonForAdmission || 'Not recorded'}`,
    `CONDITION ON ADMISSION: ${admission.conditionOnAdmission}`,
    '',
    'DIAGNOSES:',
    ...(diagnoses.length
      ? diagnoses.map((d) => ` - ${d.description} (${d.type})`)
      : [' - None recorded']),
    '',
    'PROCEDURES / CONSULTATIONS:',
    ...(consultations.length
      ? consultations.map((c) => ` - ${c.consultationNumber}: ${c.chiefComplaint || ''} ${c.treatmentPlan ? `| Plan: ${c.treatmentPlan}` : ''}`)
      : [' - None recorded']),
    '',
    'LABORATORY:',
    ...(labOrders.length ? labOrders.map((o) => ` - ${o.orderNumber} (${o.status})`) : [' - None']),
    'IMAGING:',
    ...(imagingOrders.length ? imagingOrders.map((o) => ` - ${o.orderNumber} ${o.imagingType} (${o.status})`) : [' - None']),
    'MEDICATIONS ON DISCHARGE:',
    ...(prescriptions.length
      ? prescriptions.map((p) => ` - ${p.prescriptionNumber} (${p.status})`)
      : [' - None']),
    '',
    `CONDITION ON DISCHARGE: ${data.conditionOnDischarge || 'Stable'}`,
    `DISCHARGE MEDICATIONS: ${data.dischargeMedications || 'As prescribed'}`,
    `FOLLOW UP: ${data.followUpDate || admission.expectedDischargeAt || 'As advised'}`,
    `DISCHARGE TYPE: ${data.dischargeType || 'NORMAL'}`,
    '',
    `NIGHTLY RATE: ${admission.dailyRate}   TOTAL BED CHARGES: ${round2(Number(admission.dailyRate || 0) * Math.max(1, daysBetween(admission.admittedAt) || 1))}`,
  ];

  const summary = parts.join('\n');

  return {
    summary,
    structured: {
      admissionNumber: admission.admissionNumber,
      admittedAt: admission.admittedAt,
      dischargedAt: new Date(),
      daysAdmitted: Math.max(1, daysBetween(admission.admittedAt) || 1),
      reasonForAdmission: admission.reasonForAdmission,
      conditionOnAdmission: admission.conditionOnAdmission,
      diagnoses: diagnoses.map((d) => ({ description: d.description, type: d.type, code: d.code })),
      consultations: consultations.map((c) => ({
        consultationNumber: c.consultationNumber,
        chiefComplaint: c.chiefComplaint,
        treatmentPlan: c.treatmentPlan,
      })),
      laboratoryOrders: labOrders.map((o) => ({ orderNumber: o.orderNumber, status: o.status })),
      imagingOrders: imagingOrders.map((o) => ({ orderNumber: o.orderNumber, imagingType: o.imagingType, status: o.status })),
      prescriptions: prescriptions.map((p) => ({ prescriptionNumber: p.prescriptionNumber, status: p.status })),
      nursingNotes: notes.map((n) => ({ noteType: n.noteType, recordedAt: n.recordedAt })),
      conditionOnDischarge: data.conditionOnDischarge || 'Stable',
      followUpDate: data.followUpDate ?? admission.expectedDischargeAt ?? null,
      bedCharges: round2(Number(admission.dailyRate || 0) * Math.max(1, daysBetween(admission.admittedAt) || 1)),
    },
  };
}

async function getDischargeSummary({ user, id }) {
  const admission = await Admission.findByPk(id, { include: [{ model: Patient, as: 'patient' }] });
  if (!admission) throw AppError.notFound('Admission not found');
  if (roleNameOf(user) === 'PATIENT' && Number(admission.patientId) !== Number(user.patientId)) {
    throw AppError.forbidden('You are not authorised to view this summary');
  }

  if (admission.dischargeSummary) {
    return { admissionNumber: admission.admissionNumber, summary: admission.dischargeSummary, stored: true };
  }

  const built = await buildDischargeSummary(admission, {});
  return { admissionNumber: admission.admissionNumber, ...built, stored: false };
}

/** Bed occupancy + admissions overview. */
async function statistics({ query = {} }) {
  const day = query.date || toDateOnly();

  const [occupancy, admitted, discharged, activeAdmissions, byWard] = await Promise.all([
    bedCounts(query.wardId ? Number(query.wardId) : undefined),
    Admission.count({ where: { admittedAt: { [Op.gte]: new Date(`${day}T00:00:00Z`) } } }),
    Admission.count({ where: { dischargedAt: { [Op.gte]: new Date(`${day}T00:00:00Z`) } } }),
    Admission.count({ where: { status: { [Op.in]: ACTIVE_ADMISSION_STATUSES } } }),
    Admission.findAll({
      where: { status: { [Op.in]: ACTIVE_ADMISSION_STATUSES } },
      attributes: ['wardId', [fn('COUNT', col('id')), 'count']],
      group: ['wardId'],
      raw: true,
    }),
  ]);

  const wards = await Ward.findAll({ attributes: ['id', 'name', 'code', 'totalBeds'], order: [['name', 'ASC']] });
  const wardCountMap = new Map(byWard.map((row) => [row.wardId, Number(row.count)]));

  return {
    date: day,
    occupancy,
    admittedToday: admitted,
    dischargedToday: discharged,
    activeAdmissions,
    wards: wards.map((ward) => ({
      id: ward.id,
      name: ward.name,
      code: ward.code,
      totalBeds: ward.totalBeds,
      occupied: wardCountMap.get(ward.id) || 0,
    })),
  };
}

module.exports = {
  listWards,
  getWard,
  listBeds,
  setBedStatus,
  findAvailableBed,
  bedCounts,
  listAdmissions,
  getAdmission,
  admit,
  transfer,
  discharge,
  getDischargeSummary,
  statistics,
  buildDischargeSummary,
  present,
  presentBed,
  nextAdmissionNumber,
  ACTIVE_ADMISSION_STATUSES,
  BED_STATUS,
};