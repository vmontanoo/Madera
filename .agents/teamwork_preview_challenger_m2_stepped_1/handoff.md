# Handoff Report — Challenger M2-1 (Stepped 2D SVG Adversarial Verifier)

**Verdict**: **APPROVE**  
**Milestone**: M2 (Editor 2D Interactivo y Arrastre de Bordes - Stepped 2D SVG Verifier)  
**Target File Reviewed**: `public/js/app.js` (lines 787–865)  
**Test Harness Created**: `test/m2_challenger_svg_stepped.test.js`

---

## 1. Observation

1. **`buildCanvasSvg` Implementation in `public/js/app.js` (Lines 787–795)**:
   ```javascript
   export function buildCanvasSvg(project, layout, selected = null) {
     const s = layout.settings;
     const maxH = layout.maxH || Math.max(...project.columns.map((c) => (typeof c.height === 'number' && c.height > 0 ? c.height : s.height)), s.height);
     const ov = s.overhang;
     const top = maxH + ov;
     const Y = (y, sy) => top - (y + sy);
     const sel = selected;
     const selCell = sel && layout.cells[sel];
     let svg = `<svg viewBox="${-120} ${-110} ${layout.totalW + 240} ${maxH + 2 * ov + 200}" preserveAspectRatio="xMidYMid meet">
   ```

2. **Per-Column Top (+) Button Rendering in `public/js/app.js` (Lines 849–858)**:
   ```javascript
     let colX = 0;
     const cols = project.columns;
     const colHeights = layout.colHeights || cols.map((c) => (typeof c.height === 'number' && c.height > 0 ? c.height : s.height));
     cols.forEach((c, idx) => {
       colX += s.thickness;
       const colH = colHeights[idx] || (typeof c.height === 'number' && c.height > 0 ? c.height : s.height);
       const cy = top - colH - 50;
       svg += plus(colX + c.width / 2, cy, 'top', `data-col="${c.id}"`);
       colX += c.width;
     });
   ```

3. **Lateral (+) Button Rendering in `public/js/app.js` (Lines 859–863)**:
   ```javascript
     const col0H = colHeights[0] || (typeof cols[0]?.height === 'number' && cols[0].height > 0 ? cols[0].height : s.height);
     const lastColH = colHeights[cols.length - 1] || (typeof cols[cols.length - 1]?.height === 'number' && cols[cols.length - 1].height > 0 ? cols[cols.length - 1].height : s.height);
     svg += plus(-70, top - col0H / 2, 'colLeft', '');
     svg += plus(layout.totalW + 70, top - lastColH / 2, 'colRight', '');
     svg += '</svg>';
   ```

4. **Adversarial Test Suite `test/m2_challenger_svg_stepped.test.js`**:
   Created dedicated 8-suite test harness covering:
   - Extreme staggered heights `[500, 2500, 900, 3200, 600]`.
   - Per-column `cy` strictly equal to `(top - H_i - 50)` with zero collapse.
   - ViewBox accommodation and bounding-box margin checks (no clipping).
   - Asymmetrical lateral (+) button centering on `col0H` and `lastColH`.
   - Fallback resolution for undefined, null, zero, or negative heights.
   - Monotonic ascending, descending, and sawtooth staircase progressions.
   - Top cap line, drag handle, and button vertical 50mm offset invariance.
   - `addOnTop(..., false)` single-column elevation invariance in SVG.
   - 50-iteration random fuzzing/stress generator across random column counts and height ratios up to 20:1.

---

## 2. Logic Chain

1. **Non-Collapsing `cy` Verification (Observation 2 & Test 1)**:
   - For configuration `[500, 2500, 900, 3200, 600]` with `overhang = 20`, `maxH = 3200` and `top = 3220`.
   - The formula `cy = top - colH - 50` computes:
     - Col 0 ($H=500$): $cy = 3220 - 500 - 50 = 2670$
     - Col 1 ($H=2500$): $cy = 3220 - 2500 - 50 = 670$
     - Col 2 ($H=900$): $cy = 3220 - 900 - 50 = 2270$
     - Col 3 ($H=3200$): $cy = 3220 - 3200 - 50 = -30$
     - Col 4 ($H=600$): $cy = 3220 - 600 - 50 = 2570$
   - Set of `cy` coordinates has 5 distinct values: $\{2670, 670, 2270, -30, 2570\}$.
   - They strictly track individual column heights and never collapse to a uniform Y.

2. **Zero-Clipping ViewBox Verification (Observations 1, 2, 3 & Test 2)**:
   - ViewBox envelope: $X \in [-120, totalW + 120]$, $Y \in [-110, maxH + 2 \cdot ov + 90]$.
   - Tallest (+) button: For $H = maxH$, $cy = -30$, radius $r = 30$, top edge is $Y = -60$.
     $Y_{top} = -60 \ge -110 = Y_{min}$, providing a guaranteed 50mm clearance above the button.
   - Bottom lateral overhang: Lowest point in SVG is $Y = maxH + 2 \cdot ov$.
     $Y_{bottom} = maxH + 2 \cdot ov \le maxH + 2 \cdot ov + 90 = Y_{max}$, providing a guaranteed 90mm clearance below the carcass.
   - Left lateral (+) button: $cx = -70$, $r = 30 \implies X_{left} = -100 \ge -120$. Guaranteed 20mm clearance.
   - Right lateral (+) button: $cx = totalW + 70$, $r = 30 \implies X_{right} = totalW + 100 \le totalW + 120$. Guaranteed 20mm clearance.
   - Across all tested height bounds (from $H_{min} = 200$ to $H_{max} = 4000$), no element is clipped.

3. **Lateral Button Positioning Conformance (Observation 3 & Test 3)**:
   - In asymmetrical cabinets (e.g. $col0H = 400$, $lastColH = 3000$), left button is placed at $cy = top - 200$ and right button at $cy = top - 1500$.
   - Left button is strictly centered relative to Column 0; right button is strictly centered relative to the final column. Neither button mistakenly centers on global `maxH`.

4. **Invariance and Isolation Verification (Observation 2 & Tests 6, 7)**:
   - For every column $i$, distance between top cap line (`top - H_i`) and (+) button center (`top - H_i - 50`) is invariant at exactly 50mm.
   - Calling `addOnTop(project, 'c0', 'shelf', 350, false)` increases only `c0.height` (by 368mm) and adjusts only `c0`'s (+) button $cy$ and left lateral button $cy$. Sibling (+) buttons and the right lateral (+) button maintain identical coordinates.

---

## 3. Caveats

- **DOM Drag Event Listeners**: The interactive mouse dragging handlers (`onmousedown`, `mousemove`, `mouseup`) rely on DOM client coordinates and `getScreenCTM()`, which are mocked in headless Node environments. The pure geometric calculations (`calculateTopBorderDrag`, `simulateTopBorderDrag`, `buildCanvasSvg`) are fully verified.
- **Single-Column Edge Case**: When $N = 1$, $col0H$ equals $lastColH$, so both lateral buttons correctly align to $top - col0H / 2$.

---

## 4. Conclusion

**VERDICT: APPROVE**

The 2D SVG canvas generation implemented in `public/js/app.js` fully satisfies Milestone 2 requirements:
1. Supports arbitrary stepped configurations, including the required `[500, 2500, 900, 3200, 600]`.
2. Every column's (+) button $cy$ strictly obeys $(top - H_i - 50)$ and never collapses to a uniform Y.
3. The dynamic `viewBox` accommodates the tallest column, bottom overhang, and lateral buttons without clipping under all extreme boundary conditions.
4. Lateral buttons accurately center on outer column heights.

---

## 5. Verification Method

To independently execute and verify the test harness:

```bash
node --test test/m2_challenger_svg_stepped.test.js
```

Expected output:
- 8 tests passing (100% pass rate).
- 0 failures, 0 timeouts.

Key files for inspection:
- `public/js/app.js` (lines 787–865)
- `test/m2_challenger_svg_stepped.test.js` (all 8 test suites)
