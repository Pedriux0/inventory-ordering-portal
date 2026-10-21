const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../../src/app');
const orderRequestModel = require('../../src/models/orderRequestModel');
const productModel = require('../../src/models/productModel');
const auditLogModel = require('../../src/models/auditLogModel');
const { StockError } = require('../../src/utils/stock');

jest.mock('../../src/models/orderRequestModel');
jest.mock('../../src/models/productModel');
jest.mock('../../src/models/auditLogModel');

const app = createApp();

function tokenFor(userId, role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET);
}

// a fake request as the model returns it (with its lines)
function fakeRequestRow(overrides = {}) {
  return {
    order_request_id: 9,
    status: 'Pending',
    decision_note: null,
    decided_at: null,
    created_at: '2026-10-21T10:00:00.000Z',
    order_id: null,
    requested_by: 4,
    requested_by_name: 'Maria Garcia',
    decided_by: null,
    decided_by_name: null,
    items: [
      { order_request_id: 9, product_id: 8, product_name: 'Notebook A5 Dotted', quantity: 3, unit_price: '6.75', current_stock: 240 },
      { order_request_id: 9, product_id: 2, product_name: 'Ergonomic Desk Lamp LED', quantity: 1, unit_price: '49.99', current_stock: 75 },
    ],
    ...overrides,
  };
}

const ORDER = { items: [{ productId: 8, quantity: 3 }, { productId: 2, quantity: 1 }] };

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
  auditLogModel.logEvent.mockResolvedValue();
  productModel.findById.mockImplementation(async (id) => ({ product_id: id, product_name: `Product ${id}`, current_stock: 100 }));
});

describe('Staff send sales orders for approval (client change to req 2.5.3)', () => {
  // API-19
  test('API-19 Staff sends an order: 201, Pending, with the estimated total', async () => {
    orderRequestModel.createRequest.mockResolvedValue(fakeRequestRow());

    const res = await request(app)
      .post('/api/order-requests')
      .set('Authorization', `Bearer ${tokenFor(4, 'Staff')}`)
      .send(ORDER);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Pending');
    expect(res.body.estimatedTotal).toBe(70.24); // 3 x 6.75 + 1 x 49.99
    expect(orderRequestModel.createRequest).toHaveBeenCalledWith(4, ORDER.items);
  });

  test('asking for more than is in stock is refused straight away (409)', async () => {
    productModel.findById.mockResolvedValue({ product_id: 8, product_name: 'Notebook A5 Dotted', current_stock: 2 });

    const res = await request(app)
      .post('/api/order-requests')
      .set('Authorization', `Bearer ${tokenFor(4, 'Staff')}`)
      .send({ items: [{ productId: 8, quantity: 3 }] });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Not enough stock');
    expect(orderRequestModel.createRequest).not.toHaveBeenCalled();
  });

  test('an empty order returns 400', async () => {
    const res = await request(app)
      .post('/api/order-requests')
      .set('Authorization', `Bearer ${tokenFor(4, 'Staff')}`)
      .send({ items: [] });
    expect(res.status).toBe(400);
  });

  test('GET ?status=Pending lists the waiting orders with their lines', async () => {
    orderRequestModel.findAll.mockResolvedValue([fakeRequestRow()]);

    const res = await request(app)
      .get('/api/order-requests?status=Pending')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`);

    expect(res.status).toBe(200);
    expect(orderRequestModel.findAll).toHaveBeenCalledWith('Pending');
    expect(res.body[0].items).toHaveLength(2);
    expect(res.body[0].requestedBy).toBe('Maria Garcia');
  });
});

describe('Managers approve or decline (client change to req 2.5.3)', () => {
  // API-20
  test('API-20 a Manager approves: the order is created and it is logged', async () => {
    orderRequestModel.findById
      .mockResolvedValueOnce(fakeRequestRow())
      .mockResolvedValueOnce(fakeRequestRow({ status: 'Approved', order_id: 31, decided_by_name: 'Morgan Manager' }));
    orderRequestModel.approve.mockResolvedValue({ orderId: 31, totalAmount: 70.24, items: [] });

    const res = await request(app)
      .put('/api/order-requests/9/decision')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ decision: 'Approved' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ status: 'Approved', orderId: 31 }));
    expect(orderRequestModel.approve).toHaveBeenCalledWith('9', 2);
    expect(auditLogModel.logEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'ORDER_APPROVED' }));
  });

  test('approving when the stock ran out meanwhile returns 409 and changes nothing', async () => {
    orderRequestModel.findById.mockResolvedValue(fakeRequestRow());
    orderRequestModel.approve.mockRejectedValue(
      new StockError('Notebook A5 Dotted: Not enough stock: 1 available, 3 requested', 409)
    );

    const res = await request(app)
      .put('/api/order-requests/9/decision')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ decision: 'Approved' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Not enough stock');
    expect(auditLogModel.logEvent).not.toHaveBeenCalled();
  });

  test('declining needs a reason', async () => {
    const res = await request(app)
      .put('/api/order-requests/9/decision')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ decision: 'Declined' });

    expect(res.status).toBe(400);
    expect(orderRequestModel.decline).not.toHaveBeenCalled();
  });

  test('a Manager declines with a reason', async () => {
    orderRequestModel.findById
      .mockResolvedValueOnce(fakeRequestRow())
      .mockResolvedValueOnce(fakeRequestRow({ status: 'Declined', decision_note: 'Customer cancelled' }));
    orderRequestModel.decline.mockResolvedValue(true);

    const res = await request(app)
      .put('/api/order-requests/9/decision')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ decision: 'Declined', note: ' Customer cancelled ' });

    expect(res.status).toBe(200);
    expect(res.body.decisionNote).toBe('Customer cancelled');
    expect(orderRequestModel.decline).toHaveBeenCalledWith('9', 2, 'Customer cancelled');
  });

  test('Staff cannot approve: 403', async () => {
    const res = await request(app)
      .put('/api/order-requests/9/decision')
      .set('Authorization', `Bearer ${tokenFor(4, 'Staff')}`)
      .send({ decision: 'Approved' });

    expect(res.status).toBe(403);
    expect(orderRequestModel.approve).not.toHaveBeenCalled();
  });

  test('an already decided request returns 409', async () => {
    orderRequestModel.findById.mockResolvedValue(fakeRequestRow({ status: 'Approved' }));
    orderRequestModel.decline.mockResolvedValue(false);

    const res = await request(app)
      .put('/api/order-requests/9/decision')
      .set('Authorization', `Bearer ${tokenFor(2, 'Manager')}`)
      .send({ decision: 'Declined', note: 'too late' });

    expect(res.status).toBe(409);
  });
});
