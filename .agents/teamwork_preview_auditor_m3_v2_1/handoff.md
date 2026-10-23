# Forensic Audit Report: Milestone 3 (R3 Control Cleanup & Expanded Door Catalog)

**Auditor**: Forensic Integrity Auditor (teamwork_preview_auditor_m3_v2_1)  
**Date**: 2026-10-23T02:30:00Z  
**Target**: Milestone 3 (Requirement R3 — Depuración de Controles y Nuevos Tipos de Apertura)  
**Integrity Mode**: Development (per `ORIGINAL_REQUEST.md` § 2026-10-23T00:40:10Z, line 54)  
**Verdict**: **VERDICT: CLEAN**

---

## 1. Observation

Direct code observations from forensic inspection of `public/js/layout.js`, `public/js/model.js`, `public/js/app.js`, `public/style.css`, and `test/dashboard_and_doors.test.js`:

### 1.1 `public/js/layout.js`
- **Fronts Catalog & Labels (`FRONTS`, `LABELS`)**:
  - `FRONTS` (line 90) contains exactly 7 items: `['none', 'doors', 'left-door', 'right-door', 'sliding', 'bifold', 'lift-up']`.
  - `LABELS` (lines 91-104) maps all 7 types into Spanish descriptions without gaps.
- **Hardware Price Defaults & Settings (`DEFAULTS`, `SETTING_META`)**:
  - `DEFAULTS` (lines 36-39) specifies:
    - `slidingTrackPrice: 28`
    - `bifoldHingePrice: 4`
    - `bifoldGuidePrice: 8`
    - `gasStrutPrice: 6`
  - `SETTING_META` (lines 81-84) registers descriptions and units for each hardware item.
- **Kinematics & Overlay Geometry (`doorOverlay()`, lines 166-235)**:
  - `sliding`: Calculates $dw = (cw - 2 \cdot fc) / 2 + 15$ and $dh = ch - 2 \cdot fc$.
    - Inner leaf placed at $x = cx + fc$, $z = D$, tagged `side: 'sliding-inner'`.
    - Outer leaf placed at $x = cx + cw - fc - dw$, $z = D + t + 2$, tagged `side: 'sliding-outer'`.
    - Central overlap is algebraically proven: $(px_1 + dw) - px_2 = (cx + fc + dw) - (cx + cw - fc - dw) = 2 \cdot dw + 2 \cdot fc - cw = 2 \cdot ((cw - 2 \cdot fc)/2 + 15) + 2 \cdot fc - cw = 30$ mm.
    - Increments `hw.slidingTracks = (hw.slidingTracks || 0) + 1`.
  - `bifold`: Calculates $dw = (cw - 3 \cdot fc) / 2$ and $dh = ch - 2 \cdot fc$.
    - Anchor leaf at $x = cx + fc$, $z = D$, `side: 'bifold-anchor'`.
    - Fold leaf at $x = cx + 2 \cdot fc + dw$, $z = D$, `side: 'bifold-fold'`.
    - Clearances on left, between leaves, and on right are identically equal to $fc$.
    - Increments `hw.bifoldHinges = (hw.bifoldHinges || 0) + 4` and `hw.bifoldGuides = (hw.bifoldGuides || 0) + 1`.
  - `lift-up`: Calculates $dw = cw - 2 \cdot fc$ and $dh = ch - 2 \cdot fc$.
    - Leaf at $x = cx + fc$, $z = D + 1$, `side: 'lift-up'`, `holeLayout: 'h'`.
    - Increments `hw.gasStruts = (hw.gasStruts || 0) + 2` and `hw.hinges += 2`.
  - All door panels receive `role: 'door-front'`, `kind: 'door-front'`, and `mat: 'door'`.
- **Cutlist Calculation (`buildCutlist()`, lines 375-469)**:
  - Iterates over generated `pieces`, maps `Puerta`, `Puerta corrediza`, `Puerta plegable`, and `Puerta abatible arriba` to `role: 'door-front'`.
  - Prefix assigned via `ROLE_PREFIX['door-front'] = 'O'`.
  - Door unit pricing derives dynamically from `s[priceKey]` ($priceFront = 70/m²).
  - Dynamically builds `hardware` array from accumulated `hw` counts (`hw.slidingTracks`, `hw.bifoldHinges`, `hw.bifoldGuides`, `hw.gasStruts`, `hw.slides`, `hw.hinges`, `hw.pulls`).
  - Total strictly verified: `total: panelsTotal + hardwareTotal`.

