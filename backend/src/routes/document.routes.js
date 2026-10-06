const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { single } = require('../middleware/upload');
const controller = require('../controllers/document.controller');
const schemas = require('../validators/document.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('documents:read'), validate(schemas.list), controller.list);

/**
 * `single('documents')` runs multer first (it populates `req.file` and the text
 * fields land on `req.body`), then the zod schema validates those fields.
 */
router.post(
  '/',
  authorize('documents:upload'),
  uploadLimiter,
  single('documents'),
  validate(schemas.create),
  controller.create,
);

router.get('/:id', authorize('documents:read'), validate(schemas.idRoute), controller.getById);
router.get('/:id/download', authorize('documents:read'), validate(schemas.idRoute), controller.download);
router.post('/:id/verify', authorize('documents:read'), validate(schemas.verifyChecksum), controller.verifyChecksum);

module.exports = router;