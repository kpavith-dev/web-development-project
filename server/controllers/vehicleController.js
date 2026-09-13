import mongoose from 'mongoose';
import Vehicle from '../models/Vehicle.js';
import Notification from '../models/Notification.js';
import { sendSuccess, sendError } from '../utils/response.js';

const normalizeVehicleNumber = (value) => value.trim().toUpperCase();
const normalizeRegistrationNumber = (value) => value?.trim().toUpperCase();
const isValidVehicleNumber = (value) => /^[A-Z0-9 -]{3,20}$/i.test(value || '');
const isValidRegistrationNumber = (value) => value === undefined || value === '' || /^[A-Z0-9 -]{2,50}$/i.test(value);
const isValidText = (value, maximumLength) => value === undefined || value === '' || (typeof value === 'string' && value.trim().length <= maximumLength);
const vehicleFields = ['vehicleNumber', 'vehicleType', 'vehicleBrand', 'model', 'color', 'registrationNumber', 'isPrimary'];
const hasUnsupportedFields = (body) => Object.keys(body).some((field) => !vehicleFields.includes(field));
const identityFields = ['vehicleNumber', 'vehicleType', 'vehicleBrand', 'model', 'color', 'registrationNumber'];

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
    const duplicate = await Vehicle.exists({ user: req.user._id, $or: [{ vehicleNumber: normalizedVehicleNumber }, ...(registrationNumber ? [{ registrationNumber: normalizeRegistrationNumber(registrationNumber) }] : [])] });
    if (duplicate) return sendError(res, 'This vehicle number or registration number is already registered to your account', 409);
    const hasVehicle = await Vehicle.exists({ user: req.user._id });
    const makePrimary = isPrimary === true || isPrimary === 'true' || !hasVehicle;
    if (makePrimary) await Vehicle.updateMany({ user: req.user._id }, { isPrimary: false });
    const vehicle = await Vehicle.create({
      vehicleNumber: normalizedVehicleNumber,
      vehicleType,
      vehicleBrand,
      model,
      color,
      registrationNumber: normalizeRegistrationNumber(registrationNumber),
      isPrimary: makePrimary,
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
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Invalid vehicle ID', 400);
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
    if (update.registrationNumber) {
      update.registrationNumber = normalizeRegistrationNumber(update.registrationNumber);
      const duplicateRegistration = await Vehicle.exists({ user: req.user._id, registrationNumber: update.registrationNumber, _id: { $ne: req.params.id } });
      if (duplicateRegistration) return sendError(res, 'This registration number is already registered to your account', 409);
    }
    const existing = await Vehicle.findOne({ _id: req.params.id, user: req.user._id });
    if (!existing) return sendError(res, 'Vehicle not found', 404);
    if (update.isPrimary === true || update.isPrimary === 'true') await Vehicle.updateMany({ user: req.user._id, _id: { $ne: existing._id } }, { isPrimary: false });
    if (req.file) update.imageUrl = `/uploads/vehicles/${req.file.filename}`;
    const identityChanged = Boolean(req.file) || identityFields.some((field) => update[field] !== undefined && String(update[field]) !== String(existing[field] || ''));
    if (identityChanged) Object.assign(update, { verificationStatus: 'pending', verifiedBy: undefined, verifiedAt: undefined, rejectionReason: undefined });
    const vehicle = await Vehicle.findOneAndUpdate({ _id: existing._id, user: req.user._id }, update, { new: true, runValidators: true });
    return sendSuccess(res, vehicle, identityChanged ? 'Vehicle updated and returned for verification' : 'Vehicle updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Invalid vehicle ID', 400);
    const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!vehicle) return sendError(res, 'Vehicle not found', 404);
    return sendSuccess(res, null, 'Vehicle deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const getAdminVehicles = async (_req, res) => {
  try {
    const vehicles = await Vehicle.find().populate('user', 'name email').populate('verifiedBy', 'name email').sort({ createdAt: -1 });
    return sendSuccess(res, vehicles, 'Vehicles fetched');
  } catch { return sendError(res, 'Unable to fetch vehicles', 500); }
};

export const verifyVehicle = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Invalid vehicle ID', 400);
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return sendError(res, 'Vehicle not found', 404);
    vehicle.verificationStatus = 'verified';
    vehicle.verifiedBy = req.user._id;
    vehicle.verifiedAt = new Date();
    vehicle.rejectionReason = undefined;
    await vehicle.save();
    await Notification.create({ user: vehicle.user, title: 'Vehicle approved', message: `${vehicle.vehicleNumber} has been approved and is eligible for reservations while active.`, type: 'vehicle-verified' });
    return sendSuccess(res, vehicle, 'Vehicle approved');
  } catch { return sendError(res, 'Unable to approve vehicle', 500); }
};

export const rejectVehicle = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Invalid vehicle ID', 400);
    const reason = typeof req.body.rejectionReason === 'string' ? req.body.rejectionReason.trim() : '';
    if (reason.length < 3 || reason.length > 500) return sendError(res, 'Provide a meaningful rejection reason (3–500 characters)', 400);
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return sendError(res, 'Vehicle not found', 404);
    vehicle.verificationStatus = 'rejected';
    vehicle.verifiedBy = req.user._id;
    vehicle.verifiedAt = new Date();
    vehicle.rejectionReason = reason;
    await vehicle.save();
    await Notification.create({ user: vehicle.user, title: 'Vehicle verification needs changes', message: `${vehicle.vehicleNumber} was rejected: ${reason}`, type: 'vehicle-verified' });
    return sendSuccess(res, vehicle, 'Vehicle rejected');
  } catch { return sendError(res, 'Unable to reject vehicle', 500); }
};

export const setVehicleActiveState = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Invalid vehicle ID', 400);
    if (typeof req.body.isActive !== 'boolean') return sendError(res, 'isActive must be true or false', 400);
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
    if (!vehicle) return sendError(res, 'Vehicle not found', 404);
    return sendSuccess(res, vehicle, req.body.isActive ? 'Vehicle activated' : 'Vehicle deactivated');
  } catch { return sendError(res, 'Unable to update vehicle status', 500); }
};
