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
  salt TEXT NOT NULL DEFAULT '',
  hash TEXT NOT NULL DEFAULT '',
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
  database.exec('PRAGMA foreign_keys = ON;');

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
  if (!userCols.has('provider')) {
    database.exec("ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'local';");
  }
  if (!userCols.has('google_id')) {
    database.exec('ALTER TABLE users ADD COLUMN google_id TEXT;');
  }
  if (!userCols.has('avatar_url')) {
    database.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT;');
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

// Clean up expired sessions on startup
try {
  db.prepare('DELETE FROM sessions WHERE expires_at > 0 AND expires_at < ?').run(Date.now());
} catch {}

// ============================================================================
// 2. CRYPTOGRAPHIC & SESSION HELPERS
// ============================================================================
const scryptAsync = promisify(crypto.scrypt);
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;
const EMAIL_REGEX = /^[a-z0-9._%+\-]+@[a-z0-9\-]+(\.[a-z0-9\-]+)*\.[a-z]{2,}$/i;

async function hashPassword(password, salt) {
  const cost = process.env.NODE_ENV === 'test' ? 1024 : 16384;
  const derivedKey = await scryptAsync(String(password), salt, 64, {
    cost,
    blockSize: 8,
    parallelization: 1,
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
    name: row.name || 'Usuario',
    email: row.email,
    avatar_url: row.avatar_url || null,
    provider: row.provider || 'local',
    created_at: row.user_created_at,
  };
  req.sessionToken = token;
  next();
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
    `).run(google_id || user.google_id || null, name || user.name || 'Usuario', avatar_url || user.avatar_url || null, user.id);
    return db.prepare('SELECT id, name, email, avatar_url, provider FROM users WHERE id = ?').get(user.id);
  }

  const now = Date.now();
  const r = db.prepare(`
    INSERT INTO users (email, name, salt, hash, google_id, avatar_url, provider, created_at)
    VALUES (?, ?, '', '', ?, ?, 'google', ?)
  `).run(normEmail, name || 'Usuario Google', google_id || null, avatar_url || null, now);

  return {
    id: Number(r.lastInsertRowid),
    name: name || 'Usuario Google',
    email: normEmail,
    avatar_url: avatar_url || null,
    provider: 'google',
  };
}

// ============================================================================
// 4. EXPRESS APPLICATION SETUP & ROUTES
// ============================================================================
const app = express();
app.use(express.json({ limit: '5mb' }));
app.use('/vendor/three', express.static(path.join(root, 'node_modules', 'three')));
app.use(express.static(path.join(root, 'public')));

// ----------------------------------------------------------------------------
// 4.1 Registration Handlers
// ----------------------------------------------------------------------------
const handleRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
    }

    if (typeof email !== 'string') {
      return res.status(400).json({ error: 'Email requerido' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 255) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Ese email ya está registrado' });
    }

    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'La contraseña debe tener entre 6 y 128 caracteres' });
    }

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
        provider: 'local',
      },
      email: normalizedEmail,
      token,
    });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

app.post('/api/auth/register', handleRegister);
app.post('/api/register', handleRegister);

// ----------------------------------------------------------------------------
// 4.2 Login Handlers
// ----------------------------------------------------------------------------
const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password || (typeof password === 'string' && password.trim() === '')) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (!u) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (u.provider === 'google' && (!u.hash || u.hash === '')) {
      return res.status(401).json({ error: 'Esta cuenta utiliza Google Sign-In' });
    }

    const candidateHash = await hashPassword(String(password), u.salt || '');
    const candidateBuf = Buffer.from(candidateHash, 'hex');
    const storedBuf = Buffer.from(u.hash || '', 'hex');

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
        provider: u.provider || 'local',
      },
      email: u.email,
      token,
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

app.post('/api/auth/login', handleLogin);
app.post('/api/login', handleLogin);

// ----------------------------------------------------------------------------
// 4.3 Profile & Session Status Handlers
// ----------------------------------------------------------------------------
const handleMe = (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name || 'Usuario',
      email: req.user.email,
      avatar_url: req.user.avatar_url || null,
      provider: req.user.provider || 'local',
    },
    email: req.user.email,
  });
};

app.get('/api/auth/me', auth, handleMe);
app.get('/api/me', auth, handleMe);

// ----------------------------------------------------------------------------
// 4.4 Logout Handlers
// ----------------------------------------------------------------------------
const handleLogout = (req, res) => {
  const token = extractToken(req);
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.setHeader('Set-Cookie', 'session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
  res.json({ ok: true });
};

app.all('/api/auth/logout', handleLogout);
app.all('/api/logout', handleLogout);

// ----------------------------------------------------------------------------
// 4.5 Google OAuth & Simulated Provider
// ----------------------------------------------------------------------------
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const HAS_REAL_GOOGLE = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

function getRedirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}/api/auth/google/callback`;
}

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
      const norm = String(email).trim().toLowerCase();
      profile = {
        name: name ? String(name).trim() : 'Usuario Google',
        email: norm,
        google_id: sub || `mock-sub-${crypto.createHash('sha256').update(norm).digest('hex').slice(0, 16)}`,
        avatar_url: 'https://lh3.googleusercontent.com/a/default-avatar',
      };
    } else {
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

// ----------------------------------------------------------------------------
// 4.6 Projects API
// ----------------------------------------------------------------------------
app.get('/api/projects', auth, (req, res) => {
  res.json(
    db
      .prepare('SELECT id, name, description, thumbnail, updated_at, created_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC')
      .all(req.user.id)
  );
});

app.post('/api/projects', auth, (req, res) => {
  const { name, data, description, thumbnail } = req.body || {};
  const now = Date.now();
  const r = db
    .prepare('INSERT INTO projects (user_id, name, data, description, thumbnail, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.id, name || 'Sin título', JSON.stringify(data || {}), description || '', thumbnail || '', now, now);
  res.status(201).json({ id: Number(r.lastInsertRowid), name: name || 'Sin título', updated_at: now });
});

const own = (req) =>
  db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);

app.get('/api/projects/:id', auth, (req, res) => {
  const p = own(req);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  res.json({
    id: p.id,
    name: p.name,
    description: p.description || '',
    thumbnail: p.thumbnail || '',
    data: JSON.parse(p.data),
    updated_at: p.updated_at,
    created_at: p.created_at,
  });
});

app.put('/api/projects/:id', auth, (req, res) => {
  const p = own(req);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  const { name, data, description, thumbnail } = req.body || {};
  db.prepare('UPDATE projects SET name = ?, data = ?, description = ?, thumbnail = ?, updated_at = ? WHERE id = ?').run(
    name ?? p.name,
    data ? JSON.stringify(data) : p.data,
    description ?? p.description,
    thumbnail ?? p.thumbnail,
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
    .prepare('INSERT INTO projects (user_id, name, data, description, thumbnail, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.user.id, p.name + ' copy', p.data, p.description || '', p.thumbnail || '', now, now);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

app.delete('/api/projects/:id', auth, (req, res) => {
  const p = own(req);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(p.id);
  res.json({ ok: true });
});

// Export app and components for testing
export { app, db, hashPassword, startSession, auth, migrateDb, upsertGoogleUser };

// Start listening if executed directly
if (process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'))) {
  app.listen(PORT, () => console.log(`Madera local en http://localhost:${PORT}`));
}
