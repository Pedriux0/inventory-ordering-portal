const express = require('express');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const errorHandler = require('./middleware/errorHandler');

// its a function so we can import this in tests whithout opening a real port
function createApp() {
  const app = express();

  // middlewares
  app.use(express.json());

  // routes
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);

  // the error handler must be added after the routes so it can catch their errors
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
