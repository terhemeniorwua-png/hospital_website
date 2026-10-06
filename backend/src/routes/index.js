const express = require('express');

/**
 * API surface.
 *
 * Every module is mounted under `/api/v1` (see `env.API_PREFIX`); the router
 * only wires paths to controllers, all logic lives in `src/services`.
 */
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/patients', require('./patient.routes'));
router.use('/departments', require('./department.routes'));
router.use('/staff', require('./staff.routes'));
router.use('/appointments', require('./appointment.routes'));
router.use('/queue', require('./queue.routes'));
router.use('/consultations', require('./consultation.routes'));
router.use('/medical-records', require('./medicalRecord.routes'));
router.use('/laboratory', require('./laboratory.routes'));
router.use('/imaging', require('./imaging.routes'));
router.use('/pharmacy', require('./pharmacy.routes'));
router.use('/admissions', require('./admission.routes'));
router.use('/nursing', require('./nursing.routes'));
router.use('/emergency', require('./emergency.routes'));
router.use('/billing', require('./billing.routes'));
router.use('/insurance', require('./insurance.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/documents', require('./document.routes'));
router.use('/analytics', require('./analytics.routes'));

module.exports = router;