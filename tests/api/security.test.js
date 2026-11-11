// week 8 security tests that do not need a database (proposal section 4.4)
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../../src/app');
const productModel = require('../../src/models/productModel');
const auditLogModel = require('../../src/models/auditLogModel');
const { stripTags, sanitizeBody } = require('../../src/middleware/sanitize');

jest.mock('../../src/models/productModel');
jest.mock('../../src/models/auditLogModel');

const app = createApp();
const tokenFor = (userId, role) => jwt.sign({ userId, role }, process.env.JWT_SECRET);

// every endpoint that only Managers and/or Admins may use
const MANAGER_OR_ADMIN = [
  ['post', '/api/orders'],
  ['put', '/api/order-requests/1/decision'],
  ['put', '/api/purchase-requests/1/decision'],
  ['post', '/api/suppliers'],
  ['put', '/api/suppliers/1'],
  ['put', '/api/suppliers/1/status'],
];
const ADMIN_ONLY = [
  ['get', '/api/users'],
  ['post', '/api/users'],
  ['get', '/api/users/1/account'],
  ['put', '/api/users/1/role'],
  ['put', '/api/users/1/status'],
];

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
  auditLogModel.logEvent.mockResolvedValue();
});

describe('SEC-04 role-based protection (reqs 3.1.4, 2.2.3)', () => {
  test('SEC-04 Staff get 403 on every Manager/Admin endpoint, and every attempt is logged', async () => {
    const staff = tokenFor(3, 'Staff');
    for (const [method, path] of [...MANAGER_OR_ADMIN, ...ADMIN_ONLY]) {
      const res = await request(app)[method](path).set('Authorization', `Bearer ${staff}`).send({});
      expect({ path, status: res.status }).toEqual({ path, status: 403 });
    }
    expect(auditLogModel.logEvent).toHaveBeenCalledTimes(MANAGER_OR_ADMIN.length + ADMIN_ONLY.length);
  });

  test('Managers get 403 on every Admin-only endpoint', async () => {
    const manager = tokenFor(2, 'Manager');
    for (const [method, path] of ADMIN_ONLY) {
      const res = await request(app)[method](path).set('Authorization', `Bearer ${manager}`).send({});
      expect({ path, status: res.status }).toEqual({ path, status: 403 });
    }
  });

  test('a token whose role was edited by the user is rejected (signature check)', async () => {
    const [header, , signature] = tokenFor(3, 'Staff').split('.');
    const fakePayload = Buffer.from(JSON.stringify({ userId: 3, role: 'Admin' })).toString('base64url');
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${header}.${fakePayload}.${signature}`);
    expect(res.status).toBe(401);
  });
});

describe('SEC-05 no system details leaked (reqs 3.2.1, 3.2.4)', () => {
  // nothing the user sees may contain a stack trace, sql, a database error code or a file path
  const LEAKS = /(at \w+.*\(|\.js:\d+|sql|ER_[A-Z_]+|mysql|mariadb|node_modules|\/home\/|stack)/i;

  test('SEC-05 malformed JSON gets a generic 400, not the parser message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "x", "password": ');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(LEAKS);
    expect(res.body.error).toBe('The request could not be read. Please check the data and try again.');
  });

  test('a database failure gets the generic 500, without the database error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    productModel.findAll.mockRejectedValue(new Error("ER_PARSE_ERROR: You have an error in your SQL syntax near 'x' at line 1"));
    const res = await request(app).get('/api/products').set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Something went wrong. Please try again later.' });
    console.error.mockRestore();
  });

  test('an unknown api path gets a JSON 404, not the framework page', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
    expect(res.text).not.toMatch(/Cannot GET/);
  });

  test('a huge request body is refused with 413', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.c', password: 'x'.repeat(200 * 1024) });
    expect(res.status).toBe(413);
    expect(JSON.stringify(res.body)).not.toMatch(LEAKS);
  });

  test('responses do not say the server runs Express, and send security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});

describe('SEC-02 XSS input sanitization (req 3.1.2)', () => {
  // common XSS payloads (OWASP cheat sheet style) and what must be left after cleaning
  const PAYLOADS = [
    ['<script>alert(1)</script>Desk lamp', 'Desk lamp'],
    ['<img src=x onerror=alert(1)>Mouse', 'Mouse'],
    ['<svg/onload=alert(1)>Hub', 'Hub'],
    ['<a href="javascript:alert(1)">click</a>', 'click'],
    ['<iframe src="https://evil.example"></iframe>Chair', 'Chair'],
    ['<STYLE>body{display:none}</STYLE>Notebook', 'Notebook'],
    ['<b>Bold</b> name', 'Bold name'],
  ];

  test.each(PAYLOADS)('SEC-02 %p is stored as %p', (input, expected) => {
    expect(stripTags(input)).toBe(expected);
  });

  test('normal text with < and > that is not a tag is kept', () => {
    expect(stripTags('Cable 3m < 5m > 1m')).toBe('Cable 3m < 5m > 1m');
  });

  test('the sanitizer runs on real requests before validation (a name that is only a tag is empty)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send({ productName: '<script>alert(1)</script>', unitPrice: 1, currentStock: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Product name is required');
    expect(productModel.createProduct).not.toHaveBeenCalled();
  });

  test('passwords are never changed by the sanitizer, every other text field is (nested too)', () => {
    const req = {
      body: {
        password: '<Not>A<Tag>Pass1234',
        currentPassword: '<b>old</b>',
        fullName: '<b>Maria</b>',
        items: [{ note: '<script>x</script>ok' }],
      },
    };
    sanitizeBody(req, {}, () => {});
    expect(req.body).toEqual({
      password: '<Not>A<Tag>Pass1234',
      currentPassword: '<b>old</b>',
      fullName: 'Maria',
      items: [{ note: 'ok' }],
    });
  });
});
