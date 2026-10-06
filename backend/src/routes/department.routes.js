const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const controller = require('../controllers/department.controller');
const schemas = require('../validators/department.validator');

const router = express.Router();

router.use(authenticate);

/* ------------------------------------------------------------------ *
 * Staff accounts (system-wide)
 *
 * Registered before `/:id` so that "staff" is not captured as a department id.
 * ------------------------------------------------------------------ */

router.get('/staff/roles', authorize('staff:read'), controller.roles);
router.get('/staff/directory', authorize('staff:read'), validate(schemas.staffListQuery), controller.staffDirectory);
router.get('/staff', authorize('staff:manage'), validate(schemas.staffListQuery), controller.listStaffAccounts);
router.post('/staff', authorize('staff:manage'), validate(schemas.createStaff), controller.createStaff);
router.get('/staff/:id', authorize('staff:read'), validate(schemas.userRoute), controller.getStaff);
router.put('/staff/:id', authorize('staff:manage'), validate(schemas.updateStaff), controller.updateStaff);
router.put('/staff/:id/role', authorize('users:manage'), validate(schemas.userRoute), validate(schemas.changeRole), controller.changeRole);
router.put('/staff/:id/status', authorize('users:manage'), validate(schemas.userRoute), validate(schemas.setStatus), controller.setStatus);

/* ------------------------------------------------------------------ *
 * Departments
 * ------------------------------------------------------------------ */

router.get('/', authorize('departments:read'), validate(schemas.listDepartments), controller.list);
router.post('/', authorize('departments:manage'), validate(schemas.createDepartment), controller.create);
router.get('/overview', authorize('departments:read'), controller.overview);

router.get('/:id', authorize('departments:read'), validate(schemas.departmentParam), controller.getById);
router.put('/:id', authorize('departments:manage'), validate(schemas.updateDepartment), controller.update);
router.delete('/:id', authorize('departments:manage'), validate(schemas.departmentParam), controller.remove);
router.get('/:id/statistics', authorize('departments:read'), validate(schemas.departmentStatistics), controller.statistics);

router.get('/:id/staff', authorize('departments:read'), validate(schemas.staffList), controller.listStaff);
router.post('/:id/staff', authorize('departments:manage'), validate(schemas.assignStaff), controller.assignStaff);
router.delete('/:id/staff/:userId', authorize('departments:manage'), validate(schemas.removeStaff), controller.removeStaff);

module.exports = router;