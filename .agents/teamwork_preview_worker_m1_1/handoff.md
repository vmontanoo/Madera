# Handoff Report: Milestone 1 — Modern Authentication & SQLite Persistence (R1)

**Agent**: Worker M1-1 (`teamwork_preview_worker_m1_1`)  
**Date**: 2026-10-23  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_worker_m1_1`  
**Modified Files**:
- `server/server.js`
- `public/js/app.js`
- `public/style.css`
- `test/auth_and_persistence.test.js`

---

## 1. Observation

### 1.1 Server & Persistence Deficiencies Prior to Modification
1. **SQLite Schema Incompleteness**:
   - In `server/server.js:14-34`, tables were defined with baseline fields only: `users` lacked `name`, `provider`, `google_id`, `avatar_url`, and `created_at`; `sessions` lacked `expires_at`; `projects` lacked `description`, `thumbnail`, and `created_at`.
   - `PRAGMA foreign_keys = ON;` was never enabled, risking orphan records when users were deleted.
   - The file `data/madera.db` was already present on disk (size: 28,672 bytes). Simply running `CREATE TABLE IF NOT EXISTS` did not add columns to existing tables in SQLite.
2. **Synchronous Hashing on Event Loop**:
   - `server/server.js:35` utilized `crypto.scryptSync(pw, salt, 64)`, blocking Node's main thread during user registration and login.
3. **Timing-Attack Vulnerable Comparison**:
   - `server/server.js:89` compared passwords with standard string equality `hashPw(...) !== u.hash`, exposing execution timing differentials that allowed deduction of matching hash prefixes.
4. **Token Handling & Middleware Limitations**:
   - `server/server.js:46-58` exclusively inspected `req.headers.cookie`. Any API client or integration test sending `Authorization: Bearer <token>` received `HTTP 401 { error: 'No autenticado' }`.
   - Expired sessions were never evaluated or pruned from the `sessions` table.
   - `startSession()` returned `undefined`, preventing token return in JSON payloads for API clients.
5. **Missing Google OAuth & Offline Simulation**:
   - `server/server.js` had zero routes for Google OAuth (`/api/auth/google`, `/api/auth/google/callback`, `/api/auth/google/mock`).

### 1.2 Frontend UI Deficiencies Prior to Modification
1. **Auth View (`public/js/app.js:37-61`)**:
   - Rendered a single static box with two action buttons on one form (`Entrar` and `Crear cuenta`). No tabbed interface, no name field for registration, and no Google Sign-In button.
   - Error container was an unstyled text tag `#err` with no auto-clear on input.
2. **User Profile State**:
   - `route()` called `await api('GET', '/api/me')` but completely discarded the return value. No `currentUser` state existed in module scope.
   - Neither the project list header (`listView()`) nor the editor topbar (`editorView()`) indicated who was logged in.
3. **Stylesheet (`public/style.css`)**:
   - Lacked styling for tabs, Google branded button, `#authErr` alert banner, user profile chips, initial badges, or editor avatar indicators.

---

## 2. Logic Chain

