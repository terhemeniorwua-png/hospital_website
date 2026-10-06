const { Op, fn, col } = require('sequelize');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { sequelize } = require('../config/database');
const { getPagination, getSort, buildPaginationMeta, withSortable } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { numbered } = require('../utils/codeGenerator');
const { round2 } = require('../utils/money');
const { addDays, toDateOnly } = require('../utils/dates');
const { isClinicalStaff, roleNameOf } = require('../utils/accessControl');
const { PRESCRIPTION_STATUS, INVENTORY_TRANSACTION_TYPES, MEDICAL_RECORD_TYPES } = require('../config/constants');
const { EVENTS } = require('../realtime/events');
const realtime = require('../realtime/socket');
const notificationService = require('./notification.service');
const medicalRecordService = require('./medicalRecord.service');
const { sameId } = require('../utils/ids');
const {
  Prescription,
  PrescriptionItem,
  Medication,
  MedicationAdministration,
  PharmacyInventory,
  InventoryTransaction,
  Supplier,
  Patient,
  Doctor,
  User,
  Consultation,
} = require('../models');

/**
 * Prescribing and dispensing.
 *
 *   Doctor creates -> Pharmacist verifies -> Dispensed (inventory deducted)
 *
 * Verification and dispensing are strict role boundaries: a pharmacist cannot
 * author a prescription and a doctor cannot dispense one.
 */

const SORTABLE = withSortable(['createdAt', 'updatedAt', 'dispensedAt', 'status', 'prescriptionNumber', 'totalPrice']);

function present(prescription) {
  if (!prescription) return null;
  const plain = prescription.get({ plain: true });
  return {
    ...plain,
    currency: env.CURRENCY,
    patientName: plain.patient ? `${plain.patient.firstName} ${plain.patient.lastName || ''}`.trim() : null,
    prescribedByName:
      plain.prescribedByDoctor && plain.prescribedByDoctor.user
        ? `Dr ${plain.prescribedByDoctor.user.firstName} ${plain.prescribedByDoctor.user.lastName}`
        : null,
  };
}

/** Only a prescriber (doctor) may author a prescription. */
async function resolveDoctor(user, doctorId) {
  if (doctorId) {
    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) throw AppError.notFound('Doctor not found');
    return doctor;
  }
  const profile = await Doctor.findOne({ where: { userId: user.id } });
  if (!profile) throw AppError.forbidden('Only doctors may prescribe medication');
  return profile;
}

async function nextPrescriptionNumber({ transaction }) {
  const last = await Prescription.findOne({ order: [['id', 'DESC']], attributes: ['prescriptionNumber'], transaction });
  let sequence = 1;
  if (last && typeof last.prescriptionNumber === 'string') {
    const parsed = Number.parseInt(last.prescriptionNumber.split('-').pop(), 10);
    if (Number.isFinite(parsed)) sequence = parsed + 1;
  }
  return numbered('RX', sequence);
}

async function list({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const order = getSort(query, SORTABLE, [['createdAt', 'DESC']]);
  const statuses = query.status ? String(query.status).split(',').map((s) => s.trim()) : null;

  const where = combineWhere(
    roleNameOf(user) === 'PATIENT' ? { patientId: user.patientId ?? -1 } : undefined,
    statuses ? { status: { [Op.in]: statuses } } : undefined,
    query.patientId ? { patientId: query.patientId } : undefined,
    query.doctorId ? { prescribedBy: query.doctorId } : undefined,
    query.consultationId ? { consultationId: query.consultationId } : undefined,
    query.unverified === true ? { verifiedAt: null } : undefined,
    searchWhere(query.search, [['prescriptionNumber', 'string'], ['notes', 'string']]),
  );

  const { rows, count } = await Prescription.findAndCountAll({
    where,
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] },
      { model: Doctor, as: 'prescribedByDoctor', attributes: ['id'], include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }] },
    ],
    order,
    limit,
    offset,
    distinct: true,
  });

  return {
    prescriptions: rows.map(present),
    pagination: buildPaginationMeta({ page, limit, total: count }),
  };
}

