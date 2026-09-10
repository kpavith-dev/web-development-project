import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSlot', required: true },
  reservationId: { type: String, required: true, unique: true },
  bookingDate: { type: Date, required: true },
  arrivalTime: { type: String, required: true },
  departureTime: { type: String, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'expired', 'no-show', 'checked-in', 'checked-out'], default: 'pending' },
  qrCode: { type: String },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  checkedInAt: { type: Date },
  checkedOutAt: { type: Date },
  reminderSentAt: { type: Date },
  gracePeriodMinutes: { type: Number, default: 15 },
  expiresAt: { type: Date }
}, { timestamps: true });

// Queries for a slot and a date are the hot path when checking availability.
reservationSchema.index({ slot: 1, bookingDate: 1, status: 1, arrivalTime: 1, departureTime: 1 });
reservationSchema.index({ status: 1, expiresAt: 1 });
reservationSchema.index({ user: 1, bookingDate: 1, status: 1 });

export default mongoose.model('Reservation', reservationSchema);
