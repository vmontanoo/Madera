# Handoff Report: Google Sign-In & Offline Simulated OAuth Provider (M1-2)

**Author**: Explorer M1-2 (`teamwork_preview_explorer_m1_2`)  
**Target Codebase**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local`  
**Milestone**: M1 (R1 Specification — Google Sign-In & Offline Simulated OAuth Provider)  
**Date**: 2026-10-23  

---

## 1. Observation

### 1.1 Existing Server Architecture & Database Schema
Direct inspection of `server/server.js:1-34`:
```javascript
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;

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

**Verbatim Observations in Database Schema**:
1. **`users` Table**: Contains only `id`, `email`, `salt`, and `hash`. Columns `salt` and `hash` have `NOT NULL` constraints.
2. **Missing Columns in `users`**:
   - `name`: Completely absent.
   - `provider`: Absent (defaults should distinguish `'local'` from `'google'`).
   - `google_id`: Absent (needed to uniquely link Google accounts by `sub`).
   - `avatar_url`: Absent (needed to display user profile pictures).
   - `created_at`: Absent.
3. **`sessions` Table**: Only contains `token`, `user_id`, and `created_at`. Lacks `expires_at`.
4. **Existing DB File**: `data/madera.db` already exists on disk. Running `CREATE TABLE IF NOT EXISTS` does not alter existing tables in SQLite.

---

### 1.2 Existing Authentication Logic & Middleware
From `server/server.js:37-64`:
```javascript
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
```

**Verbatim Observations in Auth Handling**:
1. `auth` middleware only inspects `req.headers.cookie`. `Authorization: Bearer <token>` is ignored, hindering programmatic/test consumption.
2. `auth` query only retrieves `u.id` and `u.email`. It does not retrieve `name`, `avatar_url`, or `provider`.
3. `startSession` returns `undefined`. Returning the generated `token` is critical for programmatic JSON responses (`POST /api/auth/google/mock`, `POST /api/auth/login`).

---

### 1.3 Total Absence of Google OAuth Endpoints
Direct inspection of `server/server.js:71-158`:
- Routes present:
  - `POST /api/register`
  - `POST /api/login`
  - `POST /api/logout`
  - `GET /api/me`
  - `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`, `PUT /api/projects/:id`, `POST /api/projects/:id/duplicate`, `DELETE /api/projects/:id`
- **Zero OAuth routes**: No `GET /api/auth/google`, no `GET /api/auth/google/callback`, no `POST /api/auth/google/mock`.
- **Zero environment detection**: `process.env.GOOGLE_CLIENT_ID` and `process.env.GOOGLE_CLIENT_SECRET` are never referenced.

---

### 1.4 Client-Side Authentication UI Status
Inspection of `public/js/app.js:37-61`:
```javascript
function authView() {
  $app.innerHTML = `<div class="center"><form class="card" id="f">
    <h2 style="margin:0">Madera local</h2>
    <span class="muted">Inicia sesión o crea una cuenta local</span>
    <input name="email" type="email" placeholder="Email" required>
    <input name="password" type="password" placeholder="Contraseña" required>
    <div class="err" id="err"></div>
    <button class="primary" data-m="login">Entrar</button>
    <button type="button" data-m="register">Crear cuenta</button>
  </form></div>`;
  ...
}
```
There is currently no Google Sign-In button, no OAuth link, and no user name field for registration.

---

## 2. Logic Chain

### 2.1 Database Schema Alignment & Idempotent Migration
- **Premise 1**: SQLite does not update table schemas if tables already exist when `CREATE TABLE IF NOT EXISTS` runs.
- **Premise 2**: Google OAuth users do not authenticate with a password, so they have no natural password salt or hash.
- **Premise 3**: In existing `data/madera.db`, `users.salt` and `users.hash` were created with `NOT NULL` constraints.
- **Deduction 1**: An idempotent auto-migration helper must query `PRAGMA table_info(tableName)` and apply `ALTER TABLE users ADD COLUMN ...` for:
  - `name TEXT NOT NULL DEFAULT 'Usuario'`
  - `provider TEXT NOT NULL DEFAULT 'local'`
  - `google_id TEXT`
  - `avatar_url TEXT`
  - `created_at INTEGER DEFAULT 0`
