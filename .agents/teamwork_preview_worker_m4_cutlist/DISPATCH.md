## 2026-10-23T05:38:15Z

You are Worker M4 for the Stepped Modular Furniture project.

## Your Identity and Working Directory
- Archetype: teamwork_preview_worker
- Working Directory: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_worker_m4_cutlist
- Project Root: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local
- Parent Orchestrator Conversation ID: 19197712-48bb-468e-9857-a3f5116ba09b

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Upstream Exploration Reports
Read before beginning:
1. Master User Request: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md` (§ 2026-10-23T05:16:05Z, Requirement R4)
2. Explorer M4-1 Report (Cutlist Classification & Granularity): `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m4_1\handoff.md`
3. Explorer M4-2 Report (Tabular Presentation, Cutlist Math & Print): `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m4_2\handoff.md`
4. Explorer M4-3 Report (Test Suite Matrix & Regression Analysis): `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m4_3\handoff.md` and proposed test suite `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m4_3\proposed_stepped_cutlist.test.js`

## Files Owned Exclusively
- `public/js/layout.js`
- `public/js/app.js`
- `public/style.css`
- `test/stepped_cutlist.test.js` (create this file)
- `test/stepped_layout.test.js` (if aligning M1 Test 11 for classified laterals)

## Detailed Deliverables
1. **`public/js/layout.js`**:
   - In `ROLE` dictionary: map `'Lateral exterior': 'vertical-side'`, `'Lateral interior': 'vertical-side'`, `'side': 'vertical-side'`, while keeping existing mappings.
   - In `computeLayout`:
     - Lateral exterior (left): `col: 0`, height `colHeights[0] + 2 * s.overhang`.
     - Lateral interior (intermediate shared): `col: i + 1`, height `Math.max(colHeights[i], colHeights[i + 1]) + 2 * s.overhang`.
     - Lateral exterior (right): `col: cols.length`, height `colHeights[cols.length - 1] + 2 * s.overhang`.
     - Make sure `p.kind === 'side'` is maintained.
     - Ensure cutlist grouping creates distinct rows for exterior and interior laterals (e.g. `Lateral exterior` vs `Lateral interior`) with canonical role `vertical-side` and prefix `S`.
     - Note Explorer M4-3's warning: `test/dashboard_and_doors.test.js` (lines 77, 108, 130, 152) checks `l.pieces.filter((p) => p.name === 'Lateral').length`. Make sure `p.name === 'Lateral'` in `l.pieces` (or handle gracefully so `dashboard_and_doors.test.js` continues to pass 100%), while `buildCutlist` groups them by classified name (`p.label || p.name` or `p.cutlistName`), OR if `p.name` is classified, ensure all tests pass.
     - Strict pricing identity: `panelsTotal + hardwareTotal === total`.
2. **`public/js/app.js`**:
   - In `drawCutlist()` print header: replace `${s.height}` with `${layout.maxH || s.height}` for accurate stepped bounding height.
   - Defensive `fmtMoney`: `(state.project?.settings?.currency || DEFAULTS.currency || '$') + Number(v || 0).toFixed(2)`.
   - In CSV export button: prepend UTF-8 BOM `'\uFEFF'` and sanitize file name.
3. **`public/style.css`**:
   - In `@media print`, add `min-width: 0 !important;` to `.left`.
4. **`test/stepped_cutlist.test.js`**:
   - Adopt and author the comprehensive 8-suite test matrix from `proposed_stepped_cutlist.test.js`.
5. **Run Tests & Verify**:
   - Run `node --test test/stepped_cutlist.test.js`.
   - Run `npm test` across ALL test files and ensure 100% PASS with ZERO failures.
6. **Handoff**:
   - Write `handoff.md` in your working directory with all test results, commands executed, and verified deliverables.
   - Send completion message to parent via `send_message`.
