const express = require('express');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const supplierRoutes = require('./routes/suppliers');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const orderRoutes = require('./routes/orders');
const errorHandler = require('./middleware/errorHandler');

// its a function so we can import this in tests whithout opening a real port
function createApp() {
  const app = express();

  // in production nginx sits in front of express, this makes req.ip the real
  // client ip (from X-Forwarded-For) instead of nginx's 127.0.0.1, so audit logs are useful
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // middlewares
  app.use(express.json());

  // routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/orders', orderRoutes);

  // the error handler must be added after the routes so it can catch their errors
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
