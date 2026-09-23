const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../../src/app');
const auditLogModel = require('../../src/models/auditLogModel');

jest.mock('../../src/models/auditLogModel');
jest.mock('../../src/models/userModel'); // login isnt used here, but app.js loads the routes

const app = createApp();

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
  auditLogModel.logEvent.mockResolvedValue();
});

// API-07 (req 2.1.4)
describe('POST /api/auth/logout', () => {
  test('API-07 ends the session for a valid token', async () => {
    const token = jwt.sign({ userId: 4, role: 'Staff' }, 'test-secret');

    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(auditLogModel.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 4, action: 'LOGOUT' })
    );
  });

  test('rejects logout without a token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});
