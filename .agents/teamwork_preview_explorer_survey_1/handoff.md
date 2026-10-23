# Backend, Auth & Persistence Investigation Report: Madera Local (R1 & R2)

**Author**: `teamwork_preview_explorer_survey_1` (Explorer Survey 1: Backend, Auth & Persistence)  
**Date**: 2026-10-23  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_survey_1`  
**Target Codebase**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local`  
**Target Milestone**: 2026-10-23T00:40:10Z (R1 Authentication, Registration, Login, Google Sign-In, SQLite persistence, Sessions; and Backend support for R2 Projects & Demos)

---

## 1. Observation

### 1.1 Project Architecture & Dependencies
Direct inspection of `package.json` (`package.json:1-17`):
```json
{
  "name": "madera-local",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Réplica local de un diseñador 2D/3D de muebles modulares con módulos anidados y cutlist con precios",
  "scripts": {
    "start": "node server/server.js",
    "dev": "node --watch server/server.js",
    "test": "node --test test/*.test.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "three": "^0.170.0"
  }
}
```
Key architectural observations:
1. **Module System**: Pure ECMAScript Modules (`"type": "module"`). No transpiler, Babel, or Webpack/Vite bundler.
2. **Backend Framework**: Express 4.19.2.
3. **Database Driver**: Node.js built-in `DatabaseSync` from `node:sqlite` (`server/server.js:5`). No third-party native C++ compilation dependencies (e.g. `better-sqlite3` or `sqlite3`).
4. **Testing Framework**: Native Node.js test runner (`node --test`), assertions via `node:assert/strict`.

---

### 1.2 Current SQLite Database Schema and Initialization
From `server/server.js:12-34`:
```javascript
fs.mkdirSync(path.join(root, 'data'), { recursive: true });
const db = new DatabaseSync(path.join(root, 'data', 'madera.db'));
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`);
```
Observed limitations in database schema:
1. **`users` Table**:
   - Only columns: `id`, `email`, `salt`, `hash`.
   - `name` is completely absent.
   - `salt` and `hash` are marked `NOT NULL`. A user authenticating via Google OAuth does not have a local password/salt; inserting a Google user will fail unless dummy values are injected or the columns are altered.
   - No `google_id`, `avatar_url`, `auth_provider`, or `created_at` timestamp.
   - Existing DB file on disk (`data/madera.db`, 28,672 bytes) will NOT receive new columns from `CREATE TABLE IF NOT EXISTS`. An idempotent table migration (`ALTER TABLE users ADD COLUMN ...`) is necessary.
2. **`sessions` Table**:
   - Only columns: `token`, `user_id`, `created_at`.
   - No `expires_at` column. Database sessions never expire in SQLite, leading to infinite accumulation.
   - Foreign key constraints are not enforced (`PRAGMA foreign_keys = ON;` is never executed).
3. **`projects` Table**:
   - Only columns: `id`, `user_id`, `name`, `data`, `updated_at`.
   - Missing `created_at`, `description`, or preview/thumbnail columns.

---

### 1.3 Existing User Registration Implementation
From `server/server.js:71-84`:
```javascript
app.post('/api/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || password.length < 4) {
    return res.status(400).json({ error: 'Email y contraseña (mín. 4 caracteres) requeridos' });
  }
  const e = String(email).trim().toLowerCase();
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(e)) {
    return res.status(409).json({ error: 'Ese email ya está registrado' });
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const r = db.prepare('INSERT INTO users (email, salt, hash) VALUES (?, ?, ?)').run(e, salt, hashPw(password, salt));
  startSession(res, Number(r.lastInsertRowid));
  res.json({ email: e });
});
```
Observed limitations:
1. **Endpoint URL**: Mounted strictly at `POST /api/register`. The specification mandates `POST /api/auth/register`.
2. **Missing `name` validation**: R1 requires user registration requesting user name, email, and password. Currently, `name` is neither accepted nor saved.
3. **Validation Weakness**: Email is not validated for RFC 5322 structure; any non-empty string is accepted. Password minimum length is only 4 characters, with no upper bound (opening a potential scrypt CPU exhaustion DoS with huge strings).
4. **Blocking Hashing**: `crypto.scryptSync` is executed synchronously on the main Node event loop thread (`server/server.js:35`), which blocks all concurrent incoming requests during calculation.
5. **Return Payload**: Returns only `{ email: e }`, without user ID, name, or authentication token.

---

### 1.4 Existing User Login, Session Handling & Auth Middleware
From `server/server.js:35-64` and `86-103`:
```javascript
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function auth(req, res, next) {
  const token = parseCookies(req).session;
  if (token) {
    const row = db
      .prepare('SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
      .get(token);
    if (row) {
      req.user = row;
      return next();
    }
  }
  res.status(401).json({ error: 'No autenticado' });
}

function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, userId, Date.now());
  res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 90}`);
}

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase());
  if (!u || hashPw(String(password || ''), u.salt) !== u.hash) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  startSession(res, u.id);
  res.json({ email: u.email });
});

app.post('/api/logout', (req, res) => {
  const token = parseCookies(req).session;
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.setHeader('Set-Cookie', 'session=; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => res.json({ email: req.user.email }));
```
Observed limitations:
1. **Endpoint Paths**: Mounted at `/api/login`, `/api/logout`, `/api/me`. Specification mandates `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
2. **Timing Attack**: String equality `hashPw(...) !== u.hash` is vulnerable to character-by-character timing comparison leaks. `crypto.timingSafeEqual` should be used.
3. **Cookie-Only Auth**: `auth` middleware only extracts tokens from `req.headers.cookie`. Bearer tokens (`Authorization: Bearer <token>`) are ignored, impairing automated API testing and non-browser clients.
4. **Response Profiles**: `/api/me` returns `{ email: req.user.email }` instead of a full user profile (`{ id, name, email, avatar_url, provider }`).

---

### 1.5 Google Sign-In & OAuth Status
- **Current State**: Completely missing. Neither `server/server.js` nor `public/js/app.js` contains any OAuth route, Google client credentials handler, or mock provider.
- **Requirement**:
  - Direct Google Sign-In button on the login/register screen.
  - Production Google OAuth flow (redirect to Google, callback token exchange).
  - Robust local simulated OAuth provider for offline development without external credentials or internet connection.

---

### 1.6 Current Projects API & JSON Persistence (Backend Support for R2)
From `server/server.js:105-156`:
```javascript
app.get('/api/projects', auth, (req, res) => {
  res.json(
    db.prepare('SELECT id, name, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id)
  );
});

app.post('/api/projects', auth, (req, res) => {
  const { name, data } = req.body || {};
  const r = db
    .prepare('INSERT INTO projects (user_id, name, data, updated_at) VALUES (?, ?, ?, ?)')
    .run(req.user.id, name || 'Sin título', JSON.stringify(data || {}), Date.now());
  res.json({ id: Number(r.lastInsertRowid) });
});

const own = (req) =>
  db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);

