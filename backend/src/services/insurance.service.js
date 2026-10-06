const { Op, fn, col } = require('sequelize');
const AppError = require('../utils/AppError');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { numbered } = require('../utils/codeGenerator');
const { round2, toNumber, calculateInvoiceTotals } = require('../utils/money');
const { roleNameOf } = require('../utils/accessControl');
const { INVOICE_STATUS } = require('../config/constants');
const { EVENTS } = require('../realtime/events');
const realtime = require('../realtime/socket');
const notificationService = require('./notification.service');
const auditService = require('./audit.service');
const billingService = require('./billing.service');
const { sameId } = require('../utils/ids');
const {
  InsuranceProvider,
  InsurancePolicy,
  InsuranceClaim,
  Invoice,
  InvoiceItem,
  Patient,
  User,
} = require('../models');

/**
 * Insurance: providers, patient policies and claims against invoices.
 *
 * Approved claim amounts are written back onto the invoice (`insuranceAmount`)
 * and every invoice total is recomputed through `billingService` so the money
 * shown to the patient always matches the approved claim.
 */

const CLAIM_INCLUDES = [
  { model: InsurancePolicy, as: 'policy', attributes: ['id', 'policyNumber', 'planName', 'coveragePercentage', 'coverageAmount'] },
  { model: Invoice, as: 'invoice', attributes: ['id', 'invoiceNumber', 'totalAmount', 'insuranceAmount', 'balance', 'status'] },
  { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] },
];

async function nextClaimNumber() {
  const last = await InsuranceClaim.findOne({ order: [['id', 'DESC']], attributes: ['claimNumber'] });
  let sequence = 1;
  if (last && typeof last.claimNumber === 'string') {
    const parsed = Number.parseInt(last.claimNumber.split('-').pop(), 10);
    if (Number.isFinite(parsed)) sequence = parsed + 1;
  }
  return numbered('CLM', sequence);
}

/* ------------------------------------------------------------------ *
 * Providers
 * ------------------------------------------------------------------ */

async function listProviders({ query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    query.isActive === undefined ? { isActive: true } : { isActive: query.isActive },
    searchWhere(query.search, [['name', 'string'], ['code', 'string'], ['contactPerson', 'string']]),
  );

  const { rows, count } = await InsuranceProvider.findAndCountAll({
    where,
    include: [{ model: InsurancePolicy, as: 'policies', attributes: ['id'] }],
    order: [['name', 'ASC']],
    limit,
    offset,
    distinct: true,
  });

  return {
    providers: rows.map((row) => {
      const plain = row.get({ plain: true });
      return { ...plain, policyCount: (plain.policies || []).length };
    }),
    pagination: buildPaginationMeta({ page, limit, total: count }),
  };
}

async function createProvider({ data }) {
  const exists = await InsuranceProvider.findOne({ where: { code: data.code } });
  if (exists) throw AppError.conflict('A provider with that code already exists');

  const provider = await InsuranceProvider.create({ ...data, isActive: data.isActive ?? true });
  return provider.get({ plain: true });
}

async function getProvider({ id }) {
  const provider = await InsuranceProvider.findByPk(id, {
    include: [{ model: InsurancePolicy, as: 'policies', include: [{ model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] }] }],
  });
  if (!provider) throw AppError.notFound('Insurance provider not found');

  const plain = provider.get({ plain: true });
  return { ...plain, policies: (plain.policies || []).map((policy) => policy.get ? policy.get({ plain: true }) : policy) };
}

/* ------------------------------------------------------------------ *
 * Policies
 * ------------------------------------------------------------------ */

