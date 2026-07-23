import express from 'express';
import { createReservation, getReservations, updateReservation, deleteReservation, checkInReservation, checkOutReservation } from '../controllers/reservationController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { reservationLimiter } from '../middleware/rateLimitMiddleware.js';
import { validateReservation, validateMongoId, handleValidationErrors, validatePagination } from '../middleware/validationMiddleware.js';

const router = express.Router();

router.post('/', authenticate, reservationLimiter, validateReservation, handleValidationErrors, createReservation);
router.get('/', authenticate, validatePagination, handleValidationErrors, getReservations);
router.put('/:id', authenticate, validateMongoId, handleValidationErrors, updateReservation);
router.delete('/:id', authenticate, validateMongoId, handleValidationErrors, deleteReservation);
router.post('/:id/check-in', authenticate, validateMongoId, handleValidationErrors, checkInReservation);
router.post('/:id/check-out', authenticate, validateMongoId, handleValidationErrors, checkOutReservation);

export default router;