app.get('/api/projects/:id', auth, (req, res) => {
  const p = own(req);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  res.json({ id: p.id, name: p.name, data: JSON.parse(p.data), updated_at: p.updated_at });
});

app.put('/api/projects/:id', auth, (req, res) => {
  const p = own(req);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  const { name, data } = req.body || {};
  db.prepare('UPDATE projects SET name = ?, data = ?, updated_at = ? WHERE id = ?').run(
    name ?? p.name,
    data ? JSON.stringify(data) : p.data,
    Date.now(),
    p.id
  );
  res.json({ ok: true });
});

app.post('/api/projects/:id/duplicate', auth, (req, res) => {
  const p = own(req);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  const r = db
    .prepare('INSERT INTO projects (user_id, name, data, updated_at) VALUES (?, ?, ?, ?)')
    .run(req.user.id, p.name + ' copy', p.data, Date.now());
  res.json({ id: Number(r.lastInsertRowid) });
});

app.delete('/api/projects/:id', auth, (req, res) => {
  const p = own(req);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(p.id);
  res.json({ ok: true });
});
```
Observed strengths & gaps:
- **Strengths**: Ownership check (`own(req)`) prevents IDOR (Insecure Direct Object Reference) vulnerabilities; users cannot view, edit, duplicate, or delete other users' projects. Prepared statements prevent SQL injection.
- **Gaps for R2**:
  1. The new dashboard (R2) introduces a **"Galería de Demos"** with 4 predesigned furniture models (Closet modular, Mesa de noche, Centro de TV, Mueble bajo de cocina) and an **"Importar archivo JSON"** button.
  2. The server currently has no dedicated endpoint for pre-designed demo templates (`GET /api/demos`), requiring the frontend to hardcode large JSON structures if not provided by backend.
  3. Projects list does not support pagination, metadata descriptions, or creation timestamps.
  4. Project creation does not validate whether `data` is a structurally sound furniture model object.

---

## 2. Logic Chain

### 2.1 Schema Evolution & Safe Auto-Migration
- **Premise**: `data/madera.db` already exists with tables created under the initial minimal schema (`users`: id, email, salt, hash; `sessions`: token, user_id, created_at; `projects`: id, user_id, name, data, updated_at).
- **Inference**: Executing `CREATE TABLE IF NOT EXISTS` does not modify existing table definitions in SQLite.
- **Deduction**: The server must perform idempotent migrations upon startup. By querying `PRAGMA table_info(tableName)`, missing columns can be identified and added using `ALTER TABLE tableName ADD COLUMN ...` without destroying existing development data.
- **Target Schema**:
  ```sql
  -- Users
  ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT 'Usuario';
  ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
  ALTER TABLE users ADD COLUMN avatar_url TEXT;
  ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'local';
  ALTER TABLE users ADD COLUMN created_at INTEGER DEFAULT 0;

  -- Sessions
  ALTER TABLE sessions ADD COLUMN expires_at INTEGER DEFAULT 0;

  -- Projects
  ALTER TABLE projects ADD COLUMN description TEXT DEFAULT '';
  ALTER TABLE projects ADD COLUMN thumbnail TEXT DEFAULT '';
  ALTER TABLE projects ADD COLUMN created_at INTEGER DEFAULT 0;
  ```

---

### 2.2 Secure User Registration & Input Validation Architecture
- **Premise**: User input from registration forms can be malformed, oversized, or malicious.
- **Step 1 (Name Validation)**: `name` must be a trimmed string between 2 and 100 characters. Reject empty or pure-whitespace names.
- **Step 2 (Email Validation)**: Normalize by trimming and converting to lowercase. Validate against standard email regex pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Reject emails exceeding 255 characters. Check unique existence via `SELECT id FROM users WHERE email = ?`.
- **Step 3 (Password Validation & Hashing)**: Enforce a minimum length of 6 (or 8) characters and cap at 128 characters (preventing DoS). Generate 16 bytes of cryptographically secure random salt (`crypto.randomBytes(16).toString('hex')`).
- **Step 4 (Async Password Hashing)**: Replace synchronous `crypto.scryptSync` with asynchronous `promisify(crypto.scrypt)` with standard parameters (`keylen: 64, cost: 16384, blockSize: 8, parallel: 1`). This executes the memory-hard KDF in Node's worker pool without blocking the Express event loop.
- **Step 5 (Dual Routing & Response)**: Support both `POST /api/auth/register` and `POST /api/register`. Set HTTP-only session cookie and return `{ user: { id, name, email, provider, avatar_url }, token }` with status `201 Created`.

---

### 2.3 User Login & Session Cookie/Token Mechanics
- **Premise**: Insecure password comparison allows timing attacks, and cookie-only authentication prevents non-browser API integration.
- **Step 1 (Lookup)**: Fetch user by normalized lowercase email. If user does not exist or has `provider === 'google'` (and no password hash set), return `401 Unauthorized` with a generic, safe error message ("Credenciales incorrectas" or "Esta cuenta utiliza Google Sign-In").
- **Step 2 (Timing-Safe Comparison)**: Hash candidate password with user's stored salt using scrypt. Compare the candidate hash and stored hash using `crypto.timingSafeEqual(Buffer.from(candidateHash, 'hex'), Buffer.from(storedHash, 'hex'))`.
- **Step 3 (Session Issuance)**: Generate 32 bytes of secure random hex (`crypto.randomBytes(32).toString('hex')`). Compute `expires_at = Date.now() + (90 * 24 * 60 * 60 * 1000)` (90 days). Insert into `sessions`.
- **Step 4 (Set-Cookie)**: Set cookie header: `session=<token>; HttpOnly; Path=/; SameSite=Lax; Max-Age=7776000` (append `; Secure` if `req.secure` or `NODE_ENV === 'production'`).
- **Step 5 (Dual Auth Middleware)**: Auth middleware extracts token from either:
  1. `req.headers.cookie` (`parseCookies(req).session`), OR
  2. `req.headers.authorization` (`req.headers.authorization.replace(/^Bearer\s+/i, '')`).
  Query verifies that token exists and `expires_at > Date.now()` (or fallback to `created_at` window). Attaches user record to `req.user`.

---

### 2.4 Google Sign-In: Dual-Mode Architecture (Real OAuth & Offline Simulated Provider)
- **Premise**: Development and testing often take place offline or without pre-configured Google Cloud Console OAuth credentials. However, the application must provide an authentic Google Sign-In user experience without breaking.
- **Deduction**: Implement an adaptive Google Auth service that detects environment configuration:
  `const HAS_REAL_GOOGLE = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);`
- **Path A — Real Google OAuth 2.0**:
  1. `GET /api/auth/google`: Generates CSRF state token, redirects to Google Auth endpoint:
     `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=openid%20email%20profile&state=${state}`
  2. `GET /api/auth/google/callback`: Receives `code`. Exchanges code at `https://oauth2.googleapis.com/token`. Fetches user profile from `https://www.googleapis.com/oauth2/v3/userinfo` (`{ sub, email, name, picture }`).
  3. Upsert user into SQLite with `provider = 'google'`, `google_id = sub`, `avatar_url = picture`.
  4. Issue session and redirect to `/#/`.
