const asyncHandler = require('../utils/asyncHandler');
const { created, success } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const consultationService = require('../services/consultation.service');

const list = asyncHandler(async (req, res) => {
  const result = await consultationService.list({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Consultations retrieved' });
});

const getById = asyncHandler(async (req, res) => {
  const data = await consultationService.getById({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Consultation retrieved', data });
});

const start = asyncHandler(async (req, res) => {
  const data = await consultationService.start({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Consultation started', data });
});

const update = asyncHandler(async (req, res) => {
  const data = await consultationService.update({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Consultation updated', data });
});

const complete = asyncHandler(async (req, res) => {
  const data = await consultationService.complete({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Consultation completed', data });
});

const addDiagnosis = asyncHandler(async (req, res) => {
  const data = await consultationService.addDiagnosis({
    user: req.user,
    consultationId: paramsOf(req).consultationId,
    data: bodyOf(req),
  });
  return created(res, { message: 'Diagnosis added', data });
});

const updateDiagnosis = asyncHandler(async (req, res) => {
  const data = await consultationService.updateDiagnosis({
    user: req.user,
    diagnosisId: paramsOf(req).diagnosisId,
    data: bodyOf(req),
  });
  return success(res, { message: 'Diagnosis updated', data });
});

const removeDiagnosis = asyncHandler(async (req, res) => {
  const data = await consultationService.updateDiagnosis({
    user: req.user,
    diagnosisId: paramsOf(req).diagnosisId,
    data: { status: 'RULED_OUT' },
  });
  return success(res, { message: 'Diagnosis ruled out', data });
});

const recordVitals = asyncHandler(async (req, res) => {
  const body = bodyOf(req);
  const data = await consultationService.recordVitals({
    user: req.user,
    patientId: body.patientId,
    consultationId: body.consultationId,
    data: body,
  });
  return created(res, { message: 'Vital signs recorded', data });
});

const clinicalHistory = asyncHandler(async (req, res) => {
  const data = await consultationService.clinicalHistory({
    user: req.user,
    patientId: paramsOf(req).patientId,
  });
  return success(res, { message: 'Clinical history retrieved', data });
});

const followUpList = asyncHandler(async (req, res) => {
  const result = await consultationService.followUpList({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Follow-ups retrieved' });
});

const statistics = asyncHandler(async (req, res) => {
  const data = await consultationService.statistics({ query: queryOf(req) });
  return success(res, { message: 'Consultation statistics', data });
});

module.exports = {
  list,
  getById,
  start,
  update,
  complete,
  addDiagnosis,
  updateDiagnosis,
  removeDiagnosis,
  recordVitals,
  clinicalHistory,
  followUpList,
  statistics,
};