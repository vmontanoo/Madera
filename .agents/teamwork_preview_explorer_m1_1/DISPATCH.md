# Dispatch: Explorer M1-1 (Backend Auth & SQLite Auto-Migration)

Working directory: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m1_1
Read ORIGINAL_REQUEST.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md
Read PROJECT.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\orchestrator_2\PROJECT.md
Read Survey 1 report at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_survey_1\handoff.md

Your focus:
- Formulate exact implementation strategy for SQLite auto-migrations in `server/server.js` (`PRAGMA table_info` + `ALTER TABLE ADD COLUMN` for `users`, `sessions`, `projects`).
- Formulate exact validation and async scrypt password hashing for `POST /api/auth/register` and timing-safe `POST /api/auth/login`.
- Formulate dual auth middleware (cookie + Bearer token) and `/api/auth/me`, `/api/auth/logout`.
- Write your report to handoff.md in your working directory.
- DO NOT edit source code files. You are an exploratory agent.

## 2026-10-23T00:58:00Z
<USER_REQUEST>
You are Explorer M1-1 (Backend Auth & SQLite Auto-Migration).
Your working directory is:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m1_1

CRITICAL MANDATORY INSTRUCTIONS:
- Read ORIGINAL_REQUEST.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md (§ 2026-10-23T00:40:10Z, R1)
- Read master PROJECT.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\orchestrator_2\PROJECT.md
- Read Survey 1 handoff at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_survey_1\handoff.md

TASK:
Examine `server/server.js` and determine the exact, production-ready implementation plan for:
1. SQLite Auto-Migrations on server startup:
   - Check `users` table: add `name`, `google_id`, `avatar_url`, `provider`, `created_at` if missing via `ALTER TABLE`.
   - Check `sessions` table: add `expires_at` if missing.
   - Enforce `PRAGMA foreign_keys = ON;`.
2. Input validation for `POST /api/auth/register` (and `/api/register`):
   - `name`: 2 to 100 characters.
   - `email`: RFC regex, lowercase, unique check.
   - `password`: min 6 chars, max 128 chars.
   - Asynchronous password hashing via `promisify(crypto.scrypt)` (cost: 16384, or 1024 in test mode).
3. Secure login for `POST /api/auth/login` (and `/api/login`):
   - Timing-safe hash comparison via `crypto.timingSafeEqual`.
   - Session generation: 32 random bytes hex token, 90-day expiry.
   - HTTP-only cookie `session=<token>; HttpOnly; Path=/; SameSite=Lax; Max-Age=7776000`.
4. Auth Middleware & Profile:
   - Accept either `req.headers.cookie` (`session=<token>`) OR `req.headers.authorization` (`Bearer <token>`).
   - `/api/auth/me` returning `{ user: { id, name, email, avatar_url, provider } }`.
   - `/api/auth/logout` deleting session from SQLite and clearing cookie.
5. Automated test script design (`test/auth_and_persistence.test.js`) verifying all backend requirements.

Write a complete, structured report to:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m1_1\handoff.md
DO NOT modify any source code files. You are an exploratory agent.
</USER_REQUEST>
