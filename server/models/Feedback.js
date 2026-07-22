import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true, unique: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 500 }
}, { timestamps: true });

export default mongoose.model('Feedback', feedbackSchema);
