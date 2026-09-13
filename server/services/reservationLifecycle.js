import Reservation from '../models/Reservation.js';
import Notification from '../models/Notification.js';
import ParkingSlot from '../models/ParkingSlot.js';
import { emitSlotUpdate } from '../socket.js';
import { syncSlotStatus } from './slotStatus.js';
import { campusDateBounds, campusDateTime } from '../utils/campusTime.js';

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

  // A missed checkout is auto-closed as expired after the booked departure time
  // so it cannot hold a slot indefinitely.
  const checkedIn = await Reservation.find({ status: 'checked-in' });
  await Promise.all(checkedIn.map(async (reservation) => {
    const departure = campusDateTime(reservation.bookingDate, reservation.departureTime);
    if (!departure || departure > now) return;
    reservation.status = 'expired';
    await reservation.save();
    const slot = await syncSlotStatus(reservation.slot);
    emitSlotUpdate(slot);
    await Notification.create({ user: reservation.user, title: 'Reservation auto-closed', message: `Your checked-in reservation was closed after its ${reservation.departureTime} departure time.`, type: 'reservation-expired' });
  }));

  const reminderWindow = new Date(now.getTime() + 30 * 60 * 1000);
  const upcoming = await Reservation.find({ status: { $in: ['pending', 'confirmed'] }, reminderSentAt: null, expiresAt: { $gt: now, $lte: new Date(reminderWindow.getTime() + 15 * 60 * 1000) } });
  await Promise.all(upcoming.map(async (reservation) => {
    reservation.reminderSentAt = now;
    await reservation.save();
    await Notification.create({ user: reservation.user, title: 'Parking reminder', message: `Your parking arrival time is ${reservation.arrivalTime}.`, type: 'reminder' });
  }));

  const { date, nextDate } = campusDateBounds(now);
  const [activeToday, nonAvailableSlots] = await Promise.all([
    Reservation.find({
    bookingDate: { $gte: date, $lt: nextDate },
    status: { $in: ['pending', 'confirmed', 'checked-in'] }
    }).select('slot'),
    ParkingSlot.find({ status: { $in: ['reserved', 'occupied'] } }).select('_id')
  ]);
  const slotIds = [...new Set([
    ...activeToday.map((reservation) => reservation.slot.toString()),
    ...nonAvailableSlots.map((slot) => slot._id.toString())
  ])];
  await Promise.all(slotIds.map(async (slotId) => emitSlotUpdate(await syncSlotStatus(slotId))));
};
