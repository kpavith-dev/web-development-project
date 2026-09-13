import mongoose from 'mongoose';
import Report from '../models/Report.js';
import Reservation from '../models/Reservation.js';
import ParkingSlot from '../models/ParkingSlot.js';
import ParkingArea from '../models/ParkingArea.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { campusDateBounds, campusDateKey } from '../utils/campusTime.js';

const DAY = 24 * 60 * 60 * 1000;
const rangeFor = ({ type, startDate, endDate }) => {
  if (startDate || endDate) {
    const start = campusDateBounds(startDate)?.date; const end = campusDateBounds(endDate)?.date;
    if (!start || !end || start > end) return { error: 'Provide a valid date range with startDate on or before endDate.' };
    if ((end - start) / DAY > 90) return { error: 'Custom report ranges cannot exceed 90 days.' };
    return { start, end: new Date(end.getTime() + DAY), label: `${campusDateKey(start)} to ${campusDateKey(end)}` };
  }
  const today = campusDateBounds(new Date()).date;
  if (type === 'weekly') return { start: new Date(today.getTime() - 6 * DAY), end: new Date(today.getTime() + DAY), label: 'the last 7 campus days' };
  if (type === 'monthly') {
    const [year, month] = campusDateKey(today).split('-');
    return { start: campusDateBounds(`${year}-${month}-01`).date, end: new Date(today.getTime() + DAY), label: 'this campus month' };
  }
  return { start: today, end: new Date(today.getTime() + DAY), label: 'today' };
};

export const getReports = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1); const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
    const [reports, total] = await Promise.all([Report.find().select('type generatedBy generatedAt startDate endDate summary').populate('generatedBy', 'name email').sort({ generatedAt: -1 }).skip((page - 1) * limit).limit(limit), Report.countDocuments()]);
    return sendSuccess(res, reports, 'Reports fetched', 200, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch { return sendError(res, 'Unable to fetch reports', 500); }
};

export const getReportById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return sendError(res, 'Invalid report ID', 400);
    const report = await Report.findById(req.params.id).populate('generatedBy', 'name email');
    if (!report) return sendError(res, 'Report not found', 404);
    return sendSuccess(res, report, 'Report fetched');
  } catch { return sendError(res, 'Unable to fetch report', 500); }
};

export const generateReport = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) return sendError(res, 'Database is unavailable. Reports require live MongoDB data.', 503);
    const type = ['daily', 'weekly', 'monthly'].includes(req.body.type) ? req.body.type : 'daily'; const range = rangeFor({ type, startDate: req.body.startDate, endDate: req.body.endDate });
    if (range.error) return sendError(res, range.error, 400);
    const match = { bookingDate: { $gte: range.start, $lt: range.end } };
    const [statusRows, trend, slotRows, areaRows, vehicleRows, peakRows, areas] = await Promise.all([
      Reservation.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Reservation.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$bookingDate', timezone: 'Asia/Colombo' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      ParkingSlot.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Reservation.aggregate([{ $match: match }, { $group: { _id: '$slot', count: { $sum: 1 } } }, { $lookup: { from: 'parkingslots', localField: '_id', foreignField: '_id', as: 'slot' } }, { $unwind: '$slot' }, { $lookup: { from: 'parkingareas', localField: 'slot.parkingArea', foreignField: '_id', as: 'area' } }, { $unwind: '$area' }, { $group: { _id: '$area.name', count: { $sum: '$count' } } }, { $sort: { count: -1, _id: 1 } }]),
      Reservation.aggregate([{ $match: { ...match, vehicle: { $ne: null } } }, { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle' } }, { $unwind: '$vehicle' }, { $group: { _id: '$vehicle.vehicleType', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Reservation.aggregate([{ $match: match }, { $group: { _id: '$arrivalTime', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 1 }]),
      ParkingArea.find({ isActive: true }).select('name totalSlots').lean()
    ]);
    const statuses = Object.fromEntries(statusRows.map((row) => [row._id, row.count])); const slots = Object.fromEntries(slotRows.map((row) => [row._id, row.count]));
    const totalReservations = statusRows.reduce((sum, row) => sum + row.count, 0); const totalSlots = Object.values(slots).reduce((sum, count) => sum + count, 0); const liveUsage = (slots.occupied || 0) + (slots.reserved || 0);
    const areaUsage = areaRows.map((row) => ({ name: row._id, reservations: row.count }));
    const summary = { totalReservations, completed: statuses['checked-out'] || 0, cancelled: statuses.cancelled || 0, noShow: statuses['no-show'] || 0, expired: statuses.expired || 0, checkIns: statuses['checked-in'] || 0, checkOuts: statuses['checked-out'] || 0, availableSlots: slots.available || 0, occupiedSlots: slots.occupied || 0, reservedSlots: slots.reserved || 0, utilization: totalSlots ? Math.round((liveUsage / totalSlots) * 100) : 0, mostUsedArea: areaUsage[0]?.name || null, peakReservationHour: peakRows[0]?._id || null };
    const data = { rangeLabel: range.label, statuses, slots, trend: trend.map((row) => ({ date: row._id, reservations: row.count })), areaUsage, vehicleTypes: vehicleRows.map((row) => ({ type: row._id, count: row.count })), areas: areas.map((area) => ({ name: area.name, totalSlots: area.totalSlots, reservations: areaUsage.find((item) => item.name === area.name)?.reservations || 0 })), definition: 'Live utilization is (occupied + reserved active slots) / all active slots.' };
    const report = await Report.create({ type, generatedBy: req.user._id, startDate: range.start, endDate: new Date(range.end.getTime() - DAY), summary, data });
    return sendSuccess(res, report, 'Report generated', 201);
  } catch { return sendError(res, 'Unable to generate report', 500); }
};
