import Reservation from '../models/Reservation.js';
import ParkingSlot from '../models/ParkingSlot.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const checkIn = async (req, res) => {
  try {
    const { reservationId } = req.body;
    const reservation = await Reservation.findOne({ reservationId });
    if (!reservation) return sendError(res, 'Reservation not found', 404);
    if (!['pending', 'confirmed'].includes(reservation.status)) return sendError(res, 'Reservation is not eligible for check-in', 400);

    reservation.status = 'checked-in';
    await reservation.save();
    await ParkingSlot.findByIdAndUpdate(reservation.slot, { status: 'occupied' });
    return sendSuccess(res, reservation, 'Check-in approved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const checkOut = async (req, res) => {
  try {
    const { reservationId } = req.body;
    const reservation = await Reservation.findOne({ reservationId });
    if (!reservation) return sendError(res, 'Reservation not found', 404);
    if (reservation.status !== 'checked-in') return sendError(res, 'Reservation has not been checked in', 400);

    reservation.status = 'checked-out';
    await reservation.save();
    await ParkingSlot.findByIdAndUpdate(reservation.slot, { status: 'available' });
    return sendSuccess(res, reservation, 'Check-out approved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
