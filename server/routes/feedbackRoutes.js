import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { createFeedback, getMyFeedback, getFeedbackSummary } from '../controllers/feedbackController.js';

const router = express.Router();
router.post('/', authenticate, createFeedback);
router.get('/mine', authenticate, getMyFeedback);
router.get('/summary', authenticate, getFeedbackSummary);
export default router;
