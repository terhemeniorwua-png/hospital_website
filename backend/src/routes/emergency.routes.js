const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const controller = require('../controllers/emergency.controller');
const schemas = require('../validators/emergency.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('emergency:read'), validate(schemas.list), controller.list);
router.post('/', authorize('emergency:manage'), validate(schemas.register), controller.register);

router.get('/waiting-room', authorize('emergency:read'), validate(schemas.waitingRoom), controller.waitingRoom);
router.get('/board', authorize('emergency:read'), validate(schemas.board), controller.board);
router.get('/statistics', authorize('emergency:read'), validate(schemas.statistics), controller.statistics);
router.post('/call-next', authorize('emergency:manage'), validate(schemas.callNext), controller.callNext);

router.get('/:id', authorize('emergency:read'), validate(schemas.idRoute), controller.getCase);
router.post('/:id/triage', authorize('emergency:manage'), validate(schemas.idRoute), validate(schemas.triage), controller.triage);
router.post('/:id/assign-doctor', authorize('emergency:manage'), validate(schemas.idRoute), validate(schemas.assignDoctor), controller.assignDoctor);
router.post('/:id/vitals', authorize('emergency:manage'), validate(schemas.idRoute), validate(schemas.recordVitals), controller.recordVitals);
router.post('/:id/link-patient', authorize('emergency:manage'), validate(schemas.idRoute), validate(schemas.linkPatient), controller.linkPatient);
router.post('/:id/consultation', authorize('consultations:write'), validate(schemas.idRoute), validate(schemas.startConsultation), controller.startConsultation);
router.post('/:id/admit', authorize('admissions:manage'), validate(schemas.idRoute), validate(schemas.admit), controller.admit);
router.post('/:id/discharge', authorize('emergency:manage'), validate(schemas.idRoute), validate(schemas.discharge), controller.discharge);

module.exports = router;