const asyncHandler = require('../utils/asyncHandler');
const { created, success, noContent } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const patientService = require('../services/patient.service');

const list = asyncHandler(async (req, res) => {
  const result = await patientService.list({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Patients retrieved' });
});

const getById = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const data = await patientService.getById({
    user: req.user,
    id: paramsOf(req).id,
    includeClinical: query.includeClinical === true || query.includeClinical === 'true',
  });
  return success(res, { message: 'Patient retrieved', data });
});

const search = asyncHandler(async (req, res) => {
  const result = await patientService.searchDirectory({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Search results' });
});

const create = asyncHandler(async (req, res) => {
  const body = bodyOf(req);
  const data = await patientService.create({ user: req.user, data: body, createLogin: body.createLogin === true });
  return created(res, { message: 'Patient registered', data });
});

const update = asyncHandler(async (req, res) => {
  const data = await patientService.update({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Patient updated', data });
});

const remove = asyncHandler(async (req, res) => {
  await patientService.remove({ user: req.user, id: paramsOf(req).id });
  return noContent(res);
});

const statistics = asyncHandler(async (req, res) => {
  const data = await patientService.statistics({ user: req.user });
  return success(res, { message: 'Patient statistics', data });
});

/* ------------------------------------------------------------------ *
 * Clinical sub-resources owned by the patient record
 * ------------------------------------------------------------------ */

const listAllergies = asyncHandler(async (req, res) => {
  const data = await patientService.allergies.list({ user: req.user, patientId: paramsOf(req).patientId });
  return success(res, { message: 'Allergies retrieved', data });
});

const addAllergy = asyncHandler(async (req, res) => {
  const data = await patientService.allergies.add({
    user: req.user,
    patientId: paramsOf(req).patientId,
    data: bodyOf(req),
  });
  return created(res, { message: 'Allergy recorded', data });
});

const removeAllergy = asyncHandler(async (req, res) => {
  await patientService.allergies.remove({
    user: req.user,
    patientId: paramsOf(req).patientId,
    id: paramsOf(req).allergyId,
  });
  return noContent(res);
});

const listConditions = asyncHandler(async (req, res) => {
  const data = await patientService.conditions.list({ user: req.user, patientId: paramsOf(req).patientId });
  return success(res, { message: 'Conditions retrieved', data });
});

const addCondition = asyncHandler(async (req, res) => {
  const data = await patientService.conditions.add({
    user: req.user,
    patientId: paramsOf(req).patientId,
    data: bodyOf(req),
  });
  return created(res, { message: 'Condition recorded', data });
});

const updateCondition = asyncHandler(async (req, res) => {
  const data = await patientService.conditions.update({
    user: req.user,
    patientId: paramsOf(req).patientId,
    id: paramsOf(req).conditionId,
    data: bodyOf(req),
  });
  return success(res, { message: 'Condition updated', data });
});

const removeCondition = asyncHandler(async (req, res) => {
  await patientService.conditions.remove({
    user: req.user,
    patientId: paramsOf(req).patientId,
    id: paramsOf(req).conditionId,
  });
  return noContent(res);
});

const listHistory = asyncHandler(async (req, res) => {
  const data = await patientService.history.list({ user: req.user, patientId: paramsOf(req).patientId });
  return success(res, { message: 'Medical history retrieved', data });
});

const addHistory = asyncHandler(async (req, res) => {
  const data = await patientService.history.add({
    user: req.user,
    patientId: paramsOf(req).patientId,
    data: bodyOf(req),
  });
  return created(res, { message: 'Medical history recorded', data });
});

module.exports = {
  list,
  getById,
  search,
  create,
  update,
  remove,
  statistics,
  listAllergies,
  addAllergy,
  removeAllergy,
  listConditions,
  addCondition,
  updateCondition,
  removeCondition,
  listHistory,
  addHistory,
};