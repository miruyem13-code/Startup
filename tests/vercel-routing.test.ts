import { describe, expect, it } from 'vitest';
import request from 'supertest';
import handler from '../api/index';
import config from '../vercel.json';

describe('Vercel API routing', () => {
  it('routes API requests before the SPA fallback', () => {
    expect(config.rewrites[0]).toEqual({
      source: '/api/:path*',
      destination: '/api/index?__velocity_path=:path*',
    });
  });

  it('serves a rewritten session request as JSON', async () => {
    const response = await request(handler).get('/api/index?__velocity_path=session');
    expect(response.status).toBe(200);
    expect(response.type).toBe('application/json');
    expect(response.body.user).toBeNull();
  });

  it('enforces origin validation on rewritten auth requests', async () => {
    const response = await request(handler)
      .post('/api/index?__velocity_path=auth/register')
      .set('Origin', 'https://untrusted.example')
      .send({});
    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Invalid request origin.');
  });

  it('returns an API JSON error for missing endpoints', async () => {
    const response = await request(handler).get('/api/index?__velocity_path=missing-endpoint');
    expect(response.status).toBe(404);
    expect(response.type).toBe('application/json');
  });
});
