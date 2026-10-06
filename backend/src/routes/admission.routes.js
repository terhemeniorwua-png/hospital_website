const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const controller = require('../controllers/admission.controller');
const schemas = require('../validators/admission.validator');

const router = express.Router();

router.use(authenticate);

/* Wards and beds ------------------------------------------------------------ */
router.get('/wards', authorize('admissions:read'), validate(schemas.listWards), controller.listWards);
router.get('/wards/:id', authorize('admissions:read'), validate(schemas.wardRoute), controller.getWard);
router.get('/wards/:id/available-bed', authorize('admissions:manage'), validate(schemas.wardRoute), controller.findAvailableBed);

router.get('/beds', authorize('admissions:read'), validate(schemas.listBeds), controller.listBeds);
router.get('/beds/counts', authorize('admissions:read'), validate(schemas.listBeds), controller.bedCounts);
router.patch('/beds/:id/status', authorize('beds:manage'), validate(schemas.idRoute), validate(schemas.setBedStatus), controller.setBedStatus);

/* Admissions ---------------------------------------------------------------- */
router.get('/', authorize('admissions:read'), validate(schemas.listAdmissions), controller.listAdmissions);
router.post('/', authorize('admissions:manage'), validate(schemas.admit), controller.admit);
router.get('/statistics', authorize('admissions:read'), validate(schemas.statistics), controller.statistics);

router.get('/:id', authorize('admissions:read'), validate(schemas.idRoute), controller.getAdmission);
router.post('/:id/transfer', authorize('admissions:manage'), validate(schemas.idRoute), validate(schemas.transfer), controller.transfer);
router.post('/:id/discharge', authorize('admissions:manage'), validate(schemas.idRoute), validate(schemas.discharge), controller.discharge);
router.get('/:id/discharge-summary', authorize('admissions:read'), validate(schemas.idRoute), controller.getDischargeSummary);

module.exports = router;