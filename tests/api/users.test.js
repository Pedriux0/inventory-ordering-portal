const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../../src/app');
const userModel = require('../../src/models/userModel');
const auditLogModel = require('../../src/models/auditLogModel');
const { hashPassword } = require('../../src/utils/password');

jest.mock('../../src/models/userModel');
jest.mock('../../src/models/auditLogModel');

const app = createApp();
const CURRENT_PASSWORD = 'CurrentPassword1234!';
const NEW_PASSWORD = 'BrandNewPassword5678!';

// makes a token the same way authController.login would, so tests dont need a real login
function tokenFor(userId, role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET);
}

// a fake row as it would come back from the users table
function fakeUserRow(overrides = {}) {
  return {
    user_id: 42,
    full_name: 'Maria Garcia',
    email: 'maria.garcia@company.com',
    role: 'Staff',
    is_active: 1,
    ...overrides,
  };
}

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
  auditLogModel.logEvent.mockResolvedValue();
});

describe('profile routes (reqs 2.3.1 - 2.3.3)', () => {
  test('GET /api/users/profile requires a token', async () => {
    const res = await request(app).get('/api/users/profile');
    expect(res.status).toBe(401);
  });

  test('GET /api/users/profile returns the logged in user, no password hash', async () => {
    userModel.findById.mockResolvedValue(fakeUserRow());

    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${tokenFor(42, 'Staff')}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      userId: 42,
      fullName: 'Maria Garcia',
      email: 'maria.garcia@company.com',
      role: 'Staff',
      isActive: true,
    });
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  test('PUT /api/users/profile updates name and email with validation (FE-09)', async () => {
    userModel.emailExists.mockResolvedValue(false);
    userModel.updateProfile.mockResolvedValue(fakeUserRow({ full_name: 'Maria G. Lopez' }));

    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${tokenFor(42, 'Staff')}`)
      .send({ fullName: 'Maria G. Lopez', email: 'maria.garcia@company.com' });

    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe('Maria G. Lopez');
  });

  test('PUT /api/users/profile rejects an invalid email', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${tokenFor(42, 'Staff')}`)
      .send({ fullName: 'Maria Garcia', email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(userModel.updateProfile).not.toHaveBeenCalled();
  });

  test('PUT /api/users/profile/password rejects the wrong current password', async () => {
    userModel.findAuthById.mockResolvedValue({
      user_id: 42,
      password_hash: await hashPassword(CURRENT_PASSWORD),
    });

    const res = await request(app)
      .put('/api/users/profile/password')
      .set('Authorization', `Bearer ${tokenFor(42, 'Staff')}`)
      .send({ currentPassword: 'WrongOne1234567890!', newPassword: NEW_PASSWORD });

    expect(res.status).toBe(401);
    expect(userModel.updatePasswordHash).not.toHaveBeenCalled();
  });

  // API-13
  test('API-13 PUT /api/users/profile/password changes the password on success', async () => {
    userModel.findAuthById.mockResolvedValue({
      user_id: 42,
      password_hash: await hashPassword(CURRENT_PASSWORD),
    });

    const res = await request(app)
      .put('/api/users/profile/password')
      .set('Authorization', `Bearer ${tokenFor(42, 'Staff')}`)
      .send({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD });

    expect(res.status).toBe(200);
    expect(userModel.updatePasswordHash).toHaveBeenCalledWith(42, expect.any(String));
  });
});

describe('admin account management (reqs 2.2.6, 2.3.4, 2.5.7)', () => {
  test('POST /api/users is blocked for a Staff token', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenFor(1, 'Staff')}`)
      .send({ fullName: 'New Guy', email: 'new@company.com', password: NEW_PASSWORD, role: 'Staff' });

    expect(res.status).toBe(403);
    expect(userModel.createUser).not.toHaveBeenCalled();
  });

  test('POST /api/users creates an account for an Admin token', async () => {
    userModel.emailExists.mockResolvedValue(false);
    userModel.createUser.mockResolvedValue(fakeUserRow({ user_id: 99, email: 'new@company.com' }));

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenFor(1, 'Admin')}`)
      .send({ fullName: 'New Guy', email: 'new@company.com', password: NEW_PASSWORD, role: 'Staff' });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(99);
  });

  // API-06 (reqs 2.2.3, 2.5.7)
  test('API-06 PUT /api/users/:id/role is forbidden for a Manager token', async () => {
    const res = await request(app)
      .put('/api/users/7/role')
      .set('Authorization', `Bearer ${tokenFor(3, 'Manager')}`)
      .send({ role: 'Admin' });

    expect(res.status).toBe(403);
  });

  test('PUT /api/users/:id/role updates the role for an Admin token', async () => {
    userModel.findById.mockResolvedValue(fakeUserRow({ user_id: 7 }));
    userModel.updateRole.mockResolvedValue(fakeUserRow({ user_id: 7, role: 'Manager' }));

    const res = await request(app)
      .put('/api/users/7/role')
      .set('Authorization', `Bearer ${tokenFor(1, 'Admin')}`)
      .send({ role: 'Manager' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('Manager');
  });

  // API-14
  test('API-14 PUT /api/users/:id/status deactivates an account', async () => {
    userModel.findById.mockResolvedValue(fakeUserRow({ user_id: 7 }));
    userModel.updateStatus.mockResolvedValue(fakeUserRow({ user_id: 7, is_active: 0 }));

    const res = await request(app)
      .put('/api/users/7/status')
      .set('Authorization', `Bearer ${tokenFor(1, 'Admin')}`)
      .send({ active: false });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
    expect(userModel.updateStatus).toHaveBeenCalledWith('7', false);
  });

  // API-16
  test('API-16 GET /api/users/:id/account returns the user for an Admin token', async () => {
    userModel.findById.mockResolvedValue(fakeUserRow({ user_id: 7 }));

    const res = await request(app)
      .get('/api/users/7/account')
      .set('Authorization', `Bearer ${tokenFor(1, 'Admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(7);
  });

  test('GET /api/users/:id/account returns 404 for a user that does not exist', async () => {
    userModel.findById.mockResolvedValue(undefined);

    const res = await request(app)
      .get('/api/users/999/account')
      .set('Authorization', `Bearer ${tokenFor(1, 'Admin')}`);

    expect(res.status).toBe(404);
  });
});
