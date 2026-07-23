import express from 'express';
import { register, login, logout, forgotPassword, resetPassword } from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';
import { validateRegister, validateLogin, handleValidationErrors } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.post('/register', authLimiter, validateRegister, handleValidationErrors, register);
router.post('/login', authLimiter, validateLogin, handleValidationErrors, login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
