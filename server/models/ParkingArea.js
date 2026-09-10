import mongoose from 'mongoose';

const parkingAreaSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, uppercase: true },
  description: { type: String, trim: true },
  location: { type: String, trim: true, default: 'Main Campus' },
  totalSlots: { type: Number, required: true, default: 0 },
  availableSlots: { type: Number, default: 0 },
  reservedSlots: { type: Number, default: 0 },
  occupiedSlots: { type: Number, default: 0 },
  maintenanceSlots: { type: Number, default: 0 },
  openingTime: { type: String, default: '06:00' },
  closingTime: { type: String, default: '22:00' },
  allowedVehicleTypes: {
    type: [String],
    enum: ['car', 'motorcycle', 'bicycle', 'ev'],
    default: ['car', 'motorcycle', 'bicycle', 'ev']
  },
  latitude: { type: Number, default: 6.9271 },
  longitude: { type: Number, default: 79.8612 },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' }
}, { timestamps: true });

parkingAreaSchema.index({ code: 1 });
parkingAreaSchema.index({ isActive: 1, status: 1 });

export default mongoose.model('ParkingArea', parkingAreaSchema);
