import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleNumber: { type: String, required: true, trim: true, uppercase: true },
  vehicleType: { type: String, enum: ['car', 'motorcycle', 'bicycle', 'ev'], default: 'car' },
  vehicleBrand: { type: String, trim: true },
  model: { type: String, trim: true },
  color: { type: String, trim: true },
  registrationNumber: { type: String, trim: true },
  imageUrl: { type: String },
  isPrimary: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'verified' },
  rejectionReason: { type: String },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date }
}, { timestamps: true });

vehicleSchema.index({ user: 1, vehicleNumber: 1 });
vehicleSchema.index({ verificationStatus: 1, isActive: 1 });

export default mongoose.model('Vehicle', vehicleSchema);
