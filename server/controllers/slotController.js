import ParkingSlot from '../models/ParkingSlot.js';
import Reservation from '../models/Reservation.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getSlots = async (req, res) => {
  try {
    const { date, arrivalTime, departureTime } = req.query;
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
    const slots = await ParkingSlot.find({ isActive: true, status: { $ne: 'maintenance' }, _id: { $nin: unavailableIds } }).populate('parkingArea');
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
    const slot = await ParkingSlot.create(req.body);
    return sendSuccess(res, slot, 'Parking slot created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateSlot = async (req, res) => {
  try {
    const slot = await ParkingSlot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return sendSuccess(res, slot, 'Parking slot updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteSlot = async (req, res) => {
  try {
    await ParkingSlot.findByIdAndDelete(req.params.id);
    return sendSuccess(res, null, 'Parking slot deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
