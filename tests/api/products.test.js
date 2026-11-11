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
    productModel.findAll.mockResolvedValue({
      rows: [fakeProductRow(), fakeProductRow({ product_id: 2, product_name: 'Wireless Mouse M200', current_stock: 3 })],
      total: 2,
    });

    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);

    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.lowStock)).toEqual([false, true]);
  });

  // API-05 (req 2.6.1)
  test('API-05 GET /api/products?search=Widget returns the filtered list', async () => {
    productModel.findAll.mockResolvedValue({ rows: [fakeProductRow({ product_name: 'Blue Widget' })], total: 1 });

    const res = await request(app)
      .get('/api/products?search=Widget')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);

    expect(res.status).toBe(200);
    expect(productModel.findAll).toHaveBeenCalledWith(expect.objectContaining({ search: 'Widget' }));
    expect(res.body[0].productName).toBe('Blue Widget');
    expect(res.headers['x-total-count']).toBe('1');
  });

  // API-12 (req 2.6.4)
  test('API-12 GET /api/products?page=2&limit=25 returns page 2 of 25', async () => {
    productModel.findAll.mockResolvedValue({ rows: [], total: 60 });

    const res = await request(app)
      .get('/api/products?page=2&limit=25')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);

    expect(res.status).toBe(200);
    expect(productModel.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 25, offset: 25 }));
    expect(res.headers['x-total-count']).toBe('60');
  });

  test('page without limit uses the default page size of 25 (req 2.6.4)', async () => {
    productModel.findAll.mockResolvedValue({ rows: [], total: 0 });
    await request(app).get('/api/products?page=1').set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);
    expect(productModel.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 25, offset: 0 }));
  });

  test('sorting by price, highest first (req 2.6.3)', async () => {
    productModel.findAll.mockResolvedValue({ rows: [], total: 0 });
    const res = await request(app)
      .get('/api/products?sort=price&order=desc')
      .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);
    expect(res.status).toBe(200);
    expect(productModel.findAll).toHaveBeenCalledWith(expect.objectContaining({ sort: 'price', order: 'desc' }));
  });

  test('an unknown sort column, a bad page or a too-big limit returns 400', async () => {
    for (const query of ['sort=password_hash', 'order=sideways', 'page=0', 'limit=1000', 'page=abc']) {
      const res = await request(app)
        .get(`/api/products?${query}`)
        .set('Authorization', `Bearer ${tokenFor(3, 'Staff')}`);
      expect(res.status).toBe(400);
    }
    expect(productModel.findAll).not.toHaveBeenCalled();
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
