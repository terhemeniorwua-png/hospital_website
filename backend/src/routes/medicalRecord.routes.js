const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const controller = require('../controllers/medicalRecord.controller');
const schemas = require('../validators/medicalRecord.validator');

const router = express.Router();

router.use(authenticate);

/**
 * Every action here is additionally guarded by `medicalRecord.service`'s
 * `assertCanAccess`, which is what stops a patient reading someone else's file.
 */
router.get('/:patientId/records', authorize('medical_records:read'), validate(schemas.list), controller.list);
router.get('/:patientId/timeline', authorize('medical_records:read'), validate(schemas.timeline), controller.timeline);
router.get('/:patientId/summary', authorize('medical_records:read'), validate(schemas.summary), controller.summary);
router.get('/:patientId/export', authorize('medical_records:read'), validate(schemas.exportRecord), controller.exportRecord);

module.exports = router;