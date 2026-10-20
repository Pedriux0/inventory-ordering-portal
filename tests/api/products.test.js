const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../../src/app');
const productModel = require('../../src/models/productModel');

jest.mock('../../src/models/productModel');
jest.mock('../../src/models/auditLogModel');

const app = createApp();

function tokenFor(userId, role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET);
}

// a fake row as it would come back from the products table (DECIMAL comes back as text)
function fakeProductRow(overrides = {}) {
  return {
    product_id: 1,
    product_name: 'Ergonomic Desk Lamp LED',
    description: 'Adjustable LED desk lamp',
    unit_price: '49.99',
    current_stock: 75,
    reorder_level: 15,
    created_at: '2026-10-19T12:00:00.000Z',
    ...overrides,
  };
}

const NEW_PRODUCT = {
  productName: '  Ergonomic Desk Lamp LED  ',
  description: 'Adjustable LED desk lamp',
  unitPrice: 49.99,
  currentStock: 75,
  reorderLevel: 15,
};

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('products (reqs 2.4.1, 2.5.1)', () => {
  // API-03
  test('API-03 POST /api/products as Staff returns 201 Created', async () => {
    productModel.createProduct.mockResolvedValue(fakeProductRow());

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send(NEW_PRODUCT);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({ productId: 1, unitPrice: 49.99, currentStock: 75, lowStock: false })
    );
    // name is trimmed before saving
    expect(productModel.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ productName: 'Ergonomic Desk Lamp LED' })
    );
  });

  test('missing name returns 400 and nothing is saved (UT-05 through the API)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send({ ...NEW_PRODUCT, productName: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Product name is required');
    expect(productModel.createProduct).not.toHaveBeenCalled();
  });

  test('no token returns 401', async () => {
    const res = await request(app).post('/api/products').send(NEW_PRODUCT);
    expect(res.status).toBe(401);
  });

  test('GET /api/products lists products and flags low stock', async () => {
    productModel.findAll.mockResolvedValue([
      fakeProductRow(),
      fakeProductRow({ product_id: 2, product_name: 'Wireless Mouse M200', current_stock: 3 }),
    ]);

    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);

    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.lowStock)).toEqual([false, true]);
  });

  test('PUT /api/products/:id updates details but never the stock', async () => {
    productModel.findById.mockResolvedValue(fakeProductRow());
    productModel.updateProduct.mockResolvedValue(fakeProductRow({ unit_price: '44.99' }));

    const res = await request(app)
      .put('/api/products/1')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send({ ...NEW_PRODUCT, unitPrice: 44.99, currentStock: 9999 });

    expect(res.status).toBe(200);
    expect(res.body.unitPrice).toBe(44.99);
    // the model's update query has no stock column, so 9999 is simply ignored
    expect(res.body.currentStock).toBe(75);
  });

  test('PUT /api/products/:id returns 404 for an unknown product', async () => {
    productModel.findById.mockResolvedValue(undefined);

    const res = await request(app)
      .put('/api/products/999')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`)
      .send(NEW_PRODUCT);

    expect(res.status).toBe(404);
  });
});
