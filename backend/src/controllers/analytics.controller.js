const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { queryOf, sendList } = require('../utils/http');
const analyticsService = require('../services/analytics.service');

/**
 * Analytics service functions take flat arguments (`{ from, to }`) rather than
 * the `{ user, query }` envelope used elsewhere, so each handler forwards the
 * validated query directly.
 */

const overview = asyncHandler(async (req, res) => {
  const data = await analyticsService.overview({ query: queryOf(req) });
  return success(res, { message: 'Analytics overview', data });
});

const appointmentsTrend = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const data = await analyticsService.appointmentsTrend({ days: query.days, departmentId: query.departmentId });
  return success(res, { message: 'Appointments trend', data });
});

const bedOccupancy = asyncHandler(async (req, res) => {
  const data = await analyticsService.bedOccupancy({ wardId: queryOf(req).wardId });
  return success(res, { message: 'Bed occupancy', data });
});

const revenueByDay = asyncHandler(async (req, res) => {
  const data = await analyticsService.revenueByDay({ days: queryOf(req).days });
  return success(res, { message: 'Revenue by day', data });
});

const departmentUtilisation = asyncHandler(async (req, res) => {
  const { from, to } = queryOf(req);
  const data = await analyticsService.departmentUtilisation({ from, to });
  return success(res, { message: 'Department utilisation', data });
});

const topPrescriptions = asyncHandler(async (req, res) => {
  const { from, to, limit } = queryOf(req);
  const data = await analyticsService.topPrescriptions({ from, to, limit });
  return success(res, { message: 'Top prescribed medications', data });
});

const workload = asyncHandler(async (req, res) => {
  const { from, to } = queryOf(req);
  const data = await analyticsService.workload({ from, to });
  return success(res, { message: 'Clinical workload', data });
});

const performance = asyncHandler(async (req, res) => {
  const { from, to, limit } = queryOf(req);
  const data = await analyticsService.performance({ from, to, limit });
  return success(res, { message: 'API performance', data });
});

const auditLog = asyncHandler(async (req, res) => {
  const result = await analyticsService.auditLog({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Audit log retrieved' });
});

const auditSummary = asyncHandler(async (req, res) => {
  const { from, to } = queryOf(req);
  const data = await analyticsService.auditSummary({ from, to });
  return success(res, { message: 'Audit summary', data });
});

module.exports = {
  overview,
  appointmentsTrend,
  bedOccupancy,
  revenueByDay,
  departmentUtilisation,
  topPrescriptions,
  workload,
  performance,
  auditLog,
  auditSummary,
};