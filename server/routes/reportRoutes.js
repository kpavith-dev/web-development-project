import express from 'express';
import { getReports, generateReport } from '../controllers/reportController.js';
import { authenticate, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticate, getReports);
router.post('/', authenticate, authorizeRole('admin', 'security'), generateReport);

export default router;
