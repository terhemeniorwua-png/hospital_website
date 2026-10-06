const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const controller = require('../controllers/department.controller');
const schemas = require('../validators/department.validator');

/**
 * System-wide staff accounts, mounted at `/api/v1/staff`.
 *
 * Department-scoped staffing lives under `/departments/:id/staff`.
 */
const router = express.Router();

router.use(authenticate);

router.get('/roles', authorize('staff:read'), controller.roles);
router.get('/directory', authorize('staff:read'), validate(schemas.staffListQuery), controller.staffDirectory);
router.get('/', authorize('staff:manage'), validate(schemas.staffListQuery), controller.listStaffAccounts);
router.post('/', authorize('staff:manage'), validate(schemas.createStaff), controller.createStaff);

router.get('/:id', authorize('staff:read'), validate(schemas.userRoute), controller.getStaff);
router.put('/:id', authorize('staff:manage'), validate(schemas.updateStaff), controller.updateStaff);
router.put('/:id/role', authorize('users:manage'), validate(schemas.userRoute), validate(schemas.changeRole), controller.changeRole);
router.put('/:id/status', authorize('users:manage'), validate(schemas.userRoute), validate(schemas.setStatus), controller.setStatus);

module.exports = router;