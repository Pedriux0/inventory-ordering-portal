const mysql = require('mysql2/promise');
const { retryOnConflict } = require('../utils/retry');

// one shared connection pool for the whole app, values come from .env
// queries must always use placeholders (?) so we are safe from sql injection (req 3.1.1)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'inventory_portal',
  waitForConnections: true,
  connectionLimit: 10,
  // return DATE columns (order_date, date_received) as plain 'YYYY-MM-DD' text
  // otherwise they become javascript dates and can shift a day because of timezones
  dateStrings: ['DATE'],
});

// every single statement the models run with pool.execute / pool.query is retried automatically
// on a temporary conflict (see utils/retry.js). Statements inside a transaction use their own
// connection; those transactions are retried as a whole in the models instead.
const rawExecute = pool.execute.bind(pool);
const rawQuery = pool.query.bind(pool);
pool.execute = (...args) => retryOnConflict(() => rawExecute(...args));
pool.query = (...args) => retryOnConflict(() => rawQuery(...args));

module.exports = pool;