async function getById({ user, id }) {
  const prescription = await Prescription.findByPk(id, {
    include: [
      { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName', 'allergySummary'] },
      { model: Doctor, as: 'prescribedByDoctor', attributes: ['id'], include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }] },
      { model: Consultation, as: 'consultation', attributes: ['id', 'consultationNumber'] },
    ],
  });
  if (!prescription) throw AppError.notFound('Prescription not found');
  if (roleNameOf(user) === 'PATIENT' && !sameId(prescription.patientId, user.patientId)) {
    throw AppError.forbidden('You are not authorised to view this prescription');
  }

  const items = await PrescriptionItem.findAll({
    where: { prescriptionId: prescription.id },
    include: [{ model: Medication, as: 'medication', attributes: ['id', 'code', 'name', 'genericName', 'form', 'strength', 'unitOfMeasure'] }],
    order: [['id', 'ASC']],
  });

  return { ...present(prescription), items: items.map((item) => item.get({ plain: true })) };
}

async function create({ user, data }) {
  if (!isClinicalStaff(user)) throw AppError.forbidden('Only clinical staff may prescribe medication');

  const doctor = await resolveDoctor(user, data.doctorId);
  const patient = await Patient.findByPk(data.patientId);
  if (!patient) throw AppError.notFound('Patient not found');

  const medications = await Medication.findAll({
    where: { id: { [Op.in]: data.items.map((item) => item.medicationId) }, isActive: true },
  });
  if (medications.length !== data.items.length) {
    throw AppError.badRequest('One or more medications are unavailable');
  }
  const medicationMap = new Map(medications.map((m) => [m.id, m]));

  const prescription = await sequelize.transaction(async (transaction) => {
    const created = await Prescription.create(
      {
        prescriptionNumber: await nextPrescriptionNumber({ transaction }),
        patientId: patient.id,
        consultationId: data.consultationId ?? null,
        prescribedBy: doctor.id,
        prescribedByUser: user.id,
        status: PRESCRIPTION_STATUS.PENDING_VERIFICATION,
        notes: data.notes ?? null,
        totalPrice: round2(
          data.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(medicationMap.get(item.medicationId).unitPrice || 0), 0),
        ),
        isBilled: false,
      },
      { transaction },
    );

    await PrescriptionItem.bulkCreate(
      data.items.map((item) => {
        const medication = medicationMap.get(item.medicationId);
        const quantity = Number(item.quantity || 0);
        return {
          prescriptionId: created.id,
          medicationId: medication.id,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration ?? null,
          route: item.route ?? null,
          quantity,
          dispensedQuantity: 0,
          instructions: item.instructions ?? null,
          unitPrice: medication.unitPrice,
          totalPrice: round2(quantity * Number(medication.unitPrice || 0)),
          isDispensed: false,
        };
      }),
      { transaction },
    );

    return created;
  });

  await medicalRecordService.append({
    user,
    patientId: patient.id,
    recordType: MEDICAL_RECORD_TYPES.PRESCRIPTION,
    title: `Prescription ${prescription.prescriptionNumber}`,
    summary: `${data.items.length} medication(s) prescribed`,
    referenceType: 'prescription',
    referenceId: prescription.id,
    consultationId: data.consultationId ?? null,
    departmentId: doctor.departmentId,
    occurredAt: new Date(),
  });

  await notificationService.notify({
    role: 'PHARMACIST',
    type: 'PRESCRIPTION',
    title: `Prescription awaiting verification (${prescription.prescriptionNumber})`,
    message: `${data.items.length} medication(s) prescribed for ${patient.getFullName()}.`,
    data: { prescriptionId: prescription.id },
  });

  realtime.emitToHospital(EVENTS.PRESCRIPTION_CREATED, present(prescription));
  realtime.emitToPatient(patient.id, EVENTS.PRESCRIPTION_CREATED, present(prescription));

  return getById({ user, id: prescription.id });
}

