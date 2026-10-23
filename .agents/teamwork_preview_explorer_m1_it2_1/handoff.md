# Explorer M1-IT2-1: Layout MaxH Defect Investigation Report

**Target**: `public/js/layout.js:132`  
**Verdict**: Defect confirmed; zero internal side effects; precise fix identified.  
**Patch**: `.agents/teamwork_preview_explorer_m1_it2_1/layout_maxh_fix.patch`

---

## 1. Observation

### 1.1 Verbatim Code at `public/js/layout.js:118-135`
```javascript
118: export function getColumnHeight(col, settings) {
119:   if (typeof col?.height === 'number' && Number.isFinite(col.height) && col.height > 0) {
120:     return col.height;
121:   }
122:   return (settings && typeof settings.height === 'number' && Number.isFinite(settings.height) && settings.height > 0)
123:     ? settings.height
124:     : DEFAULTS.height;
125: }
126: 
127: export function computeLayout(project) {
128:   const s = { ...DEFAULTS, ...(project.settings || {}) };
129:   const t = s.thickness;
130:   const cols = project.columns;
131:   const colHeights = cols.map((c) => getColumnHeight(c, s));
132:   const maxH = Math.max(...colHeights, s.height);
133:   const D = s.depth;
134:   const bt = s.backThickness;
135:   const cd = D - bt;
```

### 1.2 Verbatim Return at `public/js/layout.js:379`
```javascript
379:   return { settings: s, maxH, pieces, cells, dividers, colDividers, totalW, hardware: hw, cutlist: buildCutlist(pieces, s, hw) };
```

### 1.3 Verbatim Empirical Test Failure
Command executed:
```bash
node --test test/m1_challenger_stepped_layout.test.js
```
Output:
```
✔ CHALLENGE 1: Ascending staircase (700, 1050, 1400, 1750, 2100mm) geometric invariants (37.0043ms)
✔ CHALLENGE 2: Descending staircase (2100, 1750, 1400, 1050, 700mm) geometric invariants (0.9892ms)
✔ CHALLENGE 3: Alternating peaks and valleys (1800, 900, 2000, 800, 1900mm) geometric invariants (2.0818ms)
✔ CHALLENGE 4: Single column furniture (tall: 2100mm) (0.4246ms)
✖ CHALLENGE 5 [CRITICAL STRESS]: Bounding height maxH when all column heights are below settings.height (2.0984ms)
✖ CHALLENGE 6 [CRITICAL STRESS]: Single column furniture shorter than settings.height (e.g. 500mm mesa de noche vs 1400mm) (0.5291ms)
✔ CHALLENGE 7: Multi-column drawer configurations maintain strictly integer drawerIndex across all drawer sub-components (0.9573ms)
✔ CHALLENGE 8: Randomized fuzzing over 100 stepped topologies with aligned settings (25.4322ms)
✔ CHALLENGE 9: Stepped Cutlist separates unequal laterals and top caps into individual tabular rows (0.4425ms)
✔ CHALLENGE 10: Every stepped column has a col-top divider handle with ns-resize cursor at y = colH - t (0.4675ms)
ℹ tests 10
ℹ suites 0
ℹ pass 8
ℹ fail 2

✖ failing tests:
test at test\m1_challenger_stepped_layout.test.js:265:1
✖ CHALLENGE 5 [CRITICAL STRESS]: Bounding height maxH when all column heights are below settings.height (2.0984ms)
  AssertionError [ERR_ASSERTION]: Adversarial failure: maxH was 1400, but max(colHeights) is 750. layout.js line 132 erroneously uses Math.max(...colHeights, s.height)!
  1400 !== 750

test at test\m1_challenger_stepped_layout.test.js:293:1
✖ CHALLENGE 6 [CRITICAL STRESS]: Single column furniture shorter than settings.height (e.g. 500mm mesa de noche vs 1400mm) (0.5291ms)
  AssertionError [ERR_ASSERTION]: Adversarial failure: single-column maxH was 1400, expected 500. Unused settings.height (1400) polluted maxH!
  1400 !== 500
```

### 1.4 Codebase-Wide Inventory of `maxH` References
Across the entire repository:
1. `public/js/layout.js:132`: Declaration (`const maxH = Math.max(...colHeights, s.height);`).
2. `public/js/layout.js:379`: Output property (`return { settings: s, maxH, ... }`).
3. `test/m1_challenger_add_on_top.test.js:380`: `assert.equal(l.maxH, initialH + 350 + t);`.
4. `test/stepped_layout.test.js:52`: `assert.equal(l.maxH, 1600);`.
5. `test/stepped_layout.test.js:303`: `assert.equal(l.maxH, initialH + 350 + t);`.
6. `test/m1_challenger_stepped_layout.test.js:64, 130, 182, 235, 283, 301, 381`: Validates `maxH` across topologies.

---

## 2. Logic Chain

