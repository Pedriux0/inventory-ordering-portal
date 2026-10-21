// load the enviroment variables first before anything else
require('dotenv').config();
const createApp = require('./app');

// use port from .env or default to 3000 in case its not set
const port = process.env.PORT || 3000;
const app = createApp();

// HOST=127.0.0.1 in production: only NGINX on the same machine can reach the api,
// nobody can skip HTTPS by calling the port directly. Not set = all interfaces (fine for dev)
const host = process.env.HOST;

app.listen(port, host, () => {
  console.log(`Server listening on ${host || 'all interfaces'}, port ${port}`);
});
