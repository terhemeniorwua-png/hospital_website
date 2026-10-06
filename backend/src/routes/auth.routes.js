const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const controller = require('../controllers/auth.controller');
const schemas = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', authLimiter, validate(schemas.register), controller.register);
router.post('/login', authLimiter, validate(schemas.login), controller.login);
router.post('/refresh', authLimiter, validate(schemas.refresh), controller.refresh);
router.post('/forgot-password', authLimiter, validate(schemas.forgotPassword), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate(schemas.resetPassword), controller.resetPassword);

router.get('/me', authenticate, controller.me);
router.post('/logout', authenticate, controller.logout);
router.post('/logout-all', authenticate, controller.logoutAll);
router.post('/change-password', authenticate, validate(schemas.changePassword), controller.changePassword);

module.exports = router;