- **Path B — Robust Local Simulated OAuth Provider (Default for Offline / Dev)**:
  1. `GET /api/auth/google`: When real credentials are not detected (or query parameter `?simulated=1` is passed), serves a realistic Google Account Chooser dialog or redirects to a local mock consent screen (`/auth-google-simulated.html` or direct JSON/HTML handler).
  2. Pre-configured mock profiles available:
     - Profile 1: **"Ana García"** (`ana.garcia.madera@gmail.com`, avatar: simulated Google profile badge).
     - Profile 2: **"Carlos Diseñador"** (`carlos.muebles@gmail.com`, avatar: simulated Google profile badge).
     - Custom input: Option to type any Google name/email.
  3. Upon account selection, submits to `POST /api/auth/google/mock` (or `GET /api/auth/google/callback?simulated=1&account=...`).
  4. Server creates/updates the simulated user in SQLite with `provider = 'google'` and `google_id = 'mock-google-' + hash(email)`.
  5. Session is generated, cookie is attached, and the user is redirected to the dashboard.
  6. **Zero-Configuration Benefit**: Tests and human evaluators can click "Iniciar sesión con Google" and immediately enter the authenticated dashboard with a functional user session without touching external API keys.

---

### 2.5 REST API Specifications Matrix

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` (alias `/api/register`) | No | Registers new user with `{ name, email, password }`. Returns `{ user, token }`. Sets session cookie. |
| `POST` | `/api/auth/login` (alias `/api/login`) | No | Authenticates local user with `{ email, password }`. Returns `{ user, token }`. Sets session cookie. |
| `GET` | `/api/auth/google` | No | Initiates Google Sign-In. Redirects to Google OAuth or to Local Simulated Account Chooser. |
| `GET` | `/api/auth/google/callback` | No | Handles OAuth callback or simulated callback. Sets session cookie and redirects to `/#/`. |
| `POST` | `/api/auth/google/mock` | No | Programmatic endpoint for simulated Google sign-in. Accepts `{ name, email, google_id }`. Returns `{ user, token }`. |
| `POST` | `/api/auth/logout` (alias `/api/logout`) | Optional | Deletes session token from SQLite, clears session cookie (`Max-Age=0`). |
| `GET` | `/api/auth/me` (alias `/api/me`) | Yes | Returns authenticated profile `{ user: { id, name, email, avatar_url, provider, created_at } }`. |
| `GET` | `/api/projects` | Yes | Returns all projects for current user: `[ { id, name, description, updated_at, created_at } ]`. |
| `POST` | `/api/projects` | Yes | Creates new project with `{ name, data, description }`. Returns `{ id, name, updated_at }`. |
| `GET` | `/api/projects/:id` | Yes | Retrieves user's project by ID. Returns `{ id, name, description, data, updated_at, created_at }`. |
| `PUT` | `/api/projects/:id` | Yes | Updates name, description, or data. Sets `updated_at = Date.now()`. |
| `POST` | `/api/projects/:id/duplicate` | Yes | Clones project with `' (copia)'` suffix for current user. Returns `{ id }`. |
| `DELETE` | `/api/projects/:id` | Yes | Deletes project owned by current user. Returns `{ ok: true }`. |
| `GET` | `/api/demos` | No/Yes | Returns the 4 pre-designed demo models for the R2 Galería de Demos. |
| `POST` | `/api/demos/:slug/clone` | Yes | Clones a demo model into the user's projects and returns `{ id }`. |

