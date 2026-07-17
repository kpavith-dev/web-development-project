import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  type: { type: String, enum: ['daily', 'weekly', 'monthly', 'utilization', 'reservation', 'activity'], required: true },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  data: { type: Object, default: {} },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);
