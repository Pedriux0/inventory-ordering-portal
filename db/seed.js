// fills the database with demo data so there is something to show
// run with: npm run seed   (needs the schema loaded and .env filled in)
// safe to run more than once: users are skipped if the email exists,
// suppliers and products are only added when their table is empty
// DEMO ONLY: never run this on the real server, the demo passwords are public in this file
require('dotenv').config();
const pool = require('../src/config/db');
const { hashPassword } = require('../src/utils/password');

const DEMO_USERS = [
  { fullName: 'Alex Admin', email: 'admin@demo.com', password: 'DemoAdminPass2026', role: 'Admin' },
  { fullName: 'Morgan Manager', email: 'manager@demo.com', password: 'DemoManagerPass2026', role: 'Manager' },
  { fullName: 'Maria Garcia', email: 'staff@demo.com', password: 'DemoStaffPass2026', role: 'Staff' },
];

const DEMO_SUPPLIERS = [
  ['Acme Office Supply', 'sales@acme-office.com', '+1 555 201 3344'],
  ['Northwind Electronics', 'orders@northwind.com', '+1 555 410 9087'],
  ['Brightline Furniture', 'hello@brightline.com', null],
];

// name, description, price, stock, reorder level
const DEMO_PRODUCTS = [
  ['Ergonomic Desk Lamp LED', 'Adjustable LED desk lamp with 5 brightness levels', 49.99, 75, 15],
  ['Wireless Mouse M200', '2.4 GHz wireless mouse, 18 month battery', 24.5, 3, 15],
  ['USB-C Hub 7-Port', 'HDMI, 3x USB-A, SD, microSD, 100W pass-through', 39.0, 8, 20],
  ['Mechanical Keyboard K1', 'Hot-swappable switches, backlit', 89.99, 12, 15],
  ['Office Chair Mesh Pro', 'Breathable mesh back, lumbar support', 219.0, 30, 5],
  ['27in Monitor QHD', '2560x1440 IPS, height adjustable stand', 299.99, 18, 6],
  ['Notebook A5 Dotted', '120 pages, 100gsm paper', 6.75, 240, 50],
];

async function seedUsers() {
  for (const user of DEMO_USERS) {
    const [rows] = await pool.execute('SELECT user_id FROM users WHERE email = ?', [user.email]);
    if (rows.length > 0) {
      console.log(`user ${user.email} already exists, skipped`);
      continue;
    }
    await pool.execute(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [user.fullName, user.email, await hashPassword(user.password), user.role]
    );
    console.log(`user ${user.email} created (${user.role})`);
  }
}

async function tableIsEmpty(table) {
  // table name comes from this file only, never from user input
  const [rows] = await pool.execute(`SELECT COUNT(*) AS total FROM ${table}`);
  return rows[0].total === 0;
}

async function seedSuppliers() {
  if (!(await tableIsEmpty('suppliers'))) return console.log('suppliers already present, skipped');
  for (const supplier of DEMO_SUPPLIERS) {
    await pool.execute(
      'INSERT INTO suppliers (supplier_name, contact_email, contact_phone) VALUES (?, ?, ?)',
      supplier
    );
  }
  console.log(`${DEMO_SUPPLIERS.length} suppliers created`);
}

async function seedProducts() {
  if (!(await tableIsEmpty('products'))) return console.log('products already present, skipped');
  for (const product of DEMO_PRODUCTS) {
    await pool.execute(
      `INSERT INTO products (product_name, description, unit_price, current_stock, reorder_level)
       VALUES (?, ?, ?, ?, ?)`,
      product
    );
  }
  console.log(`${DEMO_PRODUCTS.length} products created`);
}

async function main() {
  await seedUsers();
  await seedSuppliers();
  await seedProducts();
  console.log('\ndemo logins:');
  DEMO_USERS.forEach((u) => console.log(`  ${u.role.padEnd(8)} ${u.email}  /  ${u.password}`));
}

main()
  .catch((err) => {
    console.error('seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
