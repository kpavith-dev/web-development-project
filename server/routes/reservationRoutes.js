import express from 'express';
import { createReservation, getReservations, updateReservation, deleteReservation, checkInReservation, checkOutReservation } from '../controllers/reservationController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authenticate, createReservation);
router.get('/', authenticate, getReservations);
router.put('/:id', authenticate, updateReservation);
router.delete('/:id', authenticate, deleteReservation);
router.post('/:id/check-in', authenticate, checkInReservation);
router.post('/:id/check-out', authenticate, checkOutReservation);

export default router;
