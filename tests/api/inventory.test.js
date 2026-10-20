const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../../src/app');
const inventoryModel = require('../../src/models/inventoryModel');
const { StockError } = require('../../src/utils/stock');

jest.mock('../../src/models/inventoryModel');
jest.mock('../../src/models/auditLogModel');

const app = createApp();

function tokenFor(userId, role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET);
}

const RECEIPT = { productId: 1, supplierId: 7, quantity: 25, dateReceived: '2026-10-01' };

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('inventory (reqs 2.4.2, 2.5.2, 2.5.4)', () => {
  // API-10
  test('API-10 GET /api/inventory with a Staff token returns 200 with the stock list', async () => {
    inventoryModel.findStockLevels.mockResolvedValue([
      { product_id: 2, product_name: 'Wireless Mouse M200', current_stock: 3, reorder_level: 15 },
      { product_id: 1, product_name: 'Ergonomic Desk Lamp LED', current_stock: 75, reorder_level: 15 },
    ]);

    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { productId: 2, productName: 'Wireless Mouse M200', currentStock: 3, reorderLevel: 15, lowStock: true },
      { productId: 1, productName: 'Ergonomic Desk Lamp LED', currentStock: 75, reorderLevel: 15, lowStock: false },
    ]);
  });

  // API-09
  test('API-09 POST /api/inventory/receipts returns 201 and the incremented stock', async () => {
    inventoryModel.createReceipt.mockResolvedValue({ receiptId: 10, productId: 1, quantity: 25, newStock: 75 });

    const res = await request(app)
      .post('/api/inventory/receipts')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send(RECEIPT);

    expect(res.status).toBe(201);
    expect(res.body.newStock).toBe(75);
    // who received it comes from the token, not from the body
    expect(inventoryModel.createReceipt).toHaveBeenCalledWith({ ...RECEIPT, receivedBy: 3 });
  });

  test('a receipt with zero quantity returns 400 and nothing is saved', async () => {
    const res = await request(app)
      .post('/api/inventory/receipts')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send({ ...RECEIPT, quantity: 0 });

    expect(res.status).toBe(400);
    expect(inventoryModel.createReceipt).not.toHaveBeenCalled();
  });

  test('a deactivated supplier returns 409 with a clear message', async () => {
    inventoryModel.createReceipt.mockRejectedValue(new StockError('Supplier is deactivated', 409));

    const res = await request(app)
      .post('/api/inventory/receipts')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send(RECEIPT);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Supplier is deactivated');
  });

  test('a database failure returns the generic 500, no internal details (req 3.2.1)', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    inventoryModel.createReceipt.mockRejectedValue(new Error('ER_LOCK_WAIT_TIMEOUT secret sql detail'));

    const res = await request(app)
      .post('/api/inventory/receipts')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send(RECEIPT);

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('sql');
    console.error.mockRestore();
  });
});
