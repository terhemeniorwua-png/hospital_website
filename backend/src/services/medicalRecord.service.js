const { Op } = require('sequelize');
const AppError = require('../utils/AppError');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { combineWhere } = require('../utils/queryHelpers');
const { roleNameOf, isClinicalStaff } = require('../utils/accessControl');
const { MEDICAL_RECORD_TYPES, CONSULTATION_STATUS } = require('../config/constants');
const auditService = require('./audit.service');
const { sameId } = require('../utils/ids');
const {
  MedicalRecord,
  Patient,
  Consultation,
  Diagnosis,
  Prescription,
  LaboratoryOrder,
  ImagingOrder,
  Admission,
  VitalSign,
  NursingNote,
  Allergy,
  MedicalCondition,
  MedicalHistory,
} = require('../models');

/**
 * The electronic medical record.
 *
 * `medical_records` is a chronological index (the timeline). Clinical detail
 * always lives in its own table - the index only points at it - so a patient
 * has exactly one copy of every fact.
 */

/** Patients may only read their own timeline; staff read any. */
function assertCanAccess(user, patientId) {
  if (!user) throw AppError.unauthorized('Authentication required');
  if (roleNameOf(user) === 'PATIENT') {
    if (!user.patientId || !sameId(user.patientId, patientId)) {
      throw AppError.forbidden('You are not authorised to view this patient record');
    }
    return;
  }
  if (!isClinicalStaff(user) && !['SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(roleNameOf(user))) {
    throw AppError.forbidden(`Your role (${roleNameOf(user)}) cannot read medical records`);
  }
}

/** Appends an entry. Used by every clinical module. */
async function append({
  user,
  patientId,
  recordType,
  title,
  summary = null,
  referenceType = null,
  referenceId = null,
  consultationId = null,
  admissionId = null,
  departmentId = null,
  occurredAt = new Date(),
  isPrivate = false,
  metadata = null,
}) {
  return MedicalRecord.create({
    patientId,
    recordType,
    title: String(title).slice(0, 180),
    summary,
    referenceType,
    referenceId,
    consultationId,
    admissionId,
    departmentId,
    isPrivate,
    occurredAt,
    recordedBy: user?.id ?? null,
    metadata,
  });
}

async function list({ user, patientId, query = {} }) {
  assertCanAccess(user, patientId);
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    { patientId: patientId },
    query.recordType ? { recordType: query.recordType } : undefined,
    query.from ? { occurredAt: { [Op.gte]: new Date(query.from) } } : undefined,
    query.to ? { occurredAt: { [Op.lte]: new Date(query.to) } } : undefined,
  );

  const { rows, count } = await MedicalRecord.findAndCountAll({
    where,
    order: [['occurredAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });

  return { records: rows.map((row) => row.get({ plain: true })), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

/**
 * The chronological patient timeline.
 *
 * Returns *live* clinical detail grouped into one list of events so the UI can
 * render a single scroll-back view.
 */
async function timeline({ user, patientId, query = {} }) {
  assertCanAccess(user, patientId);
  const pid = patientId;
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  const limit = Math.min(Number(query.limit) || 100, 500);
  const typeFilter = query.type ? String(query.type).split(',').map((t) => t.trim()) : null;

  const range = { ...(from ? { [Op.gte]: from } : {}), ...(to ? { [Op.lte]: to } : {}) };
  const hasRange = Boolean(from || to);

  const [
    patient,
    records,
    consultations,
    diagnoses,
    prescriptions,
    labOrders,
    imagingOrders,
    admissions,
    vitalSigns,
    nursingNotes,
  ] = await Promise.all([
    Patient.findByPk(pid),
    MedicalRecord.findAll({
      where: combineWhere({ patientId: pid }, hasRange ? { occurredAt: range } : undefined),
      order: [['occurredAt', 'DESC']],
      limit: 500,
    }),
    Consultation.findAll({
      where: combineWhere({ patientId: pid, status: CONSULTATION_STATUS.COMPLETED }, hasRange ? { completedAt: range } : undefined),
      include: [{ model: require('../models').Doctor, as: 'doctor', attributes: ['id'], include: [{ model: require('../models').User, as: 'user', attributes: ['firstName', 'lastName'] }] }],
      order: [['completedAt', 'DESC']],
      limit: 200,
    }),
    Diagnosis.findAll({ where: { patientId: pid }, order: [['diagnosedAt', 'DESC']], limit: 200 }),
    Prescription.findAll({ where: { patientId: pid }, order: [['createdAt', 'DESC']], limit: 200 }),
    LaboratoryOrder.findAll({ where: { patientId: pid }, order: [['orderedAt', 'DESC']], limit: 200 }),
    ImagingOrder.findAll({ where: { patientId: pid }, order: [['orderedAt', 'DESC']], limit: 200 }),
    Admission.findAll({ where: { patientId: pid }, order: [['admittedAt', 'DESC']], limit: 200 }),
    VitalSign.findAll({ where: { patientId: pid }, order: [['recordedAt', 'DESC']], limit: 200 }),
    NursingNote.findAll({ where: { patientId: pid }, order: [['recordedAt', 'DESC']], limit: 200 }),
  ]);

  if (!patient) throw AppError.notFound('Patient not found');

  const events = [];

  records.forEach((record) => {
    if (typeFilter && !typeFilter.includes(record.recordType)) return;
    events.push({
      id: `record-${record.id}`,
      type: record.recordType,
      title: record.title,
      summary: record.summary,
      occurredAt: record.occurredAt,
      departmentId: record.departmentId,
      recordedBy: record.recordedBy,
      reference: record.referenceType ? { type: record.referenceType, id: record.referenceId } : null,
    });
  });

  if (!typeFilter || typeFilter.includes(MEDICAL_RECORD_TYPES.LAB_RESULT)) {
    labOrders.forEach((order) => {
      events.push({
        id: `lab-${order.id}`,
        type: MEDICAL_RECORD_TYPES.LAB_RESULT,
        title: `Laboratory order ${order.orderNumber}`,
        summary: `${order.status}${order.totalPrice ? ` - ${order.totalPrice}` : ''}`,
        occurredAt: order.completedAt || order.orderedAt,
        reference: { type: 'laboratory_order', id: order.id },
      });
    });
  }

  if (!typeFilter || typeFilter.includes(MEDICAL_RECORD_TYPES.PRESCRIPTION)) {
    prescriptions.forEach((prescription) => {
      events.push({
        id: `rx-${prescription.id}`,
        type: MEDICAL_RECORD_TYPES.PRESCRIPTION,
        title: `Prescription ${prescription.prescriptionNumber}`,
        summary: prescription.notes,
        occurredAt: prescription.createdAt,
        reference: { type: 'prescription', id: prescription.id },
      });
    });
  }

  if (!typeFilter || typeFilter.includes(MEDICAL_RECORD_TYPES.ADMISSION)) {
    admissions.forEach((admission) => {
      events.push({
        id: `admission-${admission.id}`,
        type: MEDICAL_RECORD_TYPES.ADMISSION,
        title: `Admission ${admission.admissionNumber}`,
        summary: admission.reasonForAdmission,
        occurredAt: admission.admittedAt,
        reference: { type: 'admission', id: admission.id },
      });
      if (admission.dischargedAt) {
        events.push({
          id: `discharge-${admission.id}`,
          type: MEDICAL_RECORD_TYPES.DISCHARGE,
          title: `Discharge ${admission.admissionNumber}`,
          summary: admission.dischargeSummary,
          occurredAt: admission.dischargedAt,
          reference: { type: 'admission', id: admission.id },
        });
      }
    });
  }

  if (!typeFilter || typeFilter.includes(MEDICAL_RECORD_TYPES.VITAL_SIGNS)) {
    vitalSigns.slice(0, 25).forEach((vital) => {
      events.push({
        id: `vitals-${vital.id}`,
        type: MEDICAL_RECORD_TYPES.VITAL_SIGNS,
        title: 'Vital signs',
        summary: describeVitals(vital),
        occurredAt: vital.recordedAt,
        reference: { type: 'vital_sign', id: vital.id },
      });
    });
  }

  if (!typeFilter || typeFilter.includes(MEDICAL_RECORD_TYPES.NURSING_NOTE)) {
    nursingNotes.slice(0, 25).forEach((note) => {
      events.push({
        id: `nursing-${note.id}`,
        type: MEDICAL_RECORD_TYPES.NURSING_NOTE,
        title: `${note.noteType} nursing note`,
        summary: note.note,
        occurredAt: note.recordedAt,
        reference: { type: 'nursing_note', id: note.id },
      });
    });
  }

  events.sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0));

  return {
    patient: {
      id: patient.id,
      hospitalNumber: patient.hospitalNumber,
      fullName: patient.getFullName(),
      dateOfBirth: patient.dateOfBirth,
      bloodGroup: patient.bloodGroup,
      allergySummary: patient.allergySummary,
    },
    events: events.slice(0, limit),
    counts: events.reduce((acc, event) => ({ ...acc, [event.type]: (acc[event.type] || 0) + 1 }), {}),
  };
}

function describeVitals(vital) {
  const parts = [];
  if (vital.temperature) parts.push(`${vital.temperature}C`);
  if (vital.pulse) parts.push(`Pulse ${vital.pulse}`);
  if (vital.bloodPressureSystolic) parts.push(`BP ${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic || '?'}`);
  if (vital.spo2) parts.push(`SpO2 ${vital.spo2}%`);
  if (vital.respiratoryRate) parts.push(`RR ${vital.respiratoryRate}`);
  return parts.join(' | ') || null;
}

/** The patient's permanent clinical background. */
async function summary({ user, patientId }) {
  assertCanAccess(user, patientId);

  const [patient, allergies, conditions, history, activeDiagnoses, vitals] = await Promise.all([
    Patient.findByPk(patientId),
    Allergy.findAll({ where: { patientId }, order: [['severity', 'DESC']] }),
    MedicalCondition.findAll({ where: { patientId }, order: [['diagnosedAt', 'DESC']] }),
    MedicalHistory.findAll({ where: { patientId }, order: [['onsetDate', 'DESC']] }),
    Diagnosis.findAll({ where: { patientId, status: { [Op.in]: ['ACTIVE', 'CHRONIC'] } }, order: [['diagnosedAt', 'DESC']] }),
    VitalSign.findOne({ where: { patientId }, order: [['recordedAt', 'DESC']] }),
  ]);

  if (!patient) throw AppError.notFound('Patient not found');

  return {
    patient: patient.get({ plain: true }),
    allergies: allergies.map((a) => a.get({ plain: true })),
    conditions: conditions.map((c) => c.get({ plain: true })),
    history: history.map((h) => h.get({ plain: true })),
    activeDiagnoses: activeDiagnoses.map((d) => d.get({ plain: true })),
    latestVitals: vitals ? vitals.get({ plain: true }) : null,
  };
}

/**
 * Structured, printable export. Every export is written to the audit log -
 * removing a file from a hospital system is as sensitive as reading it.
 */
async function exportRecord({ user, patientId, req, format = 'json' }) {
  assertCanAccess(user, patientId);

  const [timelineData, clinicalSummary] = await Promise.all([
    timeline({ user, patientId, limit: 500 }),
    summary({ user, patientId }),
  ]);

  await auditService.record({
    user,
    action: 'MEDICAL_RECORD_EXPORTED',
    resource: 'medical_record',
    resourceId: String(patientId),
    patientId: patientId,
    req,
    metadata: { format, eventCount: timelineData.events.length },
  });

  return {
    generatedAt: new Date().toISOString(),
    generatedBy: { id: user.id, email: user.email, role: roleNameOf(user) },
    format,
    ...clinicalSummary,
    timeline: timelineData.events,
  };
}

module.exports = { append, list, timeline, summary, exportRecord, assertCanAccess, describeVitals };