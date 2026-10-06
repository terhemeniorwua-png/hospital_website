const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const controller = require('../controllers/queue.controller');
const schemas = require('../validators/queue.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('queue:read'), validate(schemas.list), controller.list);
router.post('/', authorize('queue:manage'), validate(schemas.join), controller.join);

router.get('/board', authorize('queue:read'), validate(schemas.board), controller.board);
router.get('/estimate', authorize('queue:read'), validate(schemas.estimate), controller.estimate);
router.get('/statistics', authorize('queue:read'), validate(schemas.statistics), controller.statistics);
router.post('/call-next', authorize('queue:manage'), validate(schemas.callNext), controller.callNext);

router.get('/:id', authorize('queue:read'), validate(schemas.idRoute), controller.getById);
router.put('/:id', authorize('queue:manage'), validate(schemas.idRoute), validate(schemas.update), controller.update);
router.delete('/:id', authorize('queue:manage'), validate(schemas.idRoute), controller.remove);

router.post('/:id/start', authorize('queue:manage'), validate(schemas.idRoute), controller.startService);
router.post('/:id/complete', authorize('queue:manage'), validate(schemas.idRoute), validate(schemas.complete), controller.complete);
router.post('/:id/skip', authorize('queue:manage'), validate(schemas.idRoute), validate(schemas.skip), controller.skip);

module.exports = router;