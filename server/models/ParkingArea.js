import mongoose from 'mongoose';

const parkingAreaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  totalSlots: { type: Number, required: true },
  openingTime: { type: String, required: true, default: '08:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  closingTime: { type: String, required: true, default: '18:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  availableSlots: { type: Number, default: 0 },
  reservedSlots: { type: Number, default: 0 },
  occupiedSlots: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('ParkingArea', parkingAreaSchema);
