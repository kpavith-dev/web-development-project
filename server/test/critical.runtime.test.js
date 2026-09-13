import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const sentResetEmails = vi.hoisted(() => []);
vi.mock('../services/email.js', () => ({ sendPasswordResetEmail: vi.fn(async (message) => { sentResetEmails.push(message); return true; }) }));

import { createApp } from '../app.js';
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

const testUri = process.env.MONGO_TEST_URI;
const runtime = testUri && /(?:test|testing)(?:[?&/]|$)/i.test(testUri) ? describe : describe.skip;
const tokenFor = (user, options = {}) => jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h', ...options });
const tomorrow = () => campusDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
const finiteValues = (value) => Object.values(value).every((entry) => (entry && typeof entry === 'object' ? finiteValues(entry) : entry !== undefined && (typeof entry !== 'number' || Number.isFinite(entry))));

runtime('critical runtime flows on isolated replica-set database', () => {
  const app = createApp();
  let student; let other; let admin; let security; let area; let slot;
  const auth = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });
  const createVerifiedVehicle = (user, suffix) => Vehicle.create({ user: user._id, vehicleNumber: `CAR-${suffix}`, vehicleType: 'car', verificationStatus: 'verified', verifiedBy: admin._id, verifiedAt: new Date() });
  const createReservation = async ({ user = student, vehicle, status = 'pending', bookingDate = campusDateBounds(new Date()).date, arrivalTime = '10:00', departureTime = '20:00', id = `RES-${new mongoose.Types.ObjectId()}` } = {}) => Reservation.create({ user: user._id, vehicle: vehicle?._id, slot: slot._id, reservationId: id, bookingDate, arrivalTime, departureTime, status, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });

  beforeAll(async () => { process.env.NODE_ENV = 'test'; process.env.JWT_SECRET ||= 'runtime-test-secret-that-is-at-least-thirty-two-characters'; await mongoose.connect(testUri); });
  beforeEach(async () => {
    sentResetEmails.length = 0;
    await Promise.all([Feedback.deleteMany({}), SecurityLog.deleteMany({}), Notification.deleteMany({}), Report.deleteMany({}), Reservation.deleteMany({}), Vehicle.deleteMany({}), ParkingSlot.deleteMany({}), ParkingArea.deleteMany({}), User.deleteMany({})]);
    [student, other, admin, security] = await User.create([
      { name: 'Student', email: 'runtime-student@test.local', password: 'Password1', role: 'student' }, { name: 'Other', email: 'runtime-other@test.local', password: 'Password1', role: 'student' }, { name: 'Admin', email: 'runtime-admin@test.local', password: 'Password1', role: 'admin' }, { name: 'Security', email: 'runtime-security@test.local', password: 'Password1', role: 'security' }
    ]);
    area = await ParkingArea.create({ name: 'Runtime Area', totalSlots: 5, openingTime: '00:00', closingTime: '23:59' });
    slot = await ParkingSlot.create({ slotNumber: 'RT-01', parkingArea: area._id, vehicleTypeAllowed: 'car', status: 'available' });
  });
  afterAll(async () => { await mongoose.disconnect(); });

  test('accepts exactly one genuinely concurrent overlapping booking', async () => {
    const payload = { slot: slot._id.toString(), bookingDate: tomorrow(), arrivalTime: '10:00', departureTime: '11:00' };
    const [one, two] = await Promise.all([request(app).post('/api/reservations').set(auth(student)).send(payload), request(app).post('/api/reservations').set(auth(other)).send(payload)]);
    expect([one.status, two.status].filter((status) => status === 201)).toHaveLength(1);
    expect([one.status, two.status].filter((status) => status === 409)).toHaveLength(1);
    expect(await Reservation.countDocuments({ slot: slot._id, status: 'pending' })).toBe(1);
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
    const completed = await createReservation({ status: 'checked-out', id: 'RES-FEEDBACK-RUNTIME' });
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
});
