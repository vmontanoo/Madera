## 2026-10-23T01:08:48Z

You are Worker M1-1 (Implement Modern Authentication & SQLite Persistence).
Your working directory is:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_worker_m1_1

CRITICAL MANDATORY INSTRUCTIONS:
- Read ORIGINAL_REQUEST.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md (§ 2026-10-23T00:40:10Z, R1)
- Read master PROJECT.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\orchestrator_2\PROJECT.md
- Read M1 Explorer blueprints at:
  - C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m1_1\handoff.md
  - C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m1_2\handoff.md
  - C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m1_3\handoff.md

EXCLUSIVE WRITE OWNERSHIP:
You own and may edit the following files:
- `server/server.js`
- `public/js/app.js`
- `public/style.css`
- `test/auth_and_persistence.test.js`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

IMPLEMENTATION DETAILS:
1. `server/server.js`:
   - SQLite auto-migration helper `migrateDb(db)`: enable `PRAGMA foreign_keys = ON;`, check and add missing columns using `PRAGMA table_info` (`users`: `name`, `provider`, `google_id`, `avatar_url`, `created_at`; `sessions`: `expires_at`; `projects`: `description`, `thumbnail`, `created_at`).
   - Async scrypt password hashing via `promisify(crypto.scrypt)` (`cost: 16384` or `1024` if `process.env.NODE_ENV === 'test'`).
   - Registration validation (`POST /api/auth/register` & `/api/register`): `name` (2-100 chars), `email` (RFC regex, lowercase, unique check), `password` (6-128 chars). Issue session token (32 random bytes), set `session` cookie (90 days, HttpOnly, Lax), return 201 with `{ user, token }`.
   - Login (`POST /api/auth/login` & `/api/login`): timing-safe hash comparison via `crypto.timingSafeEqual`. Issue session token, set cookie, return `{ user, token }`.
   - Auth middleware: extract token from either `req.headers.cookie` (`session=<token>`) OR `req.headers.authorization` (`Bearer <token>`). Attach user profile to `req.user`.
   - `/api/auth/me` & `/api/me`: return `{ user: { id, name, email, avatar_url, provider }, email }`.
   - `/api/auth/logout` & `/api/logout`: delete session from SQLite, clear cookie (`Max-Age=0`).
   - Google Sign-In: Detect `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. If absent or simulated, serve Google Account Picker dialog (`/api/auth/google`) with preconfigured accounts (Ana García, Carlos Diseñador) and custom account form. Implement callback `GET /api/auth/google/callback` and programmatic mock endpoint `POST /api/auth/google/mock`. Upsert Google user into SQLite (`provider = 'google'`), create session, set cookie, and redirect to `/#/`.
2. `public/js/app.js`:
   - Module-level `currentUser` state. `fetchSession()` verifies session and saves user.
   - Modern `authView()`: tabs for "Iniciar sesión" and "Crear cuenta".
   - Registration form includes Full Name (`name`), Email, Password with client-side validation hints.
   - Official Google Sign-In button per branding guidelines with multi-color SVG icon navigating to `/api/auth/google`.
   - Error banner `#authErr` with auto-clear on input.
   - Profile indicator with `renderUserAvatar()` in `listView()` header and `editorView()` topbar.
   - Logout button calling `/api/auth/logout`.
3. `public/style.css`:
   - Auth card, tab styling, Google button, error banner, profile chips and avatar badges.
4. `test/auth_and_persistence.test.js`:
   - Comprehensive test suite validating registration validation, timing-safe login, session cookies, Bearer tokens, simulated Google OAuth, profile endpoint, logout, and IDOR project protection.

VERIFICATION REQUIREMENT:
Run `node --test test/*.test.js`.
Ensure ALL tests pass (all prior test suites + new `auth_and_persistence.test.js`).
Document verification commands and passing results in your `handoff.md`.
Notify parent via `send_message` when done.
