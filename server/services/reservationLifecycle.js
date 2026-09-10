import Reservation from '../models/Reservation.js';
import Notification from '../models/Notification.js';
import ParkingSlot from '../models/ParkingSlot.js';
import { emitSlotUpdate } from '../socket.js';
import { syncSlotStatus } from './slotStatus.js';

export const processReservationLifecycle = async () => {
  const now = new Date();
  const expired = await Reservation.find({ status: { $in: ['pending', 'confirmed'] }, expiresAt: { $lte: now } });
  await Promise.all(expired.map(async (reservation) => {
    reservation.status = 'no-show';
    await reservation.save();
    const slot = await syncSlotStatus(reservation.slot);
    emitSlotUpdate(slot);
    await Notification.create({ user: reservation.user, title: 'Reservation expired', message: `You did not arrive within the ${reservation.gracePeriodMinutes}-minute grace period.`, type: 'reservation-expired' });
  }));

  const reminderWindow = new Date(now.getTime() + 30 * 60 * 1000);
  const upcoming = await Reservation.find({ status: { $in: ['pending', 'confirmed'] }, reminderSentAt: null, expiresAt: { $gt: now, $lte: new Date(reminderWindow.getTime() + 15 * 60 * 1000) } });
  await Promise.all(upcoming.map(async (reservation) => {
    reservation.reminderSentAt = now;
    await reservation.save();
    await Notification.create({ user: reservation.user, title: 'Parking reminder', message: `Your parking arrival time is ${reservation.arrivalTime}.`, type: 'reminder' });
  }));
};
