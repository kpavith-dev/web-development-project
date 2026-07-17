import express from 'express';
import { getAreas, createArea, updateArea, deleteArea } from '../controllers/areaController.js';
import { authenticate, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAreas);
router.post('/', authenticate, authorizeRole('admin'), createArea);
router.put('/:id', authenticate, authorizeRole('admin'), updateArea);
router.delete('/:id', authenticate, authorizeRole('admin'), deleteArea);

export default router;