---

## 3. Caveats

1. **Node.js Experimental SQLite API**:
   `DatabaseSync` from `node:sqlite` requires Node.js v22.5.0+. Because this project is built on Node 22, it is natively supported, but developers running older Node versions (v20 or earlier) will encounter `MODULE_NOT_FOUND`.
2. **Synchronous DB API vs Event Loop**:
   `node:sqlite` `DatabaseSync` is synchronous. For standard local workloads and test suites, this is fast (in-memory or fast local disk operations take < 0.2ms). However, long queries or write locks in high concurrency could block the event loop. Keeping SQLite statements prepared (`db.prepare(...)`) minimizes compile overhead.
3. **Password Hashing Computational Cost in Tests**:
   Scrypt is intentionally CPU-intensive. When running hundreds of test iterations, setting lower scrypt cost parameters during testing (`cost: 1024` instead of `16384` when `process.env.NODE_ENV === 'test'`) accelerates unit and integration test runs by 10x without compromising architecture.
4. **Existing Client Path Aliases**:
   Existing frontend code in `public/js/app.js` currently calls `/api/login`, `/api/register`, `/api/logout`, `/api/me`. To prevent breaking changes during the transition to R1/R2, both `/api/auth/*` and legacy `/api/*` routes must be supported concurrently.