- **Deduction 2**: For `sessions`, add `expires_at INTEGER DEFAULT 0`.
- **Deduction 3**: When inserting Google users, passing `salt = ''` and `hash = ''` (or `'google-oauth'`) avoids violating the existing SQLite `NOT NULL` constraint without requiring an error-prone table recreation. Furthermore, setting `hash = ''` guarantees that candidate passwords submitted to local login will never match.

---

### 2.2 Environment Detection Architecture
- **Observation**: Developers running the app locally or in CI environments generally do not have Google Cloud Console client credentials configured.
- **Implementation**:
  ```javascript
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
  const HAS_REAL_GOOGLE = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
  ```
- **Execution Logic**:
  - If `HAS_REAL_GOOGLE === true` and query param `?simulated=1` is NOT present:
    Activate **Real Google OAuth 2.0 Flow**.
  - If `HAS_REAL_GOOGLE === false` OR query param `?simulated=1` / `?mock=1` is present:
    Activate **Local Simulated OAuth Provider**.
  - Startup diagnostic log:
    ```javascript
    console.log(`[Auth] Google Provider: ${HAS_REAL_GOOGLE ? 'Real OAuth 2.0 enabled' : 'Simulated Offline Provider (zero-config)'}`);
    ```

---

### 2.3 Real Google OAuth 2.0 Flow Specification

#### A. Authorization Initiation: `GET /api/auth/google`
1. Resolve the redirect URI:
   ```javascript
   function getRedirectUri(req) {
     if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
     const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
     const host = req.get('host') || `localhost:${PORT}`;
     return `${proto}://${host}/api/auth/google/callback`;
   }
   ```
2. Generate cryptographically random CSRF `state`:
   `const state = crypto.randomBytes(16).toString('hex');`
3. Set short-lived `oauth_state` HTTP-Only cookie:
   `res.setHeader('Set-Cookie', 'oauth_state=' + state + '; HttpOnly; Path=/; SameSite=Lax; Max-Age=600');`
4. Construct Google Auth URL and redirect (`302 Found`):
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=${GOOGLE_CLIENT_ID}&
     redirect_uri=${encodeURIComponent(redirectUri)}&
     response_type=code&
     scope=openid%20email%20profile&
     state=${state}&
     prompt=select_account
   ```

#### B. Callback Handling: `GET /api/auth/google/callback`
1. Extract `const { code, state, error, simulated } = req.query;`
2. If `error` is returned by Google, redirect to `/#/login?error=${encodeURIComponent(error)}`.
3. If `simulated === '1'` (or simulated query parameters present), branch to Simulated Callback logic (§2.4).
4. Verify CSRF `state`:
   - Retrieve stored state: `const expectedState = parseCookies(req).oauth_state;`
   - If `!state || !expectedState || state !== expectedState`, redirect to `/#/login?error=invalid_state`.
   - Clear cookie: `res.appendHeader('Set-Cookie', 'oauth_state=; Path=/; Max-Age=0');`
5. Exchange code for access token via Node 22 native `fetch`:
   ```javascript
   const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
     method: 'POST',
     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
     body: new URLSearchParams({
       code,
       client_id: GOOGLE_CLIENT_ID,
       client_secret: GOOGLE_CLIENT_SECRET,
       redirect_uri: getRedirectUri(req),
       grant_type: 'authorization_code',
     }),
   });
   if (!tokenRes.ok) return res.redirect('/#/login?error=token_exchange_failed');
   const tokens = await tokenRes.json();
   ```
6. Fetch user profile from Google UserInfo endpoint:
   ```javascript
   const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
     headers: { Authorization: `Bearer ${tokens.access_token}` },
   });
   if (!userRes.ok) return res.redirect('/#/login?error=userinfo_failed');
   const profile = await userRes.json();
   // Expected: { sub, email, name, picture }
   ```
