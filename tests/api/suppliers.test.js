const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../../src/app');
const supplierModel = require('../../src/models/supplierModel');
const auditLogModel = require('../../src/models/auditLogModel');

jest.mock('../../src/models/supplierModel');
jest.mock('../../src/models/auditLogModel');

const app = createApp();

// makes a token the same way authController.login would, so tests dont need a real login
function tokenFor(userId, role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET);
}

// a fake row as it would come back from the suppliers table
function fakeSupplierRow(overrides = {}) {
  return {
    supplier_id: 7,
    supplier_name: 'Acme Supplies',
    contact_email: 'sales@acme.com',
    contact_phone: '+1 555 123 4567',
    is_active: 1,
    created_at: '2026-10-19T12:00:00.000Z',
    ...overrides,
  };
}

const VALID_SUPPLIER = {
  supplierName: 'Acme Supplies',
  contactEmail: 'Sales@Acme.com',
  contactPhone: '+1 555 123 4567',
};

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
  auditLogModel.logEvent.mockResolvedValue();
});

describe('creating suppliers (reqs 2.4.4, 2.5.6)', () => {
  // API-15
  test('API-15 POST /api/suppliers as Manager returns 201 with supplierId', async () => {
    supplierModel.createSupplier.mockResolvedValue(fakeSupplierRow());

    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send(VALID_SUPPLIER);

    expect(res.status).toBe(201);
    expect(res.body.supplierId).toBe(7);
    expect(res.body.isActive).toBe(true);
    // input is cleaned before saving: email lowercased
    expect(supplierModel.createSupplier).toHaveBeenCalledWith({
      supplierName: 'Acme Supplies',
      contactEmail: 'sales@acme.com',
      contactPhone: '+1 555 123 4567',
    });
  });

  test('Admin can also create a supplier', async () => {
    supplierModel.createSupplier.mockResolvedValue(fakeSupplierRow());

    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${tokenFor(1, 'Admin')}`)
      .send(VALID_SUPPLIER);

    expect(res.status).toBe(201);
  });

  test('empty optional fields are saved as null, not empty text', async () => {
    supplierModel.createSupplier.mockResolvedValue(
      fakeSupplierRow({ contact_email: null, contact_phone: null })
    );

    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ supplierName: 'Acme Supplies', contactEmail: '', contactPhone: '' });

    expect(res.status).toBe(201);
    expect(supplierModel.createSupplier).toHaveBeenCalledWith({
      supplierName: 'Acme Supplies',
      contactEmail: null,
      contactPhone: null,
    });
  });

  test('missing name returns 400 and nothing is saved (UT-08 through the API)', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ contactEmail: 'sales@acme.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Supplier name is required');
    expect(supplierModel.createSupplier).not.toHaveBeenCalled();
  });

  test('Staff cannot create a supplier: 403 and the denial is logged (req 3.2.3)', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send(VALID_SUPPLIER);

    expect(res.status).toBe(403);
    expect(supplierModel.createSupplier).not.toHaveBeenCalled();
    expect(auditLogModel.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 3, action: 'ACCESS_DENIED' })
    );
  });

  test('no token returns 401', async () => {
    const res = await request(app).post('/api/suppliers').send(VALID_SUPPLIER);
    expect(res.status).toBe(401);
  });
});

describe('viewing suppliers (req 2.2.5)', () => {
  test('Staff can list suppliers (needed to record receipts)', async () => {
    supplierModel.findAll.mockResolvedValue([
      fakeSupplierRow(),
      fakeSupplierRow({ supplier_id: 8, supplier_name: 'Beta Parts', is_active: 0 }),
    ]);

    const res = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[1]).toEqual(
      expect.objectContaining({ supplierId: 8, supplierName: 'Beta Parts', isActive: false })
    );
  });

  test('GET /api/suppliers/:id returns one supplier', async () => {
    supplierModel.findById.mockResolvedValue(fakeSupplierRow());

    const res = await request(app)
      .get('/api/suppliers/7')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);

    expect(res.status).toBe(200);
    expect(res.body.supplierName).toBe('Acme Supplies');
  });

  test('GET /api/suppliers/:id returns 404 for an unknown supplier', async () => {
    supplierModel.findById.mockResolvedValue(undefined);

    const res = await request(app)
      .get('/api/suppliers/999')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);

    expect(res.status).toBe(404);
  });
});

describe('updating and deactivating suppliers (req 2.5.6)', () => {
  test('Manager updates supplier information', async () => {
    supplierModel.findById.mockResolvedValue(fakeSupplierRow());
    supplierModel.updateSupplier.mockResolvedValue(
      fakeSupplierRow({ supplier_name: 'Acme Supplies Ltd' })
    );

    const res = await request(app)
      .put('/api/suppliers/7')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ ...VALID_SUPPLIER, supplierName: 'Acme Supplies Ltd' });

    expect(res.status).toBe(200);
    expect(res.body.supplierName).toBe('Acme Supplies Ltd');
  });

  test('updating an unknown supplier returns 404', async () => {
    supplierModel.findById.mockResolvedValue(undefined);

    const res = await request(app)
      .put('/api/suppliers/999')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send(VALID_SUPPLIER);

    expect(res.status).toBe(404);
    expect(supplierModel.updateSupplier).not.toHaveBeenCalled();
  });

  test('Manager deactivates a supplier', async () => {
    supplierModel.findById.mockResolvedValue(fakeSupplierRow());
    supplierModel.updateStatus.mockResolvedValue(fakeSupplierRow({ is_active: 0 }));

    const res = await request(app)
      .put('/api/suppliers/7/status')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ active: false });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
    expect(supplierModel.updateStatus).toHaveBeenCalledWith('7', false);
  });

  test('status must be a real boolean', async () => {
    const res = await request(app)
      .put('/api/suppliers/7/status')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ active: 'no' });

    expect(res.status).toBe(400);
  });

  test('Staff cannot deactivate a supplier', async () => {
    const res = await request(app)
      .put('/api/suppliers/7/status')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send({ active: false });

    expect(res.status).toBe(403);
    expect(supplierModel.updateStatus).not.toHaveBeenCalled();
  });
});
