# BRIEFING — 2026-10-23T02:04:10Z

## Mission
Investigate and design a production-ready implementation plan for Expanded Door Types (sliding, bifold, lift-up) and Cutlist Hardware Calculation in `public/js/layout.js`.

## 🔒 My Identity
- Archetype: explorer
- Roles: [investigation, synthesis]
- Working directory: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m3_v2_1
- Original parent: 26f35015-7be0-4bcc-8782-f2f9772b124d
- Milestone: M3-1 (Expanded Door Types & Cutlist Hardware Calculation)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Inspect files exclusively using view_file (or read-only search tools)
- DO NOT RUN ANY TERMINAL COMMANDS (do not call run_command)
- DO NOT modify any source code files

## Current Parent
- Conversation ID: 26f35015-7be0-4bcc-8782-f2f9772b124d
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md` (§ 2026-10-23T00:40:10Z, R3)
  - `orchestrator_2/PROJECT.md`
  - `teamwork_preview_explorer_survey_2/handoff.md` (§ 4.4)
  - `public/js/layout.js` (lines 1-363: DEFAULTS, SETTING_META, FRONTS, LABELS, doorOverlay, computeLayout, ROLE, PRICE_KEY, buildCutlist)
  - `public/js/app.js` (drawDock, drawCanvas, drawCutlist)
  - `public/js/viewer.js` (COLORS, hideFronts, explosion offsets)
  - `public/js/model.js` (normalizeProject, setFront, leaf creation)
  - `test/dashboard_and_doors.test.js`, `test/cutlist_stress_adversarial.test.js`, `test/cutlist_print.test.js`, `test/layout.test.js`
- **Key findings**:
  1. `FRONTS` and `LABELS` expansion seamlessly populates dock door dropdowns without any DOM rewrite in `app.js`.
  2. `DEFAULTS` and `SETTING_META` require 4 new keys (`slidingTrackPrice: 28`, `bifoldHingePrice: 4`, `bifoldGuidePrice: 8`, `gasStrutPrice: 6`) which automatically flow into settings modal and cutlist calculations.
  3. `doorOverlay()` 3D coordinate generation for `sliding` (2 offset panels at $z = D$ and $z = D + t + 2$ with $w/2 + 15$ overlap), `bifold` (2 articulated leaves at $z = D$), and `lift-up` (1 horizontal flap door at $z = D + 1$ with horizontal handle) strictly satisfies kinematics.
  4. For cutlist role mapping and panel pricing: `ROLE` and `PRICE_KEY` in `layout.js` must be expanded so that `mat: 'door'` and `kind: 'door-front'` resolve to `role: 'door-front'` (prefix `'O'`) and price key `priceFront` ($70/m²).
  5. `buildCutlist()` itemization cleanly adds the 4 hardware lines to `cl.hardware`, ensuring `cl.hardwareTotal` and `cl.total = panelsTotal + hardwareTotal` satisfy all mathematical invariants.
- **Unexplored areas**: None within the scope of M3-1.

## Key Decisions Made
- Use exact proposed code snippets and drop-in diffs in `handoff.md` to ensure zero ambiguity for the implementer agent.
- Document cross-module contract recommendations for `viewer.js` and `app.js` to handle `kind: 'door-front'`.

## Artifact Index
- DISPATCH.md — Incoming dispatch message log
- BRIEFING.md — Persistent working memory and situational awareness
- progress.md — Liveness heartbeat
- handoff.md — 5-component handoff report