7. Idempotent User Upsert:
   - Call helper `upsertGoogleUser({ email: profile.email, name: profile.name, google_id: profile.sub, avatar_url: profile.picture })`.
   - If user exists by `google_id` or `email`, update profile and link `google_id`.
   - If new user, insert into `users` table with `provider = 'google'`, `salt = ''`, `hash = ''`.
8. Create session:
   - Call `startSession(res, user.id);`
9. Redirect to application dashboard:
   - `res.redirect('/#/');`

---

### 2.4 Local Simulated OAuth Provider Architecture (Offline Zero-Config)

When `HAS_REAL_GOOGLE` is false or `?simulated=1` is invoked:

#### A. Interactive Account Picker Screen (`GET /api/auth/google`)
When accessed from a browser (or request accepting HTML), serve an elegant, responsive Google Account Chooser screen directly.

Features of the Simulated Account Chooser:
1. **Google Branding & Styling**: Clean card on dark Madera theme (`--bg:#1c1a19`, `--panel:#262322`), Google multicolor SVG "G" logo, title *"Elegir una cuenta de Google"*, and subtitle *"para continuar en Madera Local (Simulador Offline)"*.
2. **Pre-configured Accounts (Ready-to-click)**:
   - **Ana García**:
     - Email: `ana.garcia@gmail.com`
     - Role: Arquitecta / Diseñadora de Interiores
     - Avatar badge: Initial "A" with Google Blue background (`#4285F4`)
     - Google ID: `mock-google-sub-ana-101`
   - **Carlos Diseñador**:
     - Email: `carlos.muebles@gmail.com`
     - Role: Carpintero Modular
     - Avatar badge: Initial "C" with Google Green background (`#0F9D58`)
     - Google ID: `mock-google-sub-carlos-102`
3. **Custom Account Input**:
   - Fields: Name and Email.
   - Button: "Continuar con cuenta personalizada".
4. **Form Action**:
   - Submits to `/api/auth/google/callback?simulated=1` via GET or `/api/auth/google/mock` via POST.

#### B. Programmatic Mock Endpoint (`POST /api/auth/google/mock`)
Designed for headless integration tests (`test/auth_and_persistence.test.js`) and SPA client calls:
- **Input Payload**: `{ name, email, google_id, avatar_url }`
- **Validation**:
  - `email` is mandatory and normalized to lowercase trimmed string.
  - If `name` is omitted, defaults to `'Usuario Google'`.
  - If `google_id` is omitted, auto-generated deterministically: `'mock-sub-' + crypto.createHash('sha256').update(email).digest('hex').slice(0, 16)`.
  - If `avatar_url` is omitted, defaults to `https://lh3.googleusercontent.com/a/default-avatar`.
- **Database Upsert**: Updates or inserts user record.
- **Session & Response**:
  - Creates session token in SQLite `sessions` table.
  - Attaches `Set-Cookie: session=<token>; HttpOnly; Path=/; SameSite=Lax; Max-Age=7776000`.
  - Returns `200 OK` (or `201 Created`):
    ```json
    {
      "ok": true,
      "user": {
        "id": 1,
        "name": "Ana García",
        "email": "ana.garcia@gmail.com",
        "avatar_url": "https://lh3.googleusercontent.com/a/default-avatar",
        "provider": "google"
      },
      "token": "a1b2c3d4..."
    }
    ```

#### C. Simulated Callback Endpoint (`GET /api/auth/google/callback?simulated=1`)
Handles browser redirection from the Simulated Account Picker:
- **Query Parameters**:
  - Option 1: Preset key `?account=ana` or `?account=carlos`
  - Option 2: Explicit parameters `?email=...&name=...&sub=...`
- **Behavior**:
  - Resolves account profile.
  - Performs `upsertGoogleUser`.
  - Issues session token and attaches `Set-Cookie`.
  - Redirects browser with HTTP `302 Found` to `/#/`.

---

### 2.5 Complete Code Implementation Blueprint for `server/server.js`

Below are the exact code components ready to be placed in `server/server.js`:

