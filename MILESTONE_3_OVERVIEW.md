# Milestone 3: Search, Security, Accessibility and Performance

Version **v2.4.0**, live at https://inventoryorderingportal.cloud · branch `milestone-3`

This is the guide for the Milestone 3 meeting. It follows the four parts of the grading rubric: preparation, requirements, testing and code review.

---

## 1. Before the meeting (rubric: *Meeting Preparation*)

The rubric asks for three things to be **open and ready**: the coding environment, the testing environment and the Milestone requirements. Have all of this open 10 minutes before:

| Window | What to have open |
|---|---|
| VS Code | This repository, branch `milestone-3`, with this file open |
| Terminal 1 | The API: `source meeting-env.sh && npm run dev` |
| Terminal 2 | The website: `cd client && npm run dev`, which serves http://localhost:5173 |
| Terminal 3 | For running tests: `source meeting-env.sh`, then the commands in section 5 |
| Browser tab 1 | The requirements: the proposal document (`assets/Milestone_4_Juan_Naranjo-1 (2).docx`), sections 2.6, 3.1–3.4 and the test tables in section 4 |
| Browser tab 2 | [docs/TESTS.md on GitHub](https://github.com/Pedriux0/inventory-ordering-portal/blob/milestone-3/docs/TESTS.md), which maps every test ID to its file |
| Browser tab 3 | The latest green CI run: [GitHub Actions](https://github.com/Pedriux0/inventory-ordering-portal/actions/workflows/tests.yml), filtered to branch `milestone-3` |
| Browser tab 4 | The live site, https://inventoryorderingportal.cloud |
| Browser tab 5 | The local site, http://localhost:5173 (for the clicking demo) |

`meeting-env.sh` points the commands at the local test database (Docker, port 3307). Check that the database is running with `docker ps`; you should see `portal-test-db`. If it isn't, run `docker start portal-test-db`.

On the meeting morning the API and the website were already started in the background, with fresh demo data plus two orders placed by the Manager, so the order search has something to find. Check with `curl localhost:3000/api/health`. If that answers, **skip Terminals 1 and 2**: starting them again would fail with "port already in use". After a laptop restart, start them as in the table.

Demo logins (fake data):

| Role | Email | Password |
|---|---|---|
| Admin | admin@demo.com | DemoAdminPass2026 |
| Manager | manager@demo.com | DemoManagerPass2026 |
| Staff | staff@demo.com | DemoStaffPass2026 |

---

## 2. Scope: what Milestone 3 covers

From the proposal timeline:

| Week | Topic | Requirements | Tests |
|---|---|---|---|
| Wk 7 (Oct 26–30) | Search, sort, pages | 2.6.1 – 2.6.4 | API-05, API-11, API-12, FE-07, FE-08, FE-12, FE-13 |
| Wk 8 (Nov 2–6) | Security and logging | 3.1.1 – 3.1.4, 3.2.1 – 3.2.4 | SEC-01 – SEC-07 (OWASP ZAP) |
| Wk 9 (Nov 9–13) | Accessibility and performance | 3.3.1 – 3.3.2, 3.4.1 – 3.4.2 | A11Y-01 – A11Y-04 (axe-core, Lighthouse), PERF-01 – PERF-02 (Artillery) |

Also finished: the Milestone 1 **screens** that were still missing. The API behind them was already built and tested in Milestone 1:

| Screen | Tests |
|---|---|
| Users (Admin) | FE-06, FE-15 |
| Profile | FE-09, FE-14 |
| Access denied (403) | 3.1.4 / 3.2.1 |

---

## 3. Requirement coverage (rubric: *Requirements Met*)

| Req | What it says | How it is met | Tested by |
|---|---|---|---|
| 2.6.1 | Search products by name and ID | `?search=lamp` matches part of the name, any upper/lower case. `?search=12` or `#12` also matches product 12 | API-05, FE-07 |
| 2.6.2 | Search orders by ID and date | A number searches the order number, `YYYY-MM-DD` searches the date, anything else gets a clear 400 message | API-11, FE-12 |
| 2.6.3 | Sort products by name, price, stock | Click a column header: ascending, click again: descending | FE-08 |
| 2.6.4 | 25 per page | `?page=&limit=` (default 25, max 100). The total is sent in the `X-Total-Count` header, and the screens show "Showing 26-50 of 60" with Previous / Next | API-12, FE-13 |
| 3.1.1 | SQL injection | Every query uses `?` placeholders. Ids in URLs must be plain numbers. Sort columns come from a fixed list | SEC-01 + ZAP |
| 3.1.2 | XSS | Every text field has HTML tags removed before it is saved (passwords excepted). React also escapes everything it shows | SEC-02 + ZAP |
| 3.1.3 | Sensitive data protected in storage | Passwords are bcrypt hashes, reset tokens are SHA-256 hashes. The `.env` with secrets is readable only by root on the server | SEC-03 |
| 3.1.4 | Role-based access | `requireRole(...)` on every route. The website hides what your role can't use and shows the 403 page if you open it anyway | SEC-04, FE-06 |
| 3.2.1 | No internal details in errors | One error handler: the real error goes to the server log, the user gets a short generic message. Broken JSON → 400, too big → 413, unknown API address → 404 JSON | SEC-05 |
| 3.2.2 | Failed logins logged | `LOGIN_FAILED` row in `audit_logs`: time, and the user id when the email exists | SEC-06 |
| 3.2.3 | Access denied logged | `ACCESS_DENIED` row: user id, role and the action (`PUT /api/users/1/role`) | SEC-07 |
| 3.2.4 | Logs access-controlled, no stack traces shown | Logs are in the database (no endpoint reads them) and in the PM2 log under `/root` (root only) | SEC-05 |
| 3.3.1 | Color contrast and keyboard access | Text colors darkened to WCAG AA. Every control can be reached with Tab and shows a visible focus ring | A11Y-01, A11Y-03, A11Y-04 |
| 3.3.2 | Text at 200% | Layout reflows; long words wrap inside table cells | A11Y-02, A11Y-04 |
| 3.4.1 | Many users at once, no data loss | Transactions with row locks, plus automatic retry when the database reports a temporary conflict | PERF-01, PERF-02 |
| 3.4.2 | Relational database | MariaDB / MySQL | UT-09 |

**Result: every Milestone 3 requirement is met.**

---

## 4. Testing (rubric: *Testing Met and Automated*)

Every test case in the proposal is automated. Each push to GitHub runs **six jobs**, and each has its own green ✓:

| # | Job | Tool (from the proposal) | Count | Rehearsal time |
|---|---|---|---|---|
| 1 | Backend tests | Jest + Supertest | 151 | 3 s |
| 2 | Database tests | Jest + real MariaDB | 34 | 2 s |
| 3 | Browser tests | Cypress + axe-core | 36 | 1 min |
| 4 | Accessibility | Puppeteer (real keys) + Lighthouse | 11 checks | 1 min |
| 5 | Security scan | OWASP ZAP | 120 rules passed, 0 High | 3 min |
| 6 | Performance | Artillery | 5 checks | 1 min 15 s |

Saved on every run (open a run → **Artifacts**):
- `cypress-videos`: a video of every browser test.
- `zap-report`: the full security scan report.
- `lighthouse-reports`: the Lighthouse score pages.
- `performance-reports`: the Artillery results.

Results from the rehearsal on the meeting morning (all passed):

| Check | Result |
|---|---|
| Jest | 151 passed |
| Database tests | 34 passed |
| Cypress | 36 / 36 |
| Lighthouse accessibility | 100 on dashboard, products and orders |
| PERF-01 | 4,740 requests, 0 errors, 99% answered in under 14 ms, no data lost |
| PERF-02 | 10 orders at once: stock 100 − 10×3 = 70 ✓ |
| ZAP | High 0, Medium 0, Low 1 (explained in section 7) |

---

## 5. Demo script, step by step (about 15 minutes)

Before she joins (5 minutes):
- Start the ZAP attack scan in its own terminal: `source meeting-env.sh && npm run test:security`. It finishes in 3 minutes and you show the result later.
- In GitHub, start the live check: run `gh workflow run live-check.yml --ref milestone-3`, or press **Re-run all jobs** on its last run. It's done in about 2 minutes and ready to show.

**Step 1: Open with the plan (1 min)**

> *"Milestone 3 was weeks 7 to 9: search, sort and pages; security and logging; accessibility and performance. I'll show you the requirements, the features working, the tests running, the tests on GitHub, the tests on the live site, and then the code."*

**Step 2: Requirements (1 min).** Proposal tab: scroll through 2.6.1–2.6.4 and 3.1.1–3.4.2. Then `docs/TESTS.md`:

> *"Every test ID from the proposal is listed here with the file that tests it. All of them pass, and all of them are automated."*

**Step 3: The features, clicking (3 min).** Local site, http://localhost:5173:
1. **Staff → Products**:
   - Type `lamp`, press Enter. Point at the chip "Search: lamp · 1 found" and remove it with ×.
   - Type `#4` (search by id).
   - Click **Unit price** twice: lowest first, then highest first.
   > *"The database does the search, sort and paging, 25 per page."*
2. **Orders**:
   - Search today's date, then `1`.
   - Then `yesterday`: *"a clear message, not an error page."*
3. **Profile**: change the name, and show the top bar updating. Change it back.
4. **Admin → Users**: change a role, then deactivate and reactivate someone.
   > *"My own row is locked so I can't lock myself out."*
5. **Manager**: type `/users` in the address bar to get the 403 page.
   > *"The page is hidden from their menu, and the API refuses it too. The refusal is written to the audit log."*

**Step 4: The tests running in front of her (4 min).** Terminal 3:
1. `npm test -- --verbose`
   > *"151 tests in 3 seconds. Look at the names: SEC-04, API-05, API-12 are the IDs from my proposal."*
2. `npm run test:db -- --verbose`
   > *"These use a real database: real SQL injection attempts, bcrypt hashes checked, the failed-login and access-denied log rows checked."*
3. `cd client && npx cypress open` → E2E → Chrome → click **search.cy.js**. She watches the browser type and click by itself.
   > *"FE-07, FE-08, FE-12, FE-13."*

   Then click **a11y.cy.js**:
   > *"axe-core checks every page against WCAG 2.1 AA, then the text at 200%."*
4. `cd .. && npm run test:a11y`
   > *"Real Tab and Enter key presses, then Lighthouse: accessibility 100."*
5. `npm run test:perf`
   > *"20 users for a minute: no errors, and nothing lost. Then 10 orders at the same moment: the stock is exactly right."*
6. The ZAP terminal you started before: `High: 0 … PASS`.
   > *"OWASP ZAP sent SQL injection and XSS attacks to every endpoint; nothing High."*

**Step 5: The same tests on every push (1 min).** GitHub Actions → **Automated tests**, branch `milestone-3`:
> *"Every push runs these six jobs automatically on GitHub's servers, with a fresh database."*

Open **Artifacts** → `cypress-videos` → play one video.

**Step 6: The tests on the live site (1 min).** GitHub Actions → **Live site check**, the run you started before she joined:
> *"This tests the real site, inventoryorderingportal.cloud: 34 API checks, the keyboard and Lighthouse test, and a passive OWASP ZAP scan. These are only the tests that are safe on production; the ones that create data or attack the server only run on the throwaway copy."*

Then open https://inventoryorderingportal.cloud and search `lamp` there too.

**Step 7: Code walkthrough (as long as she wants).** Follow section 6. Open the file, say the one-line explanation from memory, then point at the line.

**Step 8: Close (30 s)**

> *"All Milestone 3 requirements are met, every test case in the proposal is automated and passing, on GitHub and on the live site. Version 2.4.0 is deployed."*

## 6. Code review: what to say (rubric: *Code Review*)

The rubric's top score needs you to explain the code *without reading it*. Learn the one-line explanation for each piece; the file:line reference is there so you can open it when she asks.

### Search, sort and pages (Week 7)

**Reading the query: `src/utils/listQuery.js`**

> *"The controller never trusts the URL. This file turns `page`/`limit` into numbers and checks them, and turns `#12` into 12."*

- `parsePaging` (line 9): no page → whole list; default 25, max 100; anything wrong → 400.
- `escapeLike` (line 31): makes `%` and `_` count as plain text, so a search for `50%` doesn't match everything.

**The SQL: `src/models/productModel.js:17` `findAll`**

> *"Search, sort and page all happen in the database, so it stays fast with thousands of products."*

- Line 23: `product_name LIKE ? OR product_id = ?`. The values always go in as `?`.
- Line 12: `SORT_COLUMNS`. A column name can't be a `?`, so the user picks a *key* (`price`) and the code maps it to the real column (`unit_price`). Anything else is refused with 400 (`productController.js:37`).
- Line 38: a second `COUNT(*)` query gives the total for the page controls.

**Orders: `src/controllers/orderController.js:32-36`**

> *"One search box: a number means order number, a date means order date, anything else gets a helpful message."*

**The website: `client/src/pages/Products.jsx`**
- Line 43 `handleSearch`: a new search goes back to page 1.
- Line 54 `handleSort`: clicking the same column flips the order.
- Line 29 `api.getPage`: reads `X-Total-Count`.
- `client/src/components/ui.jsx`:
  - `Pagination`: "Showing 26-50 of 60" + Previous / Next.
  - `SortHeader`: `aria-sort` tells screen readers the order.

### Security (Week 8)

**`src/app.js`: one line each, in order**

| Line | Code | What it does |
|---|---|---|
| 28 | `helmet()` | Security headers |
| 32 | `express.json({ limit: '100kb' })` | Refuses huge bodies |
| 34 | `sanitizeBody` | Removes HTML tags |
| 49 | JSON 404 for unknown `/api` addresses | Unknown API paths get a JSON error, not HTML |

**XSS: `src/middleware/sanitize.js:14` `stripTags`**

> *"Removes `<script>…</script>` with what's inside it, and any other tag. Passwords are skipped (line 20) so a password containing `<` still works."*

**Injection in ids: `src/middleware/validateId.js:7`**

> *"An id must be 1 to 10 digits, or it's a 404. Before this, `1 OR 1=1` was turned into the number 1 by MySQL and found product 1."*

This was found by the SEC-01 test.

**Roles: `src/middleware/auth.js:27` `requireRole`**

> *"Every protected route says which roles may use it, e.g. `routes/users.js:20` `requireRole('Admin')`. A refused attempt is written to `audit_logs` at line 35 (SEC-07)."*

**Failed logins: `src/controllers/authController.js:36`**

> *"`LOGIN_FAILED` with the time, and the user id when the email exists. The answer to the user is the same either way, so nobody can find out which emails exist."*

**Errors: `src/middleware/errorHandler.js`**

> *"The real error goes to `console.error` (line 15), which on the server is the PM2 log only root can read. The user only sees 'Something went wrong' (line 16)."*

### Concurrency and performance (Week 9)

**Retry on conflict: `src/utils/retry.js:17`**

> *"When two transactions touch the same row, the database sometimes says 'try again' (deadlock, or MariaDB's `ER_CHECKREAD`). We retry up to 5 times with a short random wait instead of failing."*

- `src/config/db.js` wraps every single query.
- The order, receipt and approval transactions are retried as a whole.

**How the retry was found**

> *"The ZAP scan, which hammers the API, caused 500 errors. The cause was these database conflicts, so the scan found a real bug."*

**Transactions (from Milestone 2)**

> *"An order locks the product rows with `SELECT … FOR UPDATE`, checks stock, and saves everything or nothing. PERF-02 proves it: 10 orders at once leave exactly the right stock."*

### The tests themselves

| Area | Test files | What to say |
|---|---|---|
| Backend | `tests/api/security.test.js` | SEC-04 loops over every Manager/Admin endpoint with a Staff token and expects 403 for all. It also checks that a changed token is refused, and that errors have no stack trace |
| Database | `tests/integration/security.db.int.js` | Real attacks against the real database. Injection in the login, search, id and fields; checks every password is a bcrypt hash; checks the log rows exist |
| Database | `tests/integration/listQuery.db.int.js` | Search, sort and pages on real data |
| Database | `tests/integration/concurrency.db.int.js` | 30 deliveries at the same moment, then checks the stock is exactly right |
| Browser | `client/cypress/e2e/search.cy.js` | FE-07/08/12/13. It creates its own 30 tagged products first, so it never depends on demo data |
| Browser | `users.cy.js`, `profile.cy.js` | FE-06/15 and FE-09/14. FE-14 logs in again with the new password and checks the old one is refused |
| Browser | `a11y.cy.js` | A11Y-01 runs axe-core on every page, form and message (`cypress/support/e2e.js:35` `checkPage`). A11Y-02 sets the text to 200% and a 640 px screen and checks nothing sticks out |
| Keyboard + Lighthouse | `a11y/run-a11y.mjs` | Real Tab and Enter key presses in a real Chrome, and Lighthouse ≥ 90 |
| Security scan | `security/zap-scan.sh` | Starts OWASP ZAP in Docker, gives it `docs/openapi.yaml` (every endpoint) and a login. It fails on any High finding |
| Performance | `perf/perf-01-load.yml`, `perf/perf-02-orders.yml`, `perf/run-perf.js` | The Artillery scenarios, plus a runner that also checks the database afterwards for lost data |

---

## 7. Questions you might get

**"Did ZAP find anything?"**

> *"No High or Medium. One Low: when ZAP asks the API for a page outside `/api`, Express answers with its default HTML 'Cannot GET' page instead of JSON. On the live site NGINX serves the website there, so the API never sees those requests. It's only a 404 either way."*

**"Did you ever have a failing security scan?"**

> *"Yes, twice:*
> - *The first scan caused 500 errors from database conflicts. That's why the retry exists.*
> - *A later scan reported SQL injection. The server logged no errors, and the stored values were plain text. ZAP was running several attacks at once on the same product, so the answers changed between requests and it mistook that for injection. I fixed the scan to attack one request at a time (`zap-scan.sh:52`) and kept every injection check switched on. The SEC-01 database tests prove the injection text is stored as plain text."*

**"The proposal says cypress-axe. Why not?"**

> *"cypress-axe doesn't support Cypress 16 yet. It's a small wrapper around axe-core, so I call axe-core directly with the same WCAG 2.1 A/AA rules (`cypress/support/e2e.js:35`)."*

**"Why is the keyboard test outside Cypress?"**

> *"Headless Cypress can't send real Tab key presses (the browser window never gets keyboard focus). So `run-a11y.mjs` uses Puppeteer with a real Chrome. Cypress still checks that every control is focusable and shows a focus ring."*

**"Why `LIMIT ${…}` in the SQL instead of `?`?"** (`orderModel.js:101`)

> *"MySQL's prepared statements don't accept `?` for LIMIT with `execute`. The value is a number already checked by `parsePaging`, so it can't contain text."*

**"Why does a wrong current password give 400 and not 401?"**

> *"401 means 'your login expired', and the website logs you out on a 401. A wrong current password is just a form error, so it's 400. Before this change it was logging people out."*

**"Is the data encrypted?"**

> *"Passwords and reset tokens are hashed (one-way), which is stronger than encryption for passwords. The site is HTTPS only. Secrets are in `.env`, readable only by root."*

**"Why didn't ZAP on the live site scan for injection?"**

> *"The live scan is passive: it only looks. Sending attack payloads to production would fill the real database with junk, so the attack scan runs on GitHub's throwaway copy of the same code. The live scan found no High risks. Its Medium warning is that NGINX doesn't add a Content-Security-Policy header to the website pages. The API answers already have it, and adding it to NGINX is my next step."*

**"Do the security and load tests run against the live site?"**

> *"Never. They attack on purpose, so they only run on GitHub's throwaway servers and on my local copy."*

---

## 8. If something goes wrong during the demo

| Problem | Fix |
|---|---|
| Login fails locally | Is the API terminal running? Run `curl localhost:3000/api/health`. Is the database up? Run `docker start portal-test-db` |
| Cypress won't start (`bad option: --ping`) | You forgot `source meeting-env.sh` (it removes `ELECTRON_RUN_AS_NODE`) |
| Cypress hangs on a screenshot | `npx cypress run --config screenshotOnRunFailure=false` |
| Demo data got messy | `docker exec portal-test-db mariadb -uroot -ptest_root -e "DROP DATABASE inventory_portal" && docker exec -i portal-test-db mariadb -uroot -ptest_root < db/schema.sql && npm run seed` |
| Anything else | Show the green GitHub Actions run and its videos: the same tests, already run |
