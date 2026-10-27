import express from 'express';
import { register, login, logout, forgotPassword, resetPassword } from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';
import { validateRegister, validateLogin, validateResetPassword, handleValidationErrors } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.post('/register', authLimiter, validateRegister, handleValidationErrors, register);
router.post('/login', authLimiter, validateLogin, handleValidationErrors, login);
router.post('/logout', logout);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, validateResetPassword, handleValidationErrors, resetPassword);

export default router;