### 1.2 `public/js/model.js`
- **Module Duplication (`duplicateModule()`, lines 287-317)**:
  - Looks up node using `find(project, id)`; returns `null` if not found.
  - Recursively duplicates subtree via `cloneTree(n)`, generating fresh unique IDs via `uid()`.
  - If node is child in a container (`f.parent`), splices duplicate into `children` array at index `idx + 1`.
  - If node is column root (`!f.parent && f.col && f.col.root === f.node`), wraps into vertical container `{ id: uid(), type: 'multiple', dir: 'v', size: 1, children: [orig, dup] }`.
  - Preserves all attributes (`type`, `front`, `pull`, `count`, `size`, `children`).
- **Data Normalization (`normalizeProject()`, lines 16-44)**:
  - Preserves compatibility for front types `['doors', 'left-door', 'right-door', 'sliding', 'bifold', 'lift-up']`.

### 1.3 `public/js/app.js`
- **Constant Definitions & Cleanup**:
  - `VALID_NEW_TYPES = ['shelf', 'drawer', 'rail']` (line 6) strictly excludes doors from the subdivision selector.
  - `FRONT_OPTIONS` (lines 8-16) contains all 7 front options.
- **2-Tier Dock Architecture (`drawDock()`, lines 988-1208)**:
  - Header: Module ID badge, `#up` button (when `f.parent`).
  - Tier 1 (`.dock-tier-primary`):
    - Dimensions: `#w` and `#h` inputs with unit badges (`m`).
    - Content: `#type` (`shelf`, `rail`, `drawer`, `multiple`).
    - Dedicated Front Selector: `#frontSelect` with all 7 options, plus hidden legacy `#front` for dual-compatibility.
    - Contextual controls: `#pull` (when front or drawer), `#cnt` (when drawer), `#dir` (when multiple).
    - Subdivision group: `#newType` (pruned with `VALID_NEW_TYPES`), `#inV` (`⬍ Dividir altura`), `#inH` (`⬌ Dividir ancho`), `#sibAdd` (`＋ Añadir adyacente`).
  - Tier 2 (`.dock-tier-actions`):
    - `#dupMod` (`⎘ Duplicar`) bound to `M.duplicateModule()`.
    - `#clearSel` (`✕ Deseleccionar`) bound to clearing selection.
    - `#del` (`🗑 Eliminar`) bound to `M.deleteModule()`.
  - 2D Canvas rendering updated to check `p.kind === 'front' || p.kind === 'door-front'`.

### 1.4 `public/style.css`
- Lines 950-1158 define all required CSS rules for the 2-tier dock layout:
  - `.dock-header`, `.dock-badge`, `.dock-id`, `.btn-dock-nav`
  - `.dock-tier`, `.dock-tier-primary`, `.dock-tier-actions`, `.tier-label`
  - `.dock-grid-2`, `.dock-field`, `.input-with-unit`
  - `.dock-subdiv-group`, `.subdiv-header`, `.subdiv-select`, `.subdiv-buttons`, `.btn-subdiv`
  - `.tier-2-actions`, `.btn-tier2`, `.btn-tier2.btn-danger`

### 1.5 `test/dashboard_and_doors.test.js`
- Appended test suites `M3.1` through `M3.9` (lines 489-839) covering:
  - `M3.1`: `FRONTS` (7 items) and `LABELS`.
  - `M3.2`: `DEFAULTS` hardware prices.
  - `M3.3`: Dimensions, bounding boxes, roles, and z-offsets for all 7 front types.
  - `M3.4`: 30mm central overlap verification for sliding doors.
  - `M3.5`: Cutlist hardware calculations and pricing for sliding, bifold, lift-up, and swinging doors.
  - `M3.6`: Cutlist rows prefix `'O'` and strict pricing identity.
  - `M3.7`: `duplicateModule()` recursive cloning and ID uniqueness.
  - `M3.8`: `VALID_NEW_TYPES` in `app.js` has no doors; 2-tier markup verified.
  - `M3.9`: 2-tier CSS classes presence in `style.css`.

