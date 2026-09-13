import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Reservation from '../models/Reservation.js';
import ParkingSlot from '../models/ParkingSlot.js';
import Vehicle from '../models/Vehicle.js';
import Notification from '../models/Notification.js';
import { checkIn as performSecurityCheckIn, checkOut as performSecurityCheckOut } from './securityController.js';
import QRCode from 'qrcode';
import { sendSuccess, sendError } from '../utils/response.js';
import { emitSlotUpdate } from '../socket.js';
import { syncSlotStatus } from '../services/slotStatus.js';
import { campusDateBounds, campusDateKey, campusDateTime } from '../utils/campusTime.js';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked-in'];
const validTimeRange = (arrivalTime, departureTime) => (
  /^([01]\d|2[0-3]):[0-5]\d$/.test(arrivalTime || '')
  && /^([01]\d|2[0-3]):[0-5]\d$/.test(departureTime || '')
  && arrivalTime < departureTime
);
const arrivalDeadline = (bookingDate, arrivalTime, gracePeriodMinutes = 15) => {
  const arrival = campusDateTime(bookingDate, arrivalTime);
  return arrival ? new Date(arrival.getTime() + gracePeriodMinutes * 60 * 1000) : null;
};
const isWithinOperatingHours = (area, arrivalTime, departureTime) => (
  arrivalTime >= area.openingTime && departureTime <= area.closingTime
);
const validateBooking = async ({ slotId, vehicleId, bookingDate, arrivalTime, departureTime, userId, excludeId, session }) => {
  const bounds = campusDateBounds(bookingDate);
  if (!slotId || !bounds || !validTimeRange(arrivalTime, departureTime)) return { error: 'Provide a slot, a valid booking date, and an arrival time before departure time' };
  if (!mongoose.isValidObjectId(slotId)) return { error: 'Selected parking slot ID is invalid' };
  if (vehicleId && !mongoose.isValidObjectId(vehicleId)) return { error: 'Selected vehicle ID is invalid' };
  if (bounds.date < campusDateBounds(new Date()).date) return { error: 'Reservations cannot be made in the past' };
  if (bounds.date.getTime() === campusDateBounds(new Date()).date.getTime() && campusDateTime(bounds.date, arrivalTime) <= new Date()) {
    return { error: 'Arrival time must be in the future for today\'s reservation' };
  }

  const slot = await ParkingSlot.findById(slotId).session(session || null).populate('parkingArea');
  if (!slot) return { error: 'Selected parking slot was not found' };
  if (!slot.isActive) return { error: 'Selected parking slot is inactive' };
  if (slot.status === 'maintenance') return { error: 'Selected parking slot is under maintenance' };
  if (!slot.parkingArea) return { error: 'Parking area for the selected slot was not found' };
  if (!slot.parkingArea.isActive) return { error: 'Parking area is inactive' };
  if (!isWithinOperatingHours(slot.parkingArea, arrivalTime, departureTime)) return { error: 'Parking area is closed at the selected time' };

  if (vehicleId) {
    const vehicle = await Vehicle.findOne({ _id: vehicleId, user: userId }).session(session || null);
    if (!vehicle) return { error: 'Selected vehicle was not found for your account' };
    if (!vehicle.isActive) return { error: 'Selected vehicle is inactive' };
    if (vehicle.verificationStatus !== 'verified') return { error: 'Selected vehicle is not verified' };
    if (vehicle.vehicleType !== slot.vehicleTypeAllowed) return { error: `This slot is available for ${slot.vehicleTypeAllowed} vehicles only` };
  }

  const overlapBase = {
    slot: slotId,
    bookingDate: { $gte: bounds.date, $lt: bounds.nextDate },
    status: { $in: ACTIVE_STATUSES },
    arrivalTime: { $lt: departureTime },
    departureTime: { $gt: arrivalTime }
  };
  if (excludeId) overlapBase._id = { $ne: excludeId };
  if (await Reservation.exists(overlapBase).session(session || null)) return { error: 'Another reservation overlaps this time', status: 409 };

  const userOverlap = { ...overlapBase, user: userId };
  delete userOverlap.slot;
  if (await Reservation.exists(userOverlap).session(session || null)) return { error: 'You already have an active reservation during that time', status: 409 };
  return { bounds, slot };
};

const withReservationTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
      if (result?.error) throw Object.assign(new Error(result.error), { reservationError: result });
    });
    return result;
  } catch (error) {
    if (error.reservationError) return error.reservationError;
    if (/Transaction numbers are only allowed|replica set|transaction/i.test(error.message)) {
      return { error: 'Reservation changes require MongoDB transactions. Configure MongoDB as a replica set.', status: 503 };
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

const lockSlot = async (slotId, session) => ParkingSlot.findByIdAndUpdate(
  slotId,
  { $set: { updatedAt: new Date() } },
  { new: true, session, timestamps: false }
);

export const createReservation = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      return sendError(res, 'Database is unavailable in preview mode. Please connect MongoDB to enable reservations.', 503);
    }

    const { slot: slotId, vehicle: vehicleId, bookingDate, arrivalTime, departureTime } = req.body;
    if (!mongoose.isValidObjectId(slotId)) return sendError(res, 'Selected parking slot ID is invalid', 400);
    const reservationId = `RES-${crypto.randomUUID()}`;
    const qrData = jwt.sign({ reservationId, userId: req.user._id.toString(), slotId: slotId.toString(), ...(vehicleId ? { vehicleId: vehicleId.toString() } : {}), type: 'parking-pass' }, process.env.JWT_SECRET, { expiresIn: '30d', algorithm: 'HS256' });
    const qrCode = await QRCode.toDataURL(qrData);
    const result = await withReservationTransaction(async (session) => {
      const lockedSlot = await lockSlot(slotId, session);
      if (!lockedSlot) return { error: 'Selected parking slot was not found', status: 404 };
      const validation = await validateBooking({ slotId, vehicleId, bookingDate, arrivalTime, departureTime, userId: req.user._id, session });
      if (validation.error) return validation;
      const reservation = new Reservation({
        slot: slotId,
        vehicle: vehicleId || undefined,
        bookingDate: validation.bounds.date,
        arrivalTime,
        departureTime,
        user: req.user._id,
        reservationId,
        qrCode,
        expiresAt: arrivalDeadline(validation.bounds.date, arrivalTime)
      });
      await reservation.save({ session });
      await Notification.create([{
        user: req.user._id,
        title: 'Reservation created',
        message: `Your reservation for ${campusDateKey(validation.bounds.date)} at ${arrivalTime} has been created.`,
        type: 'reservation-created'
      }], { session });
      return { reservation };
    });
    if (result.error) return sendError(res, result.error, result.status || 400);
    emitSlotUpdate(await syncSlotStatus(slotId));
    return sendSuccess(res, result.reservation, 'Reservation created', 201);
  } catch (error) {
    return sendError(res, 'Unable to create reservation', 500);
  }
};

