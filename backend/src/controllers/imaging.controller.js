const asyncHandler = require('../utils/asyncHandler');
const { created, success } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const imagingService = require('../services/imaging.service');

const list = asyncHandler(async (req, res) => {
  const result = await imagingService.list({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Imaging orders retrieved' });
});

const getById = asyncHandler(async (req, res) => {
  const data = await imagingService.getById({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Imaging order retrieved', data });
});

const create = asyncHandler(async (req, res) => {
  const data = await imagingService.create({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Imaging order created', data });
});

const recordReport = asyncHandler(async (req, res) => {
  const data = await imagingService.recordReport({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Imaging report recorded', data });
});

const updateStatus = asyncHandler(async (req, res) => {
  const body = bodyOf(req);
  const data = await imagingService.updateStatus({
    user: req.user,
    id: paramsOf(req).id,
    status: body.status,
    reason: body.reason,
  });
  return success(res, { message: 'Imaging order status updated', data });
});

module.exports = { list, getById, create, recordReport, updateStatus };