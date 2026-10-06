const { Op } = require('sequelize');
const AppError = require('../utils/AppError');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { isClinicalStaff, roleNameOf } = require('../utils/accessControl');
const { MEDICAL_RECORD_TYPES } = require('../config/constants');
const { EVENTS } = require('../realtime/events');
const realtime = require('../realtime/socket');
const notificationService = require('./notification.service');
const medicalRecordService = require('./medicalRecord.service');
const consultationService = require('./consultation.service');
const { sameId } = require('../utils/ids');
const {
  NursingNote,
  MedicationAdministration,
  PrescriptionItem,
  Prescription,
  Medication,
  VitalSign,
  Patient,
  Admission,
  Ward,
  Bed,
  Doctor,
  LaboratoryOrder,
  ImagingOrder,
  User,
} = require('../models');

/**
 * Nursing workflow: assigned patients, observations, notes and medication
 * administration (MAR - medication administration record).
 */

function scopeFor(user) {
  if (roleNameOf(user) === 'PATIENT') return { patientId: user.patientId ?? -1 };
  return undefined;
}

/** Every inpatient the nurse is responsible for, with today's observations. */
async function assignedPatients({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    { status: { [Op.in]: ['ADMITTED', 'TRANSFERRED'] } },
    query.wardId ? { wardId: query.wardId } : undefined,
    query.bedId ? { bedId: query.bedId } : undefined,
    searchWhere(query.search, [['patient.firstName', 'string'], ['patient.lastName', 'string']]),
  );

  const { rows, count } = await Admission.findAndCountAll({
    where,
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName', 'bloodGroup', 'allergySummary'] },
      { model: Ward, as: 'ward', attributes: ['id', 'name', 'code'] },
      { model: Bed, as: 'bed', attributes: ['id', 'bedNumber'] },
      { model: Doctor, as: 'attendingDoctor', attributes: ['id'], include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }] },
    ],
    order: [['admittedAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  const patients = await Promise.all(
    rows.map(async (admission) => {
      const plain = admission.get({ plain: true });
      const [lastVitals, pendingMeds] = await Promise.all([
        VitalSign.findOne({ where: { admissionId: admission.id }, order: [['recordedAt', 'DESC']] }),
        MedicationAdministration.count({
          where: { admissionId: admission.id, status: { [Op.in]: ['SCHEDULED', 'HELD'] } },
        }),
      ]);

      return {
        admissionId: admission.id,
        admissionNumber: plain.admissionNumber,
        patient: plain.patient,
        patientName: plain.patient ? `${plain.patient.firstName} ${plain.patient.lastName || ''}`.trim() : null,
        ward: plain.ward,
        bedNumber: plain.bed?.bedNumber || null,
        doctorName:
          plain.attendingDoctor?.user ? `Dr ${plain.attendingDoctor.user.firstName} ${plain.attendingDoctor.user.lastName}` : null,
        conditionOnAdmission: plain.conditionOnAdmission,
        admittedAt: plain.admittedAt,
        lastVitalsAt: lastVitals?.recordedAt || null,
        lastVitals: lastVitals ? lastVitals.get({ plain: true }) : null,
        pendingMedications: pendingMeds,
      };
    }),
  );

  return { patients, pagination: buildPaginationMeta({ page, limit, total: count }) };
}

/* ------------------------------------------------------------------ *
 * Nursing notes
 * ------------------------------------------------------------------ */

