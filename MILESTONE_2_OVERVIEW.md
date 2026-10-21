# Milestone 2: Products, Inventory, Orders and Suppliers

What was built and why, mapped to the proposal's requirements and test IDs. This document supports the Milestone 2 presentation.

## 1. Scope

The proposal's timeline puts three weeks before the Milestone 2 checkpoint:

| Week | Topic | Requirements | Tests |
|---|---|---|---|
| 4 | Products and receipts | 2.4.1, 2.4.2, 2.5.1, 2.5.2, 2.5.4, 3.4.2 | UT-03, 05, 09; API-03, 09, 10; FE-03, 10, 11 |
| 5 | Orders and stock | 2.4.3, 2.5.3 | UT-04; API-04; FE-04 |
| 6 | Deploy + **Milestone 2**: suppliers | 2.4.4, 2.5.6, 2.2.5 | UT-08; API-15; FE-05 |

Suppliers were built first because `inventory_receipts.supplier_id` is `NOT NULL`, which means a receipt can't be recorded until a supplier exists.

The React frontend also started in this milestone, so the features can be demonstrated in a browser instead of with curl. The login screen (FE-01, FE-02 from Week 2) is included because every other page needs it.

## 2. New API endpoints

All of these need a valid JWT.

| Endpoint | Who | Requirement / test |
|---|---|---|
| `GET /api/products`, `GET /api/products/:id` | any role | 2.4.1 |
| `POST /api/products` | any role | 2.5.1, **API-03** |
| `PUT /api/products/:id` | any role | 2.5.1 (stock can't be edited) |
| `GET /api/inventory` | any role | 2.5.4, **API-10** |
| `POST /api/inventory/receipts` | any role | 2.5.2, **API-09** |
| `GET /api/inventory/receipts` | any role | latest 25 receipts |
| `POST /api/orders` | any role | 2.5.3, **API-04** |
| `GET /api/orders`, `GET /api/orders/:id` | any role | order history and details |
| `GET /api/suppliers`, `GET /api/suppliers/:id` | any role | 2.2.5 |
| `POST /api/suppliers` | Manager, Admin | 2.5.6, **API-15** |
| `PUT /api/suppliers/:id`, `PUT /api/suppliers/:id/status` | Manager, Admin | 2.5.6 |
| `GET /api/purchase-requests` (`?status=Pending`), `POST /api/purchase-requests` | any role | 2.2.5, **API-17** |
| `PUT /api/purchase-requests/:id/decision` | Manager, Admin | 2.2.5, **API-18** |

The request bodies use the column names in camelCase, for example `{ supplierName, contactEmail, contactPhone }` and `{ productId, supplierId, quantity, dateReceived }`. The test plan writes them in shorthand (`{ name, contact }`, `{ productId, qty, date }`).

An order body is `{ items: [{ productId, quantity }, ...] }`, because req 2.4.3 says an order can contain several products ("Product ID(s)").

## 3. The most important pieces

### `src/utils/stock.js`: stock math
- `calculateStockAfterReceipt(50, 25)` returns 75 (**UT-03**).
- `calculateStockAfterOrder(75, 10)` returns 65 (**UT-04**). If the order is bigger than the stock, it throws a `StockError`, so stock never goes negative.
- These are plain functions, so the unit tests check the same code the models run.

### `src/models/inventoryModel.js` and `orderModel.js`: transactions
- A receipt inserts the receipt row **and** updates the stock in one transaction.
- An order inserts the order, every line and every stock deduction in one transaction. If any line is short on stock, the whole order is rolled back and nothing is saved.
- `SELECT ... FOR UPDATE` locks each product row until commit. When two orders arrive at the same moment, the second one waits, sees the updated stock, and is refused if there isn't enough left (req 3.4.1). Products are locked in ID order so two orders can't deadlock each other.
- The sale price is copied into `order_items.unit_price_at_sale`, so changing a product's price later doesn't change past orders.

### `src/utils/validators.js`: input checks
- `validateProduct()` (**UT-05**): the name is required. The price must be 0 or more with at most 2 decimals, to fit `DECIMAL(10,2)`. Stock and reorder level must be whole numbers.
- `validateSupplier()` (**UT-08**): the name is required. Email and phone are optional but checked when given.
- `validateReceipt()` and `validateOrder()` require positive whole-number IDs and quantities and a real date that isn't in the future, and reject an empty order or the same product twice.
- Each validator returns **every** problem at once, like `validatePassword()` in Milestone 1.

### `client/`: React frontend (Vite)
- Pages: Login, Dashboard (mockup 2), Products (mockup 3's form), Inventory, Orders, Suppliers.
- `api.js` attaches the JWT to every call. Any 401 sends the user back to login.
- The token is kept in `sessionStorage`, so it's cleared when the tab closes.
- Staff see suppliers read-only. The buttons are hidden, and the API also returns 403 if they're bypassed.
- Labels are linked to their inputs, errors use `role="alert"`, focus outlines are visible, and the layout works at 375px wide. These are a head start for the Week 9 accessibility tests.

### `deploy/`
`nginx.conf`, `ecosystem.config.js` (PM2) and `DEPLOY.md` set up the proposal's Hostinger layout: NGINX serves the React build and forwards `/api` to Express under PM2. In production, Express trusts NGINX's `X-Forwarded-For` header, so the audit logs record the real client IP.

## 4. Requirement coverage

| Requirement | Status |
|---|---|
| 2.4.1 Store product data | Done |
| 2.4.2 Store inventory receipt data | Done |
| 2.4.3 Store order data | Done (`orders` + `order_items`) |
| 2.4.4 Store supplier data | Done |
| 2.5.1 Staff create and update products | Done (API + UI) |
| 2.5.2 Staff record receipts | Done (API + UI) |
| 2.5.3 Staff process sales orders | Done (API + UI) |
| 2.5.4 Staff view current inventory | Done (API + UI) |
| 2.5.6 Manager manages suppliers | Done (Manager + Admin) |
| 2.2.5 Manager supplier access + inventory approval | Done. Inventory approval = **purchase requests**: Staff request, and a Manager or Admin approves or declines (a decline needs a reason). Managers' and Admins' own requests are approved straight away. Approving doesn't change stock. |
| 3.4.1 Concurrent users without data loss | Transactions + row locks, with a real-database test |
| 3.4.2 Relational database | Done, **UT-09** against real MariaDB |

## 5. Testing

| Suite | Count | How |
|---|---|---|
| `npm test` | 107 tests in 15 suites (includes 17 for purchase requests) | Jest + Supertest, models mocked |
| `npm run test:db` | 11 tests (includes purchase requests and two managers deciding at once) | Real MariaDB: UT-09, receipt +25, order −10, rollback on oversell, two simultaneous orders, deactivated supplier refused |
| `client: npm run test:e2e` | 20 tests (includes FE-16, FE-17 and the UX regression tests) | Cypress in a real browser: FE-01, 02, 03, 04, 05, 10, 11, plus validation, oversell and Staff read-only checks |

| Test ID | Where |
|---|---|
| UT-03, UT-04 | `tests/unit/stock.test.js` |
| UT-05 | `tests/unit/product.validation.test.js` |
| UT-08 | `tests/unit/supplier.validation.test.js` |
| UT-09 | `tests/integration/stock.db.int.js` |
| API-03 | `tests/api/products.test.js` |
| API-04 | `tests/api/orders.test.js` |
| API-09, API-10 | `tests/api/inventory.test.js` |
| API-15 | `tests/api/suppliers.test.js` |
| FE-01–05, FE-10, FE-11 | `client/cypress/e2e/*.cy.js` |

## 6. Demo script (about 5 minutes)

1. `npm run seed`, start the API (`npm run dev`) and the client (`cd client && npm run dev`), then open http://localhost:5173.
2. **Wrong password** → error message (FE-02). **Log in as Staff** (`staff@demo.com`) → dashboard with low-stock alerts (FE-01).
3. **Products** → New product → fill in the form → it appears in the list (FE-03). Submit with no name → "Product name is required" (UT-05).
4. **Inventory** → record 25 Wireless Mouse from Northwind → the stock goes up by 25 (FE-10, FE-11).
5. **Orders** → 2 products → Place order → "Order #N confirmed" and the stock goes down (FE-04). Try 100000 units → "Not enough stock", and nothing is saved.
6. **Suppliers** as Staff → read-only, no buttons. Sign out, **log in as Manager** → create a supplier → it's in the list (FE-05) → deactivate it → it no longer appears in the receipt form.

## 7. Questions you might get

- **"Why can't you edit the stock directly?"** Stock is the result of what was received and sold. If anyone could type a number, the stock would stop matching the receipt and order history. To correct a count, you record a receipt. A proper "stock adjustment" with a reason would be a future feature.
- **"What happens if two people sell the last item at the same time?"** Each order locks the product row (`FOR UPDATE`) inside a transaction. The second order waits, sees the new stock and is refused with 409. `npm run test:db` proves this by sending two orders of 40 against a stock of 65: exactly one succeeds and the stock ends at 25.
- **"What if an order has three products and the third is out of stock?"** The whole transaction rolls back. No order, no lines and no stock changes are saved. There's a real-database test for this too.
- **"Why is the price stored again in order_items?"** A product's price can change later. `unit_price_at_sale` keeps what the customer actually paid, so old order totals stay correct.
- **"Why can Staff see suppliers?"** They have to choose a supplier when recording a receipt (2.5.2). Viewing is read-only, and changes need Manager or Admin (2.5.6).
- **"Why deactivate suppliers instead of deleting them?"** Receipts reference the supplier with a foreign key. Deactivating keeps the history and blocks new receipts from that supplier.
- **"Hiding a button isn't security, is it?"** Correct. The button is hidden only to keep the screen clean. The API's `requireRole('Manager', 'Admin')` is the real check: it returns 403 and logs `ACCESS_DENIED`. There's a test that calls the API directly with a Staff token.
- **"How do you know the database part works, if the tests mock the models?"** `npm run test:db` runs against a real MariaDB and covers UT-09, the stock changes, the rollback and the concurrency case. The Cypress tests then run the whole stack in a browser.
- **"Where's the category field from the mockup?"** The ERD and req 2.4.1 don't include it, and the ERD is the source of truth, so it was left out. It's an easy addition if needed.
- **"Is it deployed?"** The deployment is fully scripted in `deploy/` (NGINX + PM2 + certbot, as in the proposal). Running it needs SSH access to the VPS.

## 8. Not built yet

- Search, sort and pagination for products and orders: Week 7 (2.6.1–2.6.4, API-05, 11, 12).
- Linking an approved request to the receipt when the delivery arrives (decided: later).
- Profile and user-admin screens: the API exists from Milestone 1, but the React pages don't yet (FE-06, 09, 14, 15).
- The "set new password" endpoint that uses a reset token, and sending reset emails.
