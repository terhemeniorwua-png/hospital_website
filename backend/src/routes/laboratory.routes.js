const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizeAny } = require('../middleware/authorize');
const controller = require('../controllers/laboratory.controller');
const schemas = require('../validators/laboratory.validator');

const router = express.Router();

router.use(authenticate);

/* Test catalogue ------------------------------------------------------------ */
router.get('/tests', authorize('lab_orders:read'), validate(schemas.listTests), controller.listTests);
router.get('/tests/:id', authorize('lab_orders:read'), validate(schemas.testRoute), controller.getTest);
router.get('/results', authorizeAny('lab_results:write', 'lab_orders:read'), validate(schemas.listResults), controller.listResults);
router.get('/statistics', authorize('lab_orders:read'), validate(schemas.statistics), controller.statistics);

/* Orders -------------------------------------------------------------------- */
router.get('/', authorize('lab_orders:read'), validate(schemas.listOrders), controller.listOrders);
router.post('/', authorize('lab_orders:write'), validate(schemas.createOrder), controller.createOrder);

router.get('/:id', authorize('lab_orders:read'), validate(schemas.idRoute), controller.getOrder);
router.patch('/:id/status', authorize('lab_orders:write'), validate(schemas.idRoute), validate(schemas.updateStatus), controller.updateStatus);

router.post('/:id/results', authorize('lab_results:write'), validate(schemas.idRoute), validate(schemas.recordResult), controller.recordResult);
router.post('/:id/publish', authorize('lab_results:publish'), validate(schemas.idRoute), controller.publishResults);

module.exports = router;