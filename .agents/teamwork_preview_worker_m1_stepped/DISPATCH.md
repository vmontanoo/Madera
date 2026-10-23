## 2026-10-23T05:31:23Z
You are Worker M1 (Stepped Model & Layout Implementation) for the stepped modular furniture project.
Working Directory: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_worker_m1_stepped
Project Root: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local
Parent Conversation ID: 20a52755-88ff-4e04-950c-4b4a3c054fe0

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Files Owned Exclusively:
- public/js/model.js
- public/js/layout.js
- test/stepped_layout.test.js

Read Before Starting:
1. C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md (specifically timestamp ## 2026-10-23T05:16:05Z).
2. C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\orchestrator_4\PROJECT.md.
3. C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_stepped_survey_1\handoff.md (detailed blueprint for layout.js and model.js).
4. C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_stepped_survey_3\handoff.md (detailed blueprint for shared laterals and drawer indices).

Tasks:
1. In public/js/layout.js:
   - Export helper `getColumnHeight(col, settings)` which returns `col.height` if positive number, else `settings?.height || DEFAULTS.height`.
   - In `computeLayout(project)`:
     - Compute `colHeights = cols.map(c => getColumnHeight(c, s))` and `maxH = Math.max(...colHeights, s.height)`.
     - Outer laterals: left lateral sy is `colHeights[0] + 2 * s.overhang`; right lateral sy is `colHeights[cols.length - 1] + 2 * s.overhang`.
     - Intermediate shared laterals: each shared lateral between col i-1 and col i must have sy = `Math.max(colHeights[i - 1], colHeights[i]) + 2 * s.overhang`.
     - Top caps ('Tapa superior'): generated for each column i at `y: colHeights[i] - t` with `sx: c.width, sy: t, sz: cd, col: i`.
     - Base: generated for each column i at `y: 0`.
     - Back panel ('Fondo'): generated for each column i at `y: t - 10 + g` with height `sy: colHeights[i] - 2 * t + 20 - 2 * g`.
     - Root module placement: `place(c.root, x0, t, W, colHeights[i] - 2 * t, i)`.
     - Generate top-border divider handles for 2D drag: `{ type: 'col-top', axis: 'v', colIdx: i, colId: c.id, x: x0, y: colHeights[i] - t, w: W, h: t, cursor: 'ns-resize' }`.
     - In drawer generation, tag each piece in a drawer with `drawerIndex: idx` for kinematic grouping.
     - Return bundle must include `maxH`.
2. In public/js/model.js:
   - In `addOnTop(project, colId, type = 'shelf', addedHeight = 350, allColumns = false)`:
     - Default `allColumns = false` (stepped column mode).
     - When `allColumns === false`:
       - If sibling columns do not have an explicit `c.height`, set `c.height = project.settings.height` so their height is explicitly locked and invariant.
       - Add module ONLY to target column `col`. Do NOT add any modules to sibling columns.
       - Increment only target column: `col.height = (col.height || project.settings.height) + addedHeight + t`.
       - Do NOT increment `project.settings.height`.
     - When `allColumns === true`: maintain legacy behavior (add shelf to all columns and increment `project.settings.height`).
   - In `setSize`: when resizing root module vertically, update `f.col.height`.
   - In `normalizeProject`: ensure `c.height` is preserved if present.
3. Create test/stepped_layout.test.js:
   - Test independent column heights with unequal heights (e.g. 800mm and 1600mm).
   - Test that intermediate shared lateral rises to max(800, 1600) + 2*ov.
   - Test that top caps sit at respective column heights.
   - Test addOnTop(project, colId, 'shelf', 350, false) increases only target column height, leaves sibling column height untouched, and sibling modules have zero change.
   - Test fallback to project.settings.height when column.height is undefined.
4. Run tests:
   - `node --test test/stepped_layout.test.js`
   - `npm test`
   Ensure all tests pass 100% with 0 regressions.
5. Write handoff.md in your working directory and notify me via send_message.