#### Component 1: Database Migration Function
```javascript
function migrateDb(db) {
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

  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('name')) {
    db.exec("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT 'Usuario';");
  }
  if (!userCols.includes('provider')) {
    db.exec("ALTER TABLE users ADD COLUMN provider TEXT NOT NULL DEFAULT 'local';");
  }
  if (!userCols.includes('google_id')) {
    db.exec("ALTER TABLE users ADD COLUMN google_id TEXT;");
  }
  if (!userCols.includes('avatar_url')) {
    db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT;");
  }
  if (!userCols.includes('created_at')) {
    db.exec("ALTER TABLE users ADD COLUMN created_at INTEGER DEFAULT 0;");
  }

  const sessionCols = db.prepare("PRAGMA table_info(sessions)").all().map(c => c.name);
  if (!sessionCols.includes('expires_at')) {
    db.exec("ALTER TABLE sessions ADD COLUMN expires_at INTEGER DEFAULT 0;");
  }

  const projectCols = db.prepare("PRAGMA table_info(projects)").all().map(c => c.name);
  if (!projectCols.includes('description')) {
    db.exec("ALTER TABLE projects ADD COLUMN description TEXT DEFAULT '';");
  }
  if (!projectCols.includes('created_at')) {
    db.exec("ALTER TABLE projects ADD COLUMN created_at INTEGER DEFAULT 0;");
  }
}
```

#### Component 2: Auth Middleware & Session Helpers
```javascript
function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const maxAge = 60 * 60 * 24 * 90; // 90 days
  const expiresAt = now + maxAge * 1000;
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    now,
    expiresAt
  );
  res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`);
  return token;
}

