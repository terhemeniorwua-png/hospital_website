const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const controller = require('../controllers/appointment.controller');
const schemas = require('../validators/appointment.validator');

const router = express.Router();

router.use(authenticate);

/* Static segments first so they are not swallowed by `/:id`. */
router.get('/availability', authorize('appointments:read'), validate(schemas.availability), controller.availability);
router.get('/doctors', authorize('appointments:read'), validate(schemas.availableDoctors), controller.availableDoctors);
router.get('/follow-ups', authorize('appointments:read'), validate(schemas.followUps), controller.followUps);
router.get('/statistics', authorize('appointments:read'), validate(schemas.statistics), controller.statistics);
router.get('/statuses', controller.statuses);
router.post('/no-shows/sweep', authorize('appointments:manage'), validate(schemas.markNoShows), controller.markNoShows);
router.put('/slots/:doctorId/:slotId', authorize('appointments:manage'), validate(schemas.blockSlot), controller.blockSlot);

router.get('/', authorize('appointments:read'), validate(schemas.list), controller.list);
router.post('/', authorize('appointments:create'), validate(schemas.book), controller.book);

router.get('/patient/:patientId/history', authorize('appointments:read'), validate(schemas.patientHistory), controller.patientHistory);

router.get('/:id', authorize('appointments:read'), validate(schemas.idRoute), controller.getById);
router.put('/:id', authorize('appointments:update'), validate(schemas.reschedule), controller.reschedule);

router.post('/:id/confirm', authorize('appointments:update'), validate(schemas.idRoute), validate(schemas.reasonBody), controller.confirm);
router.post('/:id/check-in', authorize('appointments:update'), validate(schemas.idRoute), validate(schemas.reasonBody), controller.checkIn);
router.post('/:id/start', authorize('consultations:write'), validate(schemas.idRoute), validate(schemas.reasonBody), controller.start);
router.post('/:id/complete', authorize('consultations:write'), validate(schemas.idRoute), validate(schemas.reasonBody), controller.complete);
router.post('/:id/cancel', authorize('appointments:update'), validate(schemas.idRoute), validate(schemas.reasonBody), controller.cancel);
router.post('/:id/no-show', authorize('appointments:update'), validate(schemas.idRoute), validate(schemas.reasonBody), controller.markNoShow);

module.exports = router;