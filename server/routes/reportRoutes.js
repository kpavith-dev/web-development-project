import express from 'express';
import { generateReport } from '../controllers/reportController.js';
import { authenticate, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authenticate, authorizeRole('admin', 'security'), generateReport);

export default router;
