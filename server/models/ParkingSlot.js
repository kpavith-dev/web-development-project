import mongoose from 'mongoose';

const parkingSlotSchema = new mongoose.Schema({
  slotNumber: { type: String, required: true, unique: true },
  parkingArea: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingArea', required: true },
  status: { type: String, enum: ['available', 'reserved', 'occupied', 'maintenance'], default: 'available' },
  vehicleTypeAllowed: { type: String, enum: ['car', 'motorcycle', 'bicycle', 'ev'], default: 'car' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('ParkingSlot', parkingSlotSchema);
