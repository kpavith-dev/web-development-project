import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiLimiter, authLimiter, reservationLimiter } from '../middleware/rateLimitMiddleware.js';
import { createApp, resolveTrustProxy } from '../app.js';
import { vehicleUploadDir } from '../routes/vehicleRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Rate limit middleware behavior, proxy safety, and upload configuration', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalTrustProxy = process.env.TRUST_PROXY;

  const resetAllLimiterKeys = async () => {
    const ips = ['127.0.0.1', '::ffff:127.0.0.1', '::1', '203.0.113.1', '203.0.113.2', '203.0.113.195'];
    for (const ip of ips) {
      if (typeof authLimiter.resetKey === 'function') await authLimiter.resetKey(ip);
      if (typeof apiLimiter.resetKey === 'function') await apiLimiter.resetKey(ip);
      if (typeof reservationLimiter.resetKey === 'function') await reservationLimiter.resetKey(ip);
    }
  };

  beforeEach(async () => {
    await resetAllLimiterKeys();
  });

  afterEach(async () => {
    process.env.NODE_ENV = originalEnv;
    if (originalTrustProxy !== undefined) {
      process.env.TRUST_PROXY = originalTrustProxy;
    } else {
      delete process.env.TRUST_PROXY;
    }
    await resetAllLimiterKeys();
  });

  it('preserves production rate limiting configuration', () => {
    expect(typeof apiLimiter).toBe('function');
    expect(typeof authLimiter).toBe('function');
    expect(typeof reservationLimiter).toBe('function');
  });

  it('skips rate limiters when NODE_ENV === test', async () => {
    process.env.NODE_ENV = 'test';
    const app = express();
    app.use('/auth', authLimiter);
    app.post('/auth/login', (_req, res) => res.status(401).json({ error: 'invalid credentials' }));

    // Send 7 failed attempts (above auth max of 5); none should receive 429 in test mode
    for (let i = 0; i < 7; i++) {
      const res = await request(app).post('/auth/login').send({ username: 'test', password: 'bad' });
      expect(res.status).toBe(401);
    }
  });

  it('enforces authLimiter when NODE_ENV is production and max failed attempts is exceeded', async () => {
    process.env.NODE_ENV = 'production';
    const app = express();
    app.use('/auth', authLimiter);
    app.post('/auth/login', (_req, res) => res.status(401).json({ error: 'invalid credentials' }));

    // Requests 1 to 5 should return 401
    for (let i = 1; i <= 5; i++) {
      const res = await request(app).post('/auth/login').send({ username: 'attacker', password: 'bad' });
      expect(res.status).toBe(401);
    }

    // 6th request must be blocked by the actual exported authLimiter with HTTP 429
    const blockedRes = await request(app).post('/auth/login').send({ username: 'attacker', password: 'bad' });
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.text).toContain('Too many login attempts');
  });

  it('enforces rate limiting by default when NODE_ENV is unset / undefined (non-test environment)', async () => {
    delete process.env.NODE_ENV;
    const app = express();
    app.use('/auth', authLimiter);
    app.post('/auth/login', (_req, res) => res.status(401).json({ error: 'invalid credentials' }));

    for (let i = 1; i <= 5; i++) {
      const res = await request(app).post('/auth/login').send({ username: 'attacker', password: 'bad' });
      expect(res.status).toBe(401);
    }

    // 6th request must receive 429 because rate limiting is NOT bypassed when NODE_ENV is unset
    const blockedRes = await request(app).post('/auth/login').send({ username: 'attacker', password: 'bad' });
    expect(blockedRes.status).toBe(429);
  });

  it('resolves TRUST_PROXY configuration correctly and safely', () => {
    expect(resolveTrustProxy(undefined)).toBe(false);
    expect(resolveTrustProxy('')).toBe(false);
    expect(resolveTrustProxy('false')).toBe(false);
    expect(resolveTrustProxy('0')).toBe(false);
    expect(resolveTrustProxy('true')).toBe(true);
    expect(resolveTrustProxy('1')).toBe(1);
    expect(resolveTrustProxy('2')).toBe(2);
    expect(resolveTrustProxy('loopback')).toBe('loopback');
    expect(resolveTrustProxy('127.0.0.1, 10.0.0.1')).toEqual(['127.0.0.1', '10.0.0.1']);
  });

  it('ignores arbitrary X-Forwarded-For when TRUST_PROXY is disabled', async () => {
    delete process.env.TRUST_PROXY;
    const app = express();
    app.set('trust proxy', resolveTrustProxy(process.env.TRUST_PROXY));
    app.get('/ip-check', (req, res) => res.json({ ip: req.ip }));

    const res = await request(app)
      .get('/ip-check')
      .set('X-Forwarded-For', '203.0.113.195');

    // Without trusted proxy configured, the socket loopback address is preserved
    expect(res.body.ip).not.toBe('203.0.113.195');
    expect(['127.0.0.1', '::ffff:127.0.0.1', '::1']).toContain(res.body.ip);
  });

  it('respects X-Forwarded-For when TRUST_PROXY is configured for a reverse proxy', async () => {
    process.env.TRUST_PROXY = '1';
    const app = express();
    app.set('trust proxy', resolveTrustProxy(process.env.TRUST_PROXY));
    app.get('/ip-check', (req, res) => res.json({ ip: req.ip }));

    const res = await request(app)
      .get('/ip-check')
      .set('X-Forwarded-For', '203.0.113.195');

    expect(res.body.ip).toBe('203.0.113.195');
  });

  it('uses a stable absolute vehicle upload path matching the Express static mount', () => {
    expect(path.isAbsolute(vehicleUploadDir)).toBe(true);
    const expectedPath = path.resolve(__dirname, '..', 'uploads', 'vehicles');
    expect(path.normalize(vehicleUploadDir)).toBe(path.normalize(expectedPath));
  });
});
