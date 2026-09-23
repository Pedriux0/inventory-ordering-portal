const jwt = require('jsonwebtoken');
const auditLogModel = require('../../src/models/auditLogModel');
const { authenticate, requireRole } = require('../../src/middleware/auth');

jest.mock('../../src/models/auditLogModel');

// small fake req/res, we dont need supertest here since these are plain functions
function mockReq(overrides = {}) {
  return { headers: {}, ip: '127.0.0.1', method: 'GET', originalUrl: '/api/test', ...overrides };
}
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

describe('authenticate middleware', () => {
  test('rejects a request with no token', () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects a bad or expired token', () => {
    const req = mockReq({ headers: { authorization: 'Bearer not-a-real-token' } });
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts a valid token and attaches req.user', () => {
    const token = jwt.sign({ userId: 5, role: 'Staff' }, 'test-secret');
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(expect.objectContaining({ userId: 5, role: 'Staff' }));
  });
});

describe('requireRole middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auditLogModel.logEvent.mockResolvedValue();
  });

  // UT-06 (reqs 2.2.3, 2.2.4)
  test('UT-06 blocks a staff token on an admin only route and logs it', async () => {
    const req = mockReq({ user: { userId: 9, role: 'Staff' } });
    const res = mockRes();
    const next = jest.fn();

    await requireRole('Admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    expect(auditLogModel.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 9, action: 'ACCESS_DENIED' })
    );
  });

  test('lets a matching role through without logging anything', async () => {
    const req = mockReq({ user: { userId: 1, role: 'Admin' } });
    const res = mockRes();
    const next = jest.fn();

    await requireRole('Admin')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(auditLogModel.logEvent).not.toHaveBeenCalled();
  });

  test('accepts any role from a list of allowed roles', async () => {
    const req = mockReq({ user: { userId: 2, role: 'Manager' } });
    const res = mockRes();
    const next = jest.fn();

    await requireRole('Admin', 'Manager')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
