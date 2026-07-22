import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleNumber: { type: String, required: true },
  vehicleType: { type: String, enum: ['car', 'motorcycle', 'bicycle', 'ev'], default: 'car' },
  vehicleBrand: { type: String },
  imageUrl: { type: String },
  isPrimary: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Vehicle', vehicleSchema);
