import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Reservation from '../models/Reservation.js';
import SecurityLog from '../models/SecurityLog.js';
import Notification from '../models/Notification.js';
import { emitSlotUpdate } from '../socket.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { campusDateBounds, campusDateKey, campusDateTime, campusTime } from '../utils/campusTime.js';

const INVALID_PASS = 'Invalid or expired parking pass.';
const RESERVATION_REFERENCE = /^RES-[a-zA-Z0-9-]{1,120}$/;
const invalidPass = () => ({ error: INVALID_PASS, status: 400 });

const getReservationFromRequest = async (body, session = null) => {
  const { reservationId, qrData } = body || {};
  if (qrData !== undefined && reservationId !== undefined) return { error: 'Provide either a QR pass or a reservation reference, not both.', status: 400 };
  let reference = reservationId;
  let qrPayload;
  if (qrData !== undefined) {
    if (typeof qrData !== 'string' || !qrData.trim()) return invalidPass();
    try { qrPayload = jwt.verify(qrData.trim(), process.env.JWT_SECRET, { algorithms: ['HS256'] }); } catch { return invalidPass(); }
    if (!qrPayload || typeof qrPayload !== 'object' || qrPayload.type !== 'parking-pass' || typeof qrPayload.reservationId !== 'string' || !RESERVATION_REFERENCE.test(qrPayload.reservationId) || !mongoose.isValidObjectId(qrPayload.userId)) return invalidPass();
    reference = qrPayload.reservationId;
  } else if (typeof reference !== 'string' || !RESERVATION_REFERENCE.test(reference.trim())) {
    return { error: 'Invalid reservation reference.', status: 400 };
  } else reference = reference.trim();

  const reservation = await Reservation.findOne({ reservationId: reference }).populate('user', 'name email').populate('vehicle').populate({ path: 'slot', populate: { path: 'parkingArea' } }).session(session);
  if (!reservation) return qrPayload ? invalidPass() : { error: 'Reservation not found.', status: 404 };
  if (qrPayload && (reservation.user?._id.toString() !== qrPayload.userId || (qrPayload.slotId !== undefined && reservation.slot?._id.toString() !== qrPayload.slotId) || (qrPayload.vehicleId !== undefined && reservation.vehicle?._id.toString() !== qrPayload.vehicleId))) return invalidPass();
  return { reservation, qrPayload };
};

const validateReservationForSecurity = (reservation) => {
  if (!reservation || ['cancelled', 'expired', 'no-show', 'checked-out'].includes(reservation.status)) return INVALID_PASS;
  if (reservation.expiresAt && reservation.status !== 'checked-in' && reservation.expiresAt <= new Date()) return INVALID_PASS;
  if (!reservation.vehicle || !reservation.vehicle.isActive || reservation.vehicle.verificationStatus !== 'verified') return INVALID_PASS;
  if (!reservation.slot || !reservation.slot.isActive || !reservation.slot.parkingArea || !reservation.slot.parkingArea.isActive) return INVALID_PASS;
  return null;
};

const isWithinArrivalWindow = (reservation, now) => {
  if (campusDateKey(reservation.bookingDate) !== campusDateKey(now)) return false;
  const arrival = campusDateTime(reservation.bookingDate, reservation.arrivalTime);
  const departure = campusDateTime(reservation.bookingDate, reservation.departureTime);
  return Boolean(arrival && departure && now >= arrival && now <= departure && now <= new Date(arrival.getTime() + reservation.gracePeriodMinutes * 60 * 1000));
};

const withSecurityTransaction = async (work) => {
  const session = await mongoose.startSession();
  try { let result; await session.withTransaction(async () => { result = await work(session); }); return result; }
  catch (error) { if (/Transaction numbers are only allowed|replica set|transaction/i.test(error.message)) return { error: 'Security actions require MongoDB transactions. Configure MongoDB as a replica set.', status: 503 }; throw error; }
  finally { await session.endSession(); }
};

const updateSlotState = async (slot, session) => {
  if (slot.status === 'maintenance') return slot;
  const { date, nextDate } = campusDateBounds(new Date());
  const checkedIn = await Reservation.exists({ slot: slot._id, bookingDate: { $gte: date, $lt: nextDate }, status: 'checked-in' }).session(session);
  const reserved = await Reservation.exists({ slot: slot._id, bookingDate: { $gte: date, $lt: nextDate }, status: { $in: ['pending', 'confirmed'] }, arrivalTime: { $lte: campusTime() }, departureTime: { $gt: campusTime() } }).session(session);
  slot.status = checkedIn ? 'occupied' : reserved ? 'reserved' : 'available';
  await slot.save({ session });
  return slot;
};

export const verifyPass = async (req, res) => {
  try {
    const { reservation, error, status } = await getReservationFromRequest(req.body);
    if (error) return sendError(res, error, status || 400);
    const validationError = validateReservationForSecurity(reservation);
    if (validationError) return sendError(res, validationError, 400);
    return sendSuccess(res, reservation, 'Parking pass verified.');
  } catch { return sendError(res, INVALID_PASS, 400); }
};

const performSecurityAction = async (req, res, action) => {
  try {
    const resolved = await getReservationFromRequest(req.body);
    if (resolved.error) return sendError(res, resolved.error, resolved.status || 400);
    const verifiedBody = resolved.qrPayload ? { qrData: req.body.qrData } : { reservationId: resolved.reservation.reservationId };
    const result = await withSecurityTransaction(async (session) => {
      const lookup = await getReservationFromRequest(verifiedBody, session);
      if (lookup.error) throw Object.assign(new Error(lookup.error), { status: lookup.status || 400 });
      const reservation = lookup.reservation;
      const validationError = validateReservationForSecurity(reservation);
      if (validationError) throw Object.assign(new Error(validationError), { status: 400 });
      const now = new Date();
      if (action === 'check-in') {
        if (!['pending', 'confirmed'].includes(reservation.status)) throw Object.assign(new Error('Reservation is not eligible for check-in.'), { status: 400 });
        if (!isWithinArrivalWindow(reservation, now)) throw Object.assign(new Error('Check-in is only available during the reservation arrival window.'), { status: 400 });
        reservation.status = 'checked-in'; reservation.checkedInAt = now;
      } else {
        if (reservation.status !== 'checked-in') throw Object.assign(new Error('Reservation has not been checked in.'), { status: 400 });
        reservation.status = 'checked-out'; reservation.checkedOutAt = now;
      }
      await reservation.save({ session });
      const slot = await updateSlotState(reservation.slot, session);
      await SecurityLog.create([{ reservationId: reservation.reservationId, action, officer: req.user._id, vehicle: reservation.vehicle._id, slot: slot._id, description: `Reservation ${action} by ${req.user.role}.` }], { session });
      await Notification.create([{ user: reservation.user._id, title: action === 'check-in' ? 'Parking check-in completed' : 'Parking check-out completed', message: `Your reservation ${reservation.reservationId} was ${action}.`, type: action === 'check-in' ? 'reservation-check-in' : 'reservation-check-out' }], { session });
      return { reservation, slot };
    });
    if (result?.error) return sendError(res, result.error, result.status || 500);
    emitSlotUpdate(result.slot);
    return sendSuccess(res, result.reservation, action === 'check-in' ? 'Check-in approved.' : 'Check-out approved.');
  } catch (error) { return sendError(res, error.message === INVALID_PASS ? INVALID_PASS : (error.message || 'Unable to complete security action.'), error.status || 500); }
};

export const checkIn = (req, res) => performSecurityAction(req, res, 'check-in');
export const checkOut = (req, res) => performSecurityAction(req, res, 'check-out');
