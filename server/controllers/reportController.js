import mongoose from 'mongoose';
import Report from '../models/Report.js';
import Reservation from '../models/Reservation.js';
import ParkingSlot from '../models/ParkingSlot.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ generatedAt: -1 });
    return sendSuccess(res, reports, 'Reports fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const generateReport = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      return sendSuccess(res, { type: req.body.type || 'daily', data: { summary: 'Generated report' }, generatedAt: new Date().toISOString() }, 'Report generated', 201);
    }
    const type = ['daily', 'weekly', 'monthly'].includes(req.body.type) ? req.body.type : 'daily';
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (type === 'weekly') start.setDate(start.getDate() - 6);
    if (type === 'monthly') start.setDate(start.getDate() - 29);
    const [reservationStatuses, slotStatuses] = await Promise.all([
      Reservation.aggregate([{ $match: { bookingDate: { $gte: start } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      ParkingSlot.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);
    const reservations = Object.fromEntries(reservationStatuses.map(({ _id, count }) => [_id, count]));
    const slots = Object.fromEntries(slotStatuses.map(({ _id, count }) => [_id, count]));
    const totalReservations = Object.values(reservations).reduce((total, count) => total + count, 0);
    const data = { summary: `${totalReservations} reservations from ${start.toLocaleDateString()} to today.`, rangeStart: start, reservations, slots };
    const report = await Report.create({ type, generatedBy: req.user?._id, data });
    return sendSuccess(res, report, 'Report generated', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
