# Milestone 1 — Auth, Roles & Profile

What was built, why, and how each piece works. Written to support the Milestone 1
presentation: it maps every requirement in the proposal to the code that satisfies it.

## 1. Scope

Per the proposal timeline, Milestone 1 = **Week 2 (Auth & Sessions)** + **Week 3
(Accounts, Roles, Profile)**. That's requirements 2.1.1–2.1.5, 2.2.1–2.2.6, 2.3.1–2.3.4,
2.5.7, 3.2.2 and 3.2.3.

Stack: Express 5, MySQL/MariaDB via `mysql2`, `bcrypt` for password hashing,
`jsonwebtoken` for sessions, Jest + Supertest for tests. No frontend yet — this
milestone is backend only, tested with curl/Postman.

## 2. How a request flows through the app

```
request → route → [authenticate] → [requireRole] → controller → model → database
                        ↑                 ↑
                  "are you logged in?"  "are you allowed to do THIS?"
```

- **Routes** (`src/routes/`) just map a URL + method to a controller function.
- **Middleware** (`src/middleware/`) runs before the controller and can stop the
  request early (missing token, wrong role).
- **Controllers** (`src/controllers/`) hold the logic: validate input, decide what
  to do, decide the response.
- **Models** (`src/models/`) hold every SQL query. Controllers never write SQL
  directly.

This separation is why the tests can swap out the model layer with fakes and test
the logic without needing a real database for most cases.

## 3. The most important pieces

### `src/utils/password.js` — password rules & hashing
- `validatePassword()` enforces req 2.1.2: 16+ characters, upper, lower, digit.
  Returns a list of every rule broken, not just the first one.
- `hashPassword()` / `comparePassword()` wrap **bcrypt** (req 2.1.3). Bcrypt is
  deliberately slow and auto-salts, so two users with the same password get
  different hashes, and brute-forcing a stolen hash is expensive.
- Plain text passwords are **never** stored — only the 60-character hash.

### `src/utils/token.js` — sessions & password reset tokens
- `signToken()` builds the JWT returned at login. It carries only `userId` and
  `role`, signed with `JWT_SECRET` so it can't be edited by the client without
  detection.
- `generateResetToken()` (req 2.1.5) makes a random 32-byte token, hashes it with
  SHA-256, and sets a 1-hour expiry. Only the hash is stored in the database —
  same idea as password hashing, so a database leak can't be used to reset
  accounts.

### `src/middleware/auth.js` — who are you, and are you allowed?
- `authenticate` reads `Authorization: Bearer <token>`, verifies the JWT, and
  attaches `req.user = { userId, role }`. Rejects with 401 if missing/invalid/expired.
- `requireRole('Admin')` (req 2.2.3) checks `req.user.role` against an allow-list.
  On a mismatch it **logs the denial** to `audit_logs` (req 3.2.3) before
  returning 403. This is what makes Staff unable to reach admin-only routes
  (req 2.2.4).

### `src/controllers/authController.js` — login, logout, reset
- `login`: looks up the user, checks the account is active (req 2.3.4 depends on
  this), compares the password, and either returns a signed token or logs a
  `LOGIN_FAILED` audit entry (req 3.2.2) and returns 401. Unknown email and wrong
  password get the **same error message**, so the endpoint can't be used to find
  out which emails have accounts.
- `logout`: JWTs can't be revoked server-side without extra state, so this just
  confirms and logs the event (req 2.1.4) — the client discards its own token.
- `requestPasswordReset`: generates and stores a token if the email exists, but
  always answers the same way either way (req 2.1.5). **Not yet wired to send an
  email** — no mail server is set up, so this proves the token is generated and
  stored, matching the test plan's literal wording.

### `src/controllers/userController.js` — profile & admin account management
- Self-service (any logged-in role, reqs 2.3.1–2.3.3): view own profile, update
  name/email (validated), change password (must confirm the current one first).
- Admin-only (req 2.2.6, protected by `requireRole('Admin')`): create a user,
  view any account, change a role (req 2.5.7), activate/deactivate an account
  (req 2.3.4).
- Every response goes through `toPublicUser()`, which builds the response object
  from named fields — the password hash is never even selected from the database
  for these calls, let alone returned (req 2.2.2).

### `src/models/` — all the SQL, in one place
- Every query uses `?` placeholders with values passed separately — never string
  concatenation. That's what satisfies req 3.1.1 (SQL injection protection).
- `userModel.js` — all reads/writes on `users`.
- `auditLogModel.js` — `logEvent()`, used by login failures and access denials.

### `src/middleware/errorHandler.js` — hiding internal details
Last middleware in the chain. Any unhandled error (a database going down, a bug)
gets logged server-side only, and the client gets a generic
`"Something went wrong. Please try again later."` — never a stack trace or SQL
error (req 3.2.1, 3.2.4).

### `db/schema.sql` — database
All 7 tables from the ERD. Fixed during this milestone to match the ERD exactly
(`product_name`/`unit_price`/`current_stock` instead of the original
`name`/`price`/`stock_quantity`) and added NOT NULL / default constraints on
`users` that the original schema was missing. Added `reset_token_hash` and
`reset_token_expires` columns to support req 2.1.5 — this is the one addition
beyond the original ERD, needed because the proposal doesn't specify where the
reset token lives.

## 4. Requirement coverage

| Requirement | What it needs | Status |
|---|---|---|
| 2.1.1 | Login with unique username/password | Done — `POST /api/auth/login` |
| 2.1.2 | Password complexity rules | Done — `validatePassword()` |
| 2.1.3 | Hash & store passwords | Done — bcrypt |
| 2.1.4 | Logout / end session | Done — `POST /api/auth/logout` |
| 2.1.5 | Password reset via secure token | Partial — token generated & stored; not emailed (no mailer set up), and the "consume the token" endpoint isn't built yet |
| 2.2.1, 2.2.2 | Maintain accounts with required fields | Done |
| 2.2.3, 2.2.4 | Role-based access control | Done — `requireRole` |
| 2.2.5 | Manager supplier access | Deferred — no supplier endpoints exist yet (Week 6 per timeline) |
| 2.2.6 | Admin manages accounts | Done |
| 2.3.1–2.3.4 | View/update profile, change password, deactivate | Done |
| 2.5.7 | Admin assigns roles | Done |
| 3.1.1 | SQL injection protection | Done — parameterized queries everywhere |
| 3.1.3 | Encrypt sensitive data | Done — bcrypt for passwords, SHA-256 for reset tokens |
| 3.2.1, 3.2.4 | Hide internal errors from users | Done — `errorHandler.js` |
| 3.2.2 | Log failed logins | Done |
| 3.2.3 | Log authorization failures | Done |

## 5. Testing

- **38 automated tests, all passing** (`npm test`), across 6 test suites:
  password rules/hashing, auth middleware + role checks, login, logout,
  password reset, profile + admin account management.
- Models are mocked in these tests, so they run fast and don't need a live
  database — they test the logic (validation, status codes, what gets logged).
- Every new database query was **also verified against a real MariaDB database**
  in a separate smoke test, and the full flow (login → create user → RBAC block →
  role change → deactivate → blocked login → reset request → logout) was run
  end-to-end over real HTTP with curl, not just mocked.

## 6. What's not built yet

- **The password-reset "confirm" endpoint** — taking the token + new password and
  actually changing it. Only the "request a token" half is done.
- **Frontend** — everything above is backend only. No React app yet, so mockups
  1, 4 and 5 (login, profile, error page) have no UI behind them yet.
- **Products, orders, suppliers, search/sort/pagination** — these are later weeks
  per the timeline (Week 4 onward), not part of Milestone 1.
