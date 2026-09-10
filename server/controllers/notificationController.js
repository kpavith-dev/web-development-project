import Notification from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30);
    return sendSuccess(res, notifications, 'Notifications fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return sendError(res, 'Notification not found', 404);
    return sendSuccess(res, notification, 'Notification marked as read');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    return sendSuccess(res, null, 'Notifications marked as read');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};