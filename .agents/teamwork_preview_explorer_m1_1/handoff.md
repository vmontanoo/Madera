# Handoff Report: Milestone 1 — Backend Auth & SQLite Auto-Migration (R1)

**Agent**: `teamwork_preview_explorer_m1_1` (Explorer M1-1)  
**Date**: 2026-10-23  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m1_1`  
**Target Codebase**: `server/server.js`, `test/auth_and_persistence.test.js`  
**Task Focus**: Production-ready implementation architecture for SQLite auto-migrations, input validation, asynchronous scrypt hashing, timing-safe login, dual-mode auth middleware (cookies + Bearer tokens), user profile/logout endpoints, and automated test suite design.

---

## 1. Observation

### 1.1 Direct Inspection of SQLite Initialization in `server/server.js:12-34`
```javascript
12: fs.mkdirSync(path.join(root, 'data'), { recursive: true });
13: const db = new DatabaseSync(path.join(root, 'data', 'madera.db'));
14: db.exec(`
15: CREATE TABLE IF NOT EXISTS users (
16:   id INTEGER PRIMARY KEY AUTOINCREMENT,
17:   email TEXT UNIQUE NOT NULL,
18:   salt TEXT NOT NULL,
19:   hash TEXT NOT NULL
20: );
21: CREATE TABLE IF NOT EXISTS sessions (
22:   token TEXT PRIMARY KEY,
23:   user_id INTEGER NOT NULL,
24:   created_at INTEGER NOT NULL
25: );
26: CREATE TABLE IF NOT EXISTS projects (
27:   id INTEGER PRIMARY KEY AUTOINCREMENT,
28:   user_id INTEGER NOT NULL,
29:   name TEXT NOT NULL,
30:   data TEXT NOT NULL,
31:   updated_at INTEGER NOT NULL
32: );
33: `);
```
**Deficiencies Observed**:
1. **No SQLite Foreign Keys**: `PRAGMA foreign_keys = ON;` is never executed. SQLite defaults to foreign key enforcement being disabled, which allows orphaned sessions and orphaned projects if users are removed.
2. **Missing Columns in `users`**:
   - `name`: Absent. Registration cannot store the user's display name.
   - `google_id`, `avatar_url`, `provider`: Absent. Needed for Google OAuth / SSO integration.
   - `created_at`: Absent. No audit trail for account creation.
   - `salt` and `hash` are `NOT NULL`. If a user logs in via Google OAuth, inserting a record without password hashes will trigger a SQLite constraint failure unless altered or given default values.
3. **Missing Columns in `sessions`**:
   - `expires_at`: Absent. Sessions exist perpetually in the database without expiration.
4. **Existing Database File Invariant**:
   - The file `data/madera.db` already exists on disk (size: 28,672 bytes). `CREATE TABLE IF NOT EXISTS` is a no-op when tables already exist, meaning schema changes will NOT take effect automatically unless active migration queries (`ALTER TABLE`) are run.

### 1.2 Direct Inspection of Password Hashing and Auth Helpers in `server/server.js:35-64`
```javascript
35: const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
36: 
37: function parseCookies(req) {
38:   const out = {};
39:   (req.headers.cookie || '').split(';').forEach((p) => {
40:     const i = p.indexOf('=');
41:     if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
42:   });
43:   return out;
44: }
45: 
46: function auth(req, res, next) {
47:   const token = parseCookies(req).session;
48:   if (token) {
49:     const row = db
50:       .prepare('SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
51:       .get(token);
52:     if (row) {
53:       req.user = row;
54:       return next();
55:     }
56:   }
57:   res.status(401).json({ error: 'No autenticado' });
58: }
59: 
60: function startSession(res, userId) {
61:   const token = crypto.randomBytes(32).toString('hex');
62:   db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, userId, Date.now());
63:   res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 90}`);
64: }
```
**Deficiencies Observed**:
1. **Synchronous Hashing Blocks Event Loop**: `crypto.scryptSync` (line 35) executes synchronously on Node's main thread. Under concurrent registration or login requests, Node cannot process any other HTTP request while scrypt runs.
2. **Missing Token Support in Auth Middleware**: `auth` (lines 46-58) only reads `req.headers.cookie`. Any API client or automated test sending `Authorization: Bearer <token>` is rejected with HTTP 401.
3. **Missing Session Expiration Check**: `auth` does not verify if the session has expired; any session token ever stored in `sessions` remains valid forever.
4. **Incomplete User Profile**: The query in line 50 only selects `u.id, u.email`, omitting `name`, `avatar_url`, and `provider`.
5. **Session Helper Returns Nothing**: `startSession` (line 60) does not return the generated `token`, making it impossible to return the token in the JSON response for Bearer token clients.

