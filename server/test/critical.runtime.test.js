import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';

const sentResetEmails = vi.hoisted(() => []);
vi.mock('../services/email.js', () => ({ sendPasswordResetEmail: vi.fn(async (message) => { sentResetEmails.push(message); return true; }) }));

import { createApp } from '../app.js';
import { signParkingPass } from '../controllers/reservationController.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import ParkingArea from '../models/ParkingArea.js';
import ParkingSlot from '../models/ParkingSlot.js';
import Reservation from '../models/Reservation.js';
import Feedback from '../models/Feedback.js';
import Notification from '../models/Notification.js';
import SecurityLog from '../models/SecurityLog.js';
import Report from '../models/Report.js';
import { campusDateBounds, campusDateKey, campusTime } from '../utils/campusTime.js';
import { connectTestDatabase, assertSafeTestConnection } from './testDbGuard.js';

const testUri = process.env.MONGO_TEST_URI?.trim();
const runtime = testUri ? describe : describe.skip;
const tokenFor = (user, options = {}) => jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h', ...options });
const tomorrow = () => campusDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
const finiteValues = (value) => Object.values(value).every((entry) => (entry && typeof entry === 'object' ? finiteValues(entry) : entry !== undefined && (typeof entry !== 'number' || Number.isFinite(entry))));

