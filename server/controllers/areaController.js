import ParkingArea from '../models/ParkingArea.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getAreas = async (req, res) => {
  try {
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
    const area = await ParkingArea.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return sendSuccess(res, area, 'Parking area updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteArea = async (req, res) => {
  try {
    await ParkingArea.findByIdAndDelete(req.params.id);
    return sendSuccess(res, null, 'Parking area deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