async function update({ user, id, data }) {
  const prescription = await Prescription.findByPk(id);
  if (!prescription) throw AppError.notFound('Prescription not found');
  if (prescription.status === PRESCRIPTION_STATUS.DISPENSED) {
    throw AppError.conflict('A dispensed prescription cannot be modified');
  }

  const patch = {};
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.pharmacyNotes !== undefined) patch.pharmacyNotes = data.pharmacyNotes;
  if (data.status !== undefined) patch.status = data.status;
  await prescription.update(patch);

  return getById({ user, id: prescription.id });
}

/** Pharmacist sign-off. A pharmacist may not author prescriptions. */
async function verify({ user, id, pharmacyNotes }) {
  const prescription = await Prescription.findByPk(id);
  if (!prescription) throw AppError.notFound('Prescription not found');
  if (prescription.status !== PRESCRIPTION_STATUS.PENDING_VERIFICATION) {
    throw AppError.conflict(`Only pending prescriptions can be verified (current: ${prescription.status})`);
  }

  await prescription.update({
    status: PRESCRIPTION_STATUS.VERIFIED,
    verifiedBy: user.id,
    verifiedAt: new Date(),
    pharmacyNotes: pharmacyNotes ?? prescription.pharmacyNotes,
  });

  realtime.emitToHospital(EVENTS.PRESCRIPTION_VERIFIED, present(prescription));
  return getById({ user, id: prescription.id });
}

/**
 * Dispenses a verified prescription.
 *
 * Runs in a transaction: every item either reduces stock and records an
 * inventory transaction, or the whole prescription is rolled back. Expired
 * batches are rejected and stock is never allowed to go negative.
 */