runtime('critical runtime flows on isolated replica-set database', () => {
  const app = createApp();
  let student; let other; let admin; let security; let area; let slot;
  const auth = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });
  const createVerifiedVehicle = (user, suffix) => Vehicle.create({ user: user._id, vehicleNumber: `CAR-${suffix}`, vehicleType: 'car', verificationStatus: 'verified', verifiedBy: admin._id, verifiedAt: new Date() });
  const createReservation = async ({ user = student, vehicle, status = 'pending', bookingDate = campusDateBounds(new Date()).date, arrivalTime = '10:00', departureTime = '20:00', id = `RES-${new mongoose.Types.ObjectId()}` } = {}) => {
    const effectiveVehicle = vehicle || await createVerifiedVehicle(user, `AUTO-${new mongoose.Types.ObjectId()}`);
    return Reservation.create({ user: user._id, vehicle: effectiveVehicle._id || effectiveVehicle, slot: slot._id, reservationId: id, bookingDate, arrivalTime, departureTime, status, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET ||= 'runtime-test-secret-that-is-at-least-thirty-two-characters';
    await connectTestDatabase(testUri);
  });
  beforeEach(async () => {
    sentResetEmails.length = 0;
    assertSafeTestConnection(mongoose.connection);
    await Promise.all([Feedback.deleteMany({}), SecurityLog.deleteMany({}), Notification.deleteMany({}), Report.deleteMany({}), Reservation.deleteMany({}), Vehicle.deleteMany({}), ParkingSlot.deleteMany({}), ParkingArea.deleteMany({}), User.deleteMany({})]);
    [student, other, admin, security] = await User.create([
      { name: 'Student', email: 'runtime-student@test.local', password: 'Password1', role: 'student' }, { name: 'Other', email: 'runtime-other@test.local', password: 'Password1', role: 'student' }, { name: 'Admin', email: 'runtime-admin@test.local', password: 'Password1', role: 'admin' }, { name: 'Security', email: 'runtime-security@test.local', password: 'Password1', role: 'security' }
    ]);
    area = await ParkingArea.create({ name: 'Runtime Area', totalSlots: 5, openingTime: '00:00', closingTime: '23:59' });
    slot = await ParkingSlot.create({ slotNumber: 'RT-01', parkingArea: area._id, vehicleTypeAllowed: 'car', status: 'available' });
  });
  afterAll(async () => { await mongoose.disconnect(); });

  test('accepts exactly one genuinely concurrent overlapping booking', async () => {
    const studentVehicle = await createVerifiedVehicle(student, 'CONC-1');
    const otherVehicle = await createVerifiedVehicle(other, 'CONC-2');
    const payloadStudent = { slot: slot._id.toString(), vehicle: studentVehicle._id.toString(), bookingDate: tomorrow(), arrivalTime: '10:00', departureTime: '11:00' };
    const payloadOther = { slot: slot._id.toString(), vehicle: otherVehicle._id.toString(), bookingDate: tomorrow(), arrivalTime: '10:00', departureTime: '11:00' };
    const [one, two] = await Promise.all([request(app).post('/api/reservations').set(auth(student)).send(payloadStudent), request(app).post('/api/reservations').set(auth(other)).send(payloadOther)]);
    expect([one.status, two.status].filter((status) => status === 201)).toHaveLength(1);
    expect([one.status, two.status].filter((status) => status === 409)).toHaveLength(1);
    expect(await Reservation.countDocuments({ slot: slot._id, status: 'pending' })).toBe(1);
  });

  test('enforces mandatory vehicle selection and validation during reservation creation', async () => {
    const studentVehicle = await createVerifiedVehicle(student, 'OK');
    const otherVehicle = await createVerifiedVehicle(other, 'OTHER');
    const unverifiedVehicle = await Vehicle.create({ user: student._id, vehicleNumber: 'CAR-UNVER', vehicleType: 'car', verificationStatus: 'pending' });
    const inactiveVehicle = await Vehicle.create({ user: student._id, vehicleNumber: 'CAR-INACT', vehicleType: 'car', verificationStatus: 'verified', isActive: false });

    const basePayload = { slot: slot._id.toString(), bookingDate: tomorrow(), arrivalTime: '14:00', departureTime: '16:00' };

    // Missing vehicle is rejected
    const missingRes = await request(app).post('/api/reservations').set(auth(student)).send({ ...basePayload });
    expect(missingRes.status).toBe(400);

    // Empty vehicle is rejected
    const emptyRes = await request(app).post('/api/reservations').set(auth(student)).send({ ...basePayload, vehicle: '' });
    expect(emptyRes.status).toBe(400);

    // Malformed vehicle ID is rejected
    const malformedRes = await request(app).post('/api/reservations').set(auth(student)).send({ ...basePayload, vehicle: 'invalid-id' });
    expect(malformedRes.status).toBe(400);

    // Vehicle belonging to another user is rejected
    const otherUserVehicleRes = await request(app).post('/api/reservations').set(auth(student)).send({ ...basePayload, vehicle: otherVehicle._id.toString() });
    expect(otherUserVehicleRes.status).toBe(400);
    expect(otherUserVehicleRes.body.message).toMatch(/not found for your account/i);

    // Unverified vehicle is rejected
    const unverifiedRes = await request(app).post('/api/reservations').set(auth(student)).send({ ...basePayload, vehicle: unverifiedVehicle._id.toString() });
    expect(unverifiedRes.status).toBe(400);
    expect(unverifiedRes.body.message).toMatch(/not verified/i);

    // Inactive vehicle is rejected
    const inactiveRes = await request(app).post('/api/reservations').set(auth(student)).send({ ...basePayload, vehicle: inactiveVehicle._id.toString() });
    expect(inactiveRes.status).toBe(400);
    expect(inactiveRes.body.message).toMatch(/inactive/i);

    // Failed cases do not leave unintended database changes
    expect(await Reservation.countDocuments({})).toBe(0);
    expect(await Notification.countDocuments({ type: 'reservation-created' })).toBe(0);
    const slotAfterFailures = await ParkingSlot.findById(slot._id);
    expect(slotAfterFailures.status).toBe('available');

    // Valid eligible vehicle can still create a reservation
    const validRes = await request(app).post('/api/reservations').set(auth(student)).send({ ...basePayload, vehicle: studentVehicle._id.toString() });
    expect(validRes.status).toBe(201);
    expect(validRes.body.data.vehicle).toBe(studentVehicle._id.toString());
    expect(await Reservation.countDocuments({ user: student._id })).toBe(1);
    expect(await Notification.countDocuments({ user: student._id, type: 'reservation-created' })).toBe(1);
  });

  test('regenerates QR pass and claims when reservation slot or vehicle is updated', async () => {
    const studentVehicle1 = await createVerifiedVehicle(student, 'REG-1');
    const studentVehicle2 = await createVerifiedVehicle(student, 'REG-2');
    const slot2 = await ParkingSlot.create({ slotNumber: 'RT-02', parkingArea: area._id, vehicleTypeAllowed: 'car', status: 'available' });

    const qrSpy = vi.spyOn(QRCode, 'toDataURL');
    qrSpy.mockClear();

    // Create reservation with slot 1 and vehicle 1
    const createRes = await request(app)
      .post('/api/reservations')
      .set(auth(student))
      .send({
        slot: slot._id.toString(),
        vehicle: studentVehicle1._id.toString(),
        bookingDate: tomorrow(),
        arrivalTime: '10:00',
        departureTime: '12:00'
      });
    expect(createRes.status).toBe(201);
    const reservationDbId = createRes.body.data._id;
    const reservationRef = createRes.body.data.reservationId;
    const initialQrCode = createRes.body.data.qrCode;
    expect(initialQrCode).toMatch(/^data:image\/png;base64,/);

    const initialQrData = qrSpy.mock.calls[qrSpy.mock.calls.length - 1][0];
    const initialPayload = jwt.verify(initialQrData, process.env.JWT_SECRET);
    expect(initialPayload.slotId).toBe(slot._id.toString());
    expect(initialPayload.vehicleId).toBe(studentVehicle1._id.toString());
    expect(initialPayload.reservationId).toBe(reservationRef);
    expect(initialPayload.userId).toBe(student._id.toString());
    expect(initialPayload.type).toBe('parking-pass');

    // Verify initial pass works with security verify
    const initialVerify = await request(app)
      .post('/api/security/verify')
      .set(auth(security))
      .send({ qrData: initialQrData });
    expect(initialVerify.status).toBe(200);
    expect(initialVerify.body.message).toBe('Parking pass verified.');

    // 1. Update only the slot to slot2
    qrSpy.mockClear();
    const slotUpdateRes = await request(app)
      .put(`/api/reservations/${reservationDbId}`)
      .set(auth(student))
      .send({ slot: slot2._id.toString() });
    expect(slotUpdateRes.status).toBe(200);
    expect(slotUpdateRes.body.data.slot).toBe(slot2._id.toString());
    expect(slotUpdateRes.body.data.vehicle).toBe(studentVehicle1._id.toString());
    expect(slotUpdateRes.body.data.qrCode).not.toBe(initialQrCode);
    expect(qrSpy).toHaveBeenCalledTimes(1);

    const slotUpdatedQrData = qrSpy.mock.calls[0][0];
    expect(slotUpdatedQrData).not.toBe(initialQrData);
    const slotUpdatedPayload = jwt.verify(slotUpdatedQrData, process.env.JWT_SECRET);
    expect(slotUpdatedPayload.slotId).toBe(slot2._id.toString());
    expect(slotUpdatedPayload.vehicleId).toBe(studentVehicle1._id.toString());
    expect(slotUpdatedPayload.reservationId).toBe(reservationRef);
    expect(slotUpdatedPayload.userId).toBe(student._id.toString());

    // New QR pass verified by security
    const slotUpdatedVerify = await request(app)
      .post('/api/security/verify')
      .set(auth(security))
      .send({ qrData: slotUpdatedQrData });
    expect(slotUpdatedVerify.status).toBe(200);
    expect(slotUpdatedVerify.body.message).toBe('Parking pass verified.');

    // Stale initial QR pass is rejected because slot changed
    const staleSlotVerify = await request(app)
      .post('/api/security/verify')
      .set(auth(security))
      .send({ qrData: initialQrData });
    expect(staleSlotVerify.status).toBe(400);
    expect(staleSlotVerify.body.message).toBe('Invalid or expired parking pass.');

    // 2. Update only the vehicle to vehicle 2
    qrSpy.mockClear();
    const vehicleUpdateRes = await request(app)
      .put(`/api/reservations/${reservationDbId}`)
      .set(auth(student))
      .send({ vehicle: studentVehicle2._id.toString() });
    expect(vehicleUpdateRes.status).toBe(200);
    expect(vehicleUpdateRes.body.data.slot).toBe(slot2._id.toString());
    expect(vehicleUpdateRes.body.data.vehicle).toBe(studentVehicle2._id.toString());
    expect(vehicleUpdateRes.body.data.qrCode).not.toBe(slotUpdateRes.body.data.qrCode);
    expect(qrSpy).toHaveBeenCalledTimes(1);

    const vehicleUpdatedQrData = qrSpy.mock.calls[0][0];
    const vehicleUpdatedPayload = jwt.verify(vehicleUpdatedQrData, process.env.JWT_SECRET);
    expect(vehicleUpdatedPayload.slotId).toBe(slot2._id.toString());
    expect(vehicleUpdatedPayload.vehicleId).toBe(studentVehicle2._id.toString());
    expect(vehicleUpdatedPayload.reservationId).toBe(reservationRef);
    expect(vehicleUpdatedPayload.userId).toBe(student._id.toString());

    // New QR pass verified by security
    const vehicleUpdatedVerify = await request(app)
      .post('/api/security/verify')
      .set(auth(security))
      .send({ qrData: vehicleUpdatedQrData });
    expect(vehicleUpdatedVerify.status).toBe(200);
    expect(vehicleUpdatedVerify.body.message).toBe('Parking pass verified.');

    // Previous QR pass is rejected because vehicle changed
    const staleVehicleVerify = await request(app)
      .post('/api/security/verify')
      .set(auth(security))
      .send({ qrData: slotUpdatedQrData });
    expect(staleVehicleVerify.status).toBe(400);
    expect(staleVehicleVerify.body.message).toBe('Invalid or expired parking pass.');

    // 3. Update only arrival/departure time (no slot or vehicle change)
    qrSpy.mockClear();
    const timeUpdateRes = await request(app)
      .put(`/api/reservations/${reservationDbId}`)
      .set(auth(student))
      .send({ arrivalTime: '11:00', departureTime: '13:00' });
    expect(timeUpdateRes.status).toBe(200);
    expect(timeUpdateRes.body.data.arrivalTime).toBe('11:00');
    expect(timeUpdateRes.body.data.departureTime).toBe('13:00');
    // QR regeneration is bypassed since slot and vehicle did not change
    expect(qrSpy).not.toHaveBeenCalled();
    expect(timeUpdateRes.body.data.qrCode).toBe(vehicleUpdateRes.body.data.qrCode);

    // Current pass is still verified
    const currentVerify = await request(app)
      .post('/api/security/verify')
      .set(auth(security))
      .send({ qrData: vehicleUpdatedQrData });
    expect(currentVerify.status).toBe(200);

    qrSpy.mockRestore();
  });

  test('rejects invalid, unverified, inactive, or another user vehicle during reservation update', async () => {
    const studentVehicle = await createVerifiedVehicle(student, 'UPDATE-OK');
    const otherVehicle = await createVerifiedVehicle(other, 'UPDATE-OTHER');
    const unverifiedVehicle = await Vehicle.create({ user: student._id, vehicleNumber: 'CAR-UNVER-U', vehicleType: 'car', verificationStatus: 'pending' });
    const inactiveVehicle = await Vehicle.create({ user: student._id, vehicleNumber: 'CAR-INACT-U', vehicleType: 'car', verificationStatus: 'verified', isActive: false });
    const motorcycleVehicle = await Vehicle.create({ user: student._id, vehicleNumber: 'MOTO-U', vehicleType: 'motorcycle', verificationStatus: 'verified', verifiedBy: admin._id, verifiedAt: new Date() });
    const inactiveSlot = await ParkingSlot.create({ slotNumber: 'RT-INACT', parkingArea: area._id, vehicleTypeAllowed: 'car', status: 'available', isActive: false });
    const maintenanceSlot = await ParkingSlot.create({ slotNumber: 'RT-MAINT', parkingArea: area._id, vehicleTypeAllowed: 'car', status: 'maintenance' });

    const initialQrData = signParkingPass({ reservationId: 'RES-UPDATE-VAL', userId: student._id, slotId: slot._id, vehicleId: studentVehicle._id });
    const originalQrCode = await QRCode.toDataURL(initialQrData);
    const bookingDate = campusDateBounds(new Date(Date.now() + 24 * 60 * 60 * 1000)).date;
    const testReservation = await Reservation.create({
      user: student._id,
      slot: slot._id,
      vehicle: studentVehicle._id,
      reservationId: 'RES-UPDATE-VAL',
      bookingDate,
      arrivalTime: '14:00',
      departureTime: '16:00',
      status: 'pending',
      qrCode: originalQrCode,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });
    const reservationId = testReservation._id;

    // Reject empty vehicle
    const emptyRes = await request(app).put(`/api/reservations/${reservationId}`).set(auth(student)).send({ vehicle: '' });
    expect(emptyRes.status).toBe(400);

    // Reject malformed vehicle ID
    const malformedRes = await request(app).put(`/api/reservations/${reservationId}`).set(auth(student)).send({ vehicle: 'invalid-id' });
    expect(malformedRes.status).toBe(400);

    // Reject other user's vehicle
    const otherUserRes = await request(app).put(`/api/reservations/${reservationId}`).set(auth(student)).send({ vehicle: otherVehicle._id.toString() });
    expect(otherUserRes.status).toBe(400);
    expect(otherUserRes.body.message).toMatch(/not found for your account/i);

    // Reject unverified vehicle
    const unverifiedRes = await request(app).put(`/api/reservations/${reservationId}`).set(auth(student)).send({ vehicle: unverifiedVehicle._id.toString() });
    expect(unverifiedRes.status).toBe(400);
    expect(unverifiedRes.body.message).toMatch(/not verified/i);

    // Reject inactive vehicle
    const inactiveRes = await request(app).put(`/api/reservations/${reservationId}`).set(auth(student)).send({ vehicle: inactiveVehicle._id.toString() });
    expect(inactiveRes.status).toBe(400);
    expect(inactiveRes.body.message).toMatch(/inactive/i);

    // Reject vehicle type mismatch
    const typeMismatchRes = await request(app).put(`/api/reservations/${reservationId}`).set(auth(student)).send({ vehicle: motorcycleVehicle._id.toString() });
    expect(typeMismatchRes.status).toBe(400);
    expect(typeMismatchRes.body.message).toMatch(/available for car vehicles only/i);

    // Reject inactive slot
    const inactiveSlotRes = await request(app).put(`/api/reservations/${reservationId}`).set(auth(student)).send({ slot: inactiveSlot._id.toString() });
    expect(inactiveSlotRes.status).toBe(400);
    expect(inactiveSlotRes.body.message).toMatch(/slot is inactive/i);

    // Reject maintenance slot
    const maintSlotRes = await request(app).put(`/api/reservations/${reservationId}`).set(auth(student)).send({ slot: maintenanceSlot._id.toString() });
    expect(maintSlotRes.status).toBe(400);
    expect(maintSlotRes.body.message).toMatch(/under maintenance/i);

    // Reject invalid slot ID format
    const badSlotRes = await request(app).put(`/api/reservations/${reservationId}`).set(auth(student)).send({ slot: 'bad-slot' });
    expect(badSlotRes.status).toBe(400);

    // Ensure database reservation is completely untouched
    const reservationAfterFailures = await Reservation.findById(reservationId);
    expect(reservationAfterFailures.slot.toString()).toBe(slot._id.toString());
    expect(reservationAfterFailures.vehicle.toString()).toBe(studentVehicle._id.toString());
    expect(reservationAfterFailures.qrCode).toBe(originalQrCode);
  });

  test('rolls back all reservation and QR code modifications if an update transaction fails', async () => {
    const studentVehicle = await createVerifiedVehicle(student, 'ROLL-1');
    const otherVehicle = await createVerifiedVehicle(other, 'ROLL-2');
    const slot2 = await ParkingSlot.create({ slotNumber: 'RT-02', parkingArea: area._id, vehicleTypeAllowed: 'car', status: 'available' });

    const bookingDate = campusDateBounds(new Date(Date.now() + 24 * 60 * 60 * 1000)).date;
    // Other user books slot2 from 10:00 to 12:00 tomorrow
    await Reservation.create({
      user: other._id,
      slot: slot2._id,
      vehicle: otherVehicle._id,
      reservationId: 'RES-OTHER-OCCUPIED',
      bookingDate,
      arrivalTime: '10:00',
      departureTime: '12:00',
      status: 'confirmed',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    // Student books slot 1 from 10:00 to 12:00 tomorrow
    const studentQr = await QRCode.toDataURL(signParkingPass({ reservationId: 'RES-STUDENT-ROLL', userId: student._id, slotId: slot._id, vehicleId: studentVehicle._id }));
    const studentBooking = await Reservation.create({
      user: student._id,
      slot: slot._id,
      vehicle: studentVehicle._id,
      reservationId: 'RES-STUDENT-ROLL',
      bookingDate,
      arrivalTime: '10:00',
      departureTime: '12:00',
      status: 'pending',
      qrCode: studentQr,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });
    const reservationId = studentBooking._id;
    const originalQrCode = studentBooking.qrCode;

    // Student attempts to update reservation to slot2 (overlapping other user)
    const conflictRes = await request(app)
      .put(`/api/reservations/${reservationId}`)
      .set(auth(student))
      .send({ slot: slot2._id.toString() });
    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.message).toMatch(/overlaps/i);

    // Confirm that the student's reservation remains unchanged
    const studentResAfter = await Reservation.findById(reservationId);
    expect(studentResAfter.slot.toString()).toBe(slot._id.toString());
    expect(studentResAfter.vehicle.toString()).toBe(studentVehicle._id.toString());
    expect(studentResAfter.qrCode).toBe(originalQrCode);
  });

  test('blocks QR replay and records a successful security lifecycle without raw JWT', async () => {
    const vehicle = await createVerifiedVehicle(student, 'QR');
    const arrivalTime = campusTime();
    const reservation = await createReservation({ vehicle, arrivalTime, departureTime: '23:59', id: 'RES-QR-RUNTIME' });
    const qrData = jwt.sign({ reservationId: reservation.reservationId, userId: student._id.toString(), slotId: slot._id.toString(), vehicleId: vehicle._id.toString(), type: 'parking-pass' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    expect((await request(app).post('/api/security/check-in').set(auth(student)).send({ qrData })).status).toBe(403);
    expect((await request(app).post('/api/security/check-in').set(auth(security)).send({ qrData })).status).toBe(200);
    expect((await request(app).post('/api/security/check-in').set(auth(security)).send({ qrData })).status).toBe(400);
    expect((await request(app).post('/api/security/check-out').set(auth(security)).send({ qrData })).status).toBe(200);
    expect((await request(app).post('/api/security/check-out').set(auth(security)).send({ qrData })).status).toBe(400);
    expect((await request(app).post('/api/security/check-in').set(auth(security)).send({ qrData })).status).toBe(400);
    const logs = await SecurityLog.find({ reservationId: reservation.reservationId });
    expect(logs).toHaveLength(2); expect(JSON.stringify(logs)).not.toContain(qrData);
    expect(await Notification.countDocuments({ user: student._id, type: { $in: ['reservation-check-in', 'reservation-check-out'] } })).toBe(2);
  });

  test('rejects invalid QR claims and security actions outside the arrival window', async () => {
    const vehicle = await createVerifiedVehicle(student, 'EARLY');
    const reservation = await createReservation({ vehicle, arrivalTime: '23:58', departureTime: '23:59', id: 'RES-EARLY-RUNTIME' });
    const valid = { reservationId: reservation.reservationId, userId: student._id.toString(), slotId: slot._id.toString(), vehicleId: vehicle._id.toString(), type: 'parking-pass' };
    const wrongSignature = jwt.sign(valid, 'wrong-signing-secret', { expiresIn: '1h' });
    const expired = jwt.sign(valid, process.env.JWT_SECRET, { expiresIn: -1 });
    for (const qrData of [wrongSignature, expired, jwt.sign({ ...valid, type: 'wrong' }, process.env.JWT_SECRET), jwt.sign({ ...valid, userId: other._id.toString() }, process.env.JWT_SECRET)]) expect((await request(app).post('/api/security/verify').set(auth(security)).send({ qrData })).status).toBe(400);
    expect((await request(app).post('/api/security/check-in').set(auth(security)).send({ reservationId: reservation.reservationId })).status).toBe(400);
  });

  test('rejects check-in after the grace window has elapsed', async () => {
    const vehicle = await createVerifiedVehicle(student, 'LATE');
    const [hour, minute] = campusTime().split(':').map(Number);
    const pastMinutes = Math.max(0, hour * 60 + minute - 20);
    const arrivalTime = `${String(Math.floor(pastMinutes / 60)).padStart(2, '0')}:${String(pastMinutes % 60).padStart(2, '0')}`;
    const reservation = await createReservation({ vehicle, arrivalTime, departureTime: '23:59', id: 'RES-LATE-RUNTIME' });
    expect((await request(app).post('/api/security/check-in').set(auth(security)).send({ reservationId: reservation.reservationId })).status).toBe(400);
  });

  test('enforces feedback ownership, completion, validation, and uniqueness', async () => {
    const feedbackVehicle = await createVerifiedVehicle(student, 'FDBK');
    const completed = await createReservation({ user: student, vehicle: feedbackVehicle, status: 'checked-out', id: 'RES-FEEDBACK-RUNTIME' });
    expect((await request(app).post('/api/feedback').set(auth(other)).send({ reservation: completed._id, rating: 5 })).status).toBe(403);
    expect((await request(app).post('/api/feedback').set(auth(student)).send({ reservation: completed._id, rating: 0 })).status).toBe(400);
    expect((await request(app).post('/api/feedback').set(auth(student)).send({ reservation: completed._id, rating: 5, comment: 'x'.repeat(501) })).status).toBe(400);
    expect((await request(app).post('/api/feedback').set(auth(student)).send({ reservation: completed._id, rating: 5, comment: 'Great' })).status).toBe(201);
    expect((await request(app).post('/api/feedback').set(auth(student)).send({ reservation: completed._id, rating: 5 })).status).toBe(409);
  });

  test('isolates notification reads to the authenticated owner', async () => {
    const [ownUnread, ownRead, otherUnread] = await Notification.create([{ user: student._id, title: 'Own unread', message: 'A', type: 'system' }, { user: student._id, title: 'Own read', message: 'B', type: 'system', isRead: true }, { user: other._id, title: 'Other unread', message: 'C', type: 'system' }]);
    const listed = await request(app).get('/api/notifications').set(auth(student));
    expect(listed.status).toBe(200); expect(listed.body.data.map((item) => String(item._id))).toEqual(expect.arrayContaining([String(ownUnread._id), String(ownRead._id)])); expect(listed.body.data.map((item) => String(item._id))).not.toContain(String(otherUnread._id));
    expect((await request(app).patch(`/api/notifications/${otherUnread._id}/read`).set(auth(student))).status).toBe(404);
    expect((await request(app).patch(`/api/notifications/${ownUnread._id}/read`).set(auth(student))).status).toBe(200);
    await request(app).patch('/api/notifications/read-all').set(auth(student));
    expect(await Notification.countDocuments({ user: student._id, isRead: false })).toBe(0); expect(await Notification.countDocuments({ user: other._id, isRead: false })).toBe(1);
  });

  test('mocks reset email and enforces single-use, valid, unexpired reset tokens', async () => {
    const known = await request(app).post('/api/auth/forgot-password').send({ email: student.email });
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'unknown@test.local' });
    expect(known.status).toBe(200); expect(known.body).toEqual(unknown.body); expect(JSON.stringify(known.body)).not.toMatch(/token/i); expect(sentResetEmails).toHaveLength(1);
    const rawToken = sentResetEmails[0].token;
    expect((await request(app).post('/api/auth/reset-password').send({ token: 'invalid', password: 'NewPassword1' })).status).toBe(400);
    expect((await request(app).post('/api/auth/reset-password').send({ token: rawToken, password: 'NewPassword1' })).status).toBe(200);
    expect((await request(app).post('/api/auth/reset-password').send({ token: rawToken, password: 'NewPassword1' })).status).toBe(400);
    student.resetPasswordToken = 'expired'; student.resetPasswordExpires = new Date(Date.now() - 1); await student.save();
    expect((await request(app).post('/api/auth/reset-password').send({ token: 'expired', password: 'NewPassword1' })).status).toBe(400);
  });

  test('generates admin-only report ranges with finite empty metrics', async () => {
    expect((await request(app).post('/api/reports').set(auth(student)).send({ type: 'daily' })).status).toBe(403);
    for (const body of [{ type: 'daily' }, { type: 'weekly' }, { type: 'monthly' }, { type: 'daily', startDate: '2026-01-01', endDate: '2026-01-02' }]) {
      const response = await request(app).post('/api/reports').set(auth(admin)).send(body);
      expect(response.status).toBe(201); expect(finiteValues(response.body.data.summary)).toBe(true); expect(finiteValues(response.body.data.data)).toBe(true);
    }
    expect((await request(app).post('/api/reports').set(auth(admin)).send({ type: 'daily', startDate: '2026-02-01', endDate: '2026-01-01' })).status).toBe(400);
    expect((await request(app).get('/api/reports').set(auth(admin))).status).toBe(200);
  });

  test('returns all relevant records for today queue when more than 10 reservations exist and excludes other dates', async () => {
    const studentVehicle = await createVerifiedVehicle(student, 'TODAY-S');
    const otherVehicle = await createVerifiedVehicle(other, 'TODAY-O');
    const todayBounds = campusDateBounds(new Date());
    const tomorrowBounds = campusDateBounds(tomorrow());
    const yesterdayBounds = campusDateBounds(new Date(Date.now() - 24 * 60 * 60 * 1000));

    // Create 12 reservations for today (6 by student, 6 by other)
    for (let i = 0; i < 12; i++) {
      const user = i % 2 === 0 ? student : other;
      const vehicle = i % 2 === 0 ? studentVehicle : otherVehicle;
      const hour = String(8 + Math.floor(i / 2)).padStart(2, '0');
      const min = i % 2 === 0 ? '00' : '30';
      const arr = `${hour}:${min}`;
      const depHour = String(9 + Math.floor(i / 2)).padStart(2, '0');
      const dep = `${depHour}:${min}`;
      await createReservation({
        user,
        vehicle,
        bookingDate: todayBounds.date,
        arrivalTime: arr,
        departureTime: dep,
        id: `RES-TODAY-${i}`
      });
    }

    // Create 3 reservations for tomorrow and 2 for yesterday
    for (let i = 0; i < 3; i++) {
      await createReservation({
        user: student,
        vehicle: studentVehicle,
        bookingDate: tomorrowBounds.date,
        arrivalTime: `1${i}:00`,
        departureTime: `1${i + 1}:00`,
        id: `RES-TOMORROW-${i}`
      });
    }
    for (let i = 0; i < 2; i++) {
      await createReservation({
        user: other,
        vehicle: otherVehicle,
        bookingDate: yesterdayBounds.date,
        arrivalTime: `1${i}:00`,
        departureTime: `1${i + 1}:00`,
        id: `RES-YESTERDAY-${i}`
      });
    }

    expect(await Reservation.countDocuments({})).toBe(17);

    // Security requests today's queue with date=today
    const securityTodayRes = await request(app)
      .get('/api/reservations?date=today')
      .set(auth(security));
    expect(securityTodayRes.status).toBe(200);
    expect(securityTodayRes.body.success).toBe(true);
    expect(securityTodayRes.body.data).toHaveLength(12);
    expect(securityTodayRes.body.pagination.total).toBe(12);
    expect(securityTodayRes.body.pagination.limit).toBe(100);

    const returnedIds = securityTodayRes.body.data.map((r) => r.reservationId);
    for (let i = 0; i < 12; i++) {
      expect(returnedIds).toContain(`RES-TODAY-${i}`);
    }
    for (let i = 0; i < 3; i++) {
      expect(returnedIds).not.toContain(`RES-TOMORROW-${i}`);
    }
    for (let i = 0; i < 2; i++) {
      expect(returnedIds).not.toContain(`RES-YESTERDAY-${i}`);
    }

    // Security requests today's queue using exact campusDateKey
    const todayKey = campusDateKey();
    const securityDateKeyRes = await request(app)
      .get(`/api/reservations?date=${todayKey}`)
      .set(auth(security));
    expect(securityDateKeyRes.status).toBe(200);
    expect(securityDateKeyRes.body.data).toHaveLength(12);

    // Security requests tomorrow's reservations
    const securityTomorrowRes = await request(app)
      .get(`/api/reservations?date=${tomorrow()}`)
      .set(auth(security));
    expect(securityTomorrowRes.status).toBe(200);
    expect(securityTomorrowRes.body.data).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(securityTomorrowRes.body.data.map((r) => r.reservationId)).toContain(`RES-TOMORROW-${i}`);
    }
  });

  test('uses campus timezone logic to bound date filter independently of local machine clock', async () => {
    const studentVehicle = await createVerifiedVehicle(student, 'TZ-1');
    const targetDateStr = '2026-06-15';
    const bounds = campusDateBounds(targetDateStr);
    const prevDay = new Date(bounds.date.getTime() - 24 * 60 * 60 * 1000);

    await createReservation({
      user: student,
      vehicle: studentVehicle,
      bookingDate: bounds.date,
      arrivalTime: '09:00',
      departureTime: '10:00',
      id: 'RES-TARGET-DAY'
    });
    await createReservation({
      user: student,
      vehicle: studentVehicle,
      bookingDate: bounds.nextDate,
      arrivalTime: '09:00',
      departureTime: '10:00',
      id: 'RES-NEXT-DAY'
    });
    await createReservation({
      user: student,
      vehicle: studentVehicle,
      bookingDate: prevDay,
      arrivalTime: '09:00',
      departureTime: '10:00',
      id: 'RES-PREV-DAY'
    });

    const res = await request(app)
      .get(`/api/reservations?date=${targetDateStr}`)
      .set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].reservationId).toBe('RES-TARGET-DAY');
  });

  test('preserves existing pagination for general reservation list callers without date filter', async () => {
    const studentVehicle = await createVerifiedVehicle(student, 'PAGE-1');
    for (let i = 0; i < 15; i++) {
      await createReservation({
        user: student,
        vehicle: studentVehicle,
        arrivalTime: `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
        departureTime: '22:00',
        id: `RES-PAGE-${String(i).padStart(2, '0')}`
      });
    }

    const defaultRes = await request(app)
      .get('/api/reservations')
      .set(auth(student));
    expect(defaultRes.status).toBe(200);
    expect(defaultRes.body.data).toHaveLength(10);
    expect(defaultRes.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 15,
      totalPages: 2
    });

    const page2Res = await request(app)
      .get('/api/reservations?page=2&limit=10')
      .set(auth(student));
    expect(page2Res.status).toBe(200);
    expect(page2Res.body.data).toHaveLength(5);
    expect(page2Res.body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 15,
      totalPages: 2
    });

    const limit5Res = await request(app)
      .get('/api/reservations?page=1&limit=5')
      .set(auth(student));
    expect(limit5Res.status).toBe(200);
    expect(limit5Res.body.data).toHaveLength(5);
    expect(limit5Res.body.pagination).toEqual({
      page: 1,
      limit: 5,
      total: 15,
      totalPages: 3
    });
  });

  test('preserves role-based access and ownership filtering with and without date filter', async () => {
    const studentVehicle = await createVerifiedVehicle(student, 'ROLE-S');
    const otherVehicle = await createVerifiedVehicle(other, 'ROLE-O');
    const todayBounds = campusDateBounds(new Date());

    await createReservation({
      user: student,
      vehicle: studentVehicle,
      bookingDate: todayBounds.date,
      arrivalTime: '08:00',
      departureTime: '09:00',
      id: 'RES-ROLE-STUDENT'
    });
    await createReservation({
      user: other,
      vehicle: otherVehicle,
      bookingDate: todayBounds.date,
      arrivalTime: '09:00',
      departureTime: '10:00',
      id: 'RES-ROLE-OTHER'
    });

    const studentRes = await request(app)
      .get('/api/reservations?date=today')
      .set(auth(student));
    expect(studentRes.status).toBe(200);
    expect(studentRes.body.data).toHaveLength(1);
    expect(studentRes.body.data[0].reservationId).toBe('RES-ROLE-STUDENT');

    const otherRes = await request(app)
      .get('/api/reservations?date=today')
      .set(auth(other));
    expect(otherRes.status).toBe(200);
    expect(otherRes.body.data).toHaveLength(1);
    expect(otherRes.body.data[0].reservationId).toBe('RES-ROLE-OTHER');

    const securityRes = await request(app)
      .get('/api/reservations?date=today')
      .set(auth(security));
    expect(securityRes.status).toBe(200);
    expect(securityRes.body.data).toHaveLength(2);
    const secIds = securityRes.body.data.map((r) => r.reservationId);
    expect(secIds).toContain('RES-ROLE-STUDENT');
    expect(secIds).toContain('RES-ROLE-OTHER');

    const adminRes = await request(app)
      .get('/api/reservations?date=today')
      .set(auth(admin));
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data).toHaveLength(2);

    const unauthRes = await request(app).get('/api/reservations');
    expect(unauthRes.status).toBe(401);
  });

  test('handles invalid date and excessive limit inputs safely', async () => {
    const badDateRes = await request(app)
      .get('/api/reservations?date=not-a-valid-date')
      .set(auth(student));
    expect(badDateRes.status).toBe(400);
    expect(badDateRes.body.success).toBe(false);

    const badCalRes = await request(app)
      .get('/api/reservations?date=2026-02-29')
      .set(auth(student));
    expect(badCalRes.status).toBe(400);
    expect(badCalRes.body.success).toBe(false);

    const excessiveLimitRes = await request(app)
      .get('/api/reservations?limit=101')
      .set(auth(student));
    expect(excessiveLimitRes.status).toBe(400);
    expect(excessiveLimitRes.body.success).toBe(false);
    expect(excessiveLimitRes.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'limit', message: expect.stringMatching(/between 1 and 100/i) })
      ])
    );

    const zeroLimitRes = await request(app)
      .get('/api/reservations?limit=0')
      .set(auth(student));
    expect(zeroLimitRes.status).toBe(400);

    const negPageRes = await request(app)
      .get('/api/reservations?page=-1')
      .set(auth(student));
    expect(negPageRes.status).toBe(400);
  });

  test('enforces required vehicle reference in Reservation schema', async () => {
    const invalidReservation = new Reservation({
      user: student._id,
      slot: slot._id,
      reservationId: 'RES-SCHEMA-NO-VEHICLE',
      bookingDate: campusDateBounds(new Date()).date,
      arrivalTime: '10:00',
      departureTime: '11:00'
    });
    let error;
    try {
      await invalidReservation.validate();
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.errors.vehicle).toBeDefined();
    expect(error.errors.vehicle.kind).toBe('required');
  });
});
