const asyncHandler = require('../utils/asyncHandler');
const { created, success } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const billingService = require('../services/billing.service');

/* ------------------------------------------------------------------ *
 * Invoices
 * ------------------------------------------------------------------ */

const list = asyncHandler(async (req, res) => {
  const result = await billingService.list({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Invoices retrieved' });
});

const getById = asyncHandler(async (req, res) => {
  const data = await billingService.getById({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Invoice retrieved', data });
});

const create = asyncHandler(async (req, res) => {
  const data = await billingService.create({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Invoice created', data });
});

const collectUnbilledItems = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const data = await billingService.collectUnbilledItems({
    patientId: query.patientId,
    admissionId: query.admissionId,
    since: query.from,
  });
  return success(res, { message: 'Unbilled items', data });
});

const addItem = asyncHandler(async (req, res) => {
  const data = await billingService.addItem({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return created(res, { message: 'Invoice item added', data });
});

const removeItem = asyncHandler(async (req, res) => {
  const params = paramsOf(req);
  const data = await billingService.removeItem({ user: req.user, id: params.id, itemId: params.itemId });
  return success(res, { message: 'Invoice item removed', data });
});

const applyDiscount = asyncHandler(async (req, res) => {
  const data = await billingService.applyDiscount({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Discount applied', data });
});

const issue = asyncHandler(async (req, res) => {
  const data = await billingService.issue({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Invoice issued', data });
});

const cancel = asyncHandler(async (req, res) => {
  const data = await billingService.cancel({
    user: req.user,
    id: paramsOf(req).id,
    reason: bodyOf(req).reason,
  });
  return success(res, { message: 'Invoice cancelled', data });
});

/* ------------------------------------------------------------------ *
 * Payments
 * ------------------------------------------------------------------ */

const recordPayment = asyncHandler(async (req, res) => {
  const data = await billingService.recordPayment({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Payment recorded', data });
});

const refundPayment = asyncHandler(async (req, res) => {
  const body = bodyOf(req);
  const data = await billingService.refundPayment({
    user: req.user,
    id: paramsOf(req).id,
    reason: body.reason,
    amount: body.amount,
  });
  return success(res, { message: 'Payment refunded', data });
});

const listPayments = asyncHandler(async (req, res) => {
  const result = await billingService.listPayments({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Payments retrieved' });
});

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

const statement = asyncHandler(async (req, res) => {
  const data = await billingService.statement({ user: req.user, patientId: paramsOf(req).patientId });
  return success(res, { message: 'Patient statement', data });
});

const statistics = asyncHandler(async (req, res) => {
  const data = await billingService.statistics({ query: queryOf(req) });
  return success(res, { message: 'Billing statistics', data });
});

module.exports = {
  list,
  getById,
  create,
  collectUnbilledItems,
  addItem,
  removeItem,
  applyDiscount,
  issue,
  cancel,
  recordPayment,
  refundPayment,
  listPayments,
  statement,
  statistics,
};