async function listPolicies({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);

  const where = combineWhere(
    roleNameOf(user) === 'PATIENT' ? { patientId: user.patientId ?? -1 } : undefined,
    query.patientId ? { patientId: query.patientId } : undefined,
    query.providerId ? { providerId: query.providerId } : undefined,
    query.status ? { status: query.status } : undefined,
    query.activeOnly === true ? { status: 'ACTIVE', endDate: { [Op.gte]: new Date() } } : undefined,
    searchWhere(query.search, [['policyNumber', 'string'], ['planName', 'string']]),
  );

  const { rows, count } = await InsurancePolicy.findAndCountAll({
    where,
    include: [
      { model: InsuranceProvider, as: 'provider', attributes: ['id', 'name', 'code', 'phone', 'email'] },
      { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return { policies: rows.map((row) => row.get({ plain: true })), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

async function getPolicy({ user, id }) {
  const policy = await InsurancePolicy.findByPk(id, {
    include: [
      { model: InsuranceProvider, as: 'provider' },
      { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName'] },
      { model: InsuranceClaim, as: 'claims', include: [{ model: Invoice, as: 'invoice', attributes: ['id', 'invoiceNumber', 'totalAmount'] }] },
    ],
  });
  if (!policy) throw AppError.notFound('Insurance policy not found');
  if (roleNameOf(user) === 'PATIENT' && !sameId(policy.patientId, user.patientId)) {
    throw AppError.forbidden('You are not authorised to view this policy');
  }

  const plain = policy.get({ plain: true });
  return { ...plain, isCurrentlyValid: isPolicyValid(policy) };
}

function isPolicyValid(policy) {
  const today = new Date();
  return (
    policy.status === 'ACTIVE' &&
    new Date(policy.startDate) <= today &&
    new Date(policy.endDate) >= today
  );
}

/** How much of `amount` the policy still covers. */
async function remainingCoverage({ policy, amount, consumed = 0 }) {
  const percentageCap = round2((toNumber(amount) * toNumber(policy.coveragePercentage, 0)) / 100);
  const remaining = round2(toNumber(policy.coverageAmount) - toNumber(consumed));
  const covered = Math.max(0, Math.min(percentageCap, remaining, toNumber(amount)));

  return {
    covered,
    uncovered: round2(toNumber(amount) - covered),
    percentageCap,
    remainingLimit: Math.max(0, remaining),
    patientResponsibility: round2(toNumber(amount) - covered),
  };
}

async function createPolicy({ user, data }) {
  const patient = await Patient.findByPk(data.patientId);
  if (!patient) throw AppError.notFound('Patient not found');

  const provider = await InsuranceProvider.findByPk(data.providerId);
  if (!provider) throw AppError.notFound('Insurance provider not found');
  if (new Date(data.endDate) < new Date(data.startDate)) {
    throw AppError.badRequest('endDate must be after startDate');
  }

  if (data.isPrimary) {
    await InsurancePolicy.update(
      { isPrimary: false },
      { where: { patientId: patient.id, status: 'ACTIVE', id: { [Op.ne]: data.id ?? -1 } } },
    );
  }

  const policy = data.id
    ? await InsurancePolicy.findByPk(data.id)
    : await InsurancePolicy.create({ patientId: patient.id, ...data });
  if (!policy) throw AppError.notFound('Policy not found');

  await policy.update({
    patientId: patient.id,
    providerId: provider.id,
    policyNumber: data.policyNumber ?? policy.policyNumber,
    planName: data.planName,
    coverageAmount: round2(data.coverageAmount),
    coveragePercentage: round2(data.coveragePercentage),
    premiumAmount: round2(data.premiumAmount ?? 0),
    startDate: data.startDate,
    endDate: data.endDate,
    status: data.status || 'ACTIVE',
    isPrimary: Boolean(data.isPrimary),
    notes: data.notes ?? null,
  });

  return getPolicy({ user, id: policy.id });
}

/** Coverage check for the patient portal / billing desk. */
async function coverageCheck({ user, data }) {
  const policy = await InsurancePolicy.findByPk(data.policyId);
  if (!policy) throw AppError.notFound('Insurance policy not found');
  if (roleNameOf(user) === 'PATIENT' && !sameId(policy.patientId, user.patientId)) {
    throw AppError.forbidden('You are not authorised to view this policy');
  }

  const consumed = await consumedCoverage(policy);
  return {
    policy: policy.get({ plain: true }),
    valid: isPolicyValid(policy),
    consumed,
    ...(await remainingCoverage({ policy, amount: round2(data.amount ?? 0), consumed })),
  };
}

/** Sum of approved claims so far, used to enforce the policy limit. */
async function consumedCoverage(policy) {
  const claims = await InsuranceClaim.findAll({
    where: { policyId: policy.id, status: { [Op.in]: ['APPROVED', 'PAID'] } },
    attributes: ['approvedAmount'],
    raw: true,
  });
  return round2(claims.reduce((acc, claim) => acc + Number(claim.approvedAmount || 0), 0));
}

/* ------------------------------------------------------------------ *
 * Claims
 * ------------------------------------------------------------------ */

async function listClaims({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const statuses = query.status ? String(query.status).split(',').map((s) => s.trim()) : null;

  const where = combineWhere(
    roleNameOf(user) === 'PATIENT' ? { patientId: user.patientId ?? -1 } : undefined,
    statuses ? { status: { [Op.in]: statuses } } : undefined,
    query.patientId ? { patientId: query.patientId } : undefined,
    query.policyId ? { policyId: query.policyId } : undefined,
    query.invoiceId ? { invoiceId: query.invoiceId } : undefined,
    searchWhere(query.search, [['claimNumber', 'string']]),
  );

  const { rows, count } = await InsuranceClaim.findAndCountAll({
    where,
    include: CLAIM_INCLUDES,
    order: [['submittedAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return { claims: rows.map((row) => row.get({ plain: true })), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

async function getClaim({ user, id }) {
  const claim = await InsuranceClaim.findByPk(id, {
    include: [...CLAIM_INCLUDES, { model: User, as: 'reviewedByUser', attributes: ['id', 'firstName', 'lastName'] }],
  });
  if (!claim) throw AppError.notFound('Insurance claim not found');
  if (roleNameOf(user) === 'PATIENT' && !sameId(claim.patientId, user.patientId)) {
    throw AppError.forbidden('You are not authorised to view this claim');
  }
  return claim.get({ plain: true });
}

/**
 * Submits a claim for an invoice. The claim amount defaults to the invoice
 * balance (what the insurer is actually being asked to pay).
 */
async function submitClaim({ user, data }) {
  const invoice = await Invoice.findByPk(data.invoiceId);
  if (!invoice) throw AppError.notFound('Invoice not found');
  if (invoice.status === INVOICE_STATUS.CANCELLED) throw AppError.conflict('A cancelled invoice cannot be claimed');
  if (invoice.status === INVOICE_STATUS.PAID) throw AppError.conflict('This invoice is already settled in full');

  const existing = await InsuranceClaim.findOne({
    where: { invoiceId: invoice.id, status: { [Op.in]: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] } },
  });
  if (existing) throw AppError.conflict(`A claim (${existing.claimNumber}) is already open for this invoice`);

  const policy = await InsurancePolicy.findByPk(data.policyId);
  if (!policy) throw AppError.notFound('Insurance policy not found');
  if (!sameId(policy.patientId, invoice.patientId)) {
    throw AppError.badRequest('That policy belongs to a different patient');
  }
  if (!isPolicyValid(policy)) throw AppError.badRequest('The policy is not currently valid');

  const claimAmount = round2(data.claimAmount ?? round2(Number(invoice.totalAmount) - Number(invoice.insuranceAmount || 0)));
  const coverage = await remainingCoverage({ policy, amount: claimAmount, consumed: await consumedCoverage(policy) });
  if (coverage.covered <= 0) {
    throw AppError.badRequest('The policy has no remaining coverage for this claim');
  }

  const claim = await InsuranceClaim.create({
    claimNumber: await nextClaimNumber(),
    invoiceId: invoice.id,
    policyId: policy.id,
    patientId: invoice.patientId,
    claimAmount,
    approvedAmount: 0,
    rejectedAmount: 0,
    patientContribution: coverage.patientResponsibility,
    status: 'SUBMITTED',
    diagnosisSummary: data.diagnosisSummary ?? null,
    supportingNotes: data.supportingNotes ?? null,
    submittedAt: new Date(),
    createdBy: user.id,
  });

  await auditService.record({
    user,
    action: AUDIT_ACTIONS.INVOICE_CREATED,
    resource: 'insurance_claim',
    resourceId: claim.id,
    patientId: claim.patientId,
    metadata: { event: 'claim_submitted', claimAmount, invoiceId: invoice.id },
  });

  await notificationService.notify({
    role: 'ACCOUNTANT',
    type: 'BILLING',
    title: `Claim ${claim.claimNumber} submitted`,
    message: `${claimAmount} claimed against invoice ${invoice.invoiceNumber}.`,
    data: { claimId: claim.id, invoiceId: invoice.id },
  });

  realtime.emitToPatient(claim.patientId, EVENTS.INVOICE_CREATED, {
    claimId: claim.id,
    claimNumber: claim.claimNumber,
    claimAmount,
    status: claim.status,
  });

  return getClaim({ user, id: claim.id });
}

/**
 * Approves or rejects a claim. The approved amount is written onto the invoice
 * and the invoice totals are recalculated, which moves money from the patient to
 * the insurer.
 */
async function reviewClaim({ user, id, data }) {
  const claim = await InsuranceClaim.findByPk(id, { include: [{ model: Invoice, as: 'invoice' }, { model: InsurancePolicy, as: 'policy' }] });
  if (!claim) throw AppError.notFound('Insurance claim not found');
  if (!['SUBMITTED', 'UNDER_REVIEW'].includes(claim.status)) {
    throw AppError.conflict(`A ${claim.status} claim cannot be reviewed`);
  }

  const decision = data.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
  const invoice = claim.invoice;
  const policy = claim.policy;

  const coverage = await remainingCoverage({
    policy,
    amount: round2(claim.claimAmount),
    consumed: round2((await consumedCoverage(policy)) - Number(claim.approvedAmount || 0)),
  });

  const approvedAmount = decision === 'APPROVED' ? Math.min(round2(data.approvedAmount ?? coverage.covered), coverage.covered) : 0;
  if (decision === 'APPROVED' && data.approvedAmount !== undefined && round2(data.approvedAmount) > coverage.covered) {
    throw AppError.badRequest(
      `Approved amount exceeds the remaining policy coverage of ${coverage.remainingLimit}`,
    );
  }
  const rejectedAmount = round2(Number(claim.claimAmount) - approvedAmount);

  await claim.update({
    status: decision,
    approvedAmount,
    rejectedAmount,
    patientContribution: rejectedAmount,
    rejectionReason: decision === 'REJECTED' ? data.reason ?? 'Not covered by policy' : null,
    supportingNotes: data.notes ?? claim.supportingNotes,
    reviewedBy: user.id,
    reviewedAt: new Date(),
  });

  if (invoice) {
    const insuranceAmount = round2(Number(invoice.insuranceAmount || 0) + approvedAmount);
    const items = await InvoiceItem.findAll({ where: { invoiceId: invoice.id }, raw: true });
    const totals = calculateInvoiceTotals(items, {
      discountAmount: invoice.discountAmount,
      insuranceAmount,
    });

    await billingService.recalculate({ invoice });
    await invoice.update({ insuranceAmount, ...totals });
    await billingService.recalculate({ invoice });

    if (decision === 'APPROVED') {
      await notificationService.notify({
        patientId: claim.patientId,
        type: 'BILLING',
        title: `Claim ${claim.claimNumber} approved`,
        message: `${approvedAmount} approved. Your balance is now ${invoice.balance}.`,
        data: { claimId: claim.id, invoiceId: invoice.id, balance: invoice.balance },
      });
    } else {
      await notificationService.notify({
        patientId: claim.patientId,
        type: 'BILLING',
        title: `Claim ${claim.claimNumber} rejected`,
        message: claim.rejectionReason,
        data: { claimId: claim.id, invoiceId: invoice.id },
        priority: 'HIGH',
      });
    }

    realtime.emitToPatient(claim.patientId, EVENTS.INVOICE_CREATED, {
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      status: decision,
      approvedAmount,
      invoiceId: invoice.id,
      balance: invoice.balance,
    });
  }

  return getClaim({ user, id: claim.id });
}

/** Records the insurer paying an approved claim. */
async function markClaimPaid({ user, id, data }) {
  const claim = await InsuranceClaim.findByPk(id);
  if (!claim) throw AppError.notFound('Insurance claim not found');
  if (claim.status !== 'APPROVED') throw AppError.conflict('Only approved claims can be marked as paid');

  await claim.update({ status: 'PAID', paidAt: new Date(), supportingNotes: data?.notes ?? claim.supportingNotes });

  await notificationService.notify({
    patientId: claim.patientId,
    role: 'ACCOUNTANT',
    type: 'BILLING',
    title: `Claim ${claim.claimNumber} paid`,
    message: `The insurer paid ${claim.approvedAmount}.`,
    data: { claimId: claim.id },
  });

  return getClaim({ user, id: claim.id });
}

/** Claim + policy totals for the finance dashboard. */
async function statistics({ query = {} }) {
  const [byStatus, totals, policies] = await Promise.all([
    InsuranceClaim.findAll({ attributes: ['status', [fn('COUNT', col('id')), 'count']], group: ['status'], raw: true }),
    InsuranceClaim.findOne({
      attributes: [
        [fn('SUM', col(InsuranceClaim.rawAttributes.claimAmount.field || 'claim_amount')), 'claimed'],
        [fn('SUM', col(InsuranceClaim.rawAttributes.approvedAmount.field || 'approved_amount')), 'approved'],
        [fn('SUM', col(InsuranceClaim.rawAttributes.rejectedAmount.field || 'rejected_amount')), 'rejected'],
      ],
      raw: true,
    }),
    InsurancePolicy.count({ where: { status: 'ACTIVE', endDate: { [Op.gte]: new Date() } } }),
  ]);

  const claimed = round2(totals?.claimed || 0);
  const approved = round2(totals?.approved || 0);

  return {
    activePolicies: policies,
    claimed,
    approved,
    rejected: round2(totals?.rejected || 0),
    approvalRate: claimed ? Number(((approved / claimed) * 100).toFixed(1)) : 0,
    byStatus: byStatus.map((row) => ({ status: row.status, count: Number(row.count) })),
  };
}

module.exports = {
  listProviders,
  getProvider,
  createProvider,
  listPolicies,
  getPolicy,
  createPolicy,
  coverageCheck,
  remainingCoverage,
  consumedCoverage,
  isPolicyValid,
  listClaims,
  getClaim,
  submitClaim,
  reviewClaim,
  markClaimPaid,
  statistics,
  CLAIM_INCLUDES,
};
