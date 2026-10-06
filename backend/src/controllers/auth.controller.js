const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { created, success } = require('../utils/apiResponse');
const authService = require('../services/auth.service');
const schemas = require('../validators/auth.validator');

const login = asyncHandler(async (req, res) => {
  const result = await authService.login({ ...req.body, req });
  return success(res, { message: 'Signed in', data: result });
});

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerPatient({ payload: req.body, req });
  return created(res, { message: 'Account created', data: result });
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh({ refreshToken: req.body.refreshToken, req });
  return success(res, { message: 'Token refreshed', data: result });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout({ refreshToken: req.body?.refreshToken, userId: req.user.id });
  return success(res, { message: 'Signed out' });
});

const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.id);
  return success(res, { message: 'Signed out of all devices' });
});

const me = asyncHandler(async (req, res) => {
  const data = await authService.me(req.user.id);
  return success(res, { message: 'Current account', data });
});

const changePassword = asyncHandler(async (req, res) => {
  const data = await authService.changePassword({ userId: req.user.id, ...req.body, req });
  return success(res, { message: 'Password changed', data });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const data = await authService.forgotPassword({ email: req.body.email, req });
  return success(res, { message: 'If the account exists a reset token has been generated', data });
});

const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword({ ...req.body, req });
  return success(res, { message: 'Password reset', data });
});

module.exports = {
  login,
  register,
  refresh,
  logout,
  logoutAll,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
  validateSchemas: schemas,
  validate,
};
