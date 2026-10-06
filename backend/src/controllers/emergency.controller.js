const asyncHandler = require('../utils/asyncHandler');
const { created, success } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const emergencyService = require('../services/emergency.service');

const register = asyncHandler(async (req, res) => {
  const data = await emergencyService.register({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Emergency case registered', data });
});

const list = asyncHandler(async (req, res) => {
  const result = await emergencyService.list({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Emergency cases retrieved' });
});

const getCase = asyncHandler(async (req, res) => {
  const data = await emergencyService.getCase({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Emergency case retrieved', data });
});

const triage = asyncHandler(async (req, res) => {
  const data = await emergencyService.triage({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Case triaged', data });
});

const assignDoctor = asyncHandler(async (req, res) => {
  const body = bodyOf(req);
  const data = await emergencyService.assignDoctor({
    user: req.user,
    id: paramsOf(req).id,
    doctorId: body.doctorId,
    departmentId: body.departmentId,
  });
  return success(res, { message: 'Doctor assigned', data });
});

const callNext = asyncHandler(async (req, res) => {
  const data = await emergencyService.callNext({ user: req.user, data: bodyOf(req) });
  return success(res, { message: 'Next patient called', data });
});

const waitingRoom = asyncHandler(async (req, res) => {
  const data = await emergencyService.waitingRoom({ departmentId: queryOf(req).departmentId });
  return success(res, { message: 'Emergency waiting room', data });
});

const board = asyncHandler(async (req, res) => {
  const data = await emergencyService.board({ query: queryOf(req) });
  return success(res, { message: 'Emergency board', data });
});

const recordVitals = asyncHandler(async (req, res) => {
  const data = await emergencyService.recordVitals({
    user: req.user,
    caseId: paramsOf(req).id,
    data: bodyOf(req),
  });
  return created(res, { message: 'Observations recorded', data });
});

const startConsultation = asyncHandler(async (req, res) => {
  const data = await emergencyService.startConsultation({
    user: req.user,
    id: paramsOf(req).id,
    data: bodyOf(req),
  });
  return created(res, { message: 'Consultation started', data });
});

const linkPatient = asyncHandler(async (req, res) => {
  const data = await emergencyService.linkPatient({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Case linked to a patient', data });
});

const admit = asyncHandler(async (req, res) => {
  const data = await emergencyService.admit({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return created(res, { message: 'Patient admitted', data });
});

const discharge = asyncHandler(async (req, res) => {
  const data = await emergencyService.discharge({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Emergency visit completed', data });
});

const statistics = asyncHandler(async (req, res) => {
  const data = await emergencyService.statistics({ query: queryOf(req) });
  return success(res, { message: 'Emergency statistics', data });
});

module.exports = {
  register,
  list,
  getCase,
  triage,
  assignDoctor,
  callNext,
  waitingRoom,
  board,
  recordVitals,
  startConsultation,
  linkPatient,
  admit,
  discharge,
  statistics,
};