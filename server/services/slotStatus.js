import Reservation from '../models/Reservation.js';
import ParkingSlot from '../models/ParkingSlot.js';
import { campusDateBounds, campusTime } from '../utils/campusTime.js';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked-in'];

export const syncSlotStatus = async (slotId) => {
  const slot = await ParkingSlot.findById(slotId);
  if (!slot || slot.status === 'maintenance') return slot;

  const { date: startOfDay, nextDate: endOfDay } = campusDateBounds(new Date());
  const currentTime = campusTime();
  const checkedIn = await Reservation.exists({
    slot: slotId,
    bookingDate: { $gte: startOfDay, $lt: endOfDay },
    status: 'checked-in'
  });
  // A slot's live state must not be held as reserved by a booking on another day.
  const reserved = await Reservation.exists({
    slot: slotId,
    bookingDate: { $gte: startOfDay, $lt: endOfDay },
    status: { $in: ACTIVE_STATUSES.slice(0, 2) },
    arrivalTime: { $lte: currentTime },
    departureTime: { $gt: currentTime }
  });
  const status = checkedIn ? 'occupied' : reserved ? 'reserved' : 'available';

  if (slot.status !== status) {
    slot.status = status;
    await slot.save();
  }
  return slot;
};