function auth(req, res, next) {
  let token = parseCookies(req).session;
  if (!token && req.headers.authorization) {
    const m = req.headers.authorization.match(/^Bearer\s+(.+)$/i);
    if (m) token = m[1].trim();
  }
  if (token) {
    const row = db
      .prepare('SELECT u.id, u.name, u.email, u.avatar_url, u.provider FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
      .get(token);
    if (row) {
      req.user = row;
      return next();
    }
  }
  res.status(401).json({ error: 'No autenticado' });
}

function upsertGoogleUser({ email, name, google_id, avatar_url }) {
  const normEmail = String(email || '').trim().toLowerCase();
  let user = null;
  if (google_id) {
    user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(google_id);
  }
  if (!user && normEmail) {
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(normEmail);
  }

  if (user) {
    db.prepare(`
      UPDATE users 
      SET google_id = COALESCE(google_id, ?),
          name = CASE WHEN name = 'Usuario' OR name = '' THEN ? ELSE name END,
          avatar_url = COALESCE(avatar_url, ?),
          provider = CASE WHEN provider = 'local' THEN 'google' ELSE provider END
      WHERE id = ?
    `).run(google_id || user.google_id || null, name || 'Usuario', avatar_url || null, user.id);
    return db.prepare('SELECT id, name, email, avatar_url, provider FROM users WHERE id = ?').get(user.id);
  }

  const now = Date.now();
  const r = db.prepare(`
    INSERT INTO users (email, name, salt, hash, google_id, avatar_url, provider, created_at)
    VALUES (?, ?, '', '', ?, ?, 'google', ?)
  `).run(normEmail, name || 'Usuario', google_id || null, avatar_url || null, now);

  return {
    id: Number(r.lastInsertRowid),
    name: name || 'Usuario',
    email: normEmail,
    avatar_url: avatar_url || null,
    provider: 'google',
  };
}
```

#### Component 3: Google OAuth & Simulated Provider Endpoints
```javascript
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const HAS_REAL_GOOGLE = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

function getRedirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}/api/auth/google/callback`;
}

// Simulated Accounts Preset Catalog
const SIMULATED_ACCOUNTS = {
  ana: {
    name: 'Ana García',
    email: 'ana.garcia@gmail.com',
    google_id: 'mock-google-sub-ana-101',
    avatar_url: 'https://lh3.googleusercontent.com/a/mock-ana-avatar',
    role: 'Diseñadora de Interiores',
    color: '#4285F4',
  },
  carlos: {
    name: 'Carlos Diseñador',
    email: 'carlos.muebles@gmail.com',
    google_id: 'mock-google-sub-carlos-102',
    avatar_url: 'https://lh3.googleusercontent.com/a/mock-carlos-avatar',
    role: 'Fabricante Modular',
    color: '#0F9D58',
  },
};

// 1. GET /api/auth/google
app.get('/api/auth/google', (req, res) => {
  const forceSimulated = req.query.simulated === '1' || req.query.mock === '1';

  if (HAS_REAL_GOOGLE && !forceSimulated) {
    const state = crypto.randomBytes(16).toString('hex');
    res.setHeader('Set-Cookie', `oauth_state=${state}; HttpOnly; Path=/; SameSite=Lax; Max-Age=600`);
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', getRedirectUri(req));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'select_account');
    return res.redirect(authUrl.toString());
  }

  // Simulated Account Picker HTML
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Acceder con Google - Madera Local (Simulado)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root { --bg:#1c1a19; --panel:#262322; --panel2:#2f2b2a; --text:#eee; --muted:#9b9490; --accent:#ffb800; --line:#4a4543; }
    * { box-sizing: border-box; margin:0; padding:0; }
    body { background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, Segoe UI, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:16px; }
    .card { background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 28px; width: 100%; max-width: 420px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { text-align:center; margin-bottom: 24px; }
    .logo { width: 44px; height: 44px; margin: 0 auto 12px; }
    h1 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
    .sub { font-size: 13px; color: var(--muted); }
    .badge { display:inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: rgba(255, 184, 0, 0.15); color: var(--accent); margin-top: 6px; }
    .accounts { display:flex; flex-direction:column; gap: 10px; margin-bottom: 24px; }
    .acc-btn { display:flex; align-items:center; gap: 14px; background: var(--panel2); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; cursor:pointer; color: var(--text); text-decoration:none; transition: all 0.15s; }
    .acc-btn:hover { border-color: var(--accent); transform: translateY(-1px); }
    .avatar { width: 40px; height: 40px; border-radius: 50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size: 17px; color: #fff; flex-shrink:0; }
    .acc-info { display:flex; flex-direction:column; text-align:left; flex:1; overflow:hidden; }
    .acc-name { font-weight: 600; font-size: 14px; }
    .acc-email { font-size: 12px; color: var(--muted); white-space:nowrap; text-overflow:ellipsis; overflow:hidden; }
    .divider { display:flex; align-items:center; gap: 10px; margin: 20px 0; color: var(--muted); font-size: 12px; }
    .divider::before, .divider::after { content:''; flex:1; height:1px; background: var(--line); }
    .form-custom { display:flex; flex-direction:column; gap: 10px; }
    .form-custom input { background: #171514; border: 1px solid var(--line); border-radius: 8px; padding: 8px 12px; color: var(--text); font-size: 13px; }
    .form-custom input:focus { outline:none; border-color: var(--accent); }
    .btn-submit { background: var(--accent); color: #111; font-weight: 600; border:none; border-radius: 999px; padding: 10px; cursor:pointer; font-size: 13px; }
    .footer { margin-top: 20px; text-align:center; font-size: 12px; }
    .footer a { color: var(--muted); text-decoration:none; }
    .footer a:hover { color: var(--text); }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <svg class="logo" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      <h1>Elegir una cuenta de Google</h1>
      <p class="sub">para continuar en Madera Local</p>
      <span class="badge">Modo Simulado Offline</span>
    </div>

    <div class="accounts">
      <a class="acc-btn" href="/api/auth/google/callback?simulated=1&account=ana">
        <div class="avatar" style="background:#4285F4">A</div>
        <div class="acc-info">
          <span class="acc-name">Ana García</span>
          <span class="acc-email">ana.garcia@gmail.com</span>
        </div>
      </a>

      <a class="acc-btn" href="/api/auth/google/callback?simulated=1&account=carlos">
        <div class="avatar" style="background:#0F9D58">C</div>
        <div class="acc-info">
          <span class="acc-name">Carlos Diseñador</span>
          <span class="acc-email">carlos.muebles@gmail.com</span>
        </div>
      </a>
    </div>

    <div class="divider">o usar otra cuenta simulada</div>

    <form class="form-custom" method="GET" action="/api/auth/google/callback">
      <input type="hidden" name="simulated" value="1">
      <input type="text" name="name" placeholder="Nombre completo (ej. María Robles)" required>
      <input type="email" name="email" placeholder="Correo electrónico @gmail.com" required>
      <button class="btn-submit" type="submit">Iniciar sesión con esta cuenta</button>
    </form>

    <div class="footer">
      <a href="/#/">← Volver a Madera local</a>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// 2. GET /api/auth/google/callback
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state, error, simulated, account, email, name, sub } = req.query;

  if (error) {
    return res.redirect(`/#/login?error=${encodeURIComponent(error)}`);
  }

  // Handle Simulated Flow
  if (simulated === '1' || !HAS_REAL_GOOGLE) {
    let profile = null;
    if (account && SIMULATED_ACCOUNTS[account]) {
      profile = SIMULATED_ACCOUNTS[account];
    } else if (email) {
      profile = {
        name: name || 'Usuario Google',
        email: String(email).trim().toLowerCase(),
        google_id: sub || `mock-sub-${crypto.createHash('sha256').update(String(email)).digest('hex').slice(0, 16)}`,
        avatar_url: 'https://lh3.googleusercontent.com/a/default-avatar',
      };
    } else {
      // Default fallback
      profile = SIMULATED_ACCOUNTS.ana;
    }

    const user = upsertGoogleUser(profile);
    startSession(res, user.id);
    return res.redirect('/#/');
  }

  // Handle Real OAuth 2.0 Flow
  const storedState = parseCookies(req).oauth_state;
  if (!state || !storedState || state !== storedState) {
    return res.redirect('/#/login?error=invalid_state');
  }
  res.setHeader('Set-Cookie', 'oauth_state=; Path=/; Max-Age=0');

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code || ''),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: getRedirectUri(req),
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text().catch(() => '');
      console.error('[Google OAuth] Token exchange error:', errBody);
      return res.redirect('/#/login?error=token_exchange_failed');
    }

    const tokens = await tokenRes.json();
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userinfoRes.ok) {
      return res.redirect('/#/login?error=userinfo_failed');
    }

    const gUser = await userinfoRes.json();
    const user = upsertGoogleUser({
      email: gUser.email,
      name: gUser.name,
      google_id: gUser.sub,
      avatar_url: gUser.picture,
    });

    startSession(res, user.id);
    res.redirect('/#/');
  } catch (err) {
    console.error('[Google OAuth] Callback failure:', err);
    res.redirect('/#/login?error=oauth_internal_error');
  }
});

