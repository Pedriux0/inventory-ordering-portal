const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../../src/app');
const userModel = require('../../src/models/userModel');
const auditLogModel = require('../../src/models/auditLogModel');
const { hashPassword } = require('../../src/utils/password');

// we replace the two model files with fakes, so these tests dont need a real database
jest.mock('../../src/models/userModel');
jest.mock('../../src/models/auditLogModel');

const PASSWORD = 'TestPassword1234!';
const app = createApp();
let activeUser;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  // a fake user like the one that would come from the users table
  activeUser = {
    user_id: 7,
    full_name: 'Maria Garcia',
    email: 'maria.garcia@company.com',
    password_hash: await hashPassword(PASSWORD),
    role: 'Staff',
    is_active: 1,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  auditLogModel.logEvent.mockResolvedValue();
});

describe('POST /api/auth/login', () => {
  // API-01 (req 2.1.1)
  test('API-01 valid credentials return 200 with a JWT', async () => {
    userModel.findByEmail.mockResolvedValue(activeUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maria.garcia@company.com', password: PASSWORD });

    expect(res.status).toBe(200);
    // the token must be signed by us and carry the user id and role
    const payload = jwt.verify(res.body.token, 'test-secret');
    expect(payload.userId).toBe(7);
    expect(payload.role).toBe('Staff');
    expect(res.body.user).toEqual({
      userId: 7,
      fullName: 'Maria Garcia',
      email: 'maria.garcia@company.com',
      role: 'Staff',
    });
    // the hash must never leave the server
    expect(JSON.stringify(res.body)).not.toContain('password_hash');
    expect(auditLogModel.logEvent).not.toHaveBeenCalled();
  });

  // API-02 (reqs 2.1.1 and 3.2.2)
  test('API-02 wrong password returns 401 and is logged', async () => {
    userModel.findByEmail.mockResolvedValue(activeUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maria.garcia@company.com', password: 'WrongPassword1234!' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
    expect(res.body.token).toBeUndefined();
    // the failed attempt is saved with the user id (we know who it was)
    expect(auditLogModel.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, action: 'LOGIN_FAILED' })
    );
  });

  test('unknown email returns the same 401 and is logged without a user id', async () => {
    userModel.findByEmail.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@company.com', password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password'); // same message as wrong password
    expect(auditLogModel.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, action: 'LOGIN_FAILED' })
    );
  });

  test('deactivated account cannot log in (req 2.3.4)', async () => {
    userModel.findByEmail.mockResolvedValue({ ...activeUser, is_active: 0 });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maria.garcia@company.com', password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  test('email is trimmed and lowercased before searching', async () => {
    userModel.findByEmail.mockResolvedValue(activeUser);

    await request(app)
      .post('/api/auth/login')
      .send({ email: '  Maria.Garcia@Company.com ', password: PASSWORD });

    expect(userModel.findByEmail).toHaveBeenCalledWith('maria.garcia@company.com');
  });

  test('missing or non-text fields return 400 and never reach the database', async () => {
    const bodies = [{}, { email: 'a@b.com' }, { password: PASSWORD }, { email: { $ne: 1 }, password: PASSWORD }];

    for (const body of bodies) {
      const res = await request(app).post('/api/auth/login').send(body);
      expect(res.status).toBe(400);
    }
    expect(userModel.findByEmail).not.toHaveBeenCalled();
  });

  // req 3.2.1: internal errors are hidden from the user
  test('a database error returns a generic 500 without internal details', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {}); // keep the test output clean
    userModel.findByEmail.mockRejectedValue(new Error('ER_ACCESS_DENIED secret db detail'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maria.garcia@company.com', password: PASSWORD });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Something went wrong. Please try again later.' });
    expect(JSON.stringify(res.body)).not.toContain('secret db detail');
  });
});
