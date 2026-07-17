import ParkingSlot from '../models/ParkingSlot.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getSlots = async (req, res) => {
  try {
    const slots = await ParkingSlot.find().populate('parkingArea');
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
