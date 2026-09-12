import express from 'express';
import { getSlots, getSlotById, createSlot, updateSlot, deleteSlot } from '../controllers/slotController.js';
import { authenticate, authorizeRole } from '../middleware/authMiddleware.js';
import { validateMongoId, validateSlot, handleValidationErrors } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.get('/', getSlots);
router.get('/:id', validateMongoId, handleValidationErrors, getSlotById);
router.post('/', authenticate, authorizeRole('admin'), validateSlot, handleValidationErrors, createSlot);
router.put('/:id', authenticate, authorizeRole('admin'), validateMongoId, validateSlot, handleValidationErrors, updateSlot);
router.delete('/:id', authenticate, authorizeRole('admin'), validateMongoId, handleValidationErrors, deleteSlot);

export default router;
