import express from 'express';
import { getSlots, getSlotById, createSlot, updateSlot, deleteSlot } from '../controllers/slotController.js';
import { authenticate, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getSlots);
router.get('/:id', getSlotById);
router.post('/', authenticate, authorizeRole('admin'), createSlot);
router.put('/:id', authenticate, authorizeRole('admin'), updateSlot);
router.delete('/:id', authenticate, authorizeRole('admin'), deleteSlot);

export default router;
