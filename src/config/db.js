const mysql = require('mysql2/promise');

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
});

module.exports = pool;
