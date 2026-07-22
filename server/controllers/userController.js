import mongoose from 'mongoose';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getProfile = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      return sendSuccess(res, req.user || {}, 'Profile fetched');
    }
    return sendSuccess(res, req.user, 'Profile fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    return sendSuccess(res, user, 'Profile updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
