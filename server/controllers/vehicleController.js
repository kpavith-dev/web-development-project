import mongoose from 'mongoose';
import Vehicle from '../models/Vehicle.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const createVehicle = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      return sendError(res, 'Database is unavailable in preview mode.', 503);
    }
    const vehicle = await Vehicle.create({ ...req.body, imageUrl: req.file ? `/uploads/vehicles/${req.file.filename}` : undefined, user: req.user._id });
    return sendSuccess(res, vehicle, 'Vehicle created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getVehicles = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      return sendSuccess(res, [], 'Vehicles fetched');
    }
    const vehicles = await Vehicle.find({ user: req.user._id });
    return sendSuccess(res, vehicles, 'Vehicles fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.file) update.imageUrl = `/uploads/vehicles/${req.file.filename}`;
    const vehicle = await Vehicle.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, update, { new: true, runValidators: true });
    if (!vehicle) return sendError(res, 'Vehicle not found', 404);
    return sendSuccess(res, vehicle, 'Vehicle updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!vehicle) return sendError(res, 'Vehicle not found', 404);
    return sendSuccess(res, null, 'Vehicle deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
