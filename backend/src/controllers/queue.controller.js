const asyncHandler = require('../utils/asyncHandler');
const { created, success } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const queueService = require('../services/queue.service');

const list = asyncHandler(async (req, res) => {
  const result = await queueService.list({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Queue entries retrieved' });
});

const getById = asyncHandler(async (req, res) => {
  const data = await queueService.getById({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Queue entry retrieved', data });
});

const board = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const data = await queueService.board({ departmentId: query.departmentId, date: query.date });
  return success(res, { message: 'Queue board', data });
});

const join = asyncHandler(async (req, res) => {
  const data = await queueService.join({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Added to the waiting room', data });
});

const callNext = asyncHandler(async (req, res) => {
  const body = bodyOf(req);
  const data = await queueService.callNext({
    user: req.user,
    departmentId: body.departmentId,
    date: body.date,
    ticketNumber: body.ticketNumber,
  });
  return success(res, { message: 'Next patient called', data });
});

const update = asyncHandler(async (req, res) => {
  const data = await queueService.updateEntry({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Queue entry updated', data });
});

const startService = asyncHandler(async (req, res) => {
  const data = await queueService.startService({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Consultation started', data });
});

const complete = asyncHandler(async (req, res) => {
  const data = await queueService.complete({
    user: req.user,
    id: paramsOf(req).id,
    notes: bodyOf(req).notes,
  });
  return success(res, { message: 'Queue entry completed', data });
});

const skip = asyncHandler(async (req, res) => {
  const data = await queueService.skip({
    user: req.user,
    id: paramsOf(req).id,
    reason: bodyOf(req).reason,
  });
  return success(res, { message: 'Queue entry skipped', data });
});

const remove = asyncHandler(async (req, res) => {
  await queueService.remove({ id: paramsOf(req).id });
  return success(res, { message: 'Queue entry removed' });
});

const estimate = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const data = await queueService.estimate({
    departmentId: query.departmentId,
    date: query.date,
    ticketNumber: query.ticketNumber,
  });
  return success(res, { message: 'Wait estimate', data });
});

const statistics = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const data = await queueService.statistics({ departmentId: query.departmentId, date: query.date });
  return success(res, { message: 'Queue statistics', data });
});

module.exports = {
  list,
  getById,
  board,
  join,
  callNext,
  update,
  startService,
  complete,
  skip,
  remove,
  estimate,
  statistics,
};