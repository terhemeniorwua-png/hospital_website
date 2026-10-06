const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const controller = require('../controllers/pharmacy.controller');
const schemas = require('../validators/pharmacy.validator');

const router = express.Router();

router.use(authenticate);

/* Medication catalogue and stock -------------------------------------------- */
router.get('/medications', authorize('prescriptions:read'), validate(schemas.listMedications), controller.listMedications);
router.get('/inventory', authorize('pharmacy:inventory'), validate(schemas.listInventory), controller.listInventory);
router.get('/inventory/alerts', authorize('pharmacy:inventory'), controller.inventoryAlerts);
router.get('/inventory/transactions', authorize('pharmacy:inventory'), validate(schemas.listTransactions), controller.listTransactions);
router.post('/inventory/restock', authorize('pharmacy:inventory'), validate(schemas.restock), controller.restock);
router.patch('/inventory/batches/:id', authorize('pharmacy:inventory'), validate(schemas.medicationRoute), validate(schemas.adjust), controller.adjust);
router.get('/statistics', authorize('dashboard:pharmacy'), controller.statistics);

/* Prescriptions ------------------------------------------------------------- */
router.get('/', authorize('prescriptions:read'), validate(schemas.listPrescriptions), controller.list);
router.post('/', authorize('prescriptions:write'), validate(schemas.createPrescription), controller.create);

router.get('/:id', authorize('prescriptions:read'), validate(schemas.idRoute), controller.getById);
router.put('/:id', authorize('prescriptions:write'), validate(schemas.idRoute), validate(schemas.updatePrescription), controller.update);
router.post('/:id/verify', authorize('prescriptions:read'), validate(schemas.idRoute), validate(schemas.verify), controller.verify);
router.post('/:id/dispense', authorize('pharmacy:dispense'), validate(schemas.idRoute), validate(schemas.dispense), controller.dispense);
router.post('/:id/cancel', authorize('prescriptions:write'), validate(schemas.idRoute), validate(schemas.cancel), controller.cancel);

module.exports = router;