1. **Fallback Redundancy (Obs 1.1)**:
   - `getColumnHeight(c, s)` at lines 118-125 guarantees that if any column `c` does not have an explicit positive finite `height`, it resolves to `s.height` (or `DEFAULTS.height`).
   - Consequently, for any cabinet where columns do not specify custom heights, `colHeights` will contain `[s.height, s.height, ...]`.
   - Therefore, `s.height` is already represented inside `colHeights` whenever a fallback is needed.

2. **The Root Cause of Invariant Violation (Obs 1.1 & 1.3)**:
   - When a user designs furniture where all columns have custom heights lower than `s.height` (such as a 500mm nightstand or a stepped credenza with columns at 600mm and 750mm), `colHeights` equals `[600, 750]`.
   - However, `s.height` remains at default 1400mm in `s = { ...DEFAULTS, ...(project.settings || {}) }`.
   - Line 132 calculates `Math.max(...colHeights, s.height) = Math.max(600, 750, 1400) === 1400`.
   - This corrupts `layout.maxH` to 1400mm, despite no physical piece of the furniture exceeding 790mm ($750 + 2 \times \text{overhang}$).

3. **Verification of Zero Internal Side Effects in `public/js/layout.js` (Obs 1.1, 1.2, 1.4)**:
   - Meticulous inspection of lines 132–380 shows `maxH` is **never used** in any piece placement, lateral sizing, cap positioning, cell sizing, divider calculation, or cutlist construction:
     - Left lateral: `colHeights[0] + 2 * s.overhang` (line 157)
     - Shared intermediate laterals: `Math.max(colHeights[i], colHeights[i + 1]) + 2 * s.overhang` (line 165)
     - Right lateral: `colHeights[cols.length - 1] + 2 * s.overhang` (line 176)
     - Top caps: `y = colHeights[i] - t` (line 354)
     - Col-top drag dividers: `y = colHeights[i] - t` (line 372)
     - Back panels: `sy = colHeights[i] - 2 * t + 20 - 2 * g` (line 357)
     - Cells: `h = colHeights[i] - 2 * t` (line 358)
   - `maxH` is solely an external contract property returned on line 379.
   - Modifying `maxH` has **zero** effect on internal piece geometry, cutlist pricing, or bill of materials.

4. **Blast Radius on Downstream Modules (Obs 1.4)**:
   - Neither `public/js/app.js` nor `public/js/viewer.js` currently read `layout.maxH`.
   - In Milestone M2 (Feature 5), `app.js:drawCanvas` will anchor SVG viewbox and coordinates to `top = maxH + ov`. Correcting `maxH` ensures low cabinets do not render 650mm of empty void above the furniture.
   - In Milestone M3 (Feature 9), `viewer.js` will align camera target and floor shadow to `maxH`. Correcting `maxH` ensures the 3D ground plane and camera center sit accurately at the true top of low furniture.

5. **Edge Cases for the Replacement Expression**:
   - Expression: `const maxH = colHeights.length > 0 ? Math.max(...colHeights) : s.height;`
   - Case A (`cols` has 1+ columns with custom heights): `Math.max(...colHeights)` is strictly the highest column (e.g. 750mm for `[600, 750]`, 2100mm for `[700, ..., 2100]`).
   - Case B (`cols` has 1+ columns with no custom heights): `colHeights` has `s.height`, returns `s.height` (1400mm).
   - Case C (`cols` has mixed heights): returns `Math.max(customH, s.height)`.
   - Case D (`cols` is empty `[]`): `colHeights.length === 0`, gracefully returns `s.height` (1400mm) instead of evaluating `Math.max()` to `-Infinity`.

---

## 3. Caveats

- **Contract text in `orchestrator_4/PROJECT.md:71`**:
  The orchestrator's contract document previously stated:
  `Invariants: maxH === Math.max(...colHeights, settings.height)`
  This line in `PROJECT.md` should be amended to `maxH === (colHeights.length > 0 ? Math.max(...colHeights) : settings.height)` to reflect the corrected invariant.
- **Read-only role constraint**:
  Explorer M1-IT2-1 is strictly read-only. `public/js/layout.js` has NOT been directly modified by this agent. A patch file `layout_maxh_fix.patch` is provided for the worker/implementer.

---

## 4. Conclusion

The defect in `public/js/layout.js:132` is isolated, fully understood, and safe to fix.

### Exact Change Specification
**File**: `public/js/layout.js`  
**Line**: 132  

**Before**:
```javascript
  const maxH = Math.max(...colHeights, s.height);
```

**After**:
```javascript
  const maxH = colHeights.length > 0 ? Math.max(...colHeights) : s.height;
```

---

## 5. Verification Method

1. **Apply Patch**:
   Apply `.agents/teamwork_preview_explorer_m1_it2_1/layout_maxh_fix.patch` to `public/js/layout.js`.
2. **Execute Challenger Test Suite**:
   ```bash
   node --test test/m1_challenger_stepped_layout.test.js
   ```
   **Expected Result**: 10 passed, 0 failed (Challenges 5 and 6 pass).
3. **Execute Full Suite**:
   ```bash
   node --test test/stepped_layout.test.js test/m1_challenger_add_on_top.test.js
   ```
   **Expected Result**: 100% pass, zero regressions.
