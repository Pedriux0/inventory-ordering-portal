const request = require('supertest');
const createApp = require('../../src/app');
const userModel = require('../../src/models/userModel');

jest.mock('../../src/models/userModel');
jest.mock('../../src/models/auditLogModel'); // app.js loads routes that require it, not used here

const app = createApp();

beforeEach(() => {
  jest.clearAllMocks();
});

// API-08 (req 2.1.5)
describe('POST /api/auth/resetpassword', () => {
  test('API-08 stores a token and returns 200 for a real email', async () => {
    userModel.findByEmail.mockResolvedValue({ user_id: 12, email: 'maria.garcia@company.com' });

    const res = await request(app)
      .post('/api/auth/resetpassword')
      .send({ email: 'maria.garcia@company.com' });

    expect(res.status).toBe(200);
    // one hashed token + an expiry date were saved for that user
    expect(userModel.setResetToken).toHaveBeenCalledWith(
      12,
      expect.stringMatching(/^[a-f0-9]{64}$/), // sha256 hex hash
      expect.any(Date)
    );
  });

  test('unknown email still returns 200, so emails cant be enumerated', async () => {
    userModel.findByEmail.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/auth/resetpassword')
      .send({ email: 'nobody@company.com' });

    expect(res.status).toBe(200);
    expect(userModel.setResetToken).not.toHaveBeenCalled();
  });

  test('missing email returns 400', async () => {
    const res = await request(app).post('/api/auth/resetpassword').send({});
    expect(res.status).toBe(400);
    expect(userModel.findByEmail).not.toHaveBeenCalled();
  });
});
