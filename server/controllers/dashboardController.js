import mongoose from 'mongoose';
import Reservation from '../models/Reservation.js';
import ParkingArea from '../models/ParkingArea.js';
import ParkingSlot from '../models/ParkingSlot.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getDashboard = async (req, res) => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      return sendSuccess(res, {
        totalUsers: 0,
        totalAreas: 0,
        totalSlots: 0,
        availableSlots: 0,
        occupiedSlots: 0,
        todaysReservations: 0,
        monthlyReservations: 0,
        peakParkingHours: ['08:00', '10:00', '13:00']
      }, 'Dashboard data fetched');
    }

    const [users, areas, slots] = await Promise.all([
      User.countDocuments(),
      ParkingArea.countDocuments(),
      ParkingSlot.countDocuments()
    ]);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    const [availableSlots, occupiedSlots, reservedSlots, maintenanceSlots, todaysReservations, monthlyReservations] = await Promise.all([
      ParkingSlot.countDocuments({ isActive: true, status: 'available' }),
      ParkingSlot.countDocuments({ isActive: true, status: 'occupied' }),
      ParkingSlot.countDocuments({ isActive: true, status: 'reserved' }),
      ParkingSlot.countDocuments({ status: 'maintenance' }),
      Reservation.countDocuments({ bookingDate: { $gte: startOfDay, $lt: new Date(startOfDay.getTime() + 86400000) } }),
      Reservation.countDocuments({ bookingDate: { $gte: startOfMonth } })
    ]);

    return sendSuccess(res, {
      totalUsers: users,
      totalAreas: areas,
      totalSlots: slots,
      availableSlots,
      occupiedSlots,
      reservedSlots,
      maintenanceSlots,
      todaysReservations,
      monthlyReservations,
      peakParkingHours: ['08:00', '10:00', '13:00']
    }, 'Dashboard data fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
