import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendPasswordResetEmail } from '../services/email.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, role = 'student' } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      return sendError(res, 'Name, email, and a password of at least 6 characters are required', 400);
    }
    // Privileged accounts must be provisioned by an administrator, never by a public form.
    if (!['student', 'lecturer', 'staff'].includes(role)) {
      return sendError(res, 'You may register only as a student, lecturer, or staff member', 403);
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
  try {
    const email = req.body.email?.trim().toLowerCase();
    // Always return the same response so this endpoint cannot reveal account existence.
    const successMessage = 'If an account exists for that email, a reset link has been sent.';
    if (!email) return sendSuccess(res, null, successMessage);
    const user = await User.findOne({ email, isActive: true });
    if (!user) return sendSuccess(res, null, successMessage);

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const delivered = await sendPasswordResetEmail({ email: user.email, token });
    if (!delivered) return sendError(res, 'Password reset email is not configured. Contact an administrator.', 503);
    return sendSuccess(res, null, successMessage);
  } catch (error) {
    return sendError(res, 'Unable to send password reset email', 500);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) return sendError(res, 'A valid reset token and a password of at least 6 characters are required', 400);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ resetPasswordToken: tokenHash, resetPasswordExpires: { $gt: new Date() } });
    if (!user) return sendError(res, 'This password reset link is invalid or has expired', 400);
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return sendSuccess(res, null, 'Password reset successful. You can now sign in.');
  } catch (error) {
    return sendError(res, 'Unable to reset password', 500);
  }
};
