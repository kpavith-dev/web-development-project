import { describe, expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('server smoke checks', () => {
  test('exposes a secret-free health endpoint without a database', async () => {
    const response = await request(createApp()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, service: 'smart-campus-parking-server' });
    expect(JSON.stringify(response.body)).not.toMatch(/mongo(?:db)?:\/\//i);
  });

  test('keeps protected APIs closed without a JWT', async () => {
    expect((await request(createApp()).get('/api/vehicles')).status).toBe(503);
  });
});
