const { Op, fn, col } = require('sequelize');
const AppError = require('../utils/AppError');
const { sequelize } = require('../config/database');
const { getPagination, buildPaginationMeta, getSort } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { numbered } = require('../utils/codeGenerator');
const { round2, toNumber, calculateInvoiceTotals, deriveInvoiceStatus } = require('../utils/money');
const { daysBetween, toDateOnly, addDays } = require('../utils/dates');
const { roleNameOf } = require('../utils/accessControl');
const { INVOICE_STATUS, PAYMENT_STATUS, BILLING_ITEM_TYPES, AUDIT_ACTIONS } = require('../config/constants');
const { EVENTS } = require('../realtime/events');
const realtime = require('../realtime/socket');
const notificationService = require('./notification.service');
const auditService = require('./audit.service');
const { sameId } = require('../utils/ids');
const {
  Invoice,
  InvoiceItem,
  Payment,
  Patient,
  Admission,
  Appointment,
  Consultation,
  LaboratoryOrder,
  ImagingOrder,
  Prescription,
  InsuranceClaim,
  InsurancePolicy,
  User,
} = require('../models');

/**
 * Billing: invoices, invoice lines, payments and refunds.
 *
 * Totals are always recalculated on the server (`utils/money`) - the client can
 * only propose lines and discounts. Unbilled clinical activity (consultations,
 * lab orders, imaging, dispensed prescriptions and bed days) is collected into
 * invoice lines through `collectUnbilledItems()`.
 */

const INVOICE_INCLUDES = [
  { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] },
  { model: Admission, as: 'admission', attributes: ['id', 'admissionNumber'] },
  { model: Appointment, as: 'appointment', attributes: ['id', 'appointmentNumber'] },
  { model: InvoiceItem, as: 'items' },
  { model: Payment, as: 'payments', order: [['paidAt', 'DESC']] },
];

/**
 * Money columns are stored snake_case (`total_amount`), and raw SQL aggregates
 * need the physical name, not the JS attribute name.
 */
const fieldOf = (attribute) => Invoice.rawAttributes[attribute]?.field || attribute;

function present(invoice) {
  if (!invoice) return null;
  const plain = invoice.get({ plain: true });
  return {
    ...plain,
    patientName: plain.patient ? `${plain.patient.firstName} ${plain.patient.lastName || ''}`.trim() : null,
    createdByName: plain.createdByUser ? `${plain.createdByUser.firstName} ${plain.createdByUser.lastName}` : null,
    itemCount: (plain.items || []).length,
    isOverdue:
      plain.status !== INVOICE_STATUS.PAID &&
      plain.status !== INVOICE_STATUS.CANCELLED &&
      plain.dueDate &&
      new Date(plain.dueDate) < new Date(),
  };
}

async function nextInvoiceNumber({ transaction }) {
  const last = await Invoice.findOne({ order: [['createdAt', 'DESC'], ['invoiceNumber', 'DESC']], attributes: ['invoiceNumber'], transaction });
  let sequence = 1;
  if (last && typeof last.invoiceNumber === 'string') {
    const parsed = Number.parseInt(last.invoiceNumber.split('-').pop(), 10);
    if (Number.isFinite(parsed)) sequence = parsed + 1;
  }
  return numbered('INV', sequence);
}

/* ------------------------------------------------------------------ *
 * Listing / reading
 * ------------------------------------------------------------------ */

