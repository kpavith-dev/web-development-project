import express from 'express';
import Feedback from '../models/Feedback.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = express.Router();
router.post('/', authenticate, async (req, res) => {
  try {
    const feedback = await Feedback.create({ ...req.body, user: req.user._id });
    return sendSuccess(res, feedback, 'Thanks for your feedback', 201);
  } catch (error) { return sendError(res, error.code === 11000 ? 'Feedback has already been submitted for this reservation' : error.message, 400); }
});
router.get('/summary', authenticate, async (_req, res) => {
  const [summary] = await Feedback.aggregate([{ $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]);
  return sendSuccess(res, summary || { average: 0, count: 0 }, 'Feedback summary fetched');
});
export default router;
