import mongoose from 'mongoose';
import Vehicle from '../models/Vehicle.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const createVehicle = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      return sendError(res, 'Database is unavailable in preview mode.', 503);
    }
    const { vehicleNumber, vehicleType = 'car', vehicleBrand, model, color, registrationNumber, isPrimary = false } = req.body;
    if (!/^[A-Z0-9 -]{3,20}$/i.test(vehicleNumber || '')) return sendError(res, 'Provide a valid vehicle number', 400);
    if (!['car', 'motorcycle', 'bicycle', 'ev'].includes(vehicleType)) return sendError(res, 'Invalid vehicle type', 400);
    const duplicate = await Vehicle.exists({ user: req.user._id, vehicleNumber: vehicleNumber.trim().toUpperCase() });
    if (duplicate) return sendError(res, 'This vehicle is already registered to your account', 409);
    if (isPrimary === true || isPrimary === 'true') await Vehicle.updateMany({ user: req.user._id }, { isPrimary: false });
    const vehicle = await Vehicle.create({ vehicleNumber, vehicleType, vehicleBrand, model, color, registrationNumber, isPrimary: isPrimary === true || isPrimary === 'true', imageUrl: req.file ? `/uploads/vehicles/${req.file.filename}` : undefined, user: req.user._id });
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
    const allowed = ['vehicleNumber', 'vehicleType', 'vehicleBrand', 'model', 'color', 'registrationNumber', 'isPrimary', 'isActive'];
    const update = allowed.reduce((result, field) => {
      if (req.body[field] !== undefined) result[field] = req.body[field];
      return result;
    }, {});
    if (update.vehicleNumber && !/^[A-Z0-9 -]{3,20}$/i.test(update.vehicleNumber)) return sendError(res, 'Provide a valid vehicle number', 400);
    if (update.vehicleType && !['car', 'motorcycle', 'bicycle', 'ev'].includes(update.vehicleType)) return sendError(res, 'Invalid vehicle type', 400);
    if (update.isPrimary === true || update.isPrimary === 'true') await Vehicle.updateMany({ user: req.user._id }, { isPrimary: false });
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