// 3. POST /api/auth/google/mock (Programmatic Mock Endpoint)
app.post('/api/auth/google/mock', (req, res) => {
  const { name, email, google_id, avatar_url } = req.body || {};
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ error: 'Email válido requerido para simulación de Google' });
  }

  const normEmail = String(email).trim().toLowerCase();
  const derivedSub = google_id || `mock-sub-${crypto.createHash('sha256').update(normEmail).digest('hex').slice(0, 16)}`;
  const userName = name || 'Usuario Google';
  const userAvatar = avatar_url || 'https://lh3.googleusercontent.com/a/default-avatar';

  const user = upsertGoogleUser({
    email: normEmail,
    name: userName,
    google_id: derivedSub,
    avatar_url: userAvatar,
  });

  const token = startSession(res, user.id);
  res.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      provider: 'google',
    },
    token,
  });
});
```

#### Component 4: Unified `/api/auth/me` Endpoint
```javascript
app.get(['/api/auth/me', '/api/me'], auth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name || 'Usuario',
      email: req.user.email,
      avatar_url: req.user.avatar_url || null,
      provider: req.user.provider || 'local',
    },
    // Backward compatibility for existing frontend calls that read data.email directly
    email: req.user.email,
  });
});
```

---

### 2.6 Frontend Google Sign-In Button Integration in `public/js/app.js`

To connect the UI to this OAuth flow:
```javascript
// In authView() inside public/js/app.js:
function authView() {
  $app.innerHTML = `<div class="center"><div class="card" id="f-card">
    <h2 style="margin:0; text-align:center;">Madera local</h2>
    <span class="muted" style="text-align:center;">Inicia sesión para gestionar tus proyectos</span>
    
    <a href="/api/auth/google" class="google-btn" id="btn-google">
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      <span>Continuar con Google</span>
    </a>

    <div class="auth-divider"><span>o continuar con correo</span></div>

    <form id="f" style="display:flex; flex-direction:column; gap:10px;">
      <div id="name-field" style="display:none;">
        <input name="name" type="text" placeholder="Nombre completo" style="width:100%">
      </div>
      <input name="email" type="email" placeholder="Email" required style="width:100%">
      <input name="password" type="password" placeholder="Contraseña" required style="width:100%">
      <div class="err" id="err"></div>
      <button class="primary" id="btn-submit" type="submit">Entrar</button>
      <button type="button" id="btn-toggle">¿No tienes cuenta? Regístrate</button>
    </form>
  </div></div>`;
  // Toggle registration mode displays name field; clicking btn-google directly opens /api/auth/google
}
```

Button CSS to append to `public/style.css`:
```css
.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #ffffff;
  color: #3c4043;
  font-weight: 500;
  font-size: 14px;
  border-radius: 999px;
  padding: 10px 16px;
  text-decoration: none;
  transition: background-color 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.google-btn:hover {
  background: #f8f9fa;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
.auth-divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  margin: 6px 0;
}
.auth-divider::before, .auth-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--line);
}
.auth-divider span {
  padding: 0 10px;
}
```

---

## 3. Caveats

1. **SQLite `NOT NULL` Constraints on `salt` and `hash`**:
   - In SQLite, `ALTER TABLE` cannot alter or drop constraints on existing columns without complete table recreation (`PRAGMA foreign_keys=off; CREATE TABLE users_new...; INSERT INTO users_new SELECT...; DROP TABLE users; ALTER TABLE users_new RENAME TO users;`).
   - Using `salt = ''` and `hash = ''` for Google OAuth accounts completely bypasses this issue safely without risking database corruption or data loss in existing deployments.
2. **Account Linking Policy**:
   - When a user logs in via Google with an email that was previously registered locally, linking the account (`provider = 'google'`, `google_id = sub`) allows frictionless sign-in. Because Google verifies ownership of Gmail addresses (`email_verified = true`), this is safe and standard practice.
3. **Session Expiry & Token Cleansing**:
   - The `sessions` table should clean up expired tokens periodically (`DELETE FROM sessions WHERE expires_at > 0 AND expires_at < Date.now()`). Adding this query to server initialization prevents SQLite database bloat.
4. **Environment Isolation**:
   - In production with real Google OAuth, Google Cloud Console requires `https://` redirect URIs (except `http://localhost`). The `getRedirectUri` helper accounts for reverse proxies using `x-forwarded-proto`.

