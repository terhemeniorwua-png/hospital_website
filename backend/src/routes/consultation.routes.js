const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizeAny } = require('../middleware/authorize');
const controller = require('../controllers/consultation.controller');
const schemas = require('../validators/consultation.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('consultations:read'), validate(schemas.list), controller.list);
router.post('/', authorize('consultations:write'), validate(schemas.start), controller.start);

router.get('/patient/:patientId/history', authorize('consultations:read'), validate(schemas.clinicalHistory), controller.clinicalHistory);
router.get('/follow-ups', authorize('consultations:read'), validate(schemas.followUps), controller.followUpList);
router.get('/statistics', authorize('consultations:read'), validate(schemas.statistics), controller.statistics);

router.post('/vitals', authorizeAny('nursing:write', 'consultations:write'), validate(schemas.recordVitals), controller.recordVitals);

router.get('/:id', authorize('consultations:read'), validate(schemas.idRoute), controller.getById);
router.put('/:id', authorize('consultations:write'), validate(schemas.update), controller.update);
router.post('/:id/complete', authorize('consultations:write'), validate(schemas.idRoute), validate(schemas.complete), controller.complete);

router.post('/:id/diagnoses', authorize('diagnoses:write'), validate(schemas.consultationRoute), validate(schemas.diagnosis), controller.addDiagnosis);
router.put('/:id/diagnoses/:diagnosisId', authorize('diagnoses:write'), validate(schemas.diagnosisRoute), validate(schemas.diagnosisUpdate), controller.updateDiagnosis);
router.delete('/:id/diagnoses/:diagnosisId', authorize('diagnoses:write'), validate(schemas.diagnosisRoute), controller.removeDiagnosis);

module.exports = router;