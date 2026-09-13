import mongoose from 'mongoose';
import Vehicle from '../models/Vehicle.js';
import { sendSuccess, sendError } from '../utils/response.js';

const normalizeVehicleNumber = (value) => value.trim().toUpperCase();
const isValidVehicleNumber = (value) => /^[A-Z0-9 -]{3,20}$/i.test(value || '');
const isValidRegistrationNumber = (value) => value === undefined || value === '' || /^[A-Z0-9 -]{2,50}$/i.test(value);
const isValidText = (value, maximumLength) => value === undefined || value === '' || (typeof value === 'string' && value.trim().length <= maximumLength);
const vehicleFields = ['vehicleNumber', 'vehicleType', 'vehicleBrand', 'model', 'color', 'registrationNumber', 'isPrimary', 'isActive'];
const hasUnsupportedFields = (body) => Object.keys(body).some((field) => !vehicleFields.includes(field));

export const createVehicle = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      return sendError(res, 'Database is unavailable in preview mode.', 503);
    }
    if (hasUnsupportedFields(req.body)) return sendError(res, 'Unsupported vehicle fields were provided', 400);
    const { vehicleNumber, vehicleType = 'car', vehicleBrand, model, color, registrationNumber, isPrimary = false } = req.body;
    if (!isValidVehicleNumber(vehicleNumber)) return sendError(res, 'Provide a valid vehicle number', 400);
    if (!['car', 'motorcycle', 'bicycle', 'ev'].includes(vehicleType)) return sendError(res, 'Invalid vehicle type', 400);
    if (!isValidRegistrationNumber(registrationNumber)) return sendError(res, 'Provide a valid registration number', 400);
    if (!isValidText(vehicleBrand, 100) || !isValidText(model, 100) || !isValidText(color, 50)) return sendError(res, 'Vehicle brand, model, or color is invalid', 400);
    const normalizedVehicleNumber = normalizeVehicleNumber(vehicleNumber);
    const duplicate = await Vehicle.exists({ user: req.user._id, vehicleNumber: normalizedVehicleNumber });
    if (duplicate) return sendError(res, 'This vehicle is already registered to your account', 409);
    if (isPrimary === true || isPrimary === 'true') await Vehicle.updateMany({ user: req.user._id }, { isPrimary: false });
    const vehicle = await Vehicle.create({
      vehicleNumber: normalizedVehicleNumber,
      vehicleType,
      vehicleBrand,
      model,
      color,
      registrationNumber,
      isPrimary: isPrimary === true || isPrimary === 'true',
      imageUrl: req.file ? `/uploads/vehicles/${req.file.filename}` : undefined,
      user: req.user._id
    });
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
    if (hasUnsupportedFields(req.body)) return sendError(res, 'Unsupported vehicle fields were provided', 400);
    const update = vehicleFields.reduce((result, field) => {
      if (req.body[field] !== undefined) result[field] = req.body[field];
      return result;
    }, {});
    if (update.vehicleNumber && !isValidVehicleNumber(update.vehicleNumber)) return sendError(res, 'Provide a valid vehicle number', 400);
    if (update.vehicleType && !['car', 'motorcycle', 'bicycle', 'ev'].includes(update.vehicleType)) return sendError(res, 'Invalid vehicle type', 400);
    if (!isValidRegistrationNumber(update.registrationNumber)) return sendError(res, 'Provide a valid registration number', 400);
    if (!isValidText(update.vehicleBrand, 100) || !isValidText(update.model, 100) || !isValidText(update.color, 50)) return sendError(res, 'Vehicle brand, model, or color is invalid', 400);
    if (update.vehicleNumber) {
      update.vehicleNumber = normalizeVehicleNumber(update.vehicleNumber);
      const duplicate = await Vehicle.exists({ user: req.user._id, vehicleNumber: update.vehicleNumber, _id: { $ne: req.params.id } });
      if (duplicate) return sendError(res, 'This vehicle is already registered to your account', 409);
    }
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
