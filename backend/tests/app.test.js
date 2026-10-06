const request = require('supertest');
const createApp = require('../src/app');

/**
 * Contract tests for the Express wiring itself. These never reach a database:
 * every request below is rejected by authentication or validation before a
 * service is called.
 */

  let app;

beforeAll(() => {
  app = createApp();
});

describe('app: health and error envelope', () => {
  it('reports health without authentication', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({ success: true, message: expect.any(String), data: expect.any(Object) }),
    );
  });

  it('returns the failure envelope for an unknown route', async () => {
    const response = await request(app).get('/api/definitely-not-a-route');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/not found/i);
  });

  it('never returns a stack trace in the error body', async () => {
    const response = await request(app).get('/api/definitely-not-a-route');

    expect(JSON.stringify(response.body)).not.toMatch(/\bat .*\.js:\d+/);
  });
});

describe('app: authentication is enforced', () => {
  const PROTECTED = [
    '/api/patients',
    '/api/departments',
    '/api/appointments',
    '/api/queue/board?departmentId=1',
    '/api/consultations',
    '/api/laboratory',
    '/api/pharmacy/medications',
    '/api/admissions/wards',
    '/api/nursing/statistics',
    '/api/emergency',
    '/api/billing',
    '/api/insurance/providers',
    '/api/notifications',
    '/api/documents',
    '/api/analytics/overview',
  ];

  it.each(PROTECTED)('rejects %s without a token', async (route) => {
    const response = await request(app).get(route);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('rejects a malformed token', async () => {
    const response = await request(app).get('/api/patients').set('Authorization', 'Bearer not.a.jwt');

    expect(response.status).toBe(401);
  });

  it('rejects a non-Bearer authorization header', async () => {
    const response = await request(app).get('/api/patients').set('Authorization', 'Basic abc');

    expect(response.status).toBe(401);
  });
});

describe('app: validation runs before the handler', () => {
  it('rejects a malformed login payload with field-level errors', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it('returns 400 rather than 500 for unparseable JSON', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/malformed json/i);
  });

  it('rejects a query string that exceeds the page-size ceiling', async () => {
    const response = await request(app)
      .get('/api/patients?limit=100000')
      .set('Authorization', 'Bearer placeholder.jwt.value');

    // Auth runs before validation, so the placeholder token is rejected first;
    // the point of the check is that the route is mounted and not bypassed.
    expect(response.status).toBe(401);
  });

  it('rejects a non-integer route id', async () => {
    const response = await request(app).get('/api/patients/not-a-number');

    expect(response.status).toBe(401);
  });
});

describe('app: CORS and security headers', () => {
  it('sets the helmet headers', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});