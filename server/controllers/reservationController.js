import Reservation from '../models/Reservation.js';
import ParkingSlot from '../models/ParkingSlot.js';
import QRCode from 'qrcode';
import { sendSuccess, sendError } from '../utils/response.js';

export const createReservation = async (req, res) => {
  try {
    const existing = await Reservation.findOne({ user: req.user._id, bookingDate: req.body.bookingDate, status: { $in: ['pending', 'confirmed', 'checked-in'] } });
    if (existing) return sendError(res, 'You already have an active reservation for that day', 400);

    const reservationId = `RES-${Date.now()}`;
    const qrData = `${reservationId}|${req.user._id}|${req.body.slot}|${req.body.bookingDate}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const reservation = await Reservation.create({
      ...req.body,
      user: req.user._id,
      reservationId,
      qrCode,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    await ParkingSlot.findByIdAndUpdate(req.body.slot, { status: 'reserved' });
    return sendSuccess(res, reservation, 'Reservation created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find().populate('user').populate('slot');
    return sendSuccess(res, reservations, 'Reservations fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return sendSuccess(res, reservation, 'Reservation updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteReservation = async (req, res) => {
  try {
    await Reservation.findByIdAndDelete(req.params.id);
    return sendSuccess(res, null, 'Reservation deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
