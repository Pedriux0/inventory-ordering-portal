// week 8 security tests against the REAL database through the whole app (proposal section 4.4)
// run with: npm run test:db. Every row created here is deleted again at the end
require('dotenv').config({ quiet: true });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'int-test-secret';

const request = require('supertest');
const createApp = require('../../src/app');
const pool = require('../../src/config/db');
const { hashPassword } = require('../../src/utils/password');

const app = createApp();
const STAMP = Date.now();
const STAFF_EMAIL = `sec-staff-${STAMP}@test.local`;
const STAFF_PASSWORD = 'SecurityTestPass2026';
let staffId;
let staffToken;
const createdProductIds = [];

const countRows = async (table) => (await pool.query(`SELECT COUNT(*) AS n FROM ${table}`))[0][0].n;

beforeAll(async () => {
  const [r] = await pool.execute(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Security Test', ?, ?, 'Staff')",
    [STAFF_EMAIL, await hashPassword(STAFF_PASSWORD)]
  );
  staffId = r.insertId;
  const login = await request(app).post('/api/auth/login').send({ email: STAFF_EMAIL, password: STAFF_PASSWORD });
  staffToken = login.body.token;
});

afterAll(async () => {
  await pool.execute('DELETE FROM audit_logs WHERE user_id = ?', [staffId]);
  await pool.execute('DELETE FROM audit_logs WHERE details LIKE ?', [`%${STAMP}%`]);
  for (const id of createdProductIds) await pool.execute('DELETE FROM products WHERE product_id = ?', [id]);
  await pool.execute('DELETE FROM users WHERE user_id = ?', [staffId]);
  await pool.end();
});

describe('SEC-01 SQL injection (req 3.1.1)', () => {
  const PAYLOADS = ["' OR '1'='1", "' OR 1=1 -- ", '1; DROP TABLE users; --', "admin@demo.com' -- ", '" OR ""="'];

  test('SEC-01 injection in the login email never logs anyone in', async () => {
    for (const email of PAYLOADS) {
      const res = await request(app).post('/api/auth/login').send({ email, password: "' OR '1'='1" });
      expect({ email, status: res.status }).toEqual({ email, status: 401 });
    }
  });

  test('SEC-01 injection in a search finds nothing and breaks nothing', async () => {
    // at least one product exists, so an "OR 1=1" that worked would return it
    const [p] = await pool.execute(
      "INSERT INTO products (product_name, unit_price, current_stock, reorder_level) VALUES (?, 1, 1, 0)",
      [`SEC search target ${STAMP}`]
    );
    createdProductIds.push(p.insertId);
    for (const search of PAYLOADS) {
      const res = await request(app)
        .get(`/api/products?search=${encodeURIComponent(search)}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(200);
      expect({ search, found: Number(res.headers['x-total-count']) }).toEqual({ search, found: 0 }); // matched nothing
    }
    expect(await countRows('users')).toBeGreaterThan(0); // the DROP TABLE did nothing
  });

  test('SEC-01 injection in an id in the url is just "not found"', async () => {
    const res = await request(app)
      .get(`/api/products/${encodeURIComponent('1 OR 1=1')}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(404); // ids must be plain numbers (middleware/validateId.js)
  });

  test('SEC-01 injection text saved in a field is stored as plain text', async () => {
    const name = `Robert'); DROP TABLE products;-- ${STAMP}`;
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ productName: name, unitPrice: 1, currentStock: 1 });
    expect(res.status).toBe(201);
    createdProductIds.push(res.body.productId);
    expect(res.body.productName).toBe(name);
    expect(await countRows('products')).toBeGreaterThan(0);
  });
});

describe('SEC-02 XSS (req 3.1.2)', () => {
  test('SEC-02 script tags sent in a product never reach the database', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        productName: `<script>alert('xss')</script>Lamp ${STAMP}`,
        description: '<img src=x onerror=alert(1)>Bright',
        unitPrice: 5,
        currentStock: 2,
      });
    expect(res.status).toBe(201);
    createdProductIds.push(res.body.productId);

    const [rows] = await pool.execute('SELECT product_name, description FROM products WHERE product_id = ?', [res.body.productId]);
    expect(rows[0].product_name).toBe(`Lamp ${STAMP}`);
    expect(rows[0].description).toBe('Bright');
  });
});

describe('SEC-03 passwords hashed in the database (reqs 2.1.3, 3.1.3)', () => {
  test('SEC-03 every password in the users table is a bcrypt hash, never the password itself', async () => {
    const [rows] = await pool.execute('SELECT email, password_hash FROM users');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows.filter((r) => !r.email.endsWith('@test.local') || r.email === STAFF_EMAIL)) {
      expect({ email: row.email, isBcrypt: /^\$2[aby]\$\d{2}\$.{53}$/.test(row.password_hash) }).toEqual({
        email: row.email,
        isBcrypt: true,
      });
    }
    const [plain] = await pool.execute('SELECT COUNT(*) AS n FROM users WHERE password_hash = ?', [STAFF_PASSWORD]);
    expect(plain[0].n).toBe(0);
  });

  test('the password hash is never sent back by the api', async () => {
    const res = await request(app).get('/api/users/profile').set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/password|\$2[aby]\$/);
  });
});

describe('SEC-06 failed logins are logged (req 3.2.2)', () => {
  test('SEC-06 several failures: each one has a timestamp, and the user id when the email is known', async () => {
    const unknown = `nobody-${STAMP}@test.local`;
    await request(app).post('/api/auth/login').send({ email: STAFF_EMAIL, password: 'WrongPassword0001' });
    await request(app).post('/api/auth/login').send({ email: STAFF_EMAIL, password: 'WrongPassword0002' });
    await request(app).post('/api/auth/login').send({ email: unknown, password: 'WrongPassword0003' });

    const [known] = await pool.execute(
      "SELECT user_id, created_at, details FROM audit_logs WHERE action = 'LOGIN_FAILED' AND user_id = ? ORDER BY log_id",
      [staffId]
    );
    expect(known.length).toBeGreaterThanOrEqual(2);
    expect(known.every((r) => r.created_at instanceof Date && r.user_id === staffId)).toBe(true);

    const [unk] = await pool.execute(
      "SELECT user_id, created_at, details FROM audit_logs WHERE action = 'LOGIN_FAILED' AND details LIKE ?",
      [`%${unknown}%`]
    );
    expect(unk).toHaveLength(1);
    expect(unk[0].user_id).toBeNull(); // no such account, so no id - but still logged with the time
    expect(unk[0].created_at).toBeInstanceOf(Date);
  });
});

describe('SEC-07 authorization failures are logged (req 3.2.3)', () => {
  test('SEC-07 Staff on an admin endpoint: the log has the user id, the role and the action', async () => {
    const res = await request(app).put('/api/users/1/role').set('Authorization', `Bearer ${staffToken}`).send({ role: 'Admin' });
    expect(res.status).toBe(403);

    const [rows] = await pool.execute(
      "SELECT user_id, details, created_at FROM audit_logs WHERE action = 'ACCESS_DENIED' AND user_id = ? ORDER BY log_id DESC LIMIT 1",
      [staffId]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].details).toContain('role Staff');
    expect(rows[0].details).toContain('PUT /api/users/1/role');
    expect(rows[0].created_at).toBeInstanceOf(Date);
  });
});
