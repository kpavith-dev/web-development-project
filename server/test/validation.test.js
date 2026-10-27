import { describe, expect, test } from 'vitest';
import request from 'supertest';
import express from 'express';
import {
  validateRegister,
  validateResetPassword,
  validateReservation,
  validateReservationQuery,
  handleValidationErrors
} from '../middleware/validationMiddleware.js';

describe('Authentication validation consistency', () => {
  const app = express();
  app.use(express.json());
  app.post('/test/register', validateRegister, handleValidationErrors, (_req, res) => {
    res.json({ success: true });
  });
  app.post('/test/reset-password', validateResetPassword, handleValidationErrors, (_req, res) => {
    res.json({ success: true });
  });

  describe('Registration password validation', () => {
    test('rejects short passwords', async () => {
      const res = await request(app)
        .post('/test/register')
        .send({ name: 'Valid Name', email: 'test@example.com', password: 'Aa1' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password', message: expect.stringMatching(/at least 6 characters/i) })
        ])
      );
    });

    test('rejects passwords missing numbers or uppercase', async () => {
      const res = await request(app)
        .post('/test/register')
        .send({ name: 'Valid Name', email: 'test@example.com', password: 'lowercaseonly' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password', message: expect.stringMatching(/uppercase, lowercase, and numbers/i) })
        ])
      );
    });

    test('accepts valid registration password', async () => {
      const res = await request(app)
        .post('/test/register')
        .send({ name: 'Valid Name', email: 'test@example.com', password: 'ValidPassword1' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Registration role validation', () => {
    test('accepts student, staff, and lecturer roles', async () => {
      for (const role of ['student', 'staff', 'lecturer']) {
        const res = await request(app)
          .post('/test/register')
          .send({ name: 'Valid Name', email: `${role}@example.com`, password: 'ValidPassword1', role });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });

    test('accepts omitted role', async () => {
      const res = await request(app)
        .post('/test/register')
        .send({ name: 'Valid Name', email: 'norole@example.com', password: 'ValidPassword1' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('rejects unauthorized roles such as admin and security', async () => {
      for (const role of ['admin', 'security', 'superuser', 'manager']) {
        const res = await request(app)
          .post('/test/register')
          .send({ name: 'Valid Name', email: 'unauthorized@example.com', password: 'ValidPassword1', role });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: 'role', message: expect.stringMatching(/student, staff, or lecturer/i) })
          ])
        );
      }
    });

    test('rejects empty role string', async () => {
      const res = await request(app)
        .post('/test/register')
        .send({ name: 'Valid Name', email: 'empty@example.com', password: 'ValidPassword1', role: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'role', message: expect.stringMatching(/student, staff, or lecturer/i) })
        ])
      );
    });
  });

  describe('Password reset consistency', () => {
    test('rejects reset request missing token', async () => {
      const res = await request(app)
        .post('/test/reset-password')
        .send({ password: 'ValidPassword1' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'token', message: expect.stringMatching(/token is required/i) })
        ])
      );
    });

    test('rejects reset password shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/test/reset-password')
        .send({ token: 'test-token', password: 'Aa1' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password', message: expect.stringMatching(/at least 6 characters/i) })
        ])
      );
    });

    test('rejects reset password without uppercase, lowercase, and numbers', async () => {
      const res = await request(app)
        .post('/test/reset-password')
        .send({ token: 'test-token', password: 'alllowercase123' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password', message: expect.stringMatching(/uppercase, lowercase, and numbers/i) })
        ])
      );
    });

    test('accepts valid reset password with token matching registration complexity', async () => {
      const res = await request(app)
        .post('/test/reset-password')
        .send({ token: 'test-token', password: 'ValidPassword1' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Reservation creation validation', () => {
    app.post('/test/reservation', validateReservation, handleValidationErrors, (_req, res) => {
      res.json({ success: true });
    });

    test('rejects missing vehicle', async () => {
      const res = await request(app)
        .post('/test/reservation')
        .send({
          slot: '507f1f77bcf86cd799439011',
          bookingDate: '2026-10-20',
          arrivalTime: '10:00',
          departureTime: '11:00'
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'vehicle', message: expect.stringMatching(/vehicle id is required/i) })
        ])
      );
    });

    test('rejects empty or malformed vehicle ID', async () => {
      const emptyRes = await request(app)
        .post('/test/reservation')
        .send({
          slot: '507f1f77bcf86cd799439011',
          vehicle: '',
          bookingDate: '2026-10-20',
          arrivalTime: '10:00',
          departureTime: '11:00'
        });
      expect(emptyRes.status).toBe(400);
      expect(emptyRes.body.success).toBe(false);
      expect(emptyRes.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'vehicle', message: expect.stringMatching(/vehicle id is required/i) })
        ])
      );

      const malformedRes = await request(app)
        .post('/test/reservation')
        .send({
          slot: '507f1f77bcf86cd799439011',
          vehicle: 'invalid-id',
          bookingDate: '2026-10-20',
          arrivalTime: '10:00',
          departureTime: '11:00'
        });
      expect(malformedRes.status).toBe(400);
      expect(malformedRes.body.success).toBe(false);
      expect(malformedRes.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'vehicle', message: expect.stringMatching(/invalid vehicle id/i) })
        ])
      );
    });

    test('accepts valid reservation payload with vehicle', async () => {
      const res = await request(app)
        .post('/test/reservation')
        .send({
          slot: '507f1f77bcf86cd799439011',
          vehicle: '507f1f77bcf86cd799439012',
          bookingDate: '2026-10-20',
          arrivalTime: '10:00',
          departureTime: '11:00'
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Reservation query validation', () => {
    app.get('/test/reservations', validateReservationQuery, handleValidationErrors, (_req, res) => {
      res.json({ success: true });
    });

    test('accepts valid query with today and limit', async () => {
      const res = await request(app).get('/test/reservations?date=today&limit=50&page=1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('accepts valid query with YYYY-MM-DD date', async () => {
      const res = await request(app).get('/test/reservations?date=2026-10-20&limit=100');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('accepts query without date or pagination parameters', async () => {
      const res = await request(app).get('/test/reservations');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('rejects malformed date string', async () => {
      const res = await request(app).get('/test/reservations?date=invalid-date');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'date', message: expect.stringMatching(/invalid date format/i) })
        ])
      );
    });

    test('rejects impossible calendar date like leap year mismatch', async () => {
      const res = await request(app).get('/test/reservations?date=2026-02-29');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'date', message: expect.stringMatching(/invalid date format/i) })
        ])
      );
    });

    test('rejects excessive limit beyond 100', async () => {
      const res = await request(app).get('/test/reservations?limit=101');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'limit', message: expect.stringMatching(/between 1 and 100/i) })
        ])
      );
    });

    test('rejects negative or zero limit and page', async () => {
      const resLimit = await request(app).get('/test/reservations?limit=0');
      expect(resLimit.status).toBe(400);
      const resPage = await request(app).get('/test/reservations?page=0');
      expect(resPage.status).toBe(400);
    });
  });
});