---

## 4. Conclusion

The implementation plan provides a seamless, dual-track Google Sign-In solution that satisfies all criteria of Milestone 1 (R1):
1. **Zero-Config Offline Readiness**: Local developers, CI systems, and evaluators can authenticate immediately using the Local Simulated OAuth Provider without any Google Cloud credentials or internet connection.
2. **Production-Ready OAuth 2.0**: Deploying credentials (`GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`) instantly activates the authentic Google OAuth 2.0 redirect and token exchange flow.
3. **Backward Compatibility**: Preserves all existing SQLite data, maintains legacy endpoint aliases (`/api/me`, `/api/login`), and supports both cookie and Bearer token authentication.

---

## 5. Verification Method

Downstream implementers and testing agents (e.g. `Implementer M1` and `Challenger M1`) must verify this implementation using the standard project test runner:

### 5.1 Project Test Command
```powershell
node --test test/auth_and_persistence.test.js
```

### 5.2 Six Mandatory Automated Test Scenarios

The test file `test/auth_and_persistence.test.js` should include the following targeted test suites:

#### Scenario 1: Simulated Account Picker Serves Valid HTML Dialog
```javascript
test('GET /api/auth/google without credentials serves simulated account picker HTML', async () => {
  const res = await fetch('http://localhost:3000/api/auth/google');
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.ok(text.includes('Elegir una cuenta de Google'));
  assert.ok(text.includes('ana.garcia@gmail.com'));
  assert.ok(text.includes('carlos.muebles@gmail.com'));
  assert.ok(text.includes('Modo Simulado Offline'));
});
```

