import mongoose from 'mongoose';
import ParkingArea from '../models/ParkingArea.js';
import ParkingSlot from '../models/ParkingSlot.js';
import Reservation from '../models/Reservation.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getAreas = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      return sendSuccess(res, [], 'Parking areas fetched');
    }
    const areas = await ParkingArea.find();
    return sendSuccess(res, areas, 'Parking areas fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const createArea = async (req, res) => {
  try {
    const area = await ParkingArea.create(req.body);
    return sendSuccess(res, area, 'Parking area created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateArea = async (req, res) => {
  try {
    if (req.body.totalSlots !== undefined) {
      const slotCount = await ParkingSlot.countDocuments({ parkingArea: req.params.id });
      if (Number(req.body.totalSlots) < slotCount) return sendError(res, `Capacity cannot be below the ${slotCount} existing slots`, 400);
    }
    const area = await ParkingArea.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return sendSuccess(res, area, 'Parking area updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteArea = async (req, res) => {
  try {
    const area = await ParkingArea.findById(req.params.id);
    if (!area) return sendError(res, 'Parking area not found', 404);
    const slots = await ParkingSlot.find({ parkingArea: area._id }).select('_id');
    const slotIds = slots.map((slot) => slot._id);
    const activeReservation = slotIds.length && await Reservation.exists({ slot: { $in: slotIds }, status: { $in: ['pending', 'confirmed', 'checked-in'] } });
    if (activeReservation) return sendError(res, 'This area has active reservations and cannot be deleted', 409);
    if (slotIds.length) return sendError(res, 'Remove or deactivate the area’s parking slots before deleting it', 409);
    await area.deleteOne();
    return sendSuccess(res, null, 'Parking area deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