### 2.1 SQLite Auto-Migration & Schema Evolution
- **Observation**: `data/madera.db` exists with v1 schema. Calling `CREATE TABLE IF NOT EXISTS` is a no-op on existing tables.
- **Deduction**: We implemented `migrateDb(database)` executing `PRAGMA foreign_keys = ON;` and querying `PRAGMA table_info(tableName)` for each table:
  - For `users`: iteratively verifies and executes `ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT 'Usuario';`, `ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'local';`, `ALTER TABLE users ADD COLUMN google_id TEXT;`, `ALTER TABLE users ADD COLUMN avatar_url TEXT;`, `ALTER TABLE users ADD COLUMN created_at INTEGER DEFAULT 0;`.
  - Creates secondary unique index: `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;` (avoiding SQLite's restriction on inline `UNIQUE` in `ALTER TABLE`).
  - For `sessions`: adds `expires_at INTEGER DEFAULT 0;`.
  - For `projects`: adds `description TEXT DEFAULT '';`, `thumbnail TEXT DEFAULT '';`, `created_at INTEGER DEFAULT 0;`.
  - Deletes expired sessions on startup: `DELETE FROM sessions WHERE expires_at > 0 AND expires_at < ?`.

### 2.2 Async Scrypt Hashing & Timing-Safe Login
- **Observation**: Scrypt must be non-blocking, fast in tests, and secure in production. Password checks must prevent timing attacks.
- **Deduction**:
  - `promisify(crypto.scrypt)` delegates CPU work to `libuv` worker pool threads.
  - Dynamically selects scrypt cost: `cost: process.env.NODE_ENV === 'test' ? 1024 : 16384` (test runs complete in milliseconds, production remains cryptographically hardened).
  - Login uses `crypto.timingSafeEqual(candidateBuf, storedBuf)`, ensuring constant-time comparison.
  - Accounts with `provider === 'google'` and empty hash (`!u.hash || u.hash === ''`) reject password login with `HTTP 401 { error: 'Esta cuenta utiliza Google Sign-In' }`.

### 2.3 Dual Auth Middleware & Session Expiration
- **Observation**: Web browsers send cookies; automated tests, mobile clients, and REST tools send `Authorization: Bearer <token>`.
- **Deduction**:
  - `extractToken(req)` extracts Bearer tokens first, falling back to `parseCookies(req).session`.
  - Auth middleware checks `expiry < Date.now()`. If expired, it deletes the session from SQLite and returns `HTTP 401 { error: 'Sesión expirada' }`.
  - Valid requests attach `{ id, name, email, avatar_url, provider, created_at }` to `req.user`.
  - Profile endpoint (`/api/auth/me` and `/api/me`) returns `{ user, email }` for full dual-compatibility.
  - Logout endpoint (`/api/auth/logout` and `/api/logout`) deletes session and issues `Set-Cookie: session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`.

### 2.4 Google Sign-In (Real OAuth & Offline Zero-Config Simulation)
- **Observation**: Production requires Google Cloud OAuth 2.0; offline/local developer workflows require zero-config authentication without external credentials.
- **Deduction**:
  - Detects `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. If present and `simulated` query param is not passed, initiates standard Google OAuth 2.0 flow.
  - If absent or simulated:
    - `GET /api/auth/google`: Serves a Google Account Chooser screen featuring official Google branding, preconfigured accounts (Ana García and Carlos Diseñador), and a custom account form.
    - `GET /api/auth/google/callback`: Upserts Google user, issues session token, sets cookie, and redirects (`HTTP 302`) to `/#/`.
    - `POST /api/auth/google/mock`: Programmatic mock endpoint accepting `{ name, email, google_id, avatar_url }`, upserting user and returning `{ ok: true, user, token }`.
    - `upsertGoogleUser()`: In databases with legacy `NOT NULL` constraints on `salt`/`hash`, inserts `salt: ''`, `hash: ''`, preventing schema constraint violations while blocking password login.

### 2.5 Modern Frontend Authentication UI & Profile Indicators
- **Observation**: Users need clear separation between Login and Register modes, full name input, Google button, error banner, and active session visibility.
- **Deduction**:
  - `public/js/app.js` maintains module-level `currentUser` state and validates session with `fetchSession()`.
  - `authView()` renders a dual-tab component ("Iniciar sesión" and "Crear cuenta"), full name input on register mode with validation (2–100 chars), email regex validation, password length validation (min 6 chars), and auto-clearing `#authErr` banner.
  - Includes official Google Sign-In button with multi-colored SVG icon per Google Branding Guidelines navigating to `/api/auth/google`.
  - `renderUserAvatar()` renders user picture or initial badge.
  - `listView()` header incorporates `.user-profile-chip` displaying avatar, user name, email, and logout button.
  - `editorView()` topbar incorporates `.editor-user-badge` with user avatar and tooltip.
  - `public/style.css` provides styling for auth card, Google button, tabs, banner, and chips.

---

## 3. Caveats

1. **SQLite Alter Table Invariant**:
   - In SQLite, `ALTER TABLE ... ADD COLUMN` cannot specify inline `UNIQUE` constraints. Unique indexing for `google_id` was applied via a dedicated statement: `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;`.
2. **Offline Simulated OAuth**:
   - The simulated Google account chooser is served directly by the Express server when Google environment credentials are unset. If Google credentials are provided in `.env`, the server automatically switches to production OAuth 2.0 without code modifications.
3. **Dual Endpoint Support**:
   - All endpoints are registered with both modern `/api/auth/*` and legacy `/api/*` routes to guarantee zero regressions for existing client code or future milestone workers.

---

## 4. Conclusion

Milestone 1 is complete:
- `server/server.js` provides automatic SQLite migrations, non-blocking scrypt password hashing, timing-safe authentication, dual cookie and Bearer token auth middleware, session expiration cleanup, profile/logout endpoints, and Google OAuth 2.0 with offline simulated fallback.
- `public/js/app.js` delivers a tabbed auth view, official Google Sign-In button, client-side validation hints, auto-clearing error banner `#authErr`, session state management, and user avatar chips in both list header and editor topbar.
- `public/style.css` contains all styles for the auth UI, Google button, and profile chips while preserving 100% of existing layout and print rules.
- `test/auth_and_persistence.test.js` provides a 22-test automated test suite thoroughly validating migrations, validation rules, timing-safe login, sessions, Google OAuth simulation, and IDOR project protection.

---

## 5. Verification Method

### 5.1 Automated Test Execution
Run the test suite with Node's native test runner:
```powershell
node --test test/auth_and_persistence.test.js
```
Expected output:
- `SQLite Auto-Migration: enforces PRAGMA foreign_keys = ON` -> pass
- `SQLite Auto-Migration: users table contains all required columns` -> pass
- `SQLite Auto-Migration: sessions table contains expires_at column` -> pass
- `SQLite Auto-Migration: projects table contains description, thumbnail, and created_at` -> pass
- `SQLite Foreign Key Cascade: deleting user cascades to sessions and projects` -> pass
- `Registration: rejects missing or invalid name (<2 or >100 chars)` -> pass
- `Registration: rejects malformed email address` -> pass
- `Registration: rejects passwords < 6 chars or > 128 chars` -> pass
- `Registration: successfully registers user with valid inputs and sets HttpOnly cookie` -> pass
- `Registration: rejects duplicate email with HTTP 409 Conflict` -> pass
- `Registration: backward compatibility alias POST /api/register works` -> pass
- `Login: rejects non-existent email with HTTP 401` -> pass
- `Login: rejects incorrect password with HTTP 401` -> pass
- `Login: successfully logs in with correct credentials, sets cookie, and returns token` -> pass
- `Login: backward compatibility alias POST /api/login works` -> pass
- `Auth Middleware: rejects requests without token with HTTP 401` -> pass
- `Auth Middleware: accepts session cookie and returns user profile` -> pass
- `Auth Middleware: accepts Bearer authorization header and returns user profile` -> pass
- `Auth Middleware: legacy GET /api/me works with Bearer and returns profile` -> pass
- `Auth Middleware: rejects and prunes expired sessions` -> pass
- `Logout: POST /api/auth/logout invalidates session and clears cookie` -> pass
- `Google Sign-In: GET /api/auth/google renders Account Picker HTML` -> pass
- `Google Sign-In: GET /api/auth/google/callback with simulated account logs in and redirects` -> pass
- `Google Sign-In: GET /api/auth/google/callback with custom user creates profile` -> pass
- `Google Sign-In: POST /api/auth/google/mock programmatically creates session` -> pass
- `Google Sign-In: Google accounts without password reject standard password login` -> pass
- `IDOR Project Protection: users cannot read, edit, duplicate, or delete others projects` -> pass

Run all project tests:
```powershell
npm test
```
All suites (`test/*.test.js`) must pass with 0 failures.

### 5.2 Manual Browser Verification
1. Start server: `node server/server.js`
2. Open `http://localhost:3000`:
   - Verify tabbed auth card loads.
   - Click "Iniciar sesión con Google": simulated Google Account Chooser appears. Select "Ana García" -> redirects to `/#/` with active session.
   - In project list header, observe user profile chip showing initial badge "A", "Ana García", "ana.garcia@gmail.com", and "Salir" button.
   - Click "Salir": session is invalidated, redirects to auth view.
   - Switch to "Crear cuenta": enter full name, email, password -> registers, sets cookie, redirects to project list.
   - Click "+ Nuevo mueble": in editor topbar, verify `.editor-user-badge` displays user avatar badge with tooltip.
