import express from 'express';
import { getProfile, updateProfile, getUsers, getUserById, updateUserAdmin } from '../controllers/userController.js';
import { authenticate, authorizeRole } from '../middleware/authMiddleware.js';
import { validateUserUpdate, validateMongoId, validatePagination, handleValidationErrors } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validateUserUpdate, handleValidationErrors, updateProfile);
router.get('/', authenticate, authorizeRole('admin'), validatePagination, handleValidationErrors, getUsers);
router.get('/:id', authenticate, authorizeRole('admin'), validateMongoId, handleValidationErrors, getUserById);
router.patch('/:id', authenticate, authorizeRole('admin'), validateMongoId, handleValidationErrors, updateUserAdmin);

export default router;
