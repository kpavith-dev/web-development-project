import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleNumber: { type: String, required: true, trim: true, uppercase: true },
  vehicleType: { type: String, enum: ['car', 'motorcycle', 'bicycle', 'ev'], default: 'car' },
  vehicleBrand: { type: String, trim: true, maxlength: 100 },
  model: { type: String, trim: true, maxlength: 100 },
  color: { type: String, trim: true, maxlength: 50 },
  registrationNumber: { type: String, trim: true, maxlength: 50 },
  imageUrl: { type: String },
  isPrimary: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  rejectionReason: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

vehicleSchema.index({ user: 1, vehicleNumber: 1 }, { unique: true });

export default mongoose.model('Vehicle', vehicleSchema);
