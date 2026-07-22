import mongoose from 'mongoose';
import Reservation from '../models/Reservation.js';
import ParkingSlot from '../models/ParkingSlot.js';
import QRCode from 'qrcode';
import { sendSuccess, sendError } from '../utils/response.js';
import { emitSlotUpdate } from '../socket.js';

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

export const createReservation = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      return sendError(res, 'Database is unavailable in preview mode. Please connect MongoDB to enable reservations.', 503);
    }

    const { slot: slotId, bookingDate, arrivalTime, departureTime } = req.body;
    const bounds = dateBounds(bookingDate);
    if (!slotId || !bounds || !validTimeRange(arrivalTime, departureTime)) {
      return sendError(res, 'Provide a slot, a valid booking date, and an arrival time before departure time', 400);
    }
    if (bounds.date < new Date(new Date().setHours(0, 0, 0, 0))) {
      return sendError(res, 'Reservations cannot be made in the past', 400);
    }
    const slot = await ParkingSlot.findById(slotId);
    if (!slot || !slot.isActive || slot.status === 'maintenance') return sendError(res, 'This parking slot is unavailable', 400);

    const overlapQuery = {
      slot: slotId,
      bookingDate: { $gte: bounds.date, $lt: bounds.nextDate },
      status: { $in: ACTIVE_STATUSES },
      arrivalTime: { $lt: departureTime },
      departureTime: { $gt: arrivalTime }
    };
    const collision = await Reservation.exists(overlapQuery);
    if (collision) return sendError(res, 'This slot is already reserved for the selected time', 409);

    const existing = await Reservation.findOne({
      user: req.user._id,
      bookingDate: { $gte: bounds.date, $lt: bounds.nextDate },
      status: { $in: ACTIVE_STATUSES },
      arrivalTime: { $lt: departureTime },
      departureTime: { $gt: arrivalTime }
    });
    if (existing) return sendError(res, 'You already have an active reservation for that day', 400);

    const reservationId = `RES-${Date.now()}`;
    const qrData = JSON.stringify({ reservationId, userId: req.user._id.toString() });
    const qrCode = await QRCode.toDataURL(qrData);

    const reservation = await Reservation.create({
      ...req.body,
      bookingDate: bounds.date,
      user: req.user._id,
      reservationId,
      qrCode,
      expiresAt: arrivalDeadline(bounds.date, arrivalTime)
    });

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
    const reservations = await Reservation.find(filter).sort({ bookingDate: -1, arrivalTime: -1 }).populate('user', 'name email role').populate('slot');
    return sendSuccess(res, reservations, 'Reservations fetched');
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
    const allowed = ['arrivalTime', 'departureTime', 'bookingDate'];
    allowed.forEach((field) => { if (req.body[field] !== undefined) reservation[field] = req.body[field]; });
    if (!validTimeRange(reservation.arrivalTime, reservation.departureTime)) return sendError(res, 'Arrival time must be before departure time', 400);
    await reservation.save();
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
    const slot = await ParkingSlot.findByIdAndUpdate(reservation.slot._id, { status: 'occupied' }, { new: true });
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
    const slot = await ParkingSlot.findByIdAndUpdate(reservation.slot._id, { status: 'available' }, { new: true });
    emitSlotUpdate(slot);
    return sendSuccess(res, reservation, 'Checked out successfully');
  } catch (error) { return sendError(res, error.message, 500); }
};
