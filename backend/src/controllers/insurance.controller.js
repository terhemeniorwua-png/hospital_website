const asyncHandler = require('../utils/asyncHandler');
const { created, success } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const insuranceService = require('../services/insurance.service');

/* ------------------------------------------------------------------ *
 * Providers
 * ------------------------------------------------------------------ */

const listProviders = asyncHandler(async (req, res) => {
  const result = await insuranceService.listProviders({ query: queryOf(req) });
  return sendList(res, result, { message: 'Insurance providers retrieved' });
});

const getProvider = asyncHandler(async (req, res) => {
  const data = await insuranceService.getProvider({ id: paramsOf(req).id });
  return success(res, { message: 'Insurance provider retrieved', data });
});

const createProvider = asyncHandler(async (req, res) => {
  const data = await insuranceService.createProvider({ data: bodyOf(req) });
  return created(res, { message: 'Insurance provider created', data });
});

/* ------------------------------------------------------------------ *
 * Policies
 * ------------------------------------------------------------------ */

const listPolicies = asyncHandler(async (req, res) => {
  const result = await insuranceService.listPolicies({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Insurance policies retrieved' });
});

const getPolicy = asyncHandler(async (req, res) => {
  const data = await insuranceService.getPolicy({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Insurance policy retrieved', data });
});

const createPolicy = asyncHandler(async (req, res) => {
  const data = await insuranceService.createPolicy({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Insurance policy created', data });
});

const coverageCheck = asyncHandler(async (req, res) => {
  const data = await insuranceService.coverageCheck({ user: req.user, data: bodyOf(req) });
  return success(res, { message: 'Coverage check', data });
});

/* ------------------------------------------------------------------ *
 * Claims
 * ------------------------------------------------------------------ */

const listClaims = asyncHandler(async (req, res) => {
  const result = await insuranceService.listClaims({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Insurance claims retrieved' });
});

const getClaim = asyncHandler(async (req, res) => {
  const data = await insuranceService.getClaim({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Insurance claim retrieved', data });
});

const submitClaim = asyncHandler(async (req, res) => {
  const data = await insuranceService.submitClaim({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Claim submitted', data });
});

const reviewClaim = asyncHandler(async (req, res) => {
  const data = await insuranceService.reviewClaim({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Claim reviewed', data });
});

const markClaimPaid = asyncHandler(async (req, res) => {
  const data = await insuranceService.markClaimPaid({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Claim marked as paid', data });
});

const statistics = asyncHandler(async (req, res) => {
  const data = await insuranceService.statistics({ query: queryOf(req) });
  return success(res, { message: 'Insurance statistics', data });
});

module.exports = {
  listProviders,
  getProvider,
  createProvider,
  listPolicies,
  getPolicy,
  createPolicy,
  coverageCheck,
  listClaims,
  getClaim,
  submitClaim,
  reviewClaim,
  markClaimPaid,
  statistics,
};