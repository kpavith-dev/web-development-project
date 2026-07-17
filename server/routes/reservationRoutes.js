import express from 'express';
import { createReservation, getReservations, updateReservation, deleteReservation } from '../controllers/reservationController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authenticate, createReservation);
router.get('/', authenticate, getReservations);
router.put('/:id', authenticate, updateReservation);
router.delete('/:id', authenticate, deleteReservation);

export default router;
