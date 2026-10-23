# Project: Madera Local - Professional Evolution (R1–R4)

## Architecture
- **Stack**: Pure ECMAScript Modules (ESM) running natively in browser via import maps (Three.js 0.170.0 + addons), Express backend (4.19.2), SQLite persistence via Node built-in `node:sqlite` (`DatabaseSync`), native Node test runner (`node --test`).
- **Data Flow**:
  1. **Authentication & Persistence**:
     - Express routes (`server/server.js`) handle `/api/auth/register`, `/api/auth/login`, `/api/auth/google`, `/api/auth/logout`, `/api/auth/me` (with legacy `/api/*` aliases).
     - SQLite `data/madera.db` stores users, sessions, and projects with auto-migration (`PRAGMA table_info` + `ALTER TABLE`).
     - Local simulated Google Account Chooser provides 100% offline development OAuth support.
  2. **Dashboard & Demo Catalog**:
     - `public/js/demos.js` exports 4 pre-designed furniture models (Closet modular, Mesa de noche, Centro de TV, Mueble bajo de cocina) with cloning helper.
     - `public/js/app.js` renders dual-tab dashboard ("Mis Proyectos" active/shaded + "Galería de Demos"), "+ Nuevo mueble", "Importar archivo" JSON, and project actions (Abrir, Renombrar, Duplicar, Eliminar).
  3. **Modular Geometry, Doors & Cutlist**:
     - `public/js/layout.js` expands `FRONTS` (`sliding`, `bifold`, `lift-up`, `doors`, `left-door`, `right-door`), generates 3D panel coordinates, and calculates itemized hardware (`slidingTracks`, `bifoldHinges`, `bifoldGuides`, `gasStruts`, `hinges`, `slides`, `pulls`).
     - Dock control panel in `public/js/app.js` is cleaned up: obsolete door entries removed from `newType`, buttons streamlined into a 2-tier layout.
  4. **Advanced 3D Viewer Pipeline**:
     - `public/js/viewer.js` integrates top toolbar for render modes (`normal`, `open`, `explode`) and themes (`realistic` vs `neon`).
     - Real-time soft shadows with `THREE.PCFSoftShadowMap` and shadow-receiving ground plane.
     - Neon theme with carbon dark background, neon orange edges, and procedural dotted floor grid.
     - Interactive 3D orientation gizmo via `three/addons/helpers/ViewHelper.js` with smooth camera slerp tweening on axis click.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | User Registration & Validation | User registration with name, email, password, async scrypt hashing | M1 | R1 Spec & AC 1 |
| 2 | Timing-Safe Login & Sessions | Login with crypto.timingSafeEqual, cookie and Bearer token auth middleware | M1 | R1 Spec & AC 1 |
| 3 | Simulated & Real Google Sign-In | Google OAuth with automatic fallback to local simulated Google Account Chooser | M1 | R1 Spec & AC 2 |
| 4 | SQLite Auto-Migration | Auto-migration of users, sessions, and projects tables in data/madera.db | M1 | R1 Spec & AC 1 |
| 5 | Dual-Tab Dashboard | Main dashboard with "Mis Proyectos" (active/shaded) and "Galería de Demos" tabs | M2 | R2 Spec & AC 1 |
| 6 | 4 Pre-Designed Demos | Closet modular, Mesa de noche, Centro TV, Mueble bajo de cocina modular | M2 | R2 Spec & AC 2 |
| 7 | Projects CRUD & Renaming | List, open, inline rename (PUT /api/projects/:id), duplicate, delete | M2 | R2 Spec & AC 1 |
| 8 | New Project & JSON Import | Header buttons "+ Nuevo mueble" and "Importar archivo" (JSON validation) | M2 | R2 Spec & AC 3 |
| 9 | UI Control Cleanup | Remove obsolete buttons from dock, prune door types from newType dropdown | M3 | R3 Spec & AC 1 |
| 10 | Expanded Door Types | Sliding doors (corredizas), bi-fold (plegables), lift-up flap (abatible arriba) | M3 | R3 Spec & AC 2 |
| 11 | Cutlist Hardware Integration | Automatic calculation of sliding tracks, bi-fold hinges/guides, gas struts | M3 | R3 Spec & AC 3 |
| 12 | 3D Render Modes | Normal (closed), Puertas abiertas (animated hinges & slides), Despiece (exploded) | M4 | R4 Spec & AC 1 |
| 13 | 3D Visual Themes | Realistic wood vs Charcoal black with neon orange edges and dotted floor grid | M4 | R4 Spec & AC 2 |
| 14 | Real-Time Soft Shadows | PCFSoftShadowMap, directional shadows with normalBias, ground shadow plane | M4 | R4 Spec & AC 3 |
| 15 | 3D Orientation Gizmo | Interactive Three.js ViewHelper in bottom-right corner synchronized with camera | M4 | R4 Spec & AC 4 |
| 16 | Multi-Tier Acceptance Suite | Comprehensive unit, E2E, adversarial stress tests, and forensic verification | M5 | Full Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Modern Authentication & SQLite Persistence (R1) | Registration, Login, Google Sign-In (OAuth & Simulated), sessions, DB migration | none | DONE |
| M2 | Main Dashboard, Demos & Projects JSON (R2) | Dual-tab dashboard, 4 pre-designed demos, project actions, JSON import | M1 | DONE |
| M3 | UI Control Cleanup & Expanded Doors (R3) | Prune obsolete buttons, sliding/bifold/lift-up doors, hardware calculation | none | DONE |
| M4 | Advanced 3D Viewer Modes, Themes & Gizmo (R4) | Render modes, visual themes, PCF soft shadows, ViewHelper orientation gizmo | M3 | PLANNED |
| M5 | E2E Integration, Dual-Track & Acceptance (R1–R4) | Full integration test suite, cross-feature stress tests, forensic audit | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### Auth API ↔ Client
- `POST /api/auth/register`: body `{ name, email, password }` -> returns `{ user: { id, name, email, provider }, token }`, sets `session` cookie.
- `POST /api/auth/login`: body `{ email, password }` -> returns `{ user, token }`, sets `session` cookie.
- `GET /api/auth/google`: redirects to Google OAuth or serves simulated account picker.
- `POST /api/auth/google/mock`: body `{ name, email, google_id }` -> returns `{ user, token }`, sets `session` cookie.
- `GET /api/auth/me`: requires session cookie or `Authorization: Bearer <token>` -> returns `{ user }`.
- `POST /api/auth/logout`: deletes session token and clears cookie.

