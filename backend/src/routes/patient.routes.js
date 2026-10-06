const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const controller = require('../controllers/patient.controller');
const schemas = require('../validators/patient.validator');

const router = express.Router();

router.use(authenticate);

/**
 * Listing and reading are permission-gated; `patient.service.assertCanRead`
 * still scopes every result to what the caller is allowed to see, so a patient
 * token can never widen its own scope by hitting a staff route.
 */
router.get('/', authorize('patients:read'), validate(schemas.list), controller.list);
router.get('/search', authorize('patients:read'), validate(schemas.search), controller.search);
router.get('/statistics', authorize('patients:read'), controller.statistics);
router.post('/', authorize('patients:create'), validate(schemas.create), controller.create);

router.get('/:id', authorize('patients:read'), validate(schemas.show), controller.getById);
router.put('/:id', authorize('patients:update'), validate(schemas.update), controller.update);
router.delete('/:id', authorize('patients:delete'), validate(schemas.idRoute), controller.remove);

/* Clinical sub-resources -------------------------------------------------- */

router.get('/:patientId/allergies', authorize('patients:read'), validate(schemas.nestedIdOnly), controller.listAllergies);
router.post('/:patientId/allergies', authorize('patients:update'), validate(schemas.allergy), controller.addAllergy);
router.delete(
  '/:patientId/allergies/:allergyId',
  authorize('patients:update'),
  validate(schemas.nestedId),
  controller.removeAllergy,
);

router.get('/:patientId/conditions', authorize('patients:read'), validate(schemas.nestedIdOnly), controller.listConditions);
router.post('/:patientId/conditions', authorize('patients:update'), validate(schemas.condition), controller.addCondition);
router.put(
  '/:patientId/conditions/:conditionId',
  authorize('patients:update'),
  validate(schemas.conditionUpdate),
  controller.updateCondition,
);
router.delete(
  '/:patientId/conditions/:conditionId',
  authorize('patients:update'),
  validate(schemas.nestedId),
  controller.removeCondition,
);

router.get('/:patientId/history', authorize('patients:read'), validate(schemas.historyList), controller.listHistory);
router.post('/:patientId/history', authorize('patients:update'), validate(schemas.history), controller.addHistory);

module.exports = router;