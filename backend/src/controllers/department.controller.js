const asyncHandler = require('../utils/asyncHandler');
const { created, success, noContent } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const departmentService = require('../services/department.service');
const staffService = require('../services/staff.service');

/* ------------------------------------------------------------------ *
 * Departments
 * ------------------------------------------------------------------ */

const list = asyncHandler(async (req, res) => {
  const result = await departmentService.list({ query: queryOf(req) });
  return sendList(res, result, { message: 'Departments retrieved' });
});

const getById = asyncHandler(async (req, res) => {
  const data = await departmentService.getById({ id: paramsOf(req).id });
  return success(res, { message: 'Department retrieved', data });
});

const create = asyncHandler(async (req, res) => {
  const data = await departmentService.create({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Department created', data });
});

const update = asyncHandler(async (req, res) => {
  const data = await departmentService.update({ id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Department updated', data });
});

const remove = asyncHandler(async (req, res) => {
  await departmentService.remove({ id: paramsOf(req).id });
  return noContent(res);
});

const statistics = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const data = await departmentService.statistics({
    id: paramsOf(req).id,
    from: query.from,
    to: query.to,
  });
  return success(res, { message: 'Department statistics', data });
});

const overview = asyncHandler(async (req, res) => {
  const data = await departmentService.overview();
  return success(res, { message: 'Department overview', data });
});

/* ------------------------------------------------------------------ *
 * Department staff
 * ------------------------------------------------------------------ */

const listStaff = asyncHandler(async (req, res) => {
  const result = await departmentService.listStaff({
    departmentId: paramsOf(req).id,
    query: queryOf(req),
  });
  return sendList(res, result, { message: 'Department staff retrieved' });
});

const assignStaff = asyncHandler(async (req, res) => {
  const body = bodyOf(req);
  const data = await departmentService.assignStaff({
    departmentId: paramsOf(req).id,
    userId: body.userId,
    roleInDepartment: body.roleInDepartment,
    isPrimary: body.isPrimary,
    assignedBy: req.user.id,
  });
  return created(res, { message: 'Staff assigned to department', data });
});

const removeStaff = asyncHandler(async (req, res) => {
  await departmentService.removeStaff({ departmentId: paramsOf(req).id, userId: paramsOf(req).userId });
  return noContent(res);
});

/* ------------------------------------------------------------------ *
 * Staff accounts (system-wide)
 * ------------------------------------------------------------------ */

const staffDirectory = asyncHandler(async (req, res) => {
  const result = await staffService.directory({ query: queryOf(req) });
  return sendList(res, result, { message: 'Staff directory retrieved' });
});

const listStaffAccounts = asyncHandler(async (req, res) => {
  const result = await staffService.list({ query: queryOf(req) });
  return sendList(res, result, { message: 'Staff accounts retrieved' });
});

const getStaff = asyncHandler(async (req, res) => {
  const data = await staffService.getById({ id: paramsOf(req).id });
  return success(res, { message: 'Staff account retrieved', data });
});

const createStaff = asyncHandler(async (req, res) => {
  const data = await staffService.create({ actor: req.user, data: bodyOf(req) });
  return created(res, { message: 'Staff account created', data });
});

const updateStaff = asyncHandler(async (req, res) => {
  const data = await staffService.update({ actor: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Staff account updated', data });
});

const changeRole = asyncHandler(async (req, res) => {
  const data = await staffService.changeRole({
    actor: req.user,
    userId: paramsOf(req).id,
    roleName: bodyOf(req).roleName,
    req,
  });
  return success(res, { message: 'Role updated', data });
});

const setStatus = asyncHandler(async (req, res) => {
  const data = await staffService.setStatus({
    actor: req.user,
    id: paramsOf(req).id,
    status: bodyOf(req).status,
    req,
  });
  return success(res, { message: 'Account status updated', data });
});

const roles = asyncHandler(async (req, res) => {
  const data = await staffService.roles();
  return success(res, { message: 'Roles retrieved', data });
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  statistics,
  overview,
  listStaff,
  assignStaff,
  removeStaff,
  staffDirectory,
  listStaffAccounts,
  getStaff,
  createStaff,
  updateStaff,
  changeRole,
  setStatus,
  roles,
};