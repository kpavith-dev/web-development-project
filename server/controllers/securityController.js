import Reservation from '../models/Reservation.js';
import jwt from 'jsonwebtoken';
import SecurityLog from '../models/SecurityLog.js';
import { emitSlotUpdate } from '../socket.js';
import { syncSlotStatus } from '../services/slotStatus.js';
import { sendSuccess, sendError } from '../utils/response.js';

const getReservationFromRequest = async (req) => {
  const { reservationId, qrData } = req.body;
  let qrPayload;
  if (qrData) {
    try {
      qrPayload = typeof qrData === 'string' ? jwt.verify(qrData, process.env.JWT_SECRET) : qrData;
    } catch {
      return { error: 'Invalid QR data' };
    }
  }
  if (qrPayload && (!qrPayload.reservationId || qrPayload.userId === undefined || qrPayload.type !== 'parking-pass')) {
    return { error: 'Invalid QR data' };
  }
  if (qrPayload && reservationId && qrPayload.reservationId !== reservationId) {
    return { error: 'QR data does not match reservation' };
  }
  const reservation = await Reservation.findOne({ reservationId: qrPayload?.reservationId || reservationId }).populate('slot vehicle user');
  if (reservation && qrPayload && reservation.user?._id.toString() !== qrPayload.userId) return { error: 'QR user does not match reservation' };
  return { reservation };
};

const isWithinArrivalWindow = (reservation, now) => {
  const bookingDate = new Date(reservation.bookingDate);
  if (bookingDate.toDateString() !== now.toDateString()) return false;
  const [arrivalHour, arrivalMinute] = reservation.arrivalTime.split(':').map(Number);
  const arrival = new Date(bookingDate);
  arrival.setHours(arrivalHour, arrivalMinute, 0, 0);
  const [departureHour, departureMinute] = reservation.departureTime.split(':').map(Number);
  const departure = new Date(bookingDate);
  departure.setHours(departureHour, departureMinute, 0, 0);
  return now >= arrival && now <= new Date(arrival.getTime() + reservation.gracePeriodMinutes * 60 * 1000) && now <= departure;
};

export const checkIn = async (req, res) => {
  try {
    const { reservation, error } = await getReservationFromRequest(req);
    if (error) return sendError(res, error, 400);
    if (!reservation) return sendError(res, 'Reservation not found', 404);
    if (!['pending', 'confirmed'].includes(reservation.status)) return sendError(res, 'Reservation is not eligible for check-in', 400);
    if (!isWithinArrivalWindow(reservation, new Date())) return sendError(res, 'Check-in is only available during the reservation arrival window', 400);

    reservation.status = 'checked-in';
    reservation.checkedInAt = new Date();
    await reservation.save();
    const slot = await syncSlotStatus(reservation.slot._id);
    await SecurityLog.create({ reservationId: reservation.reservationId, action: 'check-in', officer: req.user._id, vehicle: reservation.vehicle?._id, slot: reservation.slot._id, description: 'Reservation checked in by security.' });
    emitSlotUpdate(slot);
    return sendSuccess(res, reservation, 'Check-in approved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const checkOut = async (req, res) => {
  try {
    const { reservation, error } = await getReservationFromRequest(req);
    if (error) return sendError(res, error, 400);
    if (!reservation) return sendError(res, 'Reservation not found', 404);
    if (reservation.status !== 'checked-in') return sendError(res, 'Reservation has not been checked in', 400);

    reservation.status = 'checked-out';
    reservation.checkedOutAt = new Date();
    await reservation.save();
    const slot = await syncSlotStatus(reservation.slot._id);
    await SecurityLog.create({ reservationId: reservation.reservationId, action: 'check-out', officer: req.user._id, vehicle: reservation.vehicle?._id, slot: reservation.slot._id, description: 'Reservation checked out by security.' });
    emitSlotUpdate(slot);
    return sendSuccess(res, reservation, 'Check-out approved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