async function dispense({ user, id, data }) {
  const prescription = await Prescription.findByPk(id);
  if (!prescription) throw AppError.notFound('Prescription not found');

  if (![PRESCRIPTION_STATUS.VERIFIED, PRESCRIPTION_STATUS.PARTIALLY_DISPENSED].includes(prescription.status)) {
    throw AppError.conflict('Only a verified prescription can be dispensed');
  }

  const items = await PrescriptionItem.findAll({
    where: { prescriptionId: prescription.id },
    include: [{ model: Medication, as: 'medication' }],
    order: [['id', 'ASC']],
  });
  if (!items.length) throw AppError.conflict('This prescription has no items to dispense');

  // The client may narrow what is handed over; everything not dispensed today
  // stays outstanding so the prescription remains PARTIALLY_DISPENSED.
  const requested = new Map(
    (data.items || items.map((item) => ({ itemId: item.id, quantity: item.quantity }))).map((entry) => [
      entry.itemId ?? entry.prescriptionItemId,
      Number(entry.quantity ?? 0),
    ]),
  );

  const dispensedAt = new Date();

  await sequelize.transaction(async (transaction) => {
    for (const item of items) {
      const quantityWanted = requested.get(item.id);
      if (!quantityWanted || quantityWanted <= 0) continue;

      const outstanding = Number(item.quantity) - Number(item.dispensedQuantity || 0);
      const quantity = Math.min(quantityWanted, outstanding);
      if (quantity <= 0) continue;

      // eslint-disable-next-line no-await-in-loop
      const inventory = await PharmacyInventory.findOne({
        where: { medicationId: item.medicationId, isActive: true },
        order: [['expiryDate', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!inventory) {
        throw AppError.conflict(`${item.medication?.name || 'Medication'} is not in stock`);
      }
      if (inventory.expiryDate && new Date(inventory.expiryDate) < dispensedAt) {
        throw AppError.conflict(
          `Batch ${inventory.batchNumber} of ${item.medication?.name || 'the medication'} expired on ${inventory.expiryDate}`,
        );
      }
      if (Number(inventory.quantity) < quantity) {
        throw AppError.conflict(
          `Insufficient stock for ${item.medication?.name || 'medication'}: requested ${quantity}, available ${inventory.quantity}`,
        );
      }

      // eslint-disable-next-line no-await-in-loop
      await inventory.update(
        { quantity: Number(inventory.quantity) - quantity, lastRestockedAt: inventory.lastRestockedAt },
        { transaction },
      );

      // eslint-disable-next-line no-await-in-loop
      await InventoryTransaction.create(
        {
          pharmacyInventoryId: inventory.id,
          medicationId: item.medicationId,
          transactionType: INVENTORY_TRANSACTION_TYPES.DISPENSE,
          quantity: -quantity,
          balanceAfter: Number(inventory.quantity),
          unitPrice: inventory.unitPrice,
          totalPrice: round2(quantity * Number(inventory.unitPrice || 0)),
          batchNumber: inventory.batchNumber,
          referenceType: 'prescription',
          referenceId: prescription.id,
          supplierId: inventory.supplierId,
          performedBy: user.id,
          notes: `Dispensed against ${prescription.prescriptionNumber}`,
          performedAt: dispensedAt,
        },
        { transaction },
      );

      const newDispensed = Number(item.dispensedQuantity || 0) + quantity;
      // eslint-disable-next-line no-await-in-loop
      await item.update(
        {
          dispensedQuantity: newDispensed,
          isDispensed: newDispensed >= Number(item.quantity),
        },
        { transaction },
      );
    }

    // eslint-disable-next-line no-await-in-loop
    const refreshed = await PrescriptionItem.findAll({ where: { prescriptionId: prescription.id }, transaction });
    const allDispensed = refreshed.every((item) => item.isDispensed);
    const anyDispensed = refreshed.some((item) => Number(item.dispensedQuantity || 0) > 0);

    // eslint-disable-next-line no-await-in-loop
    await prescription.update(
      {
        status: allDispensed
          ? PRESCRIPTION_STATUS.DISPENSED
          : anyDispensed
            ? PRESCRIPTION_STATUS.PARTIALLY_DISPENSED
            : PRESCRIPTION_STATUS.VERIFIED,
        dispensedBy: anyDispensed ? user.id : prescription.dispensedBy,
        dispensedAt: anyDispensed ? dispensedAt : prescription.dispensedAt,
        pharmacyNotes: data.pharmacyNotes ?? prescription.pharmacyNotes,
      },
      { transaction },
    );
  });

  const refreshed = await Prescription.findByPk(prescription.id, { include: [{ model: Patient, as: 'patient' }] });

  await medicalRecordService.append({
    user,
    patientId: prescription.patientId,
    recordType: MEDICAL_RECORD_TYPES.PRESCRIPTION,
    title: `Prescription ${prescription.prescriptionNumber} ${refreshed.status === 'DISPENSED' ? 'dispensed' : 'partially dispensed'}`,
    summary: 'Medications handed to the patient',
    referenceType: 'prescription',
    referenceId: prescription.id,
    occurredAt: dispensedAt,
  });

  await notificationService.notify({
    patientId: prescription.patientId,
    userIds: prescription.prescribedByUser ? [prescription.prescribedByUser] : [],
    type: 'PRESCRIPTION',
    title: `Prescription ${refreshed.status === 'DISPENSED' ? 'dispensed' : 'partially dispensed'}`,
    message: `Prescription ${prescription.prescriptionNumber} was dispensed at the pharmacy.`,
    data: { prescriptionId: prescription.id, status: refreshed.status },
    actionUrl: `/prescriptions/${prescription.id}`,
  });

  realtime.emitToHospital(EVENTS.PRESCRIPTION_DISPENSED, present(refreshed));
  realtime.emitToPatient(prescription.patientId, EVENTS.PRESCRIPTION_DISPENSED, present(refreshed));

  return getById({ user, id: prescription.id });
}

async function cancel({ user, id, reason }) {
  const prescription = await Prescription.findByPk(id);
  if (!prescription) throw AppError.notFound('Prescription not found');
  if ([PRESCRIPTION_STATUS.DISPENSED, PRESCRIPTION_STATUS.CANCELLED].includes(prescription.status)) {
    throw AppError.conflict(`A ${prescription.status.toLowerCase()} prescription cannot be cancelled`);
  }
  await prescription.update({
    status: PRESCRIPTION_STATUS.CANCELLED,
    cancelledAt: new Date(),
    cancelReason: reason || 'Cancelled',
  });
  return getById({ user, id: prescription.id });
}

/* ------------------------------------------------------------------ *
 * Inventory
 * ------------------------------------------------------------------ */

async function listMedications({ query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const where = combineWhere(
    query.isActive === undefined ? { isActive: true } : { isActive: query.isActive },
    searchWhere(query.search, [['name', 'string'], ['genericName', 'string'], ['code', 'string']]),
  );

  const { rows, count } = await Medication.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit,
    offset,
  });
  return { medications: rows.map((row) => row.get({ plain: true })), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

async function listInventory({ query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const today = toDateOnly();
  const expiryCutoff = toDateOnly(addDays(new Date(), env.EXPIRY_WARNING_DAYS));

  const where = combineWhere(
    query.isActive === undefined ? { isActive: true } : { isActive: query.isActive },
    query.medicationId ? { medicationId: query.medicationId } : undefined,
    query.batchNumber ? { batchNumber: { [Op.iLike]: `%${query.batchNumber}%` } } : undefined,
    query.expiring ? { expiryDate: { [Op.between]: [today, expiryCutoff] } } : undefined,
    query.expired ? { expiryDate: { [Op.lt]: today } } : undefined,
    query.lowStock ? { quantity: { [Op.lte]: col('reorderLevel') } } : undefined,
    searchWhere(query.search, [['medication.name', 'string'], ['batchNumber', 'string']]),
  );

  const { rows, count } = await PharmacyInventory.findAndCountAll({
    where,
    include: [
      { model: Medication, as: 'medication', attributes: ['id', 'code', 'name', 'genericName', 'unitOfMeasure', 'reorderLevel'] },
      { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
    ],
    order: [['expiryDate', 'ASC']],
    limit,
    offset,
    distinct: true,
  });

  const batches = rows.map((row) => decorate(row, today, expiryCutoff));
  return { inventory: batches, pagination: buildPaginationMeta({ page, limit, total: count }) };
}

function decorate(row, today, expiryCutoff) {
  const plain = row.get({ plain: true });
  const reorder = Number(plain.reorderLevel ?? plain.medication?.reorderLevel ?? 0);
  const quantity = Number(plain.quantity || 0);
  const expiry = plain.expiryDate ? new Date(`${plain.expiryDate}T00:00:00Z`) : null;

  let stockStatus = 'OK';
  if (plain.isActive === false) stockStatus = 'INACTIVE';
  else if (quantity <= 0) stockStatus = 'OUT_OF_STOCK';
  else if (quantity <= reorder) stockStatus = 'LOW';
  else if (expiry && expiry < new Date(`${today}T00:00:00Z`)) stockStatus = 'EXPIRED';
  else if (expiry && expiry <= new Date(`${expiryCutoff}T00:00:00Z`)) stockStatus = 'EXPIRING';

  return { ...plain, stockStatus };
}

async function restock({ user, data }) {
  const medication = await Medication.findByPk(data.medicationId);
  if (!medication) throw AppError.notFound('Medication not found');

  const quantity = Number(data.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) throw AppError.badRequest('quantity must be greater than zero');
  if (!data.batchNumber) throw AppError.badRequest('batchNumber is required');
  if (!data.expiryDate) throw AppError.badRequest('expiryDate is required');

  const [inventory] = await PharmacyInventory.findOrCreate({
    where: { medicationId: medication.id, batchNumber: data.batchNumber },
    defaults: {
      medicationId: medication.id,
      supplierId: data.supplierId ?? null,
      batchNumber: data.batchNumber,
      quantity: 0,
      expiryDate: data.expiryDate,
      unitPrice: data.unitPrice ?? medication.unitPrice,
      reorderLevel: data.reorderLevel ?? medication.reorderLevel,
      shelfLocation: data.shelfLocation ?? null,
      isActive: true,
      createdBy: user.id,
    },
  });

  await sequelize.transaction(async (transaction) => {
    // eslint-disable-next-line no-await-in-loop
    const locked = await PharmacyInventory.findByPk(inventory.id, { transaction, lock: transaction.LOCK.UPDATE });
    // eslint-disable-next-line no-await-in-loop
    await locked.update(
      {
        quantity: Number(locked.quantity) + quantity,
        unitPrice: data.unitPrice ?? locked.unitPrice,
        expiryDate: data.expiryDate ?? locked.expiryDate,
        supplierId: data.supplierId ?? locked.supplierId,
        reorderLevel: data.reorderLevel ?? locked.reorderLevel,
        shelfLocation: data.shelfLocation ?? locked.shelfLocation,
        isActive: true,
        lastRestockedAt: new Date(),
        updatedBy: user.id,
      },
      { transaction },
    );

    // eslint-disable-next-line no-await-in-loop
    await InventoryTransaction.create(
      {
        pharmacyInventoryId: locked.id,
        medicationId: medication.id,
        transactionType: INVENTORY_TRANSACTION_TYPES.PURCHASE,
        quantity,
        balanceAfter: Number(locked.quantity) + quantity,
        unitPrice: data.unitPrice ?? locked.unitPrice,
        totalPrice: round2(quantity * Number(data.unitPrice ?? locked.unitPrice ?? 0)),
        batchNumber: locked.batchNumber,
        referenceType: 'purchase',
        supplierId: data.supplierId ?? null,
        performedBy: user.id,
        notes: data.notes ?? null,
        performedAt: new Date(),
      },
      { transaction },
    );
  });

  const fresh = await PharmacyInventory.findByPk(inventory.id, {
    include: [{ model: Medication, as: 'medication', attributes: ['id', 'name'] }],
  });
  return fresh.get({ plain: true });
}

async function adjust({ user, id, data }) {
  const inventory = await PharmacyInventory.findByPk(id);
  if (!inventory) throw AppError.notFound('Inventory batch not found');

  const delta = Number(data.delta ?? data.quantity);
  if (!Number.isFinite(delta) || delta === 0) throw AppError.badRequest('A non-zero adjustment is required');

  await sequelize.transaction(async (transaction) => {
    // eslint-disable-next-line no-await-in-loop
    const locked = await PharmacyInventory.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    const next = Number(locked.quantity) + delta;
    if (next < 0) throw AppError.conflict(`Adjustment would take stock below zero (current ${locked.quantity})`);

    // eslint-disable-next-line no-await-in-loop
    await locked.update({ quantity: next, updatedBy: user.id }, { transaction });
    // eslint-disable-next-line no-await-in-loop
    await InventoryTransaction.create(
      {
        pharmacyInventoryId: locked.id,
        medicationId: locked.medicationId,
        transactionType: INVENTORY_TRANSACTION_TYPES.ADJUSTMENT,
        quantity: delta,
        balanceAfter: next,
        unitPrice: locked.unitPrice,
        batchNumber: locked.batchNumber,
        referenceType: 'adjustment',
        supplierId: locked.supplierId,
        performedBy: user.id,
        notes: data.notes ?? null,
        performedAt: new Date(),
      },
      { transaction },
    );
  });

  const fresh = await PharmacyInventory.findByPk(id);
  return fresh.get({ plain: true });
}

async function listTransactions({ query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    query.medicationId ? { medicationId: query.medicationId } : undefined,
    query.transactionType ? { transactionType: query.transactionType } : undefined,
    query.referenceType ? { referenceType: query.referenceType } : undefined,
    query.from ? { performedAt: { [Op.gte]: new Date(query.from) } } : undefined,
    query.to ? { performedAt: { [Op.lte]: new Date(query.to) } } : undefined,
  );

  const { rows, count } = await InventoryTransaction.findAndCountAll({
    where,
    include: [
      { model: Medication, as: 'medication', attributes: ['id', 'name', 'code'] },
      { model: User, as: 'performedByUser', attributes: ['id', 'firstName', 'lastName'] },
    ],
    order: [['performedAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return {
    transactions: rows.map((row) => row.get({ plain: true })),
    pagination: buildPaginationMeta({ page, limit, total: count }),
  };
}

/** Low stock, expired and expiring batches - the pharmacist's dashboard. */
async function inventoryAlerts() {
  const today = toDateOnly();
  const cutoff = toDateOnly(addDays(new Date(), env.EXPIRY_WARNING_DAYS));

  // Alerts are derived from one joined read: the reorder level and the expiry
  // date are per-batch values, and both `medications` and `pharmacy_inventory`
  // expose a `reorder_level` column, so the comparisons are done in JS where
  // each row keeps its own inventory value.
  const stockRows = await PharmacyInventory.findAll({
    where: { isActive: true, quantity: { [Op.gt]: 0 } },
    include: [{ model: Medication, as: 'medication', attributes: ['id', 'name', 'code'] }],
    order: [['expiryDate', 'ASC'], ['quantity', 'ASC']],
  });

  const lowStock = [];
  const expired = [];
  const expiring = [];

  stockRows.forEach((row) => {
    const plain = row.get({ plain: true });
    const reorder = Number(plain.reorderLevel ?? plain.medication?.reorderLevel ?? 0);
    const quantity = Number(plain.quantity || 0);
    if (quantity <= reorder) lowStock.push(row);

    if (plain.expiryDate) {
      const expiry = new Date(`${plain.expiryDate}T00:00:00Z`);
      if (expiry < new Date(`${today}T00:00:00Z`)) expired.push(row);
      else if (expiry <= new Date(`${cutoff}T23:59:59Z`)) expiring.push(row);
    }
  });

  return {
    lowStock: lowStock.map((row) => decorate(row, today, cutoff)),
    expired: expired.map((row) => decorate(row, today, cutoff)),
    expiring: expiring.map((row) => decorate(row, today, cutoff)),
    counts: { lowStock: lowStock.length, expired: expired.length, expiring: expiring.length },
    expiryWarningDays: env.EXPIRY_WARNING_DAYS,
  };
}

async function statistics({ query = {} }) {
  const since = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [pending, verified, dispensed, value] = await Promise.all([
    Prescription.count({ where: { status: 'PENDING_VERIFICATION' } }),
    Prescription.count({ where: { status: 'VERIFIED' } }),
    Prescription.count({ where: { status: { [Op.in]: ['DISPENSED', 'PARTIALLY_DISPENSED'] }, dispensedAt: { [Op.gte]: since } } }),
    InventoryTransaction.sum('totalPrice', {
      where: { transactionType: INVENTORY_TRANSACTION_TYPES.DISPENSE, performedAt: { [Op.gte]: since } },
    }),
  ]);

  return {
    pendingVerification: pending,
    readyToDispense: verified,
    dispensed,
    dispensedValue: Number(value || 0),
    currency: env.CURRENCY,
    alerts: await inventoryAlerts(),
  };
}

module.exports = {
  list,
  getById,
  create,
  update,
  verify,
  dispense,
  cancel,
  listMedications,
  listInventory,
  restock,
  adjust,
  listTransactions,
  inventoryAlerts,
  statistics,
  present,
  decorate,
  SORTABLE,
  nextPrescriptionNumber,
};