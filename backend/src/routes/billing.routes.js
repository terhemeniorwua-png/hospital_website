const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const controller = require('../controllers/billing.controller');
const schemas = require('../validators/billing.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('billing:read'), validate(schemas.list), controller.list);
router.post('/', authorize('billing:manage'), validate(schemas.create), controller.create);

router.get('/payments', authorize('billing:read'), validate(schemas.listPayments), controller.listPayments);
router.post('/payments', authorize('billing:manage'), validate(schemas.recordPayment), controller.recordPayment);
/** Refunds target a payment row, not the invoice. */
router.post('/payments/:id/refund', authorize('payments:verify'), validate(schemas.idRoute), validate(schemas.refundPayment), controller.refundPayment);
router.get('/unbilled', authorize('billing:manage'), validate(schemas.list), controller.collectUnbilledItems);
router.get('/statement/:patientId', authorize('billing:read'), validate(schemas.statement), controller.statement);
router.get('/statistics', authorize('billing:read'), validate(schemas.statistics), controller.statistics);

router.get('/:id', authorize('billing:read'), validate(schemas.idRoute), controller.getById);
router.post('/:id/items', authorize('billing:manage'), validate(schemas.idRoute), validate(schemas.addItem), controller.addItem);
router.delete('/:id/items/:itemId', authorize('billing:manage'), validate(schemas.itemRoute), controller.removeItem);
router.post('/:id/discount', authorize('billing:manage'), validate(schemas.idRoute), validate(schemas.applyDiscount), controller.applyDiscount);
router.post('/:id/issue', authorize('billing:manage'), validate(schemas.idRoute), controller.issue);
router.post('/:id/cancel', authorize('billing:manage'), validate(schemas.idRoute), validate(schemas.cancel), controller.cancel);
router.post('/:id/payments', authorize('billing:manage'), validate(schemas.idRoute), validate(schemas.recordPayment), controller.recordPayment);

module.exports = router;