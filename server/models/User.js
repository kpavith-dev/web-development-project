import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'lecturer', 'staff', 'security', 'admin'], default: 'student' },
  registrationNumber: { type: String, trim: true },
  faculty: { type: String, trim: true },
  department: { type: String, trim: true },
  phoneNumber: { type: String, trim: true },
  vehicleNumber: { type: String, trim: true },
  vehicleType: { type: String, trim: true },
  vehicleBrand: { type: String, trim: true },
  profilePicture: { type: String },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
