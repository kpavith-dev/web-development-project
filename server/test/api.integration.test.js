import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import ParkingArea from '../models/ParkingArea.js';
import ParkingSlot from '../models/ParkingSlot.js';
import Reservation from '../models/Reservation.js';
import Notification from '../models/Notification.js';

const testUri = process.env.MONGO_TEST_URI;
const hasTestDatabase = testUri && /(?:test|testing)(?:[?&/]|$)/i.test(testUri);
const runtime = hasTestDatabase ? describe : describe.skip;
const tokenFor = (user, options = {}) => jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h', ...options });

runtime('API integration and security boundaries', () => {
  const app = createApp();
  let student; let secondStudent; let admin; let security; let area; let slot;
  const auth = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });

  beforeAll(async () => { process.env.NODE_ENV = 'test'; process.env.JWT_SECRET ||= 'test-secret-that-is-at-least-thirty-two-characters'; await mongoose.connect(testUri); });
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Vehicle.deleteMany({}), ParkingArea.deleteMany({}), ParkingSlot.deleteMany({}), Reservation.deleteMany({}), Notification.deleteMany({})]);
    [student, secondStudent, admin, security] = await User.create([
      { name: 'Student One', email: 'student1@test.local', password: 'Password1', role: 'student' },
      { name: 'Student Two', email: 'student2@test.local', password: 'Password1', role: 'student' },
      { name: 'Administrator', email: 'admin@test.local', password: 'Password1', role: 'admin' },
      { name: 'Officer', email: 'security@test.local', password: 'Password1', role: 'security' }
    ]);
    area = await ParkingArea.create({ name: 'Main Parking', totalSlots: 10, openingTime: '06:00', closingTime: '22:00' });
    slot = await ParkingSlot.create({ slotNumber: 'A-01', parkingArea: area._id, vehicleTypeAllowed: 'car' });
  });
  afterAll(async () => { await mongoose.disconnect(); });

  test('registers, rejects duplicate/invalid registration, and logs in', async () => {
    const registration = { name: 'New User', email: 'new@test.local', password: 'Password1', role: 'student' };
    expect((await request(app).post('/api/auth/register').send(registration)).status).toBe(201);
    expect((await request(app).post('/api/auth/register').send(registration)).status).toBe(409);
    expect((await request(app).post('/api/auth/register').send({ email: 'bad', password: 'x' })).status).toBe(400);
    expect((await request(app).post('/api/auth/login').send({ email: registration.email, password: registration.password })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: registration.email, password: 'WrongPassword1' })).status).toBe(401);
  });

  test('rejects missing, malformed, expired, and deactivated JWTs', async () => {
    expect((await request(app).get('/api/vehicles')).status).toBe(401);
    expect((await request(app).get('/api/vehicles').set('Authorization', 'Bearer malformed')).status).toBe(401);
    expect((await request(app).get('/api/vehicles').set('Authorization', `Bearer ${tokenFor(student, { expiresIn: -1 })}`)).status).toBe(401);
    student.isActive = false; await student.save();
    expect((await request(app).get('/api/vehicles').set(auth(student))).status).toBe(401);
  });

  test('enforces direct HTTP role boundaries', async () => {
    expect((await request(app).patch(`/api/vehicles/${new mongoose.Types.ObjectId()}/verify`).set(auth(student))).status).toBe(403);
    expect((await request(app).get('/api/users').set(auth(student))).status).toBe(403);
    expect((await request(app).get('/api/reports').set(auth(student))).status).toBe(403);
    expect((await request(app).post('/api/security/verify').set(auth(student)).send({ reservationId: 'RES-X' })).status).toBe(403);
    expect((await request(app).get('/api/reports').set(auth(security))).status).toBe(403);
    expect((await request(app).get('/api/reports').set(auth(admin))).status).toBe(200);
  });

  test('protects vehicle verification fields, ownership, duplicates, and admin review', async () => {
    const created = await request(app).post('/api/vehicles').set(auth(student)).send({ vehicleNumber: 'CAR 100', vehicleType: 'car', verificationStatus: 'verified', verifiedBy: admin._id, verifiedAt: new Date() });
    expect(created.status).toBe(400);
    const vehicle = await request(app).post('/api/vehicles').set(auth(student)).send({ vehicleNumber: 'CAR 100', vehicleType: 'car', registrationNumber: 'REG-100' });
    expect(vehicle.status).toBe(201); expect(vehicle.body.data.verificationStatus).toBe('pending'); expect(vehicle.body.data.isActive).toBe(true);
    expect((await request(app).post('/api/vehicles').set(auth(student)).send({ vehicleNumber: 'CAR 100', vehicleType: 'car' })).status).toBe(409);
    expect((await request(app).put(`/api/vehicles/${vehicle.body.data._id}`).set(auth(secondStudent)).send({ color: 'Blue' })).status).toBe(404);
    expect((await request(app).patch(`/api/vehicles/${vehicle.body.data._id}/reject`).set(auth(admin)).send({})).status).toBe(400);
    const approved = await request(app).patch(`/api/vehicles/${vehicle.body.data._id}/verify`).set(auth(admin));
    expect(approved.status).toBe(200); expect(String(approved.body.data.verifiedBy)).toBe(String(admin._id));
  });

  test('validates areas and slots with current field names', async () => {
    expect((await request(app).post('/api/areas').set(auth(admin)).send({ name: 'A', totalSlots: 1, openingTime: '10:00', closingTime: '09:00' })).status).toBe(400);
    expect((await request(app).post('/api/slots').set(auth(admin)).send({ slotNumber: 'B-01', parkingArea: 'bad', vehicleTypeAllowed: 'truck' })).status).toBe(400);
    expect((await request(app).post('/api/slots').set(auth(admin)).send({ slotNumber: 'B-01', parkingArea: area._id, vehicleTypeAllowed: 'car' })).status).toBe(201);
  });

  test('rejects malformed and object-form QR passes before security actions', async () => {
    for (const qrData of [{ reservationId: 'RES-X' }, 'bad.jwt.token', jwt.sign({ type: 'wrong', reservationId: 'RES-X', userId: student._id.toString() }, process.env.JWT_SECRET)]) {
      const response = await request(app).post('/api/security/verify').set(auth(security)).send({ qrData });
      expect(response.status).toBe(400);
    }
  });
});
