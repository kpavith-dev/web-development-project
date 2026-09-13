import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import Reservation from '../models/Reservation.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const createFeedback = async (req, res) => {
  try {
    const { reservation: reservationId, rating, comment = '' } = req.body || {};
    if (!mongoose.isValidObjectId(reservationId)) return sendError(res, 'Invalid reservation reference', 400);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return sendError(res, 'Rating must be between 1 and 5', 400);
    if (typeof comment !== 'string' || comment.trim().length > 500) return sendError(res, 'Comment must be 500 characters or fewer', 400);
    const reservation = await Reservation.findOne({ _id: reservationId, user: req.user._id, status: 'checked-out' });
    if (!reservation) return sendError(res, 'Feedback is available only for your completed reservations', 403);
    if (await Feedback.exists({ reservation: reservation._id })) return sendError(res, 'Feedback has already been submitted for this reservation', 409);
    const feedback = await Feedback.create({ reservation: reservation._id, user: req.user._id, rating, comment: comment.trim() });
    return sendSuccess(res, feedback, 'Thanks for your feedback', 201);
  } catch (error) { return sendError(res, error.code === 11000 ? 'Feedback has already been submitted for this reservation' : 'Unable to submit feedback', error.code === 11000 ? 409 : 500); }
};

export const getMyFeedback = async (req, res) => {
  try { return sendSuccess(res, await Feedback.find({ user: req.user._id }), 'Feedback fetched'); }
  catch { return sendError(res, 'Unable to fetch feedback', 500); }
};

export const getFeedbackSummary = async (_req, res) => {
  try {
    const [summary] = await Feedback.aggregate([{ $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]);
    return sendSuccess(res, summary || { average: 0, count: 0 }, 'Feedback summary fetched');
  } catch { return sendError(res, 'Unable to fetch feedback summary', 500); }
};