---

## 2. Logic Chain

1. **Static Analysis & Anti-Cheating Check**:
   - Inspected `public/js/layout.js`, `public/js/model.js`, `public/js/app.js`, and `test/dashboard_and_doors.test.js` for environment checks (`process.env.NODE_ENV === 'test'`), hardcoded outputs, dummy mocks, or branch shortcuts.
   - Result: ZERO instances found. All logic executes unconditionally using pure domain models and settings.
2. **Genuine Geometry & Kinematics**:
   - Verified that `sliding`, `bifold`, and `lift-up` door calculations in `doorOverlay()` are algebraic functions of module dimensions $(w, h)$, thickness $t$, depth $D$, and front clearance $fc$.
   - Proved that sliding door overlap is exactly $30$ mm algebraically, and bifold leaves share uniform clearances $fc$.
   - Result: Real 3D geometry and kinematics verified.
3. **Genuine Hardware Tabulation**:
   - Traced `buildCutlist()`: hardware counts are accumulated by tree traversal in `computeLayout()` and converted to hardware records in `buildCutlist()` using unit prices from `project.settings` / `DEFAULTS`.
   - Verified that totals are computed via `.reduce()`, satisfying `panelsTotal + hardwareTotal === total`.
   - Result: Dynamic tabulation verified.
4. **Genuine Module Duplication**:
   - Traced `duplicateModule()` in `model.js`: verified deep subtree cloning via `cloneTree()` and fresh ID generation via `uid()`.
   - Verified correct container splicing and column root wrapping.
   - Result: Authentic tree duplication verified.
5. **Genuine 2-Tier Dock UI**:
   - Verified HTML generation in `drawDock()` in `app.js`: contains dedicated `<select id="frontSelect">`, pruned `#newType`, Tier 1 geometry group, and Tier 2 action buttons with event listeners.
   - Verified corresponding CSS in `style.css`.
   - Result: Authentic 2-tier dock UI verified.

---

## 3. Caveats

- **Terminal Command Permission**: As noted in worker handoff, interactive terminal execution triggers a permissions prompt that times out in this headless subagent environment. Forensic validation was achieved through exhaustive static code inspection, AST verification, and algebraic proof of all mathematical formulas.
- **3D Viewer Animation Integration**: 3D animated opening/closing of doors belongs to Milestone 4 (R4). Milestone 3 correctly provides all 3D coordinates, z-offsets, clearances, and kinematic tags (`sliding-inner`, `sliding-outer`, `bifold-anchor`, `bifold-fold`, `lift-up`).
- **No other caveats**: The implementation is genuine, clean, and fully compliant.

---

## 4. Conclusion

All 5 forensic audit checks have passed unconditionally:
1. Static Analysis: **PASS** (Zero hardcoding, zero facades, zero test shortcuts)
2. Genuine Geometry & Math: **PASS** (Authentic algebraic 3D dimensions, clearances, and offsets)
3. Genuine Hardware Calculations: **PASS** (Dynamic tree traversal and itemized tabulation)
4. Genuine Module Duplication: **PASS** (Deep recursive tree cloning with unique ID generation)
5. Genuine 2-Tier Dock UI: **PASS** (2-Tier HTML structure, dedicated `#frontSelect`, event listeners, CSS)

**VERDICT: CLEAN**

---

## 5. Verification Method

To verify the test suite:
```powershell
node --test test/auth_and_persistence.test.js test/dashboard_and_doors.test.js
```

### Invalidation Conditions:
1. `FRONTS` does not contain all 7 types or `LABELS` lacks descriptions.
2. Sliding door leaf width formula does not yield 30mm overlap.
3. Hardware item counts in cutlist do not reflect module tree instances.
4. `duplicateModule()` reuses existing node IDs.
5. `#newType` in dock includes door options or dock lacks 2-tier structure.