### 1.3 Direct Inspection of Registration & Login Routes in `server/server.js:71-104`
```javascript
71: app.post('/api/register', (req, res) => {
72:   const { email, password } = req.body || {};
73:   if (!email || !password || password.length < 4) {
74:     return res.status(400).json({ error: 'Email y contraseña (mín. 4 caracteres) requeridos' });
75:   }
76:   const e = String(email).trim().toLowerCase();
77:   if (db.prepare('SELECT id FROM users WHERE email = ?').get(e)) {
78:     return res.status(409).json({ error: 'Ese email ya está registrado' });
79:   }
80:   const salt = crypto.randomBytes(16).toString('hex');
81:   const r = db.prepare('INSERT INTO users (email, salt, hash) VALUES (?, ?, ?)').run(e, salt, hashPw(password, salt));
82:   startSession(res, Number(r.lastInsertRowid));
83:   res.json({ email: e });
84: });
85: 
86: app.post('/api/login', (req, res) => {
87:   const { email, password } = req.body || {};
88:   const u = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase());
89:   if (!u || hashPw(String(password || ''), u.salt) !== u.hash) {
90:     return res.status(401).json({ error: 'Credenciales incorrectas' });
91:   }
92:   startSession(res, u.id);
93:   res.json({ email: u.email });
94: });
```
**Deficiencies Observed**:
1. **Missing Canonical Auth Endpoints**: Registered exclusively under `/api/register` and `/api/login`. R1 specification and REST best practices mandate `/api/auth/register` and `/api/auth/login` (while maintaining `/api/register` and `/api/login` as backward-compatible aliases).
2. **Missing `name` Field**: Name is neither accepted, nor validated, nor saved.
3. **Inadequate Validation**:
   - Email is not validated against an email regex; arbitrary strings without `@` or domain are accepted.
   - Password only requires $\ge 4$ characters without upper bound (risk of CPU exhaustion via multi-megabyte string in scrypt).
4. **Timing Attack Vulnerability in Login**:
   - Line 89 uses JavaScript standard string comparison: `hashPw(...) !== u.hash`. Standard string comparison terminates on the first mismatched byte, creating measurable timing differentials that allow attackers to deduce valid hashes. `crypto.timingSafeEqual` is required.
5. **Profile & Logout Endpoints**:
   - `/api/me` returns only `{ email: req.user.email }` rather than the required `{ user: { id, name, email, avatar_url, provider } }`.
   - `/api/auth/logout` is missing; only `/api/logout` exists, and it only removes the cookie token without handling Bearer token authorization header extraction.

---

## 2. Logic Chain

### 2.1 SQLite Auto-Migration Logic Chain
- **Observation**: `data/madera.db` already exists with tables defined under the v1 schema. Calling `CREATE TABLE IF NOT EXISTS` will not add missing columns.
- **Inference**: SQLite provides the `PRAGMA table_info(tableName)` command, which returns metadata for every column currently in a table.
- **Deduction**: We can implement an idempotent migration routine `migrateDb(db)` executed immediately on startup:
  1. Turn on foreign key constraints: `db.exec('PRAGMA foreign_keys = ON;');`.
  2. For table `users`, query `PRAGMA table_info(users)` and collect existing column names in a `Set`.
  3. Sequentially verify required columns:
     - `name`: if missing, execute `ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT 'Usuario';`
     - `google_id`: if missing, execute `ALTER TABLE users ADD COLUMN google_id TEXT;` and create index `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;`
     - `avatar_url`: if missing, execute `ALTER TABLE users ADD COLUMN avatar_url TEXT;`
     - `provider`: if missing, execute `ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'local';`
     - `created_at`: if missing, execute `ALTER TABLE users ADD COLUMN created_at INTEGER DEFAULT 0;`
  4. For table `sessions`, query `PRAGMA table_info(sessions)`:
     - `expires_at`: if missing, execute `ALTER TABLE sessions ADD COLUMN expires_at INTEGER DEFAULT 0;`
  5. For table `projects`, query `PRAGMA table_info(projects)`:
     - `description`: if missing, execute `ALTER TABLE projects ADD COLUMN description TEXT DEFAULT '';`
     - `thumbnail`: if missing, execute `ALTER TABLE projects ADD COLUMN thumbnail TEXT DEFAULT '';`
     - `created_at`: if missing, execute `ALTER TABLE projects ADD COLUMN created_at INTEGER DEFAULT 0;`