async function list({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const order = getSort(query, ['issuedAt', 'dueDate', 'totalAmount', 'createdAt', 'status'], [['issuedAt', 'DESC']]);
  const statuses = query.status ? String(query.status).split(',').map((s) => s.trim()) : null;

  const where = combineWhere(
    roleNameOf(user) === 'PATIENT' ? { patientId: user.patientId ?? -1 } : undefined,
    statuses ? { status: { [Op.in]: statuses } } : undefined,
    query.patientId ? { patientId: query.patientId } : undefined,
    query.admissionId ? { admissionId: query.admissionId } : undefined,
    query.unpaid === true ? { balance: { [Op.gt]: 0 } } : undefined,
    query.overdue === true
      ? { dueDate: { [Op.lt]: new Date() }, balance: { [Op.gt]: 0 } }
      : undefined,
    query.from ? { issuedAt: { [Op.gte]: new Date(query.from) } } : undefined,
    query.to ? { issuedAt: { [Op.lte]: new Date(query.to) } } : undefined,
    searchWhere(query.search, [['invoiceNumber', 'string']]),
  );

  const { rows, count } = await Invoice.findAndCountAll({
    where,
    include: INVOICE_INCLUDES,
    order,
    limit,
    offset,
    distinct: true,
  });

  return { invoices: rows.map(present), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

async function getById({ user, id }) {
  const invoice = await Invoice.findByPk(id, {
    include: [
      ...INVOICE_INCLUDES,
      { model: User, as: 'createdByUser', attributes: ['id', 'firstName', 'lastName'] },
      { model: InsuranceClaim, as: 'claims', include: [{ model: InsurancePolicy, as: 'policy', attributes: ['policyNumber', 'planName'] }] },
    ],
  });
  if (!invoice) throw AppError.notFound('Invoice not found');
  if (roleNameOf(user) === 'PATIENT' && !sameId(invoice.patientId, user.patientId)) {
    throw AppError.forbidden('You are not authorised to view this invoice');
  }

  await auditService.record({
    user,
    action: AUDIT_ACTIONS.PATIENT_VIEWED,
    resource: 'invoice',
    resourceId: invoice.id,
    patientId: invoice.patientId,
    metadata: { invoiceNumber: invoice.invoiceNumber },
  });

  return present(invoice);
}

/* ------------------------------------------------------------------ *
 * Collecting billable activity
 * ------------------------------------------------------------------ */

/**
 * Gathers the unbilled clinical activity for a patient so it can be turned into
 * invoice lines in one go.
 */
async function collectUnbilledItems({ patientId, admissionId, since }) {
  const admissionScope = admissionId ? { admissionId } : {};
  const patientScope = { patientId, ...admissionScope };

  const [consultations, labOrders, imagingOrders, prescriptions, admission] = await Promise.all([
    // A consultation is billable once it is COMPLETED. It carries no price of
    // its own, so the fee comes from the appointment that triggered it.
    Consultation.findAll({
      where: { ...patientScope, status: 'COMPLETED' },
      include: [{ model: Appointment, as: 'appointment', attributes: ['id', 'appointmentNumber', 'fee'] }],
      order: [['completedAt', 'ASC']],
    }),
    LaboratoryOrder.findAll({
      where: { ...patientScope, status: { [Op.in]: ['COMPLETED'] }, isBilled: false },
      order: [['orderedAt', 'ASC']],
    }),
    ImagingOrder.findAll({
      where: { ...patientScope, status: { [Op.in]: ['COMPLETED'] }, isBilled: false },
      order: [['orderedAt', 'ASC']],
    }),
    Prescription.findAll({
      where: { ...patientScope, status: { [Op.in]: ['DISPENSED', 'PARTIALLY_DISPENSED'] }, isBilled: false },
      order: [['createdAt', 'ASC']],
    }),
    admissionId ? Admission.findByPk(admissionId) : Admission.findOne({
      where: { patientId, status: { [Op.in]: ['ADMITTED', 'TRANSFERRED'] } },
    }),
  ]);

  const items = [];

  const alreadyInvoiced = new Set(
    (await InvoiceItem.findAll({
      attributes: ['referenceType', 'referenceId'],
      where: { referenceType: 'consultation', referenceId: { [Op.in]: consultations.map((c) => c.id) } },
      raw: true,
    })).map((row) => row.referenceId),
  );

  consultations.forEach((consultation) => {
    const plain = consultation.get({ plain: true });
    if (alreadyInvoiced.has(consultation.id)) return;

    const fee = round2(plain.appointment?.fee || 0);
    if (fee <= 0) return;

    items.push({
      itemType: BILLING_ITEM_TYPES.CONSULTATION,
      description: `Consultation ${consultation.consultationNumber}`,
      referenceType: 'consultation',
      referenceId: consultation.id,
      quantity: 1,
      unitPrice: fee,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      subtotal: fee,
      total: fee,
      isBilled: true,
      metadata: {
        consultationNumber: consultation.consultationNumber,
        appointmentNumber: plain.appointment?.appointmentNumber ?? null,
        completedAt: consultation.completedAt,
      },
    });
  });

  labOrders.forEach((order) => {
    const total = round2(order.totalPrice || 0);
    items.push({
      itemType: BILLING_ITEM_TYPES.LABORATORY,
      description: `Laboratory ${order.orderNumber}`,
      referenceType: 'laboratory_order',
      referenceId: order.id,
      quantity: 1,
      unitPrice: total,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      subtotal: total,
      total: total,
      isBilled: true,
      metadata: { orderNumber: order.orderNumber },
    });
  });

  imagingOrders.forEach((order) => {
    const total = round2(order.price || 0);
    items.push({
      itemType: BILLING_ITEM_TYPES.IMAGING,
      description: `Imaging ${order.imagingType}${order.bodyPart ? ` (${order.bodyPart})` : ''} - ${order.orderNumber}`,
      referenceType: 'imaging_order',
      referenceId: order.id,
      quantity: 1,
      unitPrice: total,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      subtotal: total,
      total: total,
      isBilled: true,
      metadata: { orderNumber: order.orderNumber, imagingType: order.imagingType },
    });
  });

  prescriptions.forEach((prescription) => {
    const total = round2(prescription.totalPrice || 0);
    items.push({
      itemType: BILLING_ITEM_TYPES.MEDICATION,
      description: `Pharmacy ${prescription.prescriptionNumber}`,
      referenceType: 'prescription',
      referenceId: prescription.id,
      quantity: 1,
      unitPrice: total,
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      subtotal: total,
      total: total,
      isBilled: true,
      metadata: { prescriptionNumber: prescription.prescriptionNumber, status: prescription.status },
    });
  });

  if (admission && (admission.dailyRate || 0) > 0) {
    const from = since ? new Date(since) : new Date(admission.admittedAt);
    const to = new Date();
    const days = Math.max(1, daysBetween(from, to) || 1);
    items.push({
      itemType: BILLING_ITEM_TYPES.ADMISSION,
      description: `Bed charges - ${admission.admissionNumber} (${days} day(s) in ${admission.wardName || 'ward'})`,
      referenceType: 'admission',
      referenceId: admission.id,
      quantity: days,
      unitPrice: round2(admission.dailyRate),
      discountAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      subtotal: round2(days * Number(admission.dailyRate)),
      total: round2(days * Number(admission.dailyRate)),
      isBilled: true,
      metadata: { admissionNumber: admission.admissionNumber, from, to, days },
    });
  }

  return items;
}

/**
 * Marks the clinical record behind an invoice line as billed. Consultations have
 * no `isBilled` column (they are de-duplicated through invoice lines instead),
 * so they are skipped here.
 */
async function markReferencesBilled({ referenceType, referenceId, transaction }) {
  if (!referenceId) return;
  const target = { laboratory_order: LaboratoryOrder, imaging_order: ImagingOrder, prescription: Prescription }[referenceType];
  if (!target) return;
  // eslint-disable-next-line no-await-in-loop
  await target.update({ isBilled: true }, { where: { id: referenceId }, transaction });
}

/* ------------------------------------------------------------------ *
 * Creating / editing invoices
 * ------------------------------------------------------------------ */

function normaliseItems(rawItems = []) {
  return rawItems.map((item) => {
    const quantity = Math.max(toNumber(item.quantity, 1), 0);
    const unitPrice = round2(item.unitPrice);
    const discountAmount = round2(Math.min(toNumber(item.discountAmount), quantity * unitPrice));
    const taxRate = toNumber(item.taxRate);
    const subtotal = round2(quantity * unitPrice - discountAmount);
    const taxAmount = round2((subtotal * taxRate) / 100);

    return {
      itemType: item.itemType || BILLING_ITEM_TYPES.OTHER,
      description: item.description,
      referenceType: item.referenceType ?? null,
      referenceId: item.referenceId ?? null,
      quantity,
      unitPrice,
      discountAmount,
      taxRate,
      taxAmount,
      subtotal,
      total: round2(subtotal + taxAmount),
      isBilled: Boolean(item.referenceId),
      metadata: item.metadata ?? null,
    };
  });
}

/**
 * Creates an invoice from explicit lines and/or auto-collected activity.
 * Runs in a transaction so lines and clinical "billed" flags stay in sync.
 */
async function create({ user, data }) {
  const patient = await Patient.findByPk(data.patientId);
  if (!patient) throw AppError.notFound('Patient not found');

  const manualItems = data.items ? normaliseItems(data.items) : [];
  let collected = [];

  if (data.autoCollect !== false) {
    collected = await collectUnbilledItems({
      patientId: patient.id,
      admissionId: data.admissionId,
      since: data.bedChargesFrom,
    });
  }

  // Never bill the same clinical record twice.
  const alreadyBilled = new Set(collected.map((item) => `${item.referenceType}:${item.referenceId}`));
  const items = [
    ...collected,
    ...manualItems.filter((item) => !item.referenceId || !alreadyBilled.has(`${item.referenceType}:${item.referenceId}`)),
  ];

  if (!items.length) throw AppError.badRequest('No billable items were found for this patient');

  const insuranceAmount = await resolveInsuranceAmount({
    patientId: patient.id,
    total: calculateInvoiceTotals(items, { discountAmount: data.discountAmount }).totalAmount,
    claimAmount: data.insuranceAmount,
    policyId: data.policyId,
  });

  const totals = calculateInvoiceTotals(items, {
    discountAmount: data.discountAmount,
    insuranceAmount,
  });

  const invoice = await sequelize.transaction(async (transaction) => {
    const created = await Invoice.create(
      {
        invoiceNumber: await nextInvoiceNumber({ transaction }),
        patientId: patient.id,
        admissionId: data.admissionId ?? null,
        appointmentId: data.appointmentId ?? null,
        status: INVOICE_STATUS.DRAFT,
        currency: data.currency || 'NGN',
        ...totals,
        amountPaid: 0,
        balance: totals.totalAmount,
        notes: data.notes ?? null,
        issuedAt: new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : addDays(new Date(), 30),
        createdBy: user.id,
      },
      { transaction },
    );

    for (const item of items) {
      // eslint-disable-next-line no-await-in-loop
      await InvoiceItem.create({ ...item, invoiceId: created.id }, { transaction });
      // eslint-disable-next-line no-await-in-loop
      await markReferencesBilled(item, { referenceType: item.referenceType, referenceId: item.referenceId, transaction });
    }

    return created;
  });

  await auditService.record({
    user,
    action: AUDIT_ACTIONS.INVOICE_CREATED,
    resource: 'invoice',
    resourceId: invoice.id,
    patientId: patient.id,
    metadata: { invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount },
  });

  realtime.emitToPatient(patient.id, EVENTS.INVOICE_CREATED, {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    totalAmount: invoice.totalAmount,
    balance: invoice.balance,
  });

  await notificationService.notify({
    patientId: patient.id,
    role: 'ACCOUNTANT',
    type: 'BILLING',
    title: `Invoice ${invoice.invoiceNumber}`,
    message: `Balance due: ${invoice.balance} ${invoice.currency}.`,
    data: { invoiceId: invoice.id, balance: invoice.balance },
    actionUrl: `/billing/invoices/${invoice.id}`,
  });

  return getById({ user, id: invoice.id });
}

/** Insurance coverage for an invoice, capped by the policy limit. */
async function resolveInsuranceAmount({ patientId, total, claimAmount, policyId }) {
  if (!claimAmount) return 0;

  const policy = await InsurancePolicy.findOne({
    where: combineWhere(
      policyId ? { id: policyId } : { patientId, status: 'ACTIVE', isPrimary: true },
      { startDate: { [Op.lte]: new Date() }, endDate: { [Op.gte]: new Date() } },
    ),
  });

  if (!policy) throw AppError.badRequest('No active insurance policy covers this patient');
  if (policy.status !== 'ACTIVE') throw AppError.badRequest('The insurance policy is not active');

  const percentageCap = round2((toNumber(total) * toNumber(policy.coveragePercentage, 0)) / 100);
  const coverage = Math.min(percentageCap, toNumber(policy.coverageAmount, 0), total);
  return round2(Math.min(coverage, toNumber(claimAmount, coverage)));
}

async function addItem({ user, id, data }) {
  const invoice = await Invoice.findByPk(id, { include: [{ model: InvoiceItem, as: 'items' }] });
  if (!invoice) throw AppError.notFound('Invoice not found');
  if ([INVOICE_STATUS.PAID, INVOICE_STATUS.CANCELLED].includes(invoice.status)) {
    throw AppError.conflict(`Cannot modify a ${invoice.status} invoice`);
  }

  const [item] = normaliseItems([data]);
  await sequelize.transaction(async (transaction) => {
    // eslint-disable-next-line no-await-in-loop
    await InvoiceItem.create({ ...item, invoiceId: invoice.id }, { transaction });
    // eslint-disable-next-line no-await-in-loop
    await markReferencesBilled({ referenceType: item.referenceType, referenceId: item.referenceId, transaction });
    // eslint-disable-next-line no-await-in-loop
    await recalculate({ invoice, transaction });
  });

  return getById({ user, id: invoice.id });
}

async function removeItem({ user, id, itemId }) {
  const invoice = await Invoice.findByPk(id);
  if (!invoice) throw AppError.notFound('Invoice not found');
  if ([INVOICE_STATUS.PAID, INVOICE_STATUS.CANCELLED].includes(invoice.status)) {
    throw AppError.conflict(`Cannot modify a ${invoice.status} invoice`);
  }

  const item = await InvoiceItem.findOne({ where: { id: itemId, invoiceId: invoice.id } });
  if (!item) throw AppError.notFound('Invoice item not found');

  await sequelize.transaction(async (transaction) => {
    // eslint-disable-next-line no-await-in-loop
    await item.destroy({ transaction });

    // Release the clinical record so it can be billed again.
    const releasable = { laboratory_order: LaboratoryOrder, imaging_order: ImagingOrder, prescription: Prescription }[item.referenceType];
    if (releasable && item.referenceId) {
      // eslint-disable-next-line no-await-in-loop
      await releasable.update({ isBilled: false }, { where: { id: item.referenceId }, transaction });
    }

    // eslint-disable-next-line no-await-in-loop
    await recalculate({ invoice, transaction });
  });

  return getById({ user, id: invoice.id });
}

/** Recalculates totals + status from the persisted lines. */
async function recalculate({ invoice, transaction = sequelize }) {
  const items = await InvoiceItem.findAll({ where: { invoiceId: invoice.id }, transaction, raw: true });
  const totals = calculateInvoiceTotals(items, {
    discountAmount: invoice.discountAmount,
    insuranceAmount: invoice.insuranceAmount,
  });

  const amountPaid = round2(
    (await Payment.sum('amount', {
      where: { invoiceId: invoice.id, status: PAYMENT_STATUS.SUCCESSFUL },
      transaction,
    })) || 0,
  );

  const balance = round2(totals.totalAmount - amountPaid);
  const status = deriveInvoiceStatus(totals.totalAmount, amountPaid, invoice.status);

  await invoice.update(
    {
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      amountPaid,
      balance,
      status,
    },
    { transaction },
  );

  return invoice;
}

async function applyDiscount({ user, id, data }) {
  const invoice = await Invoice.findByPk(id);
  if (!invoice) throw AppError.notFound('Invoice not found');
  if ([INVOICE_STATUS.PAID, INVOICE_STATUS.CANCELLED].includes(invoice.status)) {
    throw AppError.conflict(`Cannot discount a ${invoice.status} invoice`);
  }

  await invoice.update({ discountAmount: round2(data.discountAmount), notes: data.notes ?? invoice.notes });
  await recalculate({ invoice });

  await auditService.record({
    user,
    action: AUDIT_ACTIONS.INVOICE_CREATED,
    resource: 'invoice',
    resourceId: invoice.id,
    patientId: invoice.patientId,
    metadata: { event: 'discount_applied', discountAmount: data.discountAmount },
  });

  return getById({ user, id: invoice.id });
}

async function cancel({ user, id, reason }) {
  const invoice = await Invoice.findByPk(id);
  if (!invoice) throw AppError.notFound('Invoice not found');
  if (invoice.status === INVOICE_STATUS.PAID) {
    throw AppError.conflict('Refund the payments before cancelling a paid invoice');
  }

  await sequelize.transaction(async (transaction) => {
    // eslint-disable-next-line no-await-in-loop
    await invoice.update(
      { status: INVOICE_STATUS.CANCELLED, cancelledAt: new Date(), cancelReason: reason ?? null },
      { transaction },
    );

    const items = await InvoiceItem.findAll({ where: { invoiceId: invoice.id }, transaction });
    for (const item of items) {
      // eslint-disable-next-line no-await-in-loop
      await markReferencesBilled({ referenceType: item.referenceType, referenceId: item.referenceId, transaction });
      const releasable = { laboratory_order: LaboratoryOrder, imaging_order: ImagingOrder, prescription: Prescription }[item.referenceType];
      if (releasable && item.referenceId) {
        // eslint-disable-next-line no-await-in-loop
        await releasable.update({ isBilled: false }, { where: { id: item.referenceId }, transaction });
      }
    }
  });

  return getById({ user, id: invoice.id });
}

/** Draft -> pending (issued to the patient). */
async function issue({ user, id }) {
  const invoice = await Invoice.findByPk(id);
  if (!invoice) throw AppError.notFound('Invoice not found');
  if (invoice.status === INVOICE_STATUS.CANCELLED) throw AppError.conflict('A cancelled invoice cannot be issued');
  if (!invoice.items || invoice.items.length === 0) throw AppError.conflict('Cannot issue an invoice without items');

  await recalculate({ invoice });
  if (invoice.status === INVOICE_STATUS.DRAFT) await invoice.update({ status: INVOICE_STATUS.PENDING });

  realtime.emitToPatient(invoice.patientId, EVENTS.INVOICE_CREATED, {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    totalAmount: invoice.totalAmount,
    balance: invoice.balance,
    issued: true,
  });

  return getById({ user, id: invoice.id });
}

/* ------------------------------------------------------------------ *
 * Payments
 * ------------------------------------------------------------------ */

async function nextPaymentNumber({ transaction }) {
  const last = await Payment.findOne({ order: [['createdAt', 'DESC'], ['paymentNumber', 'DESC']], attributes: ['paymentNumber'], transaction });
  let sequence = 1;
  if (last && typeof last.paymentNumber === 'string') {
    const parsed = Number.parseInt(last.paymentNumber.split('-').pop(), 10);
    if (Number.isFinite(parsed)) sequence = parsed + 1;
  }
  return numbered('PAY', sequence);
}

/**
 * Records a payment. Money math and the invoice status are recomputed inside
 * the transaction so a paid invoice can never show a stale balance.
 */
async function recordPayment({ user, data }) {
  const invoice = await Invoice.findByPk(data.invoiceId);
  if (!invoice) throw AppError.notFound('Invoice not found');
  if (invoice.status === INVOICE_STATUS.CANCELLED) throw AppError.conflict('This invoice was cancelled');
  if (invoice.status === INVOICE_STATUS.DRAFT) throw AppError.conflict('Issue the invoice before taking payment');

  const amount = round2(data.amount);
  if (amount <= 0) throw AppError.badRequest('Payment amount must be greater than zero');
  if (round2(amount) > round2(invoice.balance)) {
    throw AppError.badRequest(`Payment exceeds the outstanding balance of ${invoice.balance}`);
  }

  const payment = await sequelize.transaction(async (transaction) => {
    const created = await Payment.create(
      {
        paymentNumber: await nextPaymentNumber({ transaction }),
        invoiceId: invoice.id,
        patientId: invoice.patientId,
        amount,
        method: data.method,
        status: data.status || PAYMENT_STATUS.SUCCESSFUL,
        reference: data.reference ?? null,
        receivedBy: user.id,
        notes: data.notes ?? null,
        paidAt: data.paidAt || new Date(),
        createdBy: user.id,
      },
      { transaction },
    );

    // eslint-disable-next-line no-await-in-loop
    await recalculate({ invoice, transaction });
    return created;
  });

  await auditService.record({
    user,
    action: AUDIT_ACTIONS.PAYMENT_VERIFIED,
    resource: 'payment',
    resourceId: payment.id,
    patientId: payment.patientId,
    metadata: { invoiceId: invoice.id, amount, method: payment.method, reference: payment.reference },
  });

  realtime.emitToPatient(invoice.patientId, EVENTS.PAYMENT_COMPLETED, {
    paymentId: payment.id,
    invoiceId: invoice.id,
    amount,
    balance: invoice.balance,
    status: invoice.status,
  });

  if (invoice.balance > 0) {
    await notificationService.notify({
      patientId: invoice.patientId,
      role: 'ACCOUNTANT',
      type: 'BILLING',
      title: `Payment received on ${invoice.invoiceNumber}`,
      message: `${amount} ${invoice.currency} received. Balance: ${invoice.balance}.`,
      data: { paymentId: payment.id, invoiceId: invoice.id },
    });
  } else {
    await notificationService.notify({
      patientId: invoice.patientId,
      role: 'ACCOUNTANT',
      type: 'BILLING',
      title: `Invoice ${invoice.invoiceNumber} fully paid`,
      message: 'Thank you - the account is now settled.',
      data: { invoiceId: invoice.id },
      priority: 'NORMAL',
    });
  }

  return payment.get({ plain: true });
}

async function refundPayment({ user, id, reason, amount }) {
  const payment = await Payment.findByPk(id, { include: [{ model: Invoice, as: 'invoice' }] });
  if (!payment) throw AppError.notFound('Payment not found');
  if (payment.status !== PAYMENT_STATUS.SUCCESSFUL) {
    throw AppError.conflict(`Only successful payments can be refunded (this one is ${payment.status})`);
  }

  const refundAmount = round2(amount ?? payment.amount);
  if (refundAmount <= 0 || refundAmount > round2(payment.amount)) {
    throw AppError.badRequest('Refund amount must be greater than zero and no more than the payment amount');
  }

  await sequelize.transaction(async (transaction) => {
    // eslint-disable-next-line no-await-in-loop
    const reversal = await Payment.create(
      {
        paymentNumber: await nextPaymentNumber({ transaction }),
        invoiceId: payment.invoiceId,
        patientId: payment.patientId,
        amount: -refundAmount,
        method: payment.method,
        status: PAYMENT_STATUS.REFUNDED,
        reference: `REFUND OF ${payment.paymentNumber}`,
        receivedBy: user.id,
        notes: reason ?? null,
        paidAt: new Date(),
        refundedAt: new Date(),
        refundReason: reason ?? null,
        createdBy: user.id,
      },
      { transaction },
    );

    // A full refund closes the original payment; a partial one keeps it open.
    const fullyRefunded = round2(Number(payment.amount) - refundAmount) <= 0;
    // eslint-disable-next-line no-await-in-loop
    await payment.update({ status: fullyRefunded ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.SUCCESSFUL, refundReason: reason ?? payment.refundReason }, { transaction });

    // eslint-disable-next-line no-await-in-loop
    await recalculate({ invoice: payment.invoice, transaction });
    return reversal;
  });

  return getById({ user, id: payment.invoiceId });
}

async function listPayments({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    roleNameOf(user) === 'PATIENT' ? { patientId: user.patientId ?? -1 } : undefined,
    query.invoiceId ? { invoiceId: query.invoiceId } : undefined,
    query.patientId ? { patientId: query.patientId } : undefined,
    query.method ? { method: query.method } : undefined,
    query.status ? { status: query.status } : undefined,
    query.from ? { paidAt: { [Op.gte]: new Date(query.from) } } : undefined,
    query.to ? { paidAt: { [Op.lte]: new Date(query.to) } } : undefined,
  );

  const { rows, count } = await Payment.findAndCountAll({
    where,
    include: [
      { model: Invoice, as: 'invoice', attributes: ['id', 'invoiceNumber', 'totalAmount', 'balance'] },
      { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] },
      { model: User, as: 'receivedByUser', attributes: ['id', 'firstName', 'lastName'] },
    ],
    order: [['paidAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return { payments: rows.map((row) => row.get({ plain: true })), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

/** Everything the patient owes, aggregated. */
async function statement({ user, patientId }) {
  const pid = roleNameOf(user) === 'PATIENT' ? user.patientId : patientId;
  if (!pid) throw AppError.badRequest('patientId is required');

  const patient = await Patient.findByPk(pid);
  if (!patient) throw AppError.notFound('Patient not found');

  const [invoices, payments, claims] = await Promise.all([
    Invoice.findAll({ where: { patientId: pid, status: { [Op.notIn]: [INVOICE_STATUS.CANCELLED] } }, order: [['issuedAt', 'DESC']] }),
    Payment.findAll({ where: { patientId: pid, status: PAYMENT_STATUS.SUCCESSFUL }, order: [['paidAt', 'DESC']] }),
    InsuranceClaim.findAll({ where: { patientId: pid } }),
  ]);

  const billed = round2(invoices.reduce((acc, invoice) => acc + Number(invoice.totalAmount), 0));
  const paid = round2(payments.reduce((acc, payment) => acc + Number(payment.amount), 0));
  const outstanding = round2(invoices.reduce((acc, invoice) => acc + Number(invoice.balance), 0));

  return {
    patient: { id: patient.id, name: patient.getFullName(), hospitalNumber: patient.hospitalNumber },
    billed,
    paid,
    outstanding,
    currency: invoices[0]?.currency || 'NGN',
    invoices: invoices.map(present),
    payments,
    claims: claims.map((claim) => claim.get({ plain: true })),
    overdueInvoices: invoices.filter((invoice) => invoice.dueDate && new Date(invoice.dueDate) < new Date() && Number(invoice.balance) > 0).length,
  };
}

/** Revenue totals for the finance dashboard. */
async function statistics({ query = {} }) {
  const day = query.date || toDateOnly();
  const from = new Date(`${day}T00:00:00Z`);
  const to = new Date(`${day}T23:59:59Z`);

  const [todayTotals, outstanding, overdueCount, byMethod] = await Promise.all([
    Invoice.findOne({
      attributes: [
        [fn('SUM', col(fieldOf('totalAmount'))), 'billed'],
        [fn('SUM', col(fieldOf('amountPaid'))), 'collected'],
        [fn('COUNT', col('id')), 'invoices'],
      ],
      where: { issuedAt: { [Op.between]: [from, to] }, status: { [Op.notIn]: [INVOICE_STATUS.CANCELLED] } },
      raw: true,
    }),
    Invoice.sum('balance', { where: { status: { [Op.in]: [INVOICE_STATUS.PENDING, INVOICE_STATUS.PARTIALLY_PAID] } } }),
    Invoice.count({ where: { dueDate: { [Op.lt]: new Date() }, balance: { [Op.gt]: 0 } } }),
    Payment.findAll({
      attributes: ['method', [fn('SUM', col(Payment.rawAttributes.amount.field || 'amount')), 'total'], [fn('COUNT', col('id')), 'count']],
      where: { paidAt: { [Op.between]: [from, to] }, status: PAYMENT_STATUS.SUCCESSFUL },
      group: ['method'],
      raw: true,
    }),
  ]);

  return {
    date: day,
    billedToday: round2(todayTotals?.billed || 0),
    collectedToday: round2(todayTotals?.collected || 0),
    invoicesToday: Number(todayTotals?.invoices || 0),
    outstanding: round2(outstanding || 0),
    overdueInvoices: overdueCount,
    byMethod: byMethod.map((row) => ({ method: row.method, total: round2(row.total), count: Number(row.count) })),
  };
}

module.exports = {
  list,
  getById,
  create,
  issue,
  addItem,
  removeItem,
  applyDiscount,
  cancel,
  recordPayment,
  refundPayment,
  listPayments,
  collectUnbilledItems,
  statement,
  statistics,
  recalculate,
  present,
  fieldOf,
  normaliseItems,
  resolveInsuranceAmount,
  INVOICE_INCLUDES,
};
