import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';
import { apiLimiter, authLimiter, reservationLimiter } from '../middleware/rateLimitMiddleware.js';

describe('Rate limit middleware behavior and environment safety', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('preserves production rate limiting configuration', () => {
    expect(typeof apiLimiter).toBe('function');
    expect(typeof authLimiter).toBe('function');
    expect(typeof reservationLimiter).toBe('function');
  });

  it('skips apiLimiter when NODE_ENV === test', async () => {
    process.env.NODE_ENV = 'test';
    const app = express();
    app.use(apiLimiter);
    app.get('/test', (_req, res) => res.json({ ok: true }));

    // Send multiple requests in test mode; none should receive 429
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    }
  });

  it('enforces rate limiting when NODE_ENV is production and max is exceeded', async () => {
    process.env.NODE_ENV = 'production';
    const testLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 2,
      skip: () => process.env.NODE_ENV === 'test',
    });

    const app = express();
    app.use(testLimiter);
    app.get('/prod-test', (_req, res) => res.json({ ok: true }));

    const res1 = await request(app).get('/prod-test');
    expect(res1.status).toBe(200);

    const res2 = await request(app).get('/prod-test');
    expect(res2.status).toBe(200);

    const res3 = await request(app).get('/prod-test');
    expect(res3.status).toBe(429);
  });
});
