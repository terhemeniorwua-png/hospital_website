const asyncHandler = require('../utils/asyncHandler');
const { created, success } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const laboratoryService = require('../services/laboratory.service');

/* ------------------------------------------------------------------ *
 * Test catalogue
 * ------------------------------------------------------------------ */

const listTests = asyncHandler(async (req, res) => {
  const result = await laboratoryService.listTests({ query: queryOf(req) });
  return sendList(res, result, { message: 'Laboratory tests retrieved' });
});

const getTest = asyncHandler(async (req, res) => {
  const data = await laboratoryService.getTest({ id: paramsOf(req).id });
  return success(res, { message: 'Laboratory test retrieved', data });
});

/* ------------------------------------------------------------------ *
 * Orders
 * ------------------------------------------------------------------ */

const listOrders = asyncHandler(async (req, res) => {
  const result = await laboratoryService.listOrders({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Laboratory orders retrieved' });
});

const getOrder = asyncHandler(async (req, res) => {
  const data = await laboratoryService.getOrder({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Laboratory order retrieved', data });
});

const createOrder = asyncHandler(async (req, res) => {
  const data = await laboratoryService.createOrder({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Laboratory order created', data });
});

const updateStatus = asyncHandler(async (req, res) => {
  const body = bodyOf(req);
  const data = await laboratoryService.updateOrderStatus({
    user: req.user,
    id: paramsOf(req).id,
    status: body.status,
    reason: body.reason,
  });
  return success(res, { message: 'Laboratory order status updated', data });
});

/* ------------------------------------------------------------------ *
 * Results
 * ------------------------------------------------------------------ */

const recordResult = asyncHandler(async (req, res) => {
  const data = await laboratoryService.recordResult({
    user: req.user,
    orderId: paramsOf(req).id,
    data: bodyOf(req),
  });
  return created(res, { message: 'Result recorded', data });
});

const publishResults = asyncHandler(async (req, res) => {
  const data = await laboratoryService.publishResults({ user: req.user, orderId: paramsOf(req).id });
  return success(res, { message: 'Results published', data });
});

const listResults = asyncHandler(async (req, res) => {
  const result = await laboratoryService.listResults({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Laboratory results retrieved' });
});

const statistics = asyncHandler(async (req, res) => {
  const data = await laboratoryService.statistics({ query: queryOf(req) });
  return success(res, { message: 'Laboratory statistics', data });
});

module.exports = {
  listTests,
  getTest,
  listOrders,
  getOrder,
  createOrder,
  updateStatus,
  recordResult,
  publishResults,
  listResults,
  statistics,
};