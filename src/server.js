// load the enviroment variables first before anything else
require('dotenv').config();
const createApp = require('./app');

// use port from .env or default to 3000 in case its not set
const port = process.env.PORT || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
