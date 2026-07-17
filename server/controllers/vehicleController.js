import Vehicle from '../models/Vehicle.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const createVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create({ ...req.body, user: req.user._id });
    return sendSuccess(res, vehicle, 'Vehicle created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ user: req.user._id });
    return sendSuccess(res, vehicles, 'Vehicles fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return sendSuccess(res, vehicle, 'Vehicle updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    return sendSuccess(res, null, 'Vehicle deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
