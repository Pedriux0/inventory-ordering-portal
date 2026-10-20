const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../../src/app');
const orderModel = require('../../src/models/orderModel');
const { StockError } = require('../../src/utils/stock');

jest.mock('../../src/models/orderModel');
jest.mock('../../src/models/auditLogModel');

const app = createApp();

function tokenFor(userId, role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET);
}

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('orders (reqs 2.4.3, 2.5.3)', () => {
  // API-04
  test('API-04 POST /api/orders returns 201 and the stock goes down by 5', async () => {
    orderModel.createOrder.mockResolvedValue({
      orderId: 100,
      totalAmount: 249.95,
      items: [{ productId: 1, productName: 'Desk Lamp', quantity: 5, unitPrice: 49.99, newStock: 70 }],
    });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send({ items: [{ productId: 1, quantity: 5 }] });

    expect(res.status).toBe(201);
    expect(res.body.orderId).toBe(100);
    expect(res.body.items[0].newStock).toBe(70);
    // the user comes from the token
    expect(orderModel.createOrder).toHaveBeenCalledWith(3, [{ productId: 1, quantity: 5 }]);
  });

  test('not enough stock returns 409 and the reason', async () => {
    orderModel.createOrder.mockRejectedValue(
      new StockError('Desk Lamp: Not enough stock: 3 available, 5 requested', 409)
    );

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send({ items: [{ productId: 1, quantity: 5 }] });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Not enough stock');
  });

  test('an empty order returns 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send({ items: [] });

    expect(res.status).toBe(400);
    expect(orderModel.createOrder).not.toHaveBeenCalled();
  });

  test('GET /api/orders lists orders with numbers, not text', async () => {
    orderModel.findAll.mockResolvedValue([
      {
        order_id: 100,
        order_date: '2026-10-19',
        total_amount: '249.95',
        created_by_name: 'Maria Garcia',
        line_count: 1,
        unit_count: '5',
      },
    ]);

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);

    expect(res.status).toBe(200);
    expect(res.body[0]).toEqual(
      expect.objectContaining({ orderId: 100, totalAmount: 249.95, unitCount: 5, createdBy: 'Maria Garcia' })
    );
  });

  test('GET /api/orders/:id returns 404 for an unknown order', async () => {
    orderModel.findById.mockResolvedValue(undefined);

    const res = await request(app)
      .get('/api/orders/999')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);

    expect(res.status).toBe(404);
  });
});
