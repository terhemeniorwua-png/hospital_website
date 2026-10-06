const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizeAny } = require('../middleware/authorize');
const controller = require('../controllers/analytics.controller');
const schemas = require('../validators/analytics.validator');

const router = express.Router();

router.use(authenticate);

router.get('/overview', authorize('dashboard:admin'), validate(schemas.overview), controller.overview);
router.get('/appointments-trend', authorize('dashboard:admin'), validate(schemas.appointmentsTrend), controller.appointmentsTrend);
router.get('/bed-occupancy', authorizeAny('dashboard:admin', 'dashboard:nurse'), validate(schemas.bedOccupancy), controller.bedOccupancy);
router.get('/revenue-by-day', authorize('dashboard:admin'), validate(schemas.revenueByDay), controller.revenueByDay);
router.get('/department-utilisation', authorize('dashboard:admin'), validate(schemas.departmentUtilisation), controller.departmentUtilisation);
router.get('/top-prescriptions', authorize('dashboard:pharmacy'), validate(schemas.topPrescriptions), controller.topPrescriptions);
router.get('/workload', authorize('dashboard:doctor'), validate(schemas.workload), controller.workload);

router.get('/audit-log', authorize('audit:read'), validate(schemas.auditLog), controller.auditLog);
router.get('/audit-summary', authorize('audit:read'), validate(schemas.auditSummary), controller.auditSummary);
router.get('/performance', authorize('audit:read'), validate(schemas.performance), controller.performance);

module.exports = router;