async function listNotes({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    scopeFor(user),
    query.patientId ? { patientId: query.patientId } : undefined,
    query.admissionId ? { admissionId: query.admissionId } : undefined,
    query.wardId ? { wardId: query.wardId } : undefined,
    query.shift ? { shift: query.shift } : undefined,
    query.critical === true ? { isCritical: true } : undefined,
    query.date ? { recordedAt: { [Op.gte]: new Date(`${query.date}T00:00:00Z`) } } : undefined,
  );

  const { rows, count } = await NursingNote.findAndCountAll({
    where,
    include: [
      { model: User, as: 'nurse', attributes: ['id', 'firstName', 'lastName'] },
      { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] },
    ],
    order: [['recordedAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return { notes: rows.map((row) => row.get({ plain: true })), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

async function createNote({ user, data }) {
  if (!isClinicalStaff(user)) throw AppError.forbidden('Only clinical staff may write nursing notes');

  const admission = data.admissionId ? await Admission.findByPk(data.admissionId) : null;
  if (data.admissionId && !admission) throw AppError.notFound('Admission not found');

  const patientId = admission?.patientId ?? data.patientId;
  if (!patientId) throw AppError.badRequest('patientId or admissionId is required');

  const note = await NursingNote.create({
    patientId,
    admissionId: admission?.id ?? null,
    nurseId: user.id,
    wardId: admission?.wardId ?? data.wardId ?? null,
    noteType: data.noteType || 'PROGRESS',
    note: data.note,
    isCritical: Boolean(data.isCritical),
    shift: data.shift || null,
    recordedAt: data.recordedAt || new Date(),
  });

  if (note.isCritical) {
    await medicalRecordService.append({
      user,
      patientId,
      recordType: MEDICAL_RECORD_TYPES.NURSING_NOTE,
      title: `Critical nursing note (${note.noteType})`,
      summary: note.note,
      referenceType: 'nursing_note',
      referenceId: note.id,
      admissionId: note.admissionId,
      occurredAt: note.recordedAt,
    });

    await notificationService.notify({
      role: 'DOCTOR',
      type: 'ADMISSION',
      title: 'Critical nursing note',
      message: `A critical note was recorded for admission ${admission?.admissionNumber || patientId}.`,
      data: { noteId: note.id, admissionId: note.admissionId },
      priority: 'URGENT',
    });
  }

  return note.get({ plain: true });
}

/* ------------------------------------------------------------------ *
 * Medication administration record
 * ------------------------------------------------------------------ */

async function listAdministrations({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    scopeFor(user),
    query.patientId ? { patientId: query.patientId } : undefined,
    query.admissionId ? { admissionId: query.admissionId } : undefined,
    query.status ? { status: query.status } : undefined,
    query.date ? { scheduledAt: { [Op.gte]: new Date(`${query.date}T00:00:00Z`) } } : undefined,
  );

  const { rows, count } = await MedicationAdministration.findAndCountAll({
    where,
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] },
      { model: User, as: 'nurse', attributes: ['id', 'firstName', 'lastName'] },
      { model: Medication, as: 'medication', attributes: ['id', 'name', 'code', 'unitOfMeasure'] },
    ],
    order: [['scheduledAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return {
    administrations: rows.map((row) => row.get({ plain: true })),
    pagination: buildPaginationMeta({ page, limit, total: count }),
  };
}

/** Builds the MAR schedule from a prescription for an inpatient. */
async function createSchedule({ user, data }) {
  if (!isClinicalStaff(user)) throw AppError.forbidden('Only clinical staff may schedule medication');

  const prescription = await Prescription.findByPk(data.prescriptionId, {
    include: [{ model: PrescriptionItem, as: 'items', include: [{ model: Medication, as: 'medication' }] }],
  });
  if (!prescription) throw AppError.notFound('Prescription not found');

  const admission = await Admission.findByPk(data.admissionId);
  if (!admission) throw AppError.notFound('Admission not found');
  if (!sameId(admission.patientId, prescription.patientId)) {
    throw AppError.badRequest('That prescription is for a different patient');
  }

  const startAt = data.startAt ? new Date(data.startAt) : new Date();
  const days = Math.min(Math.max(Number(data.days || 1), 1), 30);

  const rows = [];
  for (let day = 0; day < days; day += 1) {
    (prescription.items || []).forEach((item) => {
      const dosesPerDay = dosesFor(item.frequency);
      const total = Number(item.quantity || 0);
      const perDose = dosesPerDay > 0 ? Math.max(1, Math.round(total / (dosesPerDay * days))) : 1;

      for (let dose = 0; dose < dosesPerDay; dose += 1) {
        const scheduledAt = new Date(startAt.getTime());
        scheduledAt.setDate(scheduledAt.getDate() + day);
        scheduledAt.setHours(8 + dose * 6, 0, 0, 0);

        rows.push({
          patientId: prescription.patientId,
          admissionId: admission.id,
          prescriptionItemId: item.id,
          medicationId: item.medicationId,
          medicationName: item.medication?.name || 'Medication',
          dose: item.dosage,
          route: item.route,
          frequency: item.frequency,
          scheduledAt,
          status: 'SCHEDULED',
          notes: item.instructions,
        });
      }
    });
  }

  const created = await MedicationAdministration.bulkCreate(rows);
  return { scheduled: created.length, administrations: created.map((row) => row.get({ plain: true })) };
}

/** Frequency strings -> doses per day. */
function dosesFor(frequency) {
  const value = String(frequency || '').toLowerCase();
  if (value.includes('od') || value.includes('once')) return 1;
  if (value.includes('bd') || value.includes('twice') || value.includes('2x')) return 2;
  if (value.includes('tds') || value.includes('three') || value.includes('3x')) return 3;
  if (value.includes('qds') || value.includes('four') || value.includes('4x')) return 4;
  if (value.includes('q4h') || value.includes('hourly')) return 6;
  if (value.includes('q6h')) return 4;
  if (value.includes('q8h')) return 3;
  if (value.includes('q12h')) return 2;
  if (value.includes('qod') || value.includes('alternate')) return 1;
  if (value.includes('prn') || value.includes('when')) return 3;
  return 1;
}

/** Records that a dose was given (or refused/held). */
async function recordAdministration({ user, id, data }) {
  const record = await MedicationAdministration.findByPk(id);
  if (!record) throw AppError.notFound('Administration record not found');

  if (!isClinicalStaff(user)) throw AppError.forbidden('Only clinical staff may record medication administration');
  if (roleNameOf(user) === 'PATIENT') throw AppError.forbidden('Patients cannot self-record administration');

  const patch = {
    status: data.status || 'ADMINISTERED',
    administeredAt: data.status === 'ADMINISTERED' ? new Date() : record.administeredAt,
    nurseId: user.id,
    notes: data.notes ?? record.notes,
  };

  await record.update(patch);

  if (record.prescriptionItemId) {
    if (patch.status === 'ADMINISTERED') {
      // eslint-disable-next-line no-await-in-loop
      const item = await PrescriptionItem.findByPk(record.prescriptionItemId);
      if (item) {
        // eslint-disable-next-line no-await-in-loop
        await item.update({ dispensedQuantity: Math.min(Number(item.quantity || 0), Number(item.dispensedQuantity || 0) + 1) });
      }
    }
  }

  return record.get({ plain: true });
}

/** Observations recorded by nurses outside a consultation. */
async function recordVitals({ user, data }) {
  const admission = data.admissionId ? await Admission.findByPk(data.admissionId) : null;
  if (data.admissionId && !admission) throw AppError.notFound('Admission not found');

  const patientId = admission?.patientId ?? data.patientId;
  if (!patientId) throw AppError.badRequest('patientId or admissionId is required');
  if (!isClinicalStaff(user)) throw AppError.forbidden('Only clinical staff may record observations');

  const vitals = await VitalSign.create({
    patientId,
    admissionId: admission?.id ?? null,
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

  realtime.emitToPatient(patientId, EVENTS.VITAL_SIGNS_RECORDED, {
    patientId,
    admissionId: admission?.id ?? null,
    recordedAt: vitals.recordedAt,
  });

  return vitals.get({ plain: true });
}

async function listVitals({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    scopeFor(user),
    query.patientId ? { patientId: query.patientId } : undefined,
    query.admissionId ? { admissionId: query.admissionId } : undefined,
    query.date ? { recordedAt: { [Op.gte]: new Date(`${query.date}T00:00:00Z`) } } : undefined,
  );

  const { rows, count } = await VitalSign.findAndCountAll({
    where,
    order: [['recordedAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return { observations: rows.map((row) => row.get({ plain: true })), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

/** The doctor's active orders for a patient, shown to the nurse. */
async function doctorOrders({ user, query = {} }) {
  const patientId = roleNameOf(user) === 'PATIENT' ? user.patientId : query.patientId;
  if (!patientId) throw AppError.badRequest('patientId is required');

  const [prescriptions, labOrders, imagingOrders, careTasks] = await Promise.all([
    Prescription.findAll({
      where: { patientId, status: { [Op.in]: ['VERIFIED', 'PARTIALLY_DISPENSED', 'DISPENSED', 'PENDING_VERIFICATION'] } },
      include: [{ model: PrescriptionItem, as: 'items' }],
      order: [['createdAt', 'DESC']],
      limit: 20,
    }),
    LaboratoryOrder.findAll({
      where: { patientId, status: { [Op.in]: ['ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING'] } },
      order: [['orderedAt', 'DESC']],
      limit: 20,
    }),
    ImagingOrder.findAll({
      where: { patientId, status: { [Op.notIn]: ['COMPLETED', 'CANCELLED'] } },
      order: [['orderedAt', 'DESC']],
      limit: 20,
    }),
    NursingNote.count({ where: { patientId, isCritical: true } }),
  ]);

  return {
    prescriptions: prescriptions.map((p) => ({
      id: p.id,
      prescriptionNumber: p.prescriptionNumber,
      status: p.status,
      items: (p.items || []).map((item) => item.get({ plain: true })),
    })),
    laboratoryOrders: labOrders.map((o) => o.get({ plain: true })),
    imagingOrders: imagingOrders.map((o) => o.get({ plain: true })),
    criticalNotes: careTasks,
  };
}

/** Nurse dashboard counters. */
async function statistics({ user, query = {} }) {
  const day = query.date || new Date().toISOString().slice(0, 10);

  const [inpatients, observationsToday, administrationsDue, criticalNotes, notesToday] = await Promise.all([
    Admission.count({ where: { status: { [Op.in]: ['ADMITTED', 'TRANSFERRED'] } } }),
    VitalSign.count({ where: { recordedAt: { [Op.gte]: new Date(`${day}T00:00:00Z`) } } }),
    MedicationAdministration.count({ where: { status: 'SCHEDULED', scheduledAt: { [Op.lte]: new Date() } } }),
    NursingNote.count({ where: { isCritical: true, recordedAt: { [Op.gte]: new Date(`${day}T00:00:00Z`) } } }),
    NursingNote.count({ where: { recordedAt: { [Op.gte]: new Date(`${day}T00:00:00Z`) } } }),
  ]);

  return { date: day, inpatients, observationsToday, administrationsDue, criticalNotes, notesToday };
}

module.exports = {
  assignedPatients,
  listNotes,
  createNote,
  listAdministrations,
  createSchedule,
  recordAdministration,
  recordVitals,
  listVitals,
  doctorOrders,
  statistics,
  dosesFor,
};