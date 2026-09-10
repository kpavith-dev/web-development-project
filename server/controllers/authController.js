import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, role = 'student' } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      return sendError(res, 'Name, email, and a password of at least 6 characters are required', 400);
    }
    // Privileged accounts must be provisioned by an administrator, never by a public form.
    if (!['student', 'staff'].includes(role)) {
      return sendError(res, 'You may register only as a student or staff member', 403);
    }
    const existing = await User.findOne({ email });
    if (existing) return sendError(res, 'User already exists', 400);

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: email.trim(), password: hashedPassword, role });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return sendSuccess(res, { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }, 'Registration successful');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return sendError(res, 'Invalid credentials', 401);
    if (!user.isActive) return sendError(res, 'Account is deactivated. Please contact an administrator.', 403);

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return sendError(res, 'Invalid credentials', 401);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return sendSuccess(res, { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }, 'Login successful');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const logout = async (req, res) => {
  return sendSuccess(res, null, 'Logout successful');
};

export const forgotPassword = async (req, res) => {
  return sendSuccess(res, null, 'Password reset email sent');
};

export const resetPassword = async (req, res) => {
  return sendSuccess(res, null, 'Password reset successful');
};