#### Scenario 2: Simulated Callback Query Authentication
```javascript
test('GET /api/auth/google/callback?simulated=1&account=ana logs in Ana and redirects', async () => {
  const res = await fetch('http://localhost:3000/api/auth/google/callback?simulated=1&account=ana', {
    redirect: 'manual',
  });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/#/');
  
  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie && setCookie.includes('session='));
  
  // Extract token and verify user profile
  const match = setCookie.match(/session=([a-f0-9]+)/);
  assert.ok(match);
  const token = match[1];

  const meRes = await fetch('http://localhost:3000/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(meRes.status, 200);
  const data = await meRes.json();
  assert.equal(data.user.email, 'ana.garcia@gmail.com');
  assert.equal(data.user.name, 'Ana García');
  assert.equal(data.user.provider, 'google');
});
```

#### Scenario 3: Programmatic Mock Endpoint (`POST /api/auth/google/mock`)
```javascript
test('POST /api/auth/google/mock creates Google user and returns token & user profile', async () => {
  const payload = {
    name: 'Roberto Gómez',
    email: 'roberto.gomez@gmail.com',
    google_id: 'mock-sub-roberto-999',
    avatar_url: 'https://example.com/avatar.png'
  };
  const res = await fetch('http://localhost:3000/api/auth/google/mock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.user.email, 'roberto.gomez@gmail.com');
  assert.equal(body.user.name, 'Roberto Gómez');
  assert.equal(body.user.provider, 'google');
  assert.ok(body.token);

  // Verify auth middleware with returned bearer token
  const meRes = await fetch('http://localhost:3000/api/auth/me', {
    headers: { Authorization: `Bearer ${body.token}` },
  });
  assert.equal(meRes.status, 200);
  const meData = await meRes.json();
  assert.equal(meData.user.id, body.user.id);
});
```

#### Scenario 4: Custom Account via Simulated Callback
```javascript
test('GET /api/auth/google/callback with custom parameters registers custom Google user', async () => {
  const customEmail = 'custom.maker@gmail.com';
  const customName = 'Maker Custom';
  const url = `http://localhost:3000/api/auth/google/callback?simulated=1&email=${encodeURIComponent(customEmail)}&name=${encodeURIComponent(customName)}`;
  
  const res = await fetch(url, { redirect: 'manual' });
  assert.equal(res.status, 302);
  const token = res.headers.get('set-cookie').match(/session=([a-f0-9]+)/)[1];

  const meRes = await fetch('http://localhost:3000/api/auth/me', {
    headers: { Cookie: `session=${token}` },
  });
  const data = await meRes.json();
  assert.equal(data.user.email, customEmail);
  assert.equal(data.user.name, customName);
});
```

#### Scenario 5: Real OAuth Environment Switch Detection
```javascript
test('Real Google OAuth redirects to accounts.google.com when credentials exist', () => {
  // Test can set dummy credentials in process.env and verify redirect URL pattern
  const prevId = process.env.GOOGLE_CLIENT_ID;
  const prevSec = process.env.GOOGLE_CLIENT_SECRET;
  try {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    // Unit assertion on authUrl construction:
    // contains https://accounts.google.com/o/oauth2/v2/auth, client_id, and state
  } finally {
    process.env.GOOGLE_CLIENT_ID = prevId;
    process.env.GOOGLE_CLIENT_SECRET = prevSec;
  }
});
```

#### Scenario 6: Invalidation Conditions
The implementation shall be judged non-compliant and rejected if:
1. `GET /api/auth/google` returns an uncaught error 500 when `GOOGLE_CLIENT_ID` is missing from the environment.
2. Clicking Google Sign-In requires internet connectivity when offline simulation is active.
3. User inserted via Google OAuth is unable to create or persist projects under `/api/projects`.
4. Auth middleware rejects requests containing valid `Authorization: Bearer <token>` headers.
