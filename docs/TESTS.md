# Automated Tests

All tests run automatically on GitHub on every push to the client branch, as the proposal's *automated-first* testing plan describes.

**See the latest results:** [GitHub Actions → Automated tests](https://github.com/Pedriux0/inventory-ordering-portal/actions/workflows/tests.yml)

Each run has three jobs, and each one shows its own green ✓ or red ✗:

| Job | Tool (from the proposal) | What it checks | Tests |
|---|---|---|---|
| 1. Backend tests | Jest + Supertest | Business rules and every API endpoint, including status codes, validation and role checks. The database is replaced with fakes, so the tests are fast and repeatable. | 118 |
| 2. Database tests | Jest + a real MariaDB | The real SQL: stock changes, rollback when an order can't be fulfilled, two people ordering at the same moment, approvals | 16 |
| 3. Browser tests | Cypress | A real browser that logs in and clicks through the app like a user. **A video of every test is saved** (open the run → *Artifacts* → `cypress-videos`). | 16 |

## Test plan coverage (proposal section 4)

✅ = automated and passing on every push · ⏳ = planned for a later milestone (the feature isn't built yet)

### Unit tests (UT)
| ID | What it checks | Where | Status |
|---|---|---|---|
| UT-01 | Password is hashed before storing | `tests/unit/password.test.js` | ✅ |
| UT-02 | Passwords under 16 characters are rejected | `tests/unit/password.test.js` | ✅ |
| UT-03 | Stock after a receipt: 50 + 25 = 75 | `tests/unit/stock.test.js` | ✅ |
| UT-04 | Stock after an order: 75 − 10 = 65 | `tests/unit/stock.test.js` | ✅ |
| UT-05 | A product with no name is rejected | `tests/unit/product.validation.test.js` | ✅ |
| UT-06 | Role check (RBAC middleware) | `tests/unit/auth.middleware.test.js` | ✅ |
| UT-07 | A user account has all its fields | `tests/api/users.test.js` | ✅ |
| UT-08 | A supplier with no name is rejected | `tests/unit/supplier.validation.test.js` | ✅ |
| UT-09 | Data persists in MySQL/MariaDB | `tests/integration/stock.db.int.js` | ✅ |
| UT-10 | Purchase request validation *(added with inventory approval)* | `tests/unit/purchaseRequest.validation.test.js` | ✅ |
| UT-11 | Declining needs a reason *(added)* | `tests/unit/purchaseRequest.validation.test.js` | ✅ |

### API tests (API)
| ID | What it checks | Where | Status |
|---|---|---|---|
| API-01, API-02 | Login works / a wrong password gives 401 | `tests/api/auth.login.test.js` | ✅ |
| API-03 | Create a product | `tests/api/products.test.js` | ✅ |
| API-04 | Place an order (Manager); Staff are blocked with 403 | `tests/api/orders.test.js` | ✅ |
| API-05, API-11, API-12 | Search, filter and pagination | — | ⏳ Week 7 |
| API-06 | Only an Admin can change roles | `tests/api/users.test.js` | ✅ |
| API-07 | Logout | `tests/api/auth.logout.test.js` | ✅ |
| API-08 | Password-reset token | `tests/api/auth.resetpassword.test.js` | ✅ |
| API-09, API-10 | Record a receipt (stock goes up) / view inventory | `tests/api/inventory.test.js` | ✅ |
| API-13, API-14, API-16 | Change password / deactivate an account / view an account | `tests/api/users.test.js` | ✅ |
| API-15 | Create a supplier | `tests/api/suppliers.test.js` | ✅ |
| API-17, API-18 | Purchase requests: create, approve or decline *(added)* | `tests/api/purchaseRequests.test.js` | ✅ |
| API-19, API-20 | Staff sales orders: send for approval, approve or decline *(added)* | `tests/api/orderRequests.test.js` | ✅ |

### Front-end tests (FE, Cypress)
| ID | What it checks | Where | Status |
|---|---|---|---|
| FE-01, FE-02 | Log in / a wrong password shows an error | `client/cypress/e2e/auth.cy.js` | ✅ |
| FE-03 | Staff create a product | `client/cypress/e2e/products.cy.js` | ✅ |
| FE-04 | Staff send an order → a Manager approves → it's confirmed | `client/cypress/e2e/orders.cy.js` | ✅ |
| FE-05 | A Manager creates a supplier | `client/cypress/e2e/suppliers.cy.js` | ✅ |
| FE-10, FE-11 | Record a receipt / view inventory | `client/cypress/e2e/inventory.cy.js` | ✅ |
| FE-16, FE-17 | Send a purchase request / a Manager approves it *(added)* | `client/cypress/e2e/requests.cy.js` | ✅ |
| FE-06, FE-09, FE-14 | Assign roles, edit profile, change password **screens** | — | ⏳ Milestone 1 screens. The API behind them is tested (API-06, API-13, and FE-09's rules in `users.test.js`). |
| FE-07, FE-08, FE-12, FE-13 | Search, sort and pagination screens | — | ⏳ Week 7 |

## Running the tests yourself

```bash
npm test -- --verbose          # 1. backend: lists every test by name, ends with "118 passed"
npm run test:db -- --verbose   # 2. real database: needs MariaDB running (uses the settings in .env)
cd client && npx cypress open  # 3. browser: pick E2E → a browser → click a spec and watch it run
```

`npx cypress run` runs every browser test without a window. The app has to be running first (`npm run dev` and `cd client && npm run dev`).
