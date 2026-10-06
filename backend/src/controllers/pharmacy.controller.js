const asyncHandler = require('../utils/asyncHandler');
const { created, success } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const pharmacyService = require('../services/pharmacy.service');

/* ------------------------------------------------------------------ *
 * Prescriptions
 * ------------------------------------------------------------------ */

const list = asyncHandler(async (req, res) => {
  const result = await pharmacyService.list({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Prescriptions retrieved' });
});

const getById = asyncHandler(async (req, res) => {
  const data = await pharmacyService.getById({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Prescription retrieved', data });
});

const create = asyncHandler(async (req, res) => {
  const data = await pharmacyService.create({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Prescription created', data });
});

const update = asyncHandler(async (req, res) => {
  const data = await pharmacyService.update({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Prescription updated', data });
});

const verify = asyncHandler(async (req, res) => {
  const data = await pharmacyService.verify({
    user: req.user,
    id: paramsOf(req).id,
    pharmacyNotes: bodyOf(req).pharmacyNotes,
  });
  return success(res, { message: 'Prescription verified', data });
});

const dispense = asyncHandler(async (req, res) => {
  const data = await pharmacyService.dispense({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Prescription dispensed', data });
});

const cancel = asyncHandler(async (req, res) => {
  const data = await pharmacyService.cancel({
    user: req.user,
    id: paramsOf(req).id,
    reason: bodyOf(req).reason,
  });
  return success(res, { message: 'Prescription cancelled', data });
});

/* ------------------------------------------------------------------ *
 * Medication catalogue and inventory
 * ------------------------------------------------------------------ */

const listMedications = asyncHandler(async (req, res) => {
  const result = await pharmacyService.listMedications({ query: queryOf(req) });
  return sendList(res, result, { message: 'Medications retrieved' });
});

const listInventory = asyncHandler(async (req, res) => {
  const result = await pharmacyService.listInventory({ query: queryOf(req) });
  return sendList(res, result, { message: 'Inventory batches retrieved' });
});

const restock = asyncHandler(async (req, res) => {
  const data = await pharmacyService.restock({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Stock received', data });
});

const adjust = asyncHandler(async (req, res) => {
  const data = await pharmacyService.adjust({ user: req.user, id: paramsOf(req).id, data: bodyOf(req) });
  return success(res, { message: 'Inventory adjusted', data });
});

const listTransactions = asyncHandler(async (req, res) => {
  const result = await pharmacyService.listTransactions({ query: queryOf(req) });
  return sendList(res, result, { message: 'Inventory transactions retrieved' });
});

const inventoryAlerts = asyncHandler(async (req, res) => {
  const data = await pharmacyService.inventoryAlerts();
  return success(res, { message: 'Inventory alerts', data });
});

const statistics = asyncHandler(async (req, res) => {
  const data = await pharmacyService.statistics({ query: queryOf(req) });
  return success(res, { message: 'Pharmacy statistics', data });
});

module.exports = {
  list,
  getById,
  create,
  update,
  verify,
  dispense,
  cancel,
  listMedications,
  listInventory,
  restock,
  adjust,
  listTransactions,
  inventoryAlerts,
  statistics,
};