---

## 4. Conclusion

The current backend provides a functional baseline for minimal local email/password login and basic project CRUD, but requires structural enhancements to satisfy the R1 and R2 specifications:

1. **Authentication (R1)**:
   - Add `name` field to registration with validation (2-100 characters).
   - Upgrade password hashing to async scrypt with `crypto.timingSafeEqual` comparison.
   - Implement dual-mode Google Sign-In with an offline Simulated Google Account Provider so the feature works out-of-the-box without Google Cloud Console credentials.
   - Provide standard `/api/auth/*` endpoints while maintaining backward-compatible `/api/*` aliases.
   - Enhance auth middleware to accept both `session` cookie and `Authorization: Bearer <token>` headers.
2. **Persistence & Database (R1 & R2)**:
   - Implement auto-migration logic to upgrade `users`, `sessions`, and `projects` tables in `data/madera.db` without data loss.
   - Enforce SQLite foreign keys with `PRAGMA foreign_keys = ON;`.
3. **Projects & Demos API (R2)**:
   - Support project cloning, import/export JSON validation, and a dedicated demos endpoint (`GET /api/demos`) providing the 4 predesigned furniture models (Closet modular, Mesa de noche, Centro de TV, Mueble bajo de cocina).

---

## 5. Verification Method

To independently verify the backend, authentication, and persistence architecture, downstream implementers and auditors should execute the following test commands and inspect the specified artifacts:

### 5.1 Verification Commands
1. **Server Startup**:
   ```powershell
   node server/server.js
   ```
   *Expected result*: Server starts on `http://localhost:3000` and outputs auto-migration status for SQLite tables without crashing.

2. **Automated Integration Test Suite**:
   Create and execute `test/auth_and_persistence.test.js`:
   ```powershell
   node --test test/auth_and_persistence.test.js
   ```
   *Test coverage must include*:
   - Registration validation: rejects missing name, invalid email, short password (<6 chars), duplicate email.
   - Successful registration: returns user profile and sets `session` cookie.
   - Local login: validates timing-safe scrypt comparison; rejects invalid passwords; returns token.
   - Session management: verifies protected `/api/auth/me` with both cookie and `Authorization: Bearer` header.
   - Simulated Google OAuth: verifies `GET /api/auth/google` (simulated mode) and `POST /api/auth/google/mock` creates user with `provider = 'google'` and issues valid session.
   - Project CRUD: verifies create, list, get, update, duplicate, and delete operations, as well as IDOR isolation between distinct users.
   - Demo catalog: verifies `GET /api/demos` returns the 4 mandatory preconfigured furniture templates.

3. **Database Schema Verification**:
   Verify column presence in SQLite:
   ```javascript
   // In a verification script or test:
   const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
   assert.ok(cols.includes('name'));
   assert.ok(cols.includes('google_id'));
   assert.ok(cols.includes('provider'));
   ```

### 5.2 Invalidation Conditions
The backend architecture shall be considered non-compliant if:
- Google Sign-In requires active internet connection or fails when `GOOGLE_CLIENT_ID` is absent.
- Registration allows saving users without a validated `name`.
- Legacy endpoints (`/api/login`, `/api/projects`) break existing frontend components.
- Existing records in `data/madera.db` are deleted or inaccessible after server schema upgrades.
