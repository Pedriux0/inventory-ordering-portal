const express = require('express');
const helmet = require('helmet');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const supplierRoutes = require('./routes/suppliers');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const orderRoutes = require('./routes/orders');
const purchaseRequestRoutes = require('./routes/purchaseRequests');
const orderRequestRoutes = require('./routes/orderRequests');
const errorHandler = require('./middleware/errorHandler');
const { sanitizeBody } = require('./middleware/sanitize');

// its a function so we can import this in tests whithout opening a real port
function createApp() {
  const app = express();

  // in production nginx sits in front of express, this makes req.ip the real
  // client ip (from X-Forwarded-For) instead of nginx's 127.0.0.1, so audit logs are useful
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // security headers on every response (req 3.1, week 8): stops the browser from guessing
  // content types, blocks the api from being framed, and removes "X-Powered-By: Express"
  // so the server does not advertise what it runs on (req 3.2.4: no internal details)
  app.use(helmet());

  // middlewares
  // a small body limit: the api only receives small forms, a huge body is refused (413)
  app.use(express.json({ limit: '100kb' }));
  // req 3.1.2: strip html/script tags from every text field before anything else sees it
  app.use(sanitizeBody);

  // routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/purchase-requests', purchaseRequestRoutes);
  app.use('/api/order-requests', orderRequestRoutes);

  // any other /api path: a plain JSON 404 instead of express's default html page,
  // which would reveal the framework and the exact path handling (req 3.2.1, SEC-05)
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // the error handler must be added after the routes so it can catch their errors
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
