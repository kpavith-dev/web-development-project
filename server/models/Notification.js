import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['reservation-created', 'reservation-confirmed', 'reservation-cancelled', 'reservation-expired', 'reservation-check-in', 'reservation-check-out', 'reminder', 'vehicle-verified', 'system'], default: 'system' },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