export const getReservations = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      return sendSuccess(res, [], 'Reservations fetched');
    }

    const filter = ['admin', 'security'].includes(req.user.role) ? {} : { user: req.user._id };
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const [reservations, total] = await Promise.all([
      Reservation.find(filter).sort({ bookingDate: -1, arrivalTime: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name email role').populate({ path: 'slot', populate: { path: 'parkingArea', select: 'name' } }).populate('vehicle', 'vehicleNumber vehicleType'),
      Reservation.countDocuments(filter)
    ]);
    return sendSuccess(res, reservations, 'Reservations fetched', 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return sendError(res, 'Unable to fetch reservations', 500);
  }
};

export const updateReservation = async (req, res) => {
  try {
    if (req.body.slot !== undefined && !mongoose.isValidObjectId(req.body.slot)) return sendError(res, 'Selected parking slot ID is invalid', 400);
    if (req.body.vehicle && !mongoose.isValidObjectId(req.body.vehicle)) return sendError(res, 'Selected vehicle ID is invalid', 400);
    const result = await withReservationTransaction(async (session) => {
      const reservation = await Reservation.findById(req.params.id).session(session);
      if (!reservation) return { error: 'Reservation not found', status: 404 };
      if (reservation.user.toString() !== req.user._id.toString() && !['admin', 'security'].includes(req.user.role)) return { error: 'Forbidden', status: 403 };
      if (!['pending', 'confirmed'].includes(reservation.status)) return { error: 'Only pending or confirmed reservations can be edited', status: 400 };

      const next = {
        slotId: req.body.slot ?? reservation.slot.toString(),
        vehicleId: req.body.vehicle ?? reservation.vehicle?.toString(),
        bookingDate: req.body.bookingDate ?? reservation.bookingDate,
        arrivalTime: req.body.arrivalTime ?? reservation.arrivalTime,
        departureTime: req.body.departureTime ?? reservation.departureTime
      };
      const lockedSlot = await lockSlot(next.slotId, session);
      if (!lockedSlot) return { error: 'Selected parking slot was not found', status: 404 };
      const validation = await validateBooking({ ...next, userId: reservation.user, excludeId: reservation._id, session });
      if (validation.error) return validation;

      const oldSlotId = reservation.slot.toString();
      reservation.slot = next.slotId;
      reservation.vehicle = next.vehicleId || undefined;
      reservation.bookingDate = validation.bounds.date;
      reservation.arrivalTime = next.arrivalTime;
      reservation.departureTime = next.departureTime;
      reservation.expiresAt = arrivalDeadline(validation.bounds.date, next.arrivalTime, reservation.gracePeriodMinutes);
      await reservation.save({ session });
      return { reservation, oldSlotId, slotId: next.slotId };
    });
    if (result.error) return sendError(res, result.error, result.status || 400);
    const slotIds = [...new Set([result.oldSlotId, result.slotId])];
    await Promise.all(slotIds.map(async (slotId) => emitSlotUpdate(await syncSlotStatus(slotId))));
    return sendSuccess(res, result.reservation, 'Reservation updated');
  } catch (error) {
    return sendError(res, 'Unable to update reservation', 500);
  }
};

export const deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return sendError(res, 'Reservation not found', 404);
    if (reservation.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') return sendError(res, 'Forbidden', 403);
    if (!['pending', 'confirmed'].includes(reservation.status)) return sendError(res, 'Only pending or confirmed reservations can be cancelled', 400);
    reservation.status = 'cancelled';
    await reservation.save();
    emitSlotUpdate(await syncSlotStatus(reservation.slot));
    await Notification.create({ user: reservation.user, title: 'Reservation cancelled', message: `Your reservation ${reservation.reservationId} has been cancelled.`, type: 'reservation-cancelled' });
    return sendSuccess(res, reservation, 'Reservation cancelled');
  } catch (error) {
    return sendError(res, 'Unable to cancel reservation', 500);
  }
};

export const checkInReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).select('reservationId');
    if (!reservation) return sendError(res, 'Reservation not found', 404);
    req.body = { reservationId: reservation.reservationId };
    return performSecurityCheckIn(req, res);
  } catch { return sendError(res, 'Unable to check in reservation', 500); }
};

export const checkOutReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).select('reservationId');
    if (!reservation) return sendError(res, 'Reservation not found', 404);
    req.body = { reservationId: reservation.reservationId };
    return performSecurityCheckOut(req, res);
  } catch { return sendError(res, 'Unable to check out reservation', 500); }
};
