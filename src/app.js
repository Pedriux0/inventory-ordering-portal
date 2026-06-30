const express = require('express');
const healthRoutes = require('./routes/health');

// its a function so we can import this in tests whithout opening a real port
function createApp() {
  const app = express();

  // middlewares
  app.use(express.json());

  // routes
  app.use('/api/health', healthRoutes);

  return app;
}

module.exports = createApp;
