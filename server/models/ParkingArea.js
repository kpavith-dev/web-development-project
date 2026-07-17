import mongoose from 'mongoose';

const parkingAreaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  totalSlots: { type: Number, required: true },
  availableSlots: { type: Number, default: 0 },
  reservedSlots: { type: Number, default: 0 },
  occupiedSlots: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('ParkingArea', parkingAreaSchema);
