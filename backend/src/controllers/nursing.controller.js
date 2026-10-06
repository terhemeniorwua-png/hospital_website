const asyncHandler = require('../utils/asyncHandler');
const { created, success } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const nursingService = require('../services/nursing.service');

/* ------------------------------------------------------------------ *
 * Ward view for nurses
 * ------------------------------------------------------------------ */

const assignedPatients = asyncHandler(async (req, res) => {
  const result = await nursingService.assignedPatients({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Assigned patients retrieved' });
});

const doctorOrders = asyncHandler(async (req, res) => {
  const data = await nursingService.doctorOrders({ user: req.user, query: queryOf(req) });
  return success(res, { message: 'Doctor orders', data });
});

const statistics = asyncHandler(async (req, res) => {
  const data = await nursingService.statistics({ user: req.user, query: queryOf(req) });
  return success(res, { message: 'Nursing statistics', data });
});

/* ------------------------------------------------------------------ *
 * Nursing notes
 * ------------------------------------------------------------------ */

const listNotes = asyncHandler(async (req, res) => {
  const result = await nursingService.listNotes({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Nursing notes retrieved' });
});

const createNote = asyncHandler(async (req, res) => {
  const data = await nursingService.createNote({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Nursing note recorded', data });
});

/* ------------------------------------------------------------------ *
 * Medication administration
 * ------------------------------------------------------------------ */

const listAdministrations = asyncHandler(async (req, res) => {
  const result = await nursingService.listAdministrations({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Medication administrations retrieved' });
});

const createSchedule = asyncHandler(async (req, res) => {
  const data = await nursingService.createSchedule({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Administration schedule created', data });
});

const recordAdministration = asyncHandler(async (req, res) => {
  const data = await nursingService.recordAdministration({
    user: req.user,
    id: paramsOf(req).id,
    data: bodyOf(req),
  });
  return success(res, { message: 'Administration recorded', data });
});

/* ------------------------------------------------------------------ *
 * Observations
 * ------------------------------------------------------------------ */

const recordVitals = asyncHandler(async (req, res) => {
  const data = await nursingService.recordVitals({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Observations recorded', data });
});

const listVitals = asyncHandler(async (req, res) => {
  const result = await nursingService.listVitals({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Observations retrieved' });
});

module.exports = {
  assignedPatients,
  doctorOrders,
  statistics,
  listNotes,
  createNote,
  listAdministrations,
  createSchedule,
  recordAdministration,
  recordVitals,
  listVitals,
};