### Demos Contract (`public/js/demos.js`)
- `DEMOS`: Array of 4 objects `{ id, name, category, description, dimensions, tags, data }`.
- `cloneDemoProject(demoId)`: Deep-clones `data` and assigns new unique IDs to all columns and module nodes.

### Door Geometry Contract (`layout.js`)
- `sliding`: 2 overlapping panels on double tracks. Inner door at `z = D`, outer door at `z = D + t + 2`.
- `bifold`: 2 articulated leaves with `side = 'bifold-anchor'` and `side = 'bifold-fold'`.
- `lift-up`: 1 horizontal flap door hinged at top with gas struts.
- `ROLE`: Maps all door types to `'door-front'`, ensuring ID prefix `'O'` in tabular cutlist.

### 3D Viewer Toolbar Contract (`viewer.js`)
- `viewer.setRenderMode('normal' | 'open' | 'explode')`: triggers lerp animation for door pivots and drawer slides.
- `viewer.setVisualTheme('realistic' | 'neon')`: toggles palette, neon orange edges, and dotted floor grid.
- `viewer.resetCamera()`: centers camera on furniture bounding box.

## Code Layout
- `server/server.js`: Express server, SQLite migrations, auth endpoints, project CRUD.
- `public/js/demos.js`: Pre-designed demo furniture definitions and cloning utility.
- `public/js/app.js`: Dashboard views, tabs, JSON import, dock controls, 2D SVG canvas.
- `public/js/model.js`: Pure data mutations and normalization.
- `public/js/layout.js`: Geometry computation, door kinematics, cutlist & hardware calculations.
- `public/js/viewer.js`: Three.js 3D viewer, render modes, visual themes, shadows, ViewHelper gizmo.
- `public/style.css`: Dashboard tabs, cards, toolbar, theme styling, print stylesheet.
- `test/auth_and_persistence.test.js`: M1 auth and SQLite persistence test suite.
- `test/m1_challenger_empirical.test.js`: M1 empirical challenger test suite.
- `test/adversarial_auth_m1.test.js`: M1 adversarial security stress test suite.
- `test/dashboard_and_doors.test.js`: M2 & M3 dashboard, demos, and doors test suite.
- `test/adversarial_m2_json_demos.test.js`: M2 adversarial stress test suite.
- `test/m2_challenger_empirical_v2.test.js`: M2 empirical verification test suite.
- `test/viewer_3d.test.js`: M4 3D viewer modes and themes test suite.
- `test/e2e_evolution_complete.test.js`: M5 end-to-end integration and acceptance test suite.
