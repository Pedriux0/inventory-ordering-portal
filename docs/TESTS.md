# Automated Tests

All tests run automatically on GitHub on every push, as the proposal's *automated-first* testing plan describes (section 4).

**See the latest results:** [GitHub Actions → Automated tests](https://github.com/Pedriux0/inventory-ordering-portal/actions/workflows/tests.yml)

Each run has six jobs, and each one shows its own green ✓ or red ✗:

| Job | Tool (from the proposal) | What it checks | Tests |
|---|---|---|---|
| 1. Backend tests | Jest + Supertest | Business rules and every API endpoint: status codes, validation, role checks, search/sort/paging, security headers, XSS clean-up. The database is replaced with fakes, so the tests are fast and repeatable. | 151 |
| 2. Database tests | Jest + a real MariaDB | The real SQL: stock changes, rollback, people ordering at the same moment, approvals, search and paging, SQL injection attempts, hashed passwords, the audit log | 34 |
| 3. Browser tests | Cypress + axe-core | A real browser that logs in and clicks through the app like a user, plus WCAG checks on every page. **A video of every test is saved** (open the run → *Artifacts* → `cypress-videos`). | 36 |
| 4. Accessibility | Puppeteer + Lighthouse | Real Tab / Enter key presses through the app, and a Lighthouse accessibility score of 90 or more (reports saved as `lighthouse-reports`) | 11 checks |
| 5. Security scan | OWASP ZAP | Sends SQL injection, XSS and other attacks to every API endpoint (from `docs/openapi.yaml`). Fails on any High risk. Report saved as `zap-report` | 120+ rules |
| 6. Performance | Artillery | 20 users for 60 seconds, and 10 orders placed at the same moment. Checks response times, errors and that no stock is lost (reports saved as `performance-reports`) | 5 checks |

## Test plan coverage (proposal section 4)

Every test ID in the proposal is automated and passes on every push.

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
| API-05 | Search products by name or id (any upper/lower case) | `tests/api/products.test.js`, `tests/integration/listQuery.db.int.js` | ✅ |
| API-06 | Only an Admin can change roles | `tests/api/users.test.js` | ✅ |
| API-07 | Logout | `tests/api/auth.logout.test.js` | ✅ |
| API-08 | Password-reset token | `tests/api/auth.resetpassword.test.js` | ✅ |
| API-09, API-10 | Record a receipt (stock goes up) / view inventory | `tests/api/inventory.test.js` | ✅ |
| API-11 | Search orders by order number or date | `tests/api/orders.test.js`, `tests/integration/listQuery.db.int.js` | ✅ |
| API-12 | 25 per page, with the total in the `X-Total-Count` header | `tests/api/products.test.js`, `tests/integration/listQuery.db.int.js` | ✅ |
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
| FE-06 | The Admin assigns a role (Users page) | `client/cypress/e2e/users.cy.js` | ✅ |
| FE-07 | Search products by name | `client/cypress/e2e/search.cy.js` | ✅ |
| FE-08 | Sort products by price, ascending and descending | `client/cypress/e2e/search.cy.js` | ✅ |
| FE-09 | View and update your profile | `client/cypress/e2e/profile.cy.js` | ✅ |
| FE-10, FE-11 | Record a receipt / view inventory | `client/cypress/e2e/inventory.cy.js` | ✅ |
| FE-12 | Search orders by date (and by order number) | `client/cypress/e2e/search.cy.js` | ✅ |
| FE-13 | More than 25 products: pages and Previous / Next | `client/cypress/e2e/search.cy.js` | ✅ |
| FE-14 | Change password, then log in with the new one | `client/cypress/e2e/profile.cy.js` | ✅ |
| FE-15 | The Admin deactivates and reactivates an account | `client/cypress/e2e/users.cy.js` | ✅ |
| FE-16, FE-17 | Send a purchase request / a Manager approves it *(added)* | `client/cypress/e2e/requests.cy.js` | ✅ |

### Security tests (SEC, reqs 3.1.1 – 3.2.4)
| ID | What it checks | Where | Status |
|---|---|---|---|
| SEC-01 | SQL injection in the login, searches, ids and saved fields does nothing | `tests/integration/security.db.int.js` + OWASP ZAP (`security/zap-scan.sh`) | ✅ |
| SEC-02 | XSS: script tags are removed before saving | `tests/api/security.test.js`, `tests/integration/security.db.int.js` + OWASP ZAP | ✅ |
| SEC-03 | Every password in the database is a bcrypt hash, never sent back | `tests/integration/security.db.int.js` | ✅ |
| SEC-04 | Staff get 403 on every Manager / Admin endpoint; a changed token is refused | `tests/api/security.test.js` | ✅ |
| SEC-05 | Errors never show internal details (no stack traces, no SQL) | `tests/api/security.test.js` | ✅ |
| SEC-06 | Failed logins are logged with the time (and the user id when known) | `tests/integration/security.db.int.js` | ✅ |
| SEC-07 | Access-denied attempts are logged with user id, role and action | `tests/integration/security.db.int.js` | ✅ |

### Accessibility tests (A11Y, reqs 3.3.1 – 3.3.2)
| ID | What it checks | Where | Status |
|---|---|---|---|
| A11Y-01 | axe-core finds no WCAG 2.1 A/AA problem (contrast and more) on any page, form, message or the 403 page | `client/cypress/e2e/a11y.cy.js` | ✅ |
| A11Y-02 | Text at 200%, and the page zoomed to 200%: everything still fits and works | `client/cypress/e2e/a11y.cy.js` | ✅ |
| A11Y-03 | Keyboard only: log in, Tab reaches every control, visible focus, Enter opens and sends forms | `a11y/run-a11y.mjs` (real keys) + `client/cypress/e2e/a11y.cy.js` | ✅ |
| A11Y-04 | Lighthouse accessibility score ≥ 90 on dashboard, products and orders (currently 100) | `a11y/run-a11y.mjs` | ✅ |

### Performance tests (PERF, req 3.4.1)
| ID | What it checks | Where | Status |
|---|---|---|---|
| PERF-01 | 20 users for 60 seconds: no errors, 99% of answers under 2 seconds, no data lost | `perf/perf-01-load.yml`, `perf/run-perf.js` | ✅ |
| PERF-02 | 10 orders at the same moment on one product: every order is counted, stock is exactly right | `perf/perf-02-orders.yml`, `perf/run-perf.js` | ✅ |

## Running the tests yourself

```bash
npm test -- --verbose                  # 1. backend: lists every test by name
npm run test:db -- --verbose           # 2. real database: needs MariaDB running (settings in .env)
cd client && npx cypress open          # 3. browser: pick E2E → a browser → click a spec and watch it run
npm run test:a11y                      # 4. real keyboard + Lighthouse (needs Chrome/Chromium)
npm run test:security                  # 5. OWASP ZAP scan (needs Docker)
npm run test:perf                      # 6. Artillery load + concurrency
```

Tests 3 to 6 need the app running first (`npm run dev` and `cd client && npm run dev`) with the demo data (`npm run seed`). `npx cypress run` runs every browser test without a window.

The security and performance tests attack and load the server on purpose: run them only against a local or test copy, **never against the live site**.
