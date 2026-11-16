const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../../src/app');
const purchaseRequestModel = require('../../src/models/purchaseRequestModel');
const productModel = require('../../src/models/productModel');
const supplierModel = require('../../src/models/supplierModel');
const auditLogModel = require('../../src/models/auditLogModel');

jest.mock('../../src/models/purchaseRequestModel');
jest.mock('../../src/models/productModel');
jest.mock('../../src/models/supplierModel');
jest.mock('../../src/models/auditLogModel');

const app = createApp();

function tokenFor(userId, role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET);
}

// a fake row as the model's join query returns it
function fakeRequestRow(overrides = {}) {
  return {
    request_id: 5,
    product_id: 3,
    product_name: 'Wireless Mouse M200',
    supplier_id: 2,
    supplier_name: 'Northwind Electronics',
    quantity: 50,
    note: null,
    status: 'Pending',
    requested_by: 4,
    requested_by_name: 'Maria Garcia',
    requested_by_role: 'Staff',
    decided_by: null,
    decided_by_name: null,
    decided_at: null,
    decision_note: null,
    created_at: '2026-10-21T10:00:00.000Z',
    ...overrides,
  };
}

const NEW_REQUEST = { productId: 3, supplierId: 2, quantity: 50, note: 'running low' };

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
  auditLogModel.logEvent.mockResolvedValue();
  productModel.findById.mockResolvedValue({ product_id: 3 });
  supplierModel.findById.mockResolvedValue({ supplier_id: 2, is_active: 1 });
});

describe('creating purchase requests (req 2.2.5)', () => {
  // API-17
  test('API-17 Staff creates a request: 201 and it waits for approval (Pending)', async () => {
    purchaseRequestModel.createRequest.mockResolvedValue(fakeRequestRow());

    const res = await request(app)
      .post('/api/purchase-requests')
      .set('Authorization', `Bearer ${tokenFor(4, 'Staff')}`)
      .send(NEW_REQUEST);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Pending');
    expect(purchaseRequestModel.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestedBy: 4, autoApprove: false, note: 'running low' })
    );
  });

  test('a Manager request needs no approval: it is created as Approved', async () => {
    purchaseRequestModel.createRequest.mockResolvedValue(
      fakeRequestRow({ status: 'Approved', requested_by_role: 'Manager', decided_by_name: 'Morgan Manager' })
    );

    const res = await request(app)
      .post('/api/purchase-requests')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send(NEW_REQUEST);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Approved');
    expect(purchaseRequestModel.createRequest).toHaveBeenCalledWith(expect.objectContaining({ autoApprove: true }));
  });

  test('an invalid request returns 400 and nothing is saved', async () => {
    const res = await request(app)
      .post('/api/purchase-requests')
      .set('Authorization', `Bearer ${tokenFor(4, 'Staff')}`)
      .send({ productId: 3, supplierId: 2, quantity: 0 });

    expect(res.status).toBe(400);
    expect(purchaseRequestModel.createRequest).not.toHaveBeenCalled();
  });

  test('a deactivated supplier returns 409', async () => {
    supplierModel.findById.mockResolvedValue({ supplier_id: 2, is_active: 0 });

    const res = await request(app)
      .post('/api/purchase-requests')
      .set('Authorization', `Bearer ${tokenFor(4, 'Staff')}`)
      .send(NEW_REQUEST);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Supplier is deactivated');
  });

  test('an unknown product returns 404', async () => {
    productModel.findById.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/purchase-requests')
      .set('Authorization', `Bearer ${tokenFor(4, 'Staff')}`)
      .send(NEW_REQUEST);

    expect(res.status).toBe(404);
  });

  test('GET with ?status=Pending lists only that status, any role can read', async () => {
    purchaseRequestModel.findAll.mockResolvedValue([fakeRequestRow()]);

    const res = await request(app)
      .get('/api/purchase-requests?status=Pending')
      .set('Authorization', `Bearer ${tokenFor(4, 'Staff')}`);

    expect(res.status).toBe(200);
    expect(purchaseRequestModel.findAll).toHaveBeenCalledWith('Pending');
    expect(res.body[0]).toEqual(expect.objectContaining({ requestId: 5, productName: 'Wireless Mouse M200', requestedBy: 'Maria Garcia' }));
  });

  test('an unknown status filter returns 400', async () => {
    const res = await request(app)
      .get('/api/purchase-requests?status=Whatever')
      .set('Authorization', `Bearer ${tokenFor(4, 'Staff')}`);
    expect(res.status).toBe(400);
  });
});

describe('approving and declining (req 2.2.5)', () => {
  // API-18
  test('API-18 a Manager approves a pending request: 200 and it is logged', async () => {
    purchaseRequestModel.findById
      .mockResolvedValueOnce(fakeRequestRow())
      .mockResolvedValueOnce(fakeRequestRow({ status: 'Approved', decided_by_name: 'Morgan Manager' }));
    purchaseRequestModel.decide.mockResolvedValue(true);

    const res = await request(app)
      .put('/api/purchase-requests/5/decision')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ decision: 'Approved' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Approved');
    expect(purchaseRequestModel.decide).toHaveBeenCalledWith('5', { status: 'Approved', decidedBy: 2, note: null });
    expect(auditLogModel.logEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'REQUEST_APPROVED', userId: 2 }));
  });

  test('declining without a reason returns 400', async () => {
    const res = await request(app)
      .put('/api/purchase-requests/5/decision')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ decision: 'Declined' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('A reason is required');
    expect(purchaseRequestModel.decide).not.toHaveBeenCalled();
  });

  test('a Manager declines with a reason', async () => {
    purchaseRequestModel.findById
      .mockResolvedValueOnce(fakeRequestRow())
      .mockResolvedValueOnce(fakeRequestRow({ status: 'Declined', decision_note: 'Enough stock coming' }));
    purchaseRequestModel.decide.mockResolvedValue(true);

    const res = await request(app)
      .put('/api/purchase-requests/5/decision')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ decision: 'Declined', note: ' Enough stock coming ' });

    expect(res.status).toBe(200);
    expect(res.body.decisionNote).toBe('Enough stock coming');
    expect(purchaseRequestModel.decide).toHaveBeenCalledWith('5', expect.objectContaining({ note: 'Enough stock coming' }));
  });

  test('Staff cannot decide: 403 and the attempt is logged (req 3.2.3)', async () => {
    const res = await request(app)
      .put('/api/purchase-requests/5/decision')
      .set('Authorization', `Bearer ${tokenFor(4, 'Staff')}`)
      .send({ decision: 'Approved' });

    expect(res.status).toBe(403);
    expect(purchaseRequestModel.decide).not.toHaveBeenCalled();
    expect(auditLogModel.logEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'ACCESS_DENIED', userId: 4 }));
  });

  test('a request that was already decided returns 409', async () => {
    purchaseRequestModel.findById.mockResolvedValue(fakeRequestRow({ status: 'Approved' }));
    purchaseRequestModel.decide.mockResolvedValue(false);

    const res = await request(app)
      .put('/api/purchase-requests/5/decision')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ decision: 'Declined', note: 'too late' });

    expect(res.status).toBe(409);
  });

  test('an unknown request returns 404', async () => {
    purchaseRequestModel.findById.mockResolvedValue(undefined);

    const res = await request(app)
      .put('/api/purchase-requests/999/decision')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ decision: 'Approved' });

    expect(res.status).toBe(404);
  });
});
