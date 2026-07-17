import Reservation from '../models/Reservation.js';
import ParkingArea from '../models/ParkingArea.js';
import ParkingSlot from '../models/ParkingSlot.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const getDashboard = async (req, res) => {
  try {
    const [users, areas, slots, reservations] = await Promise.all([
      User.countDocuments(),
      ParkingArea.countDocuments(),
      ParkingSlot.countDocuments(),
      Reservation.countDocuments()
    ]);

    const availableSlots = await ParkingSlot.countDocuments({ status: 'available' });
    const occupiedSlots = await ParkingSlot.countDocuments({ status: 'occupied' });

    return sendSuccess(res, {
      totalUsers: users,
      totalAreas: areas,
      totalSlots: slots,
      availableSlots,
      occupiedSlots,
      todaysReservations: reservations,
      monthlyReservations: reservations,
      peakParkingHours: ['08:00', '10:00', '13:00']
    }, 'Dashboard data fetched');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};
