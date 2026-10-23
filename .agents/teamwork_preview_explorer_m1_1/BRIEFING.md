# BRIEFING — 2026-10-23T01:02:00Z

## Mission
Investigate and formulate the exact, production-ready implementation plan for Milestone 1 (R1): Backend Auth & SQLite Auto-Migration in `server/server.js`, and test design in `test/auth_and_persistence.test.js`.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m1_1
- Original parent: 6ff36568-731c-48e7-b25c-de212f052b2a
- Milestone: Milestone 1 (R1 - Top exterior modules without compression)
- Evolution Milestone: Milestone 1 (R1 - Backend Auth & SQLite Auto-Migration, parent: 26f35015-7be0-4bcc-8782-f2f9772b124d)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement in source code
- Inspect `addOnTop` and `wrap` in `public/js/model.js` and `computeLayout` in `public/js/layout.js`
- Formulate exact algorithm to freeze/lock current module heights in mm across all columns before `project.settings.height` increases
- Ensure newly created top module receives exact height `addedHeight` (default 350mm)
- Verify existing modules across all columns preserve exact heights
- Provide exact code changes and unit test assertions in `handoff.md`
- Inspect `server/server.js` and design SQLite auto-migrations on startup (`users`, `sessions`, `PRAGMA foreign_keys = ON;`)
- Design input validation and async scrypt password hashing for `POST /api/auth/register` (and `/api/register`)
- Design timing-safe login, session generation, and HTTP-only cookie for `POST /api/auth/login` (and `/api/login`)
- Design dual auth middleware (cookie + Bearer token), `/api/auth/me`, and `/api/auth/logout`
- Design complete automated test script `test/auth_and_persistence.test.js`

## Current Parent
- Conversation ID: 26f35015-7be0-4bcc-8782-f2f9772b124d
- Updated: 2026-10-23T01:02:00Z

## Investigation State
- **Explored paths**: `server/server.js`, `package.json`, `ORIGINAL_REQUEST.md`, `PROJECT.md`, `Survey 1 handoff`, existing test suite in `test/`.
- **Key findings**:
  1. `node:sqlite` `DatabaseSync` in Node 22 supports synchronous execution of `PRAGMA table_info(tableName)` to discover existing columns and dynamically run `ALTER TABLE tableName ADD COLUMN colDef`.
  2. `users` table currently has only `(id, email, salt, hash)`. Needs: `name TEXT NOT NULL DEFAULT 'Usuario'`, `google_id TEXT UNIQUE`, `avatar_url TEXT`, `provider TEXT DEFAULT 'local'`, `created_at INTEGER DEFAULT 0`. Furthermore, `salt` and `hash` must be nullable for Google OAuth users.
  3. `sessions` table currently has only `(token, user_id, created_at)`. Needs: `expires_at INTEGER DEFAULT 0`.
  4. `projects` table can also be enriched with `description TEXT DEFAULT ''`, `thumbnail TEXT DEFAULT ''`, `created_at INTEGER DEFAULT 0` for R2.
  5. `PRAGMA foreign_keys = ON;` must be run immediately after opening the DB connection.
  6. `POST /api/auth/register` (and `/api/register` alias): RFC regex email validation, lowercase, 2-100 char name, 6-128 char password. Async scrypt with cost parameter (16384 default, 1024 if `NODE_ENV === 'test'`). Returns 201 `{ user: { id, name, email, avatar_url, provider }, token }`.
  7. `POST /api/auth/login` (and `/api/login` alias): scrypt with user salt, timing-safe equality check via `crypto.timingSafeEqual`, session token generation (32 bytes hex, 90 day expiry), HTTP-only cookie with `HttpOnly; Path=/; SameSite=Lax; Max-Age=7776000`. Returns `{ user, token }`.
  8. Auth middleware: parses cookie (`session=<token>`) OR header `Authorization: Bearer <token>`, verifies token in DB and ensures `expires_at > Date.now()` (or within 90 days of `created_at`), attaches `req.user`.
  9. `test/auth_and_persistence.test.js` specification: comprehensive suite covering migration verification, validation edge cases, timing-safe login, cookie and bearer token auth, profile retrieval, logout revocation, and session expiration.
- **Unexplored areas**: None.

## Key Decisions Made
- Use `PRAGMA table_info` migration helper function `migrateTable(db, tableName, columns)` to make table evolution idempotent and completely non-destructive.
- Implement promisified `crypto.scrypt` with dynamic cost parameter (`process.env.NODE_ENV === 'test' ? 1024 : 16384`) for fast tests and production security.
- Maintain full backward compatibility for `/api/register`, `/api/login`, `/api/logout`, `/api/me`.

## Artifact Index
- BRIEFING.md — Persistent situational awareness
- DISPATCH.md — Incoming directives log
- progress.md — Liveness heartbeat and milestone progress
- handoff.md — Final 5-component handoff report

