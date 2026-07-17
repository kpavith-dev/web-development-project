import mongoose from 'mongoose';

const securityLogSchema = new mongoose.Schema({
  reservationId: { type: String, required: true },
  action: { type: String, enum: ['check-in', 'check-out', 'approved-entry', 'approved-exit'], required: true },
  officer: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('SecurityLog', securityLogSchema);
