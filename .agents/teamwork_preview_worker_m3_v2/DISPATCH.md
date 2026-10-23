## 2026-10-23T02:07:39Z

You are Worker M3 (Implement UI Control Cleanup & Expanded Door Catalog per R3).
Your working directory is:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_worker_m3_v2

CRITICAL MANDATORY INSTRUCTIONS:
- Read ORIGINAL_REQUEST.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md (§ 2026-10-23T00:40:10Z, R3)
- Read master PROJECT.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\orchestrator_2\PROJECT.md
- Read M3-1 Explorer report at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m3_v2_1\handoff.md
- Read M3-2 Explorer report at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m3_v2_2\handoff.md

EXCLUSIVE WRITE OWNERSHIP:
You own and may edit the following files:
- `public/js/layout.js`
- `public/js/model.js`
- `public/js/app.js`
- `public/style.css`
- `test/dashboard_and_doors.test.js`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

TASK SPECIFICATION:
1. `public/js/layout.js`:
   - Expand `FRONTS = ['none', 'doors', 'left-door', 'right-door', 'sliding', 'bifold', 'lift-up']`.
   - Update `LABELS` with all 7 options in Spanish.
   - Update `DEFAULTS` with hardware prices:
     `slidingTrackPrice: 28, bifoldHingePrice: 4, bifoldGuidePrice: 8, gasStrutPrice: 6`.
   - Implement door geometry and kinematics in `doorOverlay(c, s, node)`:
     - `sliding`: 2 overlapping panels on double tracks.
       Inner door at z = s.depth, outer door at z = s.depth + s.thickness + 2.
       Width: `(cw - 2 * fc) / 2 + 15` (creating 30mm overlap). Height: `ch - 2 * fc`.
       Open state: inner door slides right, outer door slides left.
     - `bifold`: 2 folding leaves hinged together.
       Width per leaf: `(cw - 3 * fc) / 2`. Height: `ch - 2 * fc`.
       Leaf 1 hinged to left stile; Leaf 2 hinged to Leaf 1 folding outward/accordion in open state.
     - `lift-up`: 1 flap panel hinged at top rail.
       Width: `cw - 2 * fc`. Height: `ch - 2 * fc`.
       Open state: swings upwards pivoted at top horizontal edge.
     - Ensure all door panels have `role: 'door-front'`, label matching front type, and prefix 'O'.
   - Update `buildCutlist(project, layout)` hardware item calculations:
     - `sliding`: 1 sliding track kit (`slidingTracks`, price from `s.slidingTrackPrice`).
     - `bifold`: 1 bi-fold guide kit (`bifoldGuides`, price `s.bifoldGuidePrice`) + 4 bi-fold hinges (`bifoldHinges`, price `s.bifoldHingePrice`).
     - `lift-up`: 2 gas struts (`gasStruts`, price `s.gasStrutPrice`) + 2 top hinges (`hinges`, price `s.hingePrice`).
     - Keep existing swinging door hardware calculations intact (`doors`: 4 hinges, `left-door`/`right-door`: 2 hinges).
     - Calculate pulls for all fronts when applicable.

2. `public/js/model.js`:
   - Add `duplicateModule(project, id)` helper as designed in M3-2 Explorer handoff.
   - Ensure `normalizeProject()` maintains compatibility with new front types.

3. `public/js/app.js`:
   - Update `drawDock()` to implement the 2-Tier Control Architecture:
     - Prune door options from `newType` selector: strictly `['shelf', 'drawer', 'rail']`.
     - Tier 1: Dimensions (Ancho, Alto), Content (`#type`), Dedicated Front Selector (`#frontSelect`) with all 7 options, Contextual Pull (`#pull`), Drawer Count (`#cnt`), Container Dir (`#dir`), Subdivision controls (`#newType`, `⬍ Dividir altura`, `⬌ Dividir ancho`, `＋ Añadir adyacente`).
     - Tier 2: `⎘ Duplicar` (`#dupMod`), `✕ Deseleccionar` (`#clearSel`), `🗑 Eliminar` (`#del`).
     - Bind `#frontSelect` and `#front` to `M.setFront(state.project, sid, e.target.value)`.
     - Bind `#dupMod` to `M.duplicateModule()`.

4. `public/style.css`:
   - Add styles for the 2-Tier Dock layout: `.dock-tier-primary`, `.dock-tier-actions`, `.dock-grid-2`, `.input-with-unit`, `.dock-subdiv-group`, `.btn-subdiv`, `.tier-2-actions`, `.btn-tier2`.

5. `test/dashboard_and_doors.test.js`:
   - Add extensive automated tests verifying:
     - All 7 front types produce correct panel dimensions and 3D bounding boxes.
     - Sliding doors produce 2 panels with +15mm overlap and `slidingTracks` hardware.
     - Bi-fold doors produce 2 articulated panels and `bifoldGuides` + `bifoldHinges` hardware.
     - Lift-up doors produce 1 panel and `gasStruts` hardware.
     - Hardware quantities and pricing in `cutlist.hardware` and total cost calculations.
     - `duplicateModule()` properly clones module subtrees with fresh IDs.
     - `VALID_NEW_TYPES` in dock contains only `shelf`, `drawer`, `rail`.

VERIFICATION:
Run all tests using `node --test test/auth_and_persistence.test.js test/dashboard_and_doors.test.js` and ensure all tests pass (0 failures).

Write your handoff report to:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_worker_m3_v2\handoff.md
Communicate results via send_message to parent with summary and verified test output.

## 2026-10-23T02:20:18Z
**Context**: Milestone 3 Implementation
**Content**: Status check on Milestone 3 tasks (layout.js, model.js, app.js, style.css, tests). Please provide a progress update on your current step.
**Action**: Continue implementation and report current status.

