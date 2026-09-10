import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Reservation from '../models/Reservation.js';
import ParkingSlot from '../models/ParkingSlot.js';
import Vehicle from '../models/Vehicle.js';
import Notification from '../models/Notification.js';
import QRCode from 'qrcode';
import { sendSuccess, sendError } from '../utils/response.js';
import { emitSlotUpdate } from '../socket.js';
import { syncSlotStatus } from '../services/slotStatus.js';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked-in'];
const dateBounds = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  return { date, nextDate };
};

const validTimeRange = (arrivalTime, departureTime) => (
  /^([01]\d|2[0-3]):[0-5]\d$/.test(arrivalTime || '')
  && /^([01]\d|2[0-3]):[0-5]\d$/.test(departureTime || '')
  && arrivalTime < departureTime
);
const arrivalDeadline = (bookingDate, arrivalTime, gracePeriodMinutes = 15) => {
  const deadline = new Date(bookingDate);
  const [hour, minute] = arrivalTime.split(':').map(Number);
  deadline.setHours(hour, minute + gracePeriodMinutes, 0, 0);
  return deadline;
};
const isWithinOperatingHours = (area, arrivalTime, departureTime) => (
  arrivalTime >= area.openingTime && departureTime <= area.closingTime
);

const validateBooking = async ({ slotId, vehicleId, bookingDate, arrivalTime, departureTime, userId, excludeId }) => {
  const bounds = dateBounds(bookingDate);
  if (!slotId || !bounds || !validTimeRange(arrivalTime, departureTime)) return { error: 'Provide a slot, a valid booking date, and an arrival time before departure time' };
  if (bounds.date < new Date(new Date().setHours(0, 0, 0, 0))) return { error: 'Reservations cannot be made in the past' };

  const slot = await ParkingSlot.findById(slotId).populate('parkingArea');
  if (!slot || !slot.isActive || slot.status === 'maintenance' || !slot.parkingArea?.isActive || slot.parkingArea.status !== 'active') return { error: 'This parking slot is unavailable' };
  if (!isWithinOperatingHours(slot.parkingArea, arrivalTime, departureTime)) return { error: `Reservations for this area are available from ${slot.parkingArea.openingTime} to ${slot.parkingArea.closingTime}` };

  if (vehicleId) {
    const vehicle = await Vehicle.findOne({ _id: vehicleId, user: userId, isActive: true, verificationStatus: 'verified' });
    if (!vehicle) return { error: 'Choose one of your verified active vehicles' };
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
  if (await Reservation.exists(overlapBase)) return { error: 'This slot is already reserved for the selected time', status: 409 };

  const userOverlap = { ...overlapBase, user: userId };
  delete userOverlap.slot;
  if (await Reservation.exists(userOverlap)) return { error: 'You already have an active reservation during that time' };
  return { bounds, slot };
};

export const createReservation = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      return sendError(res, 'Database is unavailable in preview mode. Please connect MongoDB to enable reservations.', 503);
    }

    const { slot: slotId, vehicle: vehicleId, bookingDate, arrivalTime, departureTime } = req.body;
    const validation = await validateBooking({ slotId, vehicleId, bookingDate, arrivalTime, departureTime, userId: req.user._id });
    if (validation.error) return sendError(res, validation.error, validation.status || 400);
    const { bounds } = validation;
    const reservationId = `RES-${crypto.randomUUID()}`;
    const qrData = jwt.sign({ reservationId, userId: req.user._id.toString(), type: 'parking-pass' }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const qrCode = await QRCode.toDataURL(qrData);

    const reservation = await Reservation.create({
      slot: slotId,
      vehicle: vehicleId || undefined,
      bookingDate: bounds.date,
      arrivalTime,
      departureTime,
      user: req.user._id,
      reservationId,
      qrCode,
      expiresAt: arrivalDeadline(bounds.date, arrivalTime)
    });

    emitSlotUpdate(await syncSlotStatus(slotId));
    await Notification.create({ user: req.user._id, title: 'Reservation created', message: `Your reservation for ${bookingDate} at ${arrivalTime} has been created.`, type: 'reservation-created' });

    return sendSuccess(res, reservation, 'Reservation created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
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
      Reservation.find(filter).sort({ bookingDate: -1, arrivalTime: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name email role').populate('slot'),
      Reservation.countDocuments(filter)
    ]);
    return sendSuccess(res, reservations, 'Reservations fetched', 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return sendError(res, 'Reservation not found', 404);
    if (reservation.user.toString() !== req.user._id.toString() && !['admin', 'security'].includes(req.user.role)) return sendError(res, 'Forbidden', 403);
    if (['checked-in', 'checked-out'].includes(reservation.status)) return sendError(res, 'Completed reservations cannot be edited', 400);
    const allowed = ['arrivalTime', 'departureTime', 'bookingDate', 'vehicle'];
    const next = { slotId: reservation.slot.toString(), vehicleId: reservation.vehicle?.toString(), bookingDate: reservation.bookingDate, arrivalTime: reservation.arrivalTime, departureTime: reservation.departureTime };
    allowed.forEach((field) => { if (req.body[field] !== undefined) reservation[field] = req.body[field]; });
    if (req.body.bookingDate !== undefined) next.bookingDate = req.body.bookingDate;
    if (req.body.arrivalTime !== undefined) next.arrivalTime = req.body.arrivalTime;
    if (req.body.departureTime !== undefined) next.departureTime = req.body.departureTime;
    if (req.body.vehicle !== undefined) next.vehicleId = req.body.vehicle;
    const validation = await validateBooking({ ...next, userId: reservation.user, excludeId: reservation._id });
    if (validation.error) return sendError(res, validation.error, validation.status || 400);
    reservation.bookingDate = validation.bounds.date;
    await reservation.save();
    emitSlotUpdate(await syncSlotStatus(reservation.slot));
    return sendSuccess(res, reservation, 'Reservation updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return sendError(res, 'Reservation not found', 404);
    if (reservation.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') return sendError(res, 'Forbidden', 403);
    if (['checked-in', 'checked-out'].includes(reservation.status)) return sendError(res, 'A checked-in reservation cannot be cancelled', 400);
    reservation.status = 'cancelled';
    await reservation.save();
    emitSlotUpdate(await syncSlotStatus(reservation.slot));
    return sendSuccess(res, reservation, 'Reservation cancelled');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const checkInReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findOne({ _id: req.params.id, status: { $in: ['pending', 'confirmed'] } }).populate('slot');
    if (!reservation) return sendError(res, 'Active reservation not found', 404);
    if (reservation.user.toString() !== req.user._id.toString() && !['admin', 'security'].includes(req.user.role)) return sendError(res, 'Forbidden', 403);
    reservation.status = 'checked-in'; reservation.checkedInAt = new Date();
    await reservation.save();
    const slot = await syncSlotStatus(reservation.slot._id);
    emitSlotUpdate(slot);
    return sendSuccess(res, reservation, 'Checked in successfully');
  } catch (error) { return sendError(res, error.message, 500); }
};

export const checkOutReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findOne({ _id: req.params.id, status: 'checked-in' }).populate('slot');
    if (!reservation) return sendError(res, 'Checked-in reservation not found', 404);
    if (reservation.user.toString() !== req.user._id.toString() && !['admin', 'security'].includes(req.user.role)) return sendError(res, 'Forbidden', 403);
    reservation.status = 'checked-out'; reservation.checkedOutAt = new Date();
    await reservation.save();
    const slot = await syncSlotStatus(reservation.slot._id);
    emitSlotUpdate(slot);
    return sendSuccess(res, reservation, 'Checked out successfully');
  } catch (error) { return sendError(res, error.message, 500); }
};
