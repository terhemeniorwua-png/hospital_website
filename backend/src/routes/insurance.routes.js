const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizeAny } = require('../middleware/authorize');
const controller = require('../controllers/insurance.controller');
const schemas = require('../validators/insurance.validator');

const router = express.Router();

router.use(authenticate);

/* Providers ---------------------------------------------------------------- */
router.get('/providers', authorize('insurance:read'), validate(schemas.listProviders), controller.listProviders);
router.post('/providers', authorize('insurance:manage'), validate(schemas.createProvider), controller.createProvider);
router.get('/providers/:id', authorize('insurance:read'), validate(schemas.getProvider), controller.getProvider);

/* Policies ----------------------------------------------------------------- */
router.get('/policies', authorize('insurance:read'), validate(schemas.listPolicies), controller.listPolicies);
router.post('/policies', authorize('insurance:manage'), validate(schemas.policyBody), controller.createPolicy);
router.get('/policies/:id', authorize('insurance:read'), validate(schemas.idRoute), controller.getPolicy);
router.post('/coverage-check', authorize('insurance:read'), validate(schemas.coverageCheck), controller.coverageCheck);

/* Claims ------------------------------------------------------------------- */
router.get('/claims', authorize('insurance:read'), validate(schemas.listClaims), controller.listClaims);
router.post('/claims', authorize('insurance:manage'), validate(schemas.submitClaim), controller.submitClaim);
router.get('/claims/:id', authorize('insurance:read'), validate(schemas.idRoute), controller.getClaim);
router.post('/claims/:id/review', authorize('insurance:manage'), validate(schemas.idRoute), validate(schemas.reviewClaim), controller.reviewClaim);
router.post('/claims/:id/paid', authorizeAny('insurance:manage', 'payments:verify'), validate(schemas.idRoute), validate(schemas.markClaimPaid), controller.markClaimPaid);

router.get('/statistics', authorize('insurance:read'), validate(schemas.statistics), controller.statistics);

module.exports = router;