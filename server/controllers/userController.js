import mongoose from 'mongoose';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import Reservation from '../models/Reservation.js';
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
    const editableFields = ['name', 'phoneNumber', 'faculty', 'department', 'registrationNumber'];
    const updates = editableFields.reduce((allowed, field) => {
      if (req.body[field] !== undefined) allowed[field] = req.body[field];
      return allowed;
    }, {});
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    return sendSuccess(res, user, 'Profile updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getUsers = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.active === 'true' || req.query.active === 'false') filter.isActive = req.query.active === 'true';
    if (req.query.search?.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: new RegExp(escaped, 'i') }, { email: new RegExp(escaped, 'i') }, { registrationNumber: new RegExp(escaped, 'i') }];
    }
    const [users, total] = await Promise.all([
      User.find(filter).select('-password -resetPasswordToken -resetPasswordExpires').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter)
    ]);
    return sendSuccess(res, users, 'Users fetched', 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!user) return sendError(res, 'User not found', 404);
    const [vehicles, reservations] = await Promise.all([
      Vehicle.find({ user: user._id }),
      Reservation.find({ user: user._id }).sort({ bookingDate: -1 }).limit(20).populate('slot', 'slotNumber')
    ]);
    return sendSuccess(res, { user, vehicles, reservations }, 'User details fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateUserAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 'User not found', 404);
    const { role, isActive } = req.body;
    if (role !== undefined && !['student', 'lecturer', 'staff', 'security', 'admin'].includes(role)) return sendError(res, 'Invalid role', 400);
    if (user._id.equals(req.user._id) && ((role && role !== 'admin') || isActive === false)) return sendError(res, 'You cannot remove your own administrator access', 400);
    if (role !== undefined) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    await user.save();
    return sendSuccess(res, user.toObject({ transform: (_doc, value) => { delete value.password; delete value.resetPasswordToken; delete value.resetPasswordExpires; return value; } }), 'User updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