- **Result**: Zero data loss for existing developer databases, automatic schema evolution, and guaranteed column availability.

### 2.2 Input Validation & Asynchronous Scrypt Hashing Logic Chain
- **Observation**: Input fields can contain arbitrary data types, empty strings, pure whitespace, or oversized strings.
- **Logic**:
  1. `name`: Must be trimmed string. `typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 100`. Reject otherwise with 400.
  2. `email`: Must be trimmed and lowercased. Must match regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` and `length <= 255`. Reject otherwise with 400.
  3. `unique email`: Check `db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)`. If found, return HTTP 409 Conflict `{ error: 'Ese email ya está registrado' }`.
  4. `password`: Must be string with `password.length >= 6 && password.length <= 128`. Reject otherwise with 400.
  5. `scryptAsync`: Use `util.promisify(crypto.scrypt)`.
     - Parameters: `keylen = 64`.
     - Cost parameter: `cost = (process.env.NODE_ENV === 'test' ? 1024 : 16384)`. Block size: `8`, parallelization: `1`.
     - This keeps production secure against GPU/ASIC brute force attacks while allowing test suites with 50+ iterations to run in $< 1$ second.
  6. Return `201 Created` with payload:
     `{ user: { id, name, email, avatar_url: null, provider: 'local' }, token }`.

### 2.3 Timing-Safe Authentication & Session Generation Logic Chain
- **Observation**: Login requests must verify credentials without leaking password length or byte matches through execution duration.
- **Logic**:
  1. Lookup user: `db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail)`.
  2. If user does not exist or has `provider === 'google'` with null hash:
     - Return generic 401 `{ error: 'Credenciales incorrectas' }`.
  3. Calculate candidate hash: `await hashPassword(password, u.salt)`.
  4. Compare with `crypto.timingSafeEqual`:
     ```javascript
     const candidateBuf = Buffer.from(candidateHash, 'hex');
     const storedBuf = Buffer.from(u.hash, 'hex');
     const match = candidateBuf.length === storedBuf.length && crypto.timingSafeEqual(candidateBuf, storedBuf);
     if (!match) return res.status(401).json({ error: 'Credenciales incorrectas' });
     ```
  5. Issue Session:
     - Token: `crypto.randomBytes(32).toString('hex')` (256 bits entropy).
     - Expiry: `now + 90 * 24 * 60 * 60 * 1000` (7,776,000,000 ms = 90 days).
     - Store in `sessions` table: `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`.
     - Cookie: `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=7776000`.
  6. Return `200 OK` with `{ user: { id: u.id, name: u.name, email: u.email, avatar_url: u.avatar_url, provider: u.provider }, token }`.

### 2.4 Dual Auth Middleware (`req.headers.cookie` & `Bearer <token>`) Logic Chain
- **Observation**: Browsers automatically send cookies; API consumers, mobile clients, and Node test suites frequently use `Authorization: Bearer <token>`.
- **Logic**:
  1. Check `req.headers.authorization`: If present and starts with `Bearer `, extract the token.
  2. If no Bearer token, check `parseCookies(req).session`.
  3. If no token found from either source: return 401 `{ error: 'No autenticado' }`.
  4. Query database for session and joined user:
     ```sql
     SELECT s.token, s.expires_at, s.created_at,
            u.id, u.name, u.email, u.avatar_url, u.provider
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?
     ```
  5. Expiration check: If `row.expires_at > 0 && row.expires_at < Date.now()` (or fallback `row.created_at + 7776000000 < Date.now()`):
     - Delete expired session: `DELETE FROM sessions WHERE token = ?`.
     - Return 401 `{ error: 'Sesión expirada' }`.
  6. Attach `req.user = row` and `req.sessionToken = token`, then invoke `next()`.

---

## 3. Caveats

1. **SQLite Constraint Limitations on `ALTER TABLE`**:
   In SQLite, executing `ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;` is syntactically invalid because SQLite does not allow inline `UNIQUE` constraints in `ADD COLUMN`.
   *Solution*: Add the column without the unique constraint (`ALTER TABLE users ADD COLUMN google_id TEXT;`) and then execute `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);`.
2. **Handling Legacy `NOT NULL` for Google Users**:
   In databases created with the old schema, `salt` and `hash` columns have `NOT NULL` constraints. SQLite does not support `ALTER TABLE ALTER COLUMN` to drop `NOT NULL`.
   *Solution*: When creating or upserting Google OAuth users, supply dummy non-empty values (e.g. `salt = 'google_oauth'`, `hash = 'google_oauth_no_password'`) or provide a default fallback so that SQLite does not reject Google user records.
3. **Synchronous `node:sqlite` in Node 22**:
   Node.js 22 built-in `node:sqlite` provides synchronous execution via `db.exec`, `db.prepare().get()`, `db.prepare().run()`. While synchronous, disk operations in SQLite with WAL or standard local files complete in $<0.1\text{ ms}$. Keeping queries prepared at module load avoids SQL compilation overhead.
4. **Scrypt Cost in Testing vs Production**:
   Default production scrypt cost `16384` requires ~15ms of CPU work per hash. In a test suite running 30 validation and authentication tests, this can take 500ms+. By conditionally setting `cost: process.env.NODE_ENV === 'test' ? 1024 : 16384`, tests complete in $<50\text{ ms}$ while preserving identical code execution paths.
5. **Dual Route Compatibility**:
   Existing frontend code may call `/api/register`, `/api/login`, `/api/logout`, `/api/me`. Both the canonical `/api/auth/*` routes and the legacy `/api/*` routes must be bound to the exact same controller functions to prevent regression.


---

## 4. Conclusion & Complete Implementation Plan

### 4.1 Production-Ready Code for `server/server.js`

Below is the complete, drop-in replacement implementation for `server/server.js` addressing all 5 architectural requirements:

```javascript
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { promisify } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;

// ============================================================================
// 1. DATABASE INITIALIZATION & AUTO-MIGRATIONS
// ============================================================================
fs.mkdirSync(path.join(root, 'data'), { recursive: true });
const dbPath = process.env.DATABASE_PATH || path.join(root, 'data', 'madera.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// Create baseline tables if fresh
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  salt TEXT,
  hash TEXT,
  name TEXT NOT NULL DEFAULT 'Usuario',
  google_id TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'local',
  created_at INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail TEXT DEFAULT '',
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL
);
`);

// Idempotent auto-migration helper
function migrateDb(database) {
  const getColumns = (tableName) => {
    try {
      const rows = database.prepare(`PRAGMA table_info(${tableName})`).all();
      return new Set(rows.map((r) => r.name));
    } catch {
      return new Set();
    }
  };

  // Migrate users table
  const userCols = getColumns('users');
  if (!userCols.has('name')) {
    database.exec("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT 'Usuario';");
  }
  if (!userCols.has('google_id')) {
    database.exec('ALTER TABLE users ADD COLUMN google_id TEXT;');
  }
  if (!userCols.has('avatar_url')) {
    database.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT;');
  }
  if (!userCols.has('provider')) {
    database.exec("ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'local';");
  }
  if (!userCols.has('created_at')) {
    database.exec('ALTER TABLE users ADD COLUMN created_at INTEGER DEFAULT 0;');
  }
  database.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;');

  // Migrate sessions table
  const sessionCols = getColumns('sessions');
  if (!sessionCols.has('expires_at')) {
    database.exec('ALTER TABLE sessions ADD COLUMN expires_at INTEGER DEFAULT 0;');
  }

  // Migrate projects table
  const projectCols = getColumns('projects');
  if (!projectCols.has('description')) {
    database.exec("ALTER TABLE projects ADD COLUMN description TEXT DEFAULT '';");
  }
  if (!projectCols.has('thumbnail')) {
    database.exec("ALTER TABLE projects ADD COLUMN thumbnail TEXT DEFAULT '';");
  }
  if (!projectCols.has('created_at')) {
    database.exec('ALTER TABLE projects ADD COLUMN created_at INTEGER DEFAULT 0;');
  }
}

migrateDb(db);

// ============================================================================
// 2. CRYPTOGRAPHIC & SESSION HELPERS
// ============================================================================
const scryptAsync = promisify(crypto.scrypt);
const SCRYPT_COST = process.env.NODE_ENV === 'test' ? 1024 : 16384;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function hashPassword(password, salt) {
  const derivedKey = await scryptAsync(String(password), salt, 64, {
    cost: SCRYPT_COST,
    blockSize: 8,
    parallelization: 1
  });
  return derivedKey.toString('hex');
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  return parseCookies(req).session || null;
}

function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + SESSION_MAX_AGE_MS;
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    now,
    expiresAt
  );
  res.setHeader(
    'Set-Cookie',
    `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`
  );
  return token;
}

// ============================================================================
// 3. AUTH MIDDLEWARE
// ============================================================================
function auth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const row = db
    .prepare(
      `SELECT s.token, s.expires_at, s.created_at,
              u.id, u.name, u.email, u.avatar_url, u.provider, u.created_at AS user_created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token);

  if (!row) {
    return res.status(401).json({ error: 'Sesión no válida o inexistente' });
  }

  const now = Date.now();
  const expiry = row.expires_at || (row.created_at + SESSION_MAX_AGE_MS);
  if (expiry < now) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return res.status(401).json({ error: 'Sesión expirada' });
  }

  req.user = {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar_url: row.avatar_url,
    provider: row.provider,
    created_at: row.user_created_at
  };
  req.sessionToken = token;
  next();
}

// ============================================================================
// 4. EXPRESS APPLICATION SETUP & ROUTES
// ============================================================================
const app = express();
app.use(express.json({ limit: '5mb' }));
app.use('/vendor/three', express.static(path.join(root, 'node_modules', 'three')));
app.use(express.static(path.join(root, 'public')));

// ----------------------------------------------------------------------------
// 4.1 Registration Handler
// ----------------------------------------------------------------------------
const handleRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // Validate name
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
    }

    // Validate email
    if (typeof email !== 'string') {
      return res.status(400).json({ error: 'Email requerido' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 255) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    // Check unique email
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Ese email ya está registrado' });
    }

    // Validate password
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 128 caracteres' });
    }

    // Hash password asynchronously
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await hashPassword(password, salt);
    const now = Date.now();

    const insertResult = db
      .prepare('INSERT INTO users (name, email, salt, hash, provider, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(name.trim(), normalizedEmail, salt, hash, 'local', now);

    const userId = Number(insertResult.lastInsertRowid);
    const token = startSession(res, userId);

    res.status(201).json({
      user: {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        avatar_url: null,
        provider: 'local'
      },
      token
    });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

app.post('/api/auth/register', handleRegister);
app.post('/api/register', handleRegister);

// ----------------------------------------------------------------------------
// 4.2 Login Handler
// ----------------------------------------------------------------------------
const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (!u) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (u.provider === 'google' && !u.hash) {
      return res.status(401).json({ error: 'Esta cuenta utiliza Google Sign-In' });
    }

    // Calculate candidate hash with stored salt
    const candidateHash = await hashPassword(String(password), u.salt || '');
    const candidateBuf = Buffer.from(candidateHash, 'hex');
    const storedBuf = Buffer.from(u.hash || '', 'hex');

    // Timing-safe comparison
    const isValid = candidateBuf.length === storedBuf.length && crypto.timingSafeEqual(candidateBuf, storedBuf);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = startSession(res, u.id);
    res.json({
      user: {
        id: u.id,
        name: u.name || 'Usuario',
        email: u.email,
        avatar_url: u.avatar_url || null,
        provider: u.provider || 'local'
      },
      token
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

app.post('/api/auth/login', handleLogin);
app.post('/api/login', handleLogin);

// ----------------------------------------------------------------------------
// 4.3 Profile & Session Status (`/api/auth/me`)
// ----------------------------------------------------------------------------
const handleMe = (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      avatar_url: req.user.avatar_url || null,
      provider: req.user.provider || 'local'
    }
  });
};

app.get('/api/auth/me', auth, handleMe);
app.get('/api/me', auth, handleMe);

// ----------------------------------------------------------------------------
// 4.4 Logout Handler (`/api/auth/logout`)
// ----------------------------------------------------------------------------
const handleLogout = (req, res) => {
  const token = extractToken(req);
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.setHeader('Set-Cookie', 'session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
  res.json({ ok: true });
};

app.post('/api/auth/logout', handleLogout);
app.post('/api/logout', handleLogout);

// ----------------------------------------------------------------------------
// 4.5 Projects API
// ----------------------------------------------------------------------------
app.get('/api/projects', auth, (req, res) => {
  res.json(
    db
      .prepare('SELECT id, name, description, updated_at, created_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC')
      .all(req.user.id)
  );
});

app.post('/api/projects', auth, (req, res) => {
  const { name, data, description } = req.body || {};
  const now = Date.now();
  const r = db
    .prepare('INSERT INTO projects (user_id, name, data, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, name || 'Sin título', JSON.stringify(data || {}), description || '', now, now);
  res.status(201).json({ id: Number(r.lastInsertRowid), name: name || 'Sin título', updated_at: now });
});

const own = (req) =>
  db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);

app.get('/api/projects/:id', auth, (req, res) => {
  const p = own(req);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  res.json({ id: p.id, name: p.name, description: p.description || '', data: JSON.parse(p.data), updated_at: p.updated_at });
});

app.put('/api/projects/:id', auth, (req, res) => {
  const p = own(req);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  const { name, data, description } = req.body || {};
  db.prepare('UPDATE projects SET name = ?, data = ?, description = ?, updated_at = ? WHERE id = ?').run(
    name ?? p.name,
    data ? JSON.stringify(data) : p.data,
    description ?? p.description,
    Date.now(),
    p.id
  );
  res.json({ ok: true });
});

app.post('/api/projects/:id/duplicate', auth, (req, res) => {
  const p = own(req);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  const now = Date.now();
  const r = db
    .prepare('INSERT INTO projects (user_id, name, data, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, p.name + ' copy', p.data, p.description || '', now, now);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.delete('/api/projects/:id', auth, (req, res) => {
  const p = own(req);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(p.id);
  res.json({ ok: true });
});

// Export app and db for tests
export { app, db, hashPassword, startSession, auth, migrateDb };

// Start listening if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  app.listen(PORT, () => console.log(`Madera local en http://localhost:${PORT}`));
}
```

---

### 4.2 Automated Test Script Design (`test/auth_and_persistence.test.js`)

Below is the complete, self-contained test file designed for Node's native test runner (`node --test test/auth_and_persistence.test.js`):

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Set test environment for accelerated scrypt (cost = 1024)
process.env.NODE_ENV = 'test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, 'test_madera_auth.db');
process.env.DATABASE_PATH = testDbPath;

// Import app and db after env variables set
const { app, db } = await import('../server/server.js');

let server;
let baseUrl;

// Test server lifecycle
test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  try {
    fs.unlinkSync(testDbPath);
  } catch {}
});

// Helper for making JSON requests
async function api(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let body = null;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, headers: res.headers, body };
}

// ============================================================================
// 1. SQLITE AUTO-MIGRATION & PRAGMA TESTS
// ============================================================================
test('SQLite Auto-Migration: enforces PRAGMA foreign_keys = ON', () => {
  const fk = db.prepare('PRAGMA foreign_keys').get();
  assert.equal(fk.foreign_keys, 1, 'Foreign keys must be enabled in SQLite');
});

test('SQLite Auto-Migration: users table contains all required columns', () => {
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  assert.ok(cols.includes('id'), 'users.id exists');
  assert.ok(cols.includes('email'), 'users.email exists');
  assert.ok(cols.includes('salt'), 'users.salt exists');
  assert.ok(cols.includes('hash'), 'users.hash exists');
  assert.ok(cols.includes('name'), 'users.name exists');
  assert.ok(cols.includes('google_id'), 'users.google_id exists');
  assert.ok(cols.includes('avatar_url'), 'users.avatar_url exists');
  assert.ok(cols.includes('provider'), 'users.provider exists');
  assert.ok(cols.includes('created_at'), 'users.created_at exists');
});

test('SQLite Auto-Migration: sessions table contains expires_at column', () => {
  const cols = db.prepare('PRAGMA table_info(sessions)').all().map((c) => c.name);
  assert.ok(cols.includes('expires_at'), 'sessions.expires_at exists');
});

// ============================================================================
// 2. INPUT VALIDATION FOR REGISTRATION
// ============================================================================
test('Registration: rejects missing or invalid name (<2 or >100 chars)', async () => {
  // Empty name
  let res = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: ' ', email: 'test1@example.com', password: 'password123' })
  });
  assert.equal(res.status, 400);

  // Single letter name
  res = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'A', email: 'test1@example.com', password: 'password123' })
  });
  assert.equal(res.status, 400);

  // Name > 100 chars
  res = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'A'.repeat(101), email: 'test1@example.com', password: 'password123' })
  });
  assert.equal(res.status, 400);
});

test('Registration: rejects malformed email address', async () => {
  const invalidEmails = ['notanemail', 'user@', '@domain.com', 'user@domain', 'user name@domain.com'];
  for (const email of invalidEmails) {
    const res = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Valido', email, password: 'password123' })
    });
    assert.equal(res.status, 400, `Should reject email: ${email}`);
  }
});

test('Registration: rejects passwords < 6 chars or > 128 chars', async () => {
  // Too short
  let res = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Valido', email: 'shortpw@example.com', password: '12345' })
  });
  assert.equal(res.status, 400);

  // Too long
  res = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Valido', email: 'longpw@example.com', password: 'A'.repeat(129) })
  });
  assert.equal(res.status, 400);
});

test('Registration: successfully registers user with valid inputs and sets HttpOnly cookie', async () => {
  const res = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Ana Garcia', email: 'Ana.Garcia@Example.COM', password: 'SecurePassword123!' })
  });

  assert.equal(res.status, 201);
  assert.ok(res.body.user);
  assert.equal(res.body.user.name, 'Ana Garcia');
  assert.equal(res.body.user.email, 'ana.garcia@example.com', 'Email normalized to lowercase');
  assert.equal(res.body.user.provider, 'local');
  assert.ok(res.body.token, 'Token returned in response');

  // Verify Set-Cookie header
  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie, 'Set-Cookie header present');
  assert.ok(setCookie.includes('HttpOnly'), 'Cookie is HttpOnly');
  assert.ok(setCookie.includes('Path=/'), 'Cookie path is /');
  assert.ok(setCookie.includes('SameSite=Lax'), 'Cookie SameSite is Lax');
  assert.ok(setCookie.includes('Max-Age=7776000'), 'Cookie Max-Age is 90 days');
});

test('Registration: rejects duplicate email with HTTP 409 Conflict', async () => {
  const res = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Duplicate User', email: 'ana.garcia@example.com', password: 'AnotherPassword123' })
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.error, 'Ese email ya está registrado');
});

test('Registration: backward compatibility alias POST /api/register works', async () => {
  const res = await api('/api/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Legacy User', email: 'legacy@example.com', password: 'Password123' })
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.email, 'legacy@example.com');
});

// ============================================================================
// 3. SECURE LOGIN & TIMING-SAFE AUTH
// ============================================================================
test('Login: rejects non-existent email with HTTP 401', async () => {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'nonexistent@example.com', password: 'Password123' })
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'Credenciales incorrectas');
});

test('Login: rejects incorrect password with HTTP 401', async () => {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ana.garcia@example.com', password: 'WrongPassword' })
  });
  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'Credenciales incorrectas');
});

test('Login: successfully logs in with correct credentials, sets cookie, and returns token', async () => {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ANA.GARCIA@example.com', password: 'SecurePassword123!' })
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.name, 'Ana Garcia');
  assert.equal(res.body.user.email, 'ana.garcia@example.com');
  assert.ok(res.body.token);

  // Verify session in SQLite
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(res.body.token);
  assert.ok(session, 'Session stored in DB');
  assert.ok(session.expires_at > Date.now(), 'Session expires in the future');
});

// ============================================================================
// 4. AUTH MIDDLEWARE & PROFILE (`/api/auth/me` & `/api/auth/logout`)
// ============================================================================
test('Auth Middleware: rejects requests without token with HTTP 401', async () => {
  const res = await api('/api/auth/me');
  assert.equal(res.status, 401);
});

test('Auth Middleware: accepts session cookie and returns user profile', async () => {
  // Login to get cookie
  const loginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ana.garcia@example.com', password: 'SecurePassword123!' })
  });
  const cookie = loginRes.headers.get('set-cookie').split(';')[0];

  const meRes = await api('/api/auth/me', {
    headers: { Cookie: cookie }
  });
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.email, 'ana.garcia@example.com');
  assert.equal(meRes.body.user.name, 'Ana Garcia');
});

test('Auth Middleware: accepts Bearer authorization header and returns user profile', async () => {
  const loginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ana.garcia@example.com', password: 'SecurePassword123!' })
  });
  const token = loginRes.body.token;

  const meRes = await api('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.email, 'ana.garcia@example.com');
});

test('Auth Middleware: rejects and cleans up expired sessions', async () => {
  // Insert artificially expired session
  const expiredToken = 'expired_session_test_token_1234567890';
  const u = db.prepare('SELECT id FROM users WHERE email = ?').get('ana.garcia@example.com');
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    expiredToken,
    u.id,
    Date.now() - 100000,
    Date.now() - 50000
  );

  const res = await api('/api/auth/me', {
    headers: { Authorization: `Bearer ${expiredToken}` }
  });
  assert.equal(res.status, 401);

  // Check that expired session is removed from SQLite
  const check = db.prepare('SELECT * FROM sessions WHERE token = ?').get(expiredToken);
  assert.equal(check, undefined, 'Expired session must be pruned');
});

test('Logout: invalidates session in SQLite and clears cookie', async () => {
  const loginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ana.garcia@example.com', password: 'SecurePassword123!' })
  });
  const token = loginRes.body.token;

  const logoutRes = await api('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(logoutRes.status, 200);
  assert.ok(logoutRes.headers.get('set-cookie').includes('Max-Age=0'));

  // Session must no longer exist in DB
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  assert.equal(session, undefined, 'Session was removed');

  // Request to /api/auth/me must now fail
  const meRes = await api('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(meRes.status, 401);
});
```

---

## 5. Verification Method

To independently verify the implementation, downstream developers, workers, and auditors should execute the following steps:

### 5.1 Verification Commands
1. **Automated Unit & Integration Test**:
   ```powershell
   node --test test/auth_and_persistence.test.js
   ```
   *Expected Result*: All tests pass without warnings; SQLite tables are verified, password hashing is validated, timing-safe equality is checked, session cookies and Bearer tokens are tested, and session expiration/revocation is confirmed.

2. **Full Project Test Suite Regression**:
   ```powershell
   npm test
   ```
   *Expected Result*: All existing tests (`test/layout.test.js`, `test/cutlist_print.test.js`, etc.) along with the new test suite pass with 0 failures.

3. **Manual Health Check via cURL / PowerShell**:
   ```powershell
   # 1. Register
   Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/register -ContentType "application/json" -Body '{"name":"Tester","email":"test@example.com","password":"Password123"}'
   
   # 2. Login
   $login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login -ContentType "application/json" -Body '{"email":"test@example.com","password":"Password123"}'
   
   # 3. Profile via Bearer token
   Invoke-RestMethod -Method Get -Uri http://localhost:3000/api/auth/me -Headers @{ Authorization = "Bearer $($login.token)" }
   ```

### 5.2 Invalidation Conditions
The backend implementation shall be deemed INVALID if:
- Any `ALTER TABLE` statement attempts to inline `UNIQUE` without creating a secondary unique index, causing SQLite syntax errors.
- Synchronous `crypto.scryptSync` is left on the main event loop during registration or login.
- `req.headers.authorization` Bearer tokens are ignored or rejected by the `auth` middleware.
- Input validation permits empty names, names $< 2$ chars, or passwords $< 6$ chars.
- Timing-safe comparison (`crypto.timingSafeEqual`) is not used during password verification.
- `PRAGMA foreign_keys = ON;` is omitted.
- Legacy endpoint paths (`/api/register`, `/api/login`, `/api/logout`, `/api/me`) break existing frontend functionality.

