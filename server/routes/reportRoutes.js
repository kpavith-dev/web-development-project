import express from 'express';
import { getReports, getReportById, generateReport } from '../controllers/reportController.js';
import { authenticate, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticate, authorizeRole('admin'), getReports);
router.get('/:id', authenticate, authorizeRole('admin'), getReportById);
router.post('/', authenticate, authorizeRole('admin'), generateReport);

export default router;
