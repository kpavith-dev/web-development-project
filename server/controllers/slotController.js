import mongoose from 'mongoose';
import ParkingSlot from '../models/ParkingSlot.js';
import ParkingArea from '../models/ParkingArea.js';
import Reservation from '../models/Reservation.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { emitSlotUpdate } from '../socket.js';

export const getSlots = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      return sendSuccess(res, [], 'Parking slots fetched');
    }

    const { date, arrivalTime, departureTime, vehicleType } = req.query;
    let unavailableIds = [];
    if (date || arrivalTime || departureTime) {
      const start = new Date(date);
      if (Number.isNaN(start.getTime()) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(arrivalTime || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTime || '') || arrivalTime >= departureTime) {
        return sendError(res, 'date, arrivalTime, and departureTime must be valid when filtering availability', 400);
      }
      start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const reservations = await Reservation.find({ bookingDate: { $gte: start, $lt: end }, status: { $in: ['pending', 'confirmed', 'checked-in'] }, arrivalTime: { $lt: departureTime }, departureTime: { $gt: arrivalTime } }).select('slot');
      unavailableIds = reservations.map(({ slot }) => slot);
    }
    const filter = { isActive: true, status: { $ne: 'maintenance' }, _id: { $nin: unavailableIds } };
    if (vehicleType) filter.vehicleTypeAllowed = vehicleType;
    const slots = await ParkingSlot.find(filter).populate('parkingArea');
    return sendSuccess(res, slots, 'Parking slots fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getSlotById = async (req, res) => {
  try {
    const slot = await ParkingSlot.findById(req.params.id).populate('parkingArea');
    if (!slot) return sendError(res, 'Slot not found', 404);
    return sendSuccess(res, slot, 'Parking slot fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createSlot = async (req, res) => {
  try {
    const area = await ParkingArea.findById(req.body.parkingArea);
    if (!area) return sendError(res, 'Parking area not found', 404);
    const count = await ParkingSlot.countDocuments({ parkingArea: area._id });
    if (count >= area.totalSlots) return sendError(res, 'This area has reached its configured capacity', 409);
    const slot = await ParkingSlot.create(req.body);
    emitSlotUpdate(slot);
    return sendSuccess(res, slot, 'Parking slot created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateSlot = async (req, res) => {
  try {
    const existing = await ParkingSlot.findById(req.params.id);
    if (!existing) return sendError(res, 'Slot not found', 404);
    if (req.body.parkingArea && req.body.parkingArea !== existing.parkingArea.toString()) {
      const area = await ParkingArea.findById(req.body.parkingArea);
      if (!area) return sendError(res, 'Parking area not found', 404);
      const count = await ParkingSlot.countDocuments({ parkingArea: area._id });
      if (count >= area.totalSlots) return sendError(res, 'The destination area has reached its configured capacity', 409);
    }
    const slot = await ParkingSlot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (slot) emitSlotUpdate(slot);
    return sendSuccess(res, slot, 'Parking slot updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteSlot = async (req, res) => {
  try {
    const slot = await ParkingSlot.findById(req.params.id);
    if (!slot) return sendError(res, 'Slot not found', 404);
    const activeReservation = await Reservation.exists({ slot: slot._id, status: { $in: ['pending', 'confirmed', 'checked-in'] } });
    if (activeReservation) return sendError(res, 'This slot has active reservations and cannot be deleted', 409);
    await slot.deleteOne();
    return sendSuccess(res, null, 'Parking slot deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
