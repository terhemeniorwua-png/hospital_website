const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const controller = require('../controllers/imaging.controller');
const schemas = require('../validators/imaging.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('imaging:read'), validate(schemas.list), controller.list);
router.post('/', authorize('imaging:write'), validate(schemas.create), controller.create);

router.get('/:id', authorize('imaging:read'), validate(schemas.idRoute), controller.getById);
router.post('/:id/report', authorize('imaging:write'), validate(schemas.idRoute), validate(schemas.recordReport), controller.recordReport);
router.patch('/:id/status', authorize('imaging:write'), validate(schemas.idRoute), validate(schemas.updateStatus), controller.updateStatus);

module.exports = router;