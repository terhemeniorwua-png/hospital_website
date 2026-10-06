const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const controller = require('../controllers/nursing.controller');
const schemas = require('../validators/nursing.validator');

const router = express.Router();

router.use(authenticate);

router.get('/assigned-patients', authorize('nursing:read'), validate(schemas.listQuery), controller.assignedPatients);
router.get('/doctor-orders', authorize('nursing:read'), validate(schemas.doctorOrders), controller.doctorOrders);
router.get('/statistics', authorize('nursing:read'), validate(schemas.statistics), controller.statistics);

/* Notes --------------------------------------------------------------------- */
router.get('/notes', authorize('nursing:read'), validate(schemas.listQuery), controller.listNotes);
router.post('/notes', authorize('nursing:write'), validate(schemas.createNote), controller.createNote);

/* Medication administration -------------------------------------------------- */
router.get('/administrations', authorize('nursing:read'), validate(schemas.listQuery), controller.listAdministrations);
router.post('/administrations/schedule', authorize('nursing:write'), validate(schemas.createSchedule), controller.createSchedule);
router.post('/administrations/:id', authorize('nursing:write'), validate(schemas.idRoute), validate(schemas.recordAdministration), controller.recordAdministration);

/* Observations --------------------------------------------------------------- */
router.get('/vitals', authorize('nursing:read'), validate(schemas.listQuery), controller.listVitals);
router.post('/vitals', authorize('nursing:write'), validate(schemas.recordVitals), controller.recordVitals);

module.exports = router;