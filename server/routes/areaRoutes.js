import express from 'express';
import { getAreas, createArea, updateArea, deleteArea } from '../controllers/areaController.js';
import { authenticate, authorizeRole } from '../middleware/authMiddleware.js';
import { validateArea, validateAreaUpdate, validateMongoId, handleValidationErrors } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.get('/', getAreas);
router.post('/', authenticate, authorizeRole('admin'), validateArea, handleValidationErrors, createArea);
router.put('/:id', authenticate, authorizeRole('admin'), validateMongoId, validateAreaUpdate, handleValidationErrors, updateArea);
router.delete('/:id', authenticate, authorizeRole('admin'), validateMongoId, handleValidationErrors, deleteArea);

export default router;
