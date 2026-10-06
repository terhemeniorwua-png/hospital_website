const asyncHandler = require('../utils/asyncHandler');
const { created, success } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const admissionService = require('../services/admission.service');

/* ------------------------------------------------------------------ *
 * Wards and beds
 * ------------------------------------------------------------------ */

const listWards = asyncHandler(async (req, res) => {
  const result = await admissionService.listWards({ query: queryOf(req) });
  return sendList(res, result, { message: 'Wards retrieved' });
});

const getWard = asyncHandler(async (req, res) => {
  const data = await admissionService.getWard({ id: paramsOf(req).id });
  return success(res, { message: 'Ward retrieved', data });
});

const listBeds = asyncHandler(async (req, res) => {
  const result = await admissionService.listBeds({ query: queryOf(req) });
  return sendList(res, result, { message: 'Beds retrieved' });
});

const setBedStatus = asyncHandler(async (req, res) => {
  const body = bodyOf(req);
  const data = await admissionService.setBedStatus({
    user: req.user,
    id: paramsOf(req).id,
    status: body.status,
    notes: body.notes,
  });
  return success(res, { message: 'Bed status updated', data });
});

const bedCounts = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const data = await admissionService.bedCounts(query.wardId ? Number(query.wardId) : undefined);
  return success(res, { message: 'Bed counts', data });
});

const findAvailableBed = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const data = await admissionService.findAvailableBed({
    wardId: paramsOf(req).id,
    roomType: query.roomType,
  });
  return success(res, { message: 'Available bed', data });
});

/* ------------------------------------------------------------------ *
 * Admissions
 * ------------------------------------------------------------------ */

const listAdmissions = asyncHandler(async (req, res) => {
  const result = await admissionService.listAdmissions({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Admissions retrieved' });
});

const getAdmission = asyncHandler(async (req, res) => {
  const data = await admissionService.getAdmission({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Admission retrieved', data });
});

const admit = asyncHandler(async (req, res) => {
  const data = await admissionService.admit({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Patient admitted', data });
});

const transfer = asyncHandler(async (req, res) => {
  const data = await admissionService.transfer({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Patient transferred', data });
});

const discharge = asyncHandler(async (req, res) => {
  const data = await admissionService.discharge({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Patient discharged', data });
});

const getDischargeSummary = asyncHandler(async (req, res) => {
  const data = await admissionService.getDischargeSummary({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Discharge summary', data });
});

const statistics = asyncHandler(async (req, res) => {
  const data = await admissionService.statistics({ query: queryOf(req) });
  return success(res, { message: 'Admission statistics', data });
});

module.exports = {
  listWards,
  getWard,
  listBeds,
  setBedStatus,
  bedCounts,
  findAvailableBed,
  listAdmissions,
  getAdmission,
  admit,
  transfer,
  discharge,
  getDischargeSummary,
  statistics,
};