## 2026-10-23T01:40:42Z

You are Worker M2 (Dashboard, Pre-Designed Demos & Projects JSON).
Your working directory is:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_worker_m2_v2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL MANDATORY INSTRUCTIONS:
- Read ORIGINAL_REQUEST.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md (§ 2026-10-23T00:40:10Z, R2)
- Read master PROJECT.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\orchestrator_2\PROJECT.md
- Read all 3 Explorer handoff blueprints before writing code:
  1. Demos blueprint: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m2_v2_1\handoff.md
  2. Dashboard UI & Actions blueprint: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m2_v2_2\handoff.md
  3. JSON Import & New Project blueprint: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m2_v2_3_rep\handoff.md

TASK DESCRIPTION:
Implement all features for Milestone 2 (Requirement R2):

1. Create `public/js/demos.js`:
   - Export `DEMOS`: array of 4 pre-designed modular furniture items:
     a) `closet-modular` ("Closet modular completo", 2022 × 2100 × 550 mm, category "Dormitorio")
     b) `mesa-noche` ("Mesa de noche moderna", 536 × 550 × 400 mm, category "Dormitorio")
     c) `centro-tv` ("Centro de entretenimiento / TV", 1872 × 600 × 420 mm, category "Living / TV")
     d) `cocina-bajo` ("Mueble bajo de cocina modular", 1254 × 850 × 580 mm, category "Cocina")
     Each item must have: `id`, `name`, `category`, `description`, `dimensions`, `tags`, and `data` (with settings and columns).
   - Export `cloneDemoProject(demoId)`: Deep-clones the demo project data and re-generates all column and module IDs using `uid()` to avoid ID collisions or reference sharing. Returns `{ name, data }`.

2. Update `public/js/app.js`:
   - Import `{ DEMOS, cloneDemoProject } from './demos.js';`
   - Maintain module-level tab state `let activeDashboardTab = 'projects';`
   - Update `listView()`:
     - Render `.dash-tabs` with "Mis Proyectos" (`#tabProjects`, active/shaded by default with badge `#badgeProjects` showing projects count) and "Galería de Demos" (`#tabDemos` with badge `#badgeDemos` showing 4).
     - Preserve both panes in the DOM: `#tabContentProjects` and `#tabContentDemos`.
     - Implement instant CSS/display tab toggle (`display: none` / `display: ''`) without network overhead or DOM flicker.
     - In `#tabContentDemos`, render `.demos-grid` with the 4 demo cards in a 2x2 layout, including category badges, dimension tags, description, feature tags, and "Abrir plantilla" CTA buttons. Clicking creates a project via `POST /api/projects` with cloned demo and navigates to `#/p/${id}`.
     - In `#tabContentProjects`, render project cards with:
       - Open: navigates to `#/p/${id}`.
       - Rename: prompts for new name, sends `PUT /api/projects/:id` with `{ name }`, and refreshes the list in-place via `refreshProjectsList()` preserving active tab.
       - Duplicate: calls `POST /api/projects/:id/duplicate` and refreshes list.
       - Delete: confirms with user, calls `DELETE /api/projects/:id`, decrements badge, and renders empty state if 0 projects remain.
     - Header actions in `listView()`:
       - "+ Nuevo mueble": creates blank default project (`M.defaultProject()`) via `POST /api/projects` and routes to `#/p/${r.id}`.
       - "Importar archivo": hidden `<input type="file" id="importInput" accept=".json,application/json">` triggered by button click.
       - FileReader parses JSON with error handling. Supports both direct `{ columns }` and envelope `{ name, data: { columns } }`. Deep numeric validation on dimensions. Normalizes via `M.normalizeProject()`. Persists via `POST /api/projects` and routes directly to editor.

3. Update `public/style.css`:
   - Append styles for `.dash-tabs`, `.dash-tab`, `.tab-badge`, `.tab-pane`, `.proj-list`, `.proj-info`, `.proj-actions`, `.btn-action`, `.empty-state`, `.demos-grid`, `.demo-card`, `.demo-badge`, `.demo-dim`, `.demo-title`, `.demo-desc`, `.demo-tags`, `.demo-tag`, `.btn-open-demo`.
   - Ensure responsive grid: 2 columns on desktop, 1 column on mobile (< 720px).

4. Create automated test suite `test/dashboard_and_doors.test.js`:
   - Test `DEMOS` export structure and all 4 demo configurations.
   - Test `cloneDemoProject` isolation (no reference sharing, new UIDs).
   - Test JSON import parsing and validation logic (valid envelope, direct columns, invalid JSON, missing columns, malformed numbers).
   - Test project CRUD lifecycle with SQLite database (create, rename via PUT, duplicate, delete).
   - Run tests natively via `run_command` using `node --test test/dashboard_and_doors.test.js` and `node --test test/auth_and_persistence.test.js`. Ensure 100% PASS with 0 regressions.
