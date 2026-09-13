import express from 'express';
import { checkIn, checkOut, verifyPass } from '../controllers/securityController.js';
import { authenticate, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/verify', authenticate, authorizeRole('security', 'admin'), verifyPass);
router.post('/check-in', authenticate, authorizeRole('security', 'admin'), checkIn);
router.post('/check-out', authenticate, authorizeRole('security', 'admin'), checkOut);

export default router;
