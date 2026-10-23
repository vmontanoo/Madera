# Handoff Report: Cutlist Classification & Granularity (M4-1)

## 1. Observation

### 1.1 Current Lateral Construction in `public/js/layout.js`
In `public/js/layout.js`, lines 156–181:
```javascript
156:   // Lateral izquierdo exterior
157:   const leftLatH = colHeights[0] + 2 * s.overhang;
158:   add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: leftLatH, sz: D, col: 0 });
159:   x += t;
160:   xs.push(x);
161:   x += cols[0].width;
162: 
163:   // Laterales intermedios compartidos y divisores de columna
164:   for (let i = 0; i < cols.length - 1; i++) {
165:     const sharedH = Math.max(colHeights[i], colHeights[i + 1]) + 2 * s.overhang;
166:     add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: sharedH, sz: D, col: i + 1 });
167:     const d = { type: 'col', axis: 'h', colIdx: i, x, y: -s.overhang, w: t, h: sharedH, col: i, cursor: 'ew-resize' };
168:     dividers.push(d);
169:     colDividers.push(d);
170:     x += t;
171:     xs.push(x);
172:     x += cols[i + 1].width;
173:   }
174: 
175:   // Lateral derecho exterior
176:   const rightLatH = colHeights[cols.length - 1] + 2 * s.overhang;
177:   add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: rightLatH, sz: D, col: cols.length });
```
- All three lateral injection points (`col === 0`, `col === i + 1`, `col === cols.length`) assign `name: 'Lateral'`.
- Outer left lateral has height `leftLatH = colHeights[0] + 2 * s.overhang`.
- Intermediate shared laterals have height `sharedH = Math.max(colHeights[i], colHeights[i + 1]) + 2 * s.overhang`.
- Outer right lateral has height `rightLatH = colHeights[cols.length - 1] + 2 * s.overhang`.

### 1.2 Top Caps Construction in `public/js/layout.js`
In `public/js/layout.js`, lines 350–355:
```javascript
350:   cols.forEach((c, i) => {
351:     const x0 = xs[i];
352:     const W = c.width;
353:     const colH = colHeights[i];
354:     add({ name: 'Tapa superior', mat: 'carcass', kind: 'h', x: x0, y: colH - t, z: bt, sx: W, sy: t, sz: cd, col: i });
355:     add({ name: 'Base', mat: 'carcass', kind: 'h', x: x0, y: 0, z: bt, sx: W, sy: t, sz: cd, col: i });
```
- Top caps are already instantiated per column with `sx: W` (individual column width), `sy: t`, `sz: cd` (`s.depth - s.backThickness`), and `col: i`.

### 1.3 Aggregation Key in `buildCutlist(pieces, s, hw)`
In `public/js/layout.js`, lines 430–443:
```javascript
430:     const ori = orientationOf(p);
431:     const role = p.role || ROLE[p.name] || ROLE[p.kind] || p.name;
432:     const w = round(ori.w);
433:     const h = round(ori.h);
434:     const T = round(ori.t);
435:     const key = [role, p.name, ori.o, w, h, T].join('|');
436:     let r = map.get(key);
437:     if (!r) {
438:       const area = (w * h) / 1e6;
439:       const [L, W] = [Math.max(w, h), Math.min(w, h)];
440:       const priceKey = PRICE_KEY[p.mat] || PRICE_KEY[p.kind] || 'priceFront';
441:       r = { name: p.name, role, orientation: ori.o, mat: p.mat, w, h, length: L, width: W, thickness: T, qty: 0, holes: p.holes || 0, unitPrice: area * (s[priceKey] || 0), unitArea: area };
442:       map.set(key, r);
443:     }
444:     r.qty += 1;
```
- The aggregation key is `[role, p.name, ori.o, w, h, T].join('|')`.
- Because `p.name` is part of the key:
  - If outer and intermediate laterals have `name: 'Lateral'`, an intermediate lateral of 1640mm and a right outer lateral of 1640mm share the exact same key (`vertical-side|Lateral|vertical-yz|450|1640|18`) and merge into `qty: 2`.
  - If they are classified as `'Lateral exterior'` and `'Lateral interior'`, their keys differ, resulting in distinct line items.

### 1.4 ROLE & ROLE_ORDER in `public/js/layout.js`
In `public/js/layout.js`, lines 391–410:
```javascript
391: const ROLE = {
392:   Lateral: 'vertical-side',
393:   'División vertical': 'vertical-side',
394:   'Tapa superior': 'horizontal-deck',
395:   Base: 'horizontal-deck',
396:   'Estante / división': 'horizontal-deck',
397:   Fondo: 'back-panel',
398:   Puerta: 'door-front',
399:   'Puerta corrediza': 'door-front',
400:   'Puerta plegable': 'door-front',
401:   'Puerta abatible arriba': 'door-front',
402:   'door-front': 'door-front',
403:   'Frente de gaveta': 'drawer-front',
404:   'Lateral de gaveta': 'drawer-side',
405:   'Frente/trasera de gaveta': 'drawer-back',
406:   'Fondo de gaveta': 'drawer-bottom',
407: };
408: const ROLE_ORDER = ['back-panel', 'door-front', 'drawer-back', 'drawer-bottom', 'drawer-front', 'drawer-side', 'horizontal-deck', 'vertical-side'];
409: const ROLE_PREFIX = { 'back-panel': 'B', 'door-front': 'O', 'drawer-back': 'D', 'drawer-bottom': 'D', 'drawer-front': 'D', 'drawer-side': 'D', 'horizontal-deck': 'H', 'vertical-side': 'S' };
```
- `ROLE` currently maps `'Lateral'` and `'División vertical'` to `'vertical-side'`.
- `'Lateral exterior'`, `'Lateral interior'`, and `'side'` are NOT currently present in `ROLE`.
- In `buildCutlist`: `const role = p.role || ROLE[p.name] || ROLE[p.kind] || p.name;`.
  If `'Lateral exterior'` is not in `ROLE`, and `'side'` is not in `ROLE`, `role` falls back to `'Lateral exterior'`, which is NOT a canonical role, has index -1 in `ROLE_ORDER`, and gets fallback ID prefix `'X'` instead of `'S'`.

### 1.5 Consumers of `p.name` vs `p.kind`
1. `public/js/viewer.js`:
   - Line 750: `if (p.kind === 'side') { expOx = Math.sign(pcx - cx) * E_BASE * 0.9; }`
   - Line 561: `(NEON_PALETTE[p.kind] || NEON_PALETTE[p.role] || NEON_PALETTE.default)`
   - Does NOT filter or branch on `p.name === 'Lateral'`.
2. `public/js/app.js`:
   - Line 1350: `<td><b>${esc(r.name)}</b> <span class="muted">(${esc(r.role)})</span></td>`
   - Renders `r.name` verbatim in the cutlist table. Does NOT filter on `p.name === 'Lateral'`.
3. `test/stepped_3d_viewer.test.js`:
   - Line 290: `if (obj.isMesh && obj.userData?.piece?.kind === 'side')`
4. `test/m1_challenger_stepped_layout.test.js`:
   - Lines 67, 132, 184: `const sidePieces = l.pieces.filter((piece) => piece.kind === 'side');`
5. `test/cutlist_stress_adversarial.test.js`:
   - Line 414: `const sideRows = layout.cutlist.rows.filter((r) => r.role === 'vertical-side');`
   - Line 629: `assert.equal(layout.pieces.length, 5); assert.equal(cutlist.rows.length, 4);`
     (For single-column: both outer laterals are `Lateral exterior`, identical dimensions, so they group into 1 row of qty 2, yielding 4 rows total).
6. `test/cutlist_print.test.js`:
   - Checks that all rows have canonical roles (`vertical-side` with prefix `S`), woodworking invariants, mm dimensions.
7. `test/stepped_layout.test.js`:
   - Test 11 (lines 408–417):
     ```javascript
     // Height 840 (Left lateral): qty 1
     const lat840 = cl.rows.find((r) => r.name === 'Lateral' && r.length === 840);
     assert.ok(lat840, 'Must have a cutlist row for 840mm lateral');
     assert.equal(lat840.qty, 1);

     // Height 1640 (Shared and right laterals): qty 2
     const lat1640 = cl.rows.find((r) => r.name === 'Lateral' && r.length === 1640);
     assert.ok(lat1640, 'Must have a cutlist row for 1640mm laterals');
     assert.equal(lat1640.qty, 2);
     ```
     This was written in M1 before M4. It expected both shared and right laterals to merge under `name: 'Lateral'` with `qty: 2`.

---

## 2. Logic Chain

1. **R4 Requirement Traceability**:
   Requirement R4 mandates: *"Laterales exteriores e interiores clasificados con sus alturas reales individuales (`Lateral exterior` vs `Lateral interior`) y tapas superiores desglosadas por cada columna con sus medidas individuales de ancho y profundidad"*.
2. **Distinct Panel Classification**:
   - The left outer lateral (`col: 0`) and right outer lateral (`col: cols.length`) are external carcass sides and must be named `'Lateral exterior'`.
   - The intermediate shared laterals (`col: i + 1` for `0 <= i < cols.length - 1`) divide adjoining columns and must be named `'Lateral interior'`.
   - Because `buildCutlist` groups panels by `key = [role, p.name, ori.o, w, h, T].join('|')`, separating names ensures that an interior shared lateral and an exterior lateral of the same height (e.g. 1640mm) generate distinct, itemized cutlist rows with `qty: 1` each.
3. **Canonical Role Resolution**:
   - Adding `'Lateral exterior': 'vertical-side'`, `'Lateral interior': 'vertical-side'`, and `'side': 'vertical-side'` to `ROLE` guarantees that:
     a) `role` resolves to canonical role `'vertical-side'`.
     b) `ROLE_ORDER.indexOf(a.role)` places them at index 7.
     c) `ROLE_PREFIX['vertical-side']` assigns sequential ID prefix `'S'` (`S1`, `S2`, ...).
     d) `canonicalRoles.includes(r.role)` passes in `test/cutlist_print.test.js`.
4. **Machining & 3D Viewer Independence**:
   - In `buildCutlist`, back panel groove machining is triggered by `if (p.kind === 'side' || p.kind === 'h') groove('back', ...);`. Since `p.kind === 'side'` is preserved, machining calculations are completely unaffected.
   - In `viewer.js`, mesh colors, materials, and explode transforms check `p.kind === 'side'`. Since `p.kind === 'side'` is preserved, 3D rendering and explode animations are completely unaffected.
5. **Backwards Compatibility & Test 11 Resolution**:
   - All tests in `m1_challenger_stepped_layout.test.js`, `stepped_3d_viewer.test.js`, and `cutlist_stress_adversarial.test.js` filter laterals by `p.kind === 'side'` or `r.role === 'vertical-side'`.
   - The only test expecting `r.name === 'Lateral'` is `test/stepped_layout.test.js` Test 11. That test was a preliminary M1 check. In M4, Test 11 must be updated to assert the M4 requirement:
     - 840mm lateral: `Lateral exterior`, `qty: 1`
     - 1640mm outer lateral: `Lateral exterior`, `qty: 1`
     - 1640mm shared lateral: `Lateral interior`, `qty: 1`

---

## 3. Caveats

- **Single Column Furniture ($N = 1$)**: For a single column, both outer laterals are named `'Lateral exterior'`. Because their heights and dimensions are identical ($H_0 + 2ov$), they group into a single cutlist row with `qty: 2`, maintaining the exact 4-row cutlist expectation in `test/cutlist_stress_adversarial.test.js` (Suite 8).
- **Uniform Multi-Column Furniture**: If all columns have identical heights, all intermediate laterals share identical dimensions and merge into `name: 'Lateral interior', qty: N - 1`, and both outer laterals merge into `name: 'Lateral exterior', qty: 2`. This accurately mirrors real workshop cutlists.
- **Top Caps (`Tapa superior`)**: Top caps are already instantiated per-column (`sx: W`, `sz: cd`). No modification to top cap naming is necessary; retaining `name: 'Tapa superior'` ensures compatibility with `viewer.js` (line 753) and all existing top cap assertions.

---

## 4. Conclusion

1. In `public/js/layout.js`, update `computeLayout` so:
   - Left outer lateral is injected with `name: 'Lateral exterior'`.
   - Intermediate shared laterals are injected with `name: 'Lateral interior'`.
   - Right outer lateral is injected with `name: 'Lateral exterior'`.
2. In `public/js/layout.js`, update `ROLE` dictionary to include:
   - `'Lateral exterior': 'vertical-side'`
   - `'Lateral interior': 'vertical-side'`
   - `'side': 'vertical-side'`
   - Retain `'Lateral': 'vertical-side'` for backward compatibility.
3. In `test/stepped_layout.test.js`, update Test 11 to check for `Lateral exterior` (840mm qty 1 and 1640mm qty 1) and `Lateral interior` (1640mm qty 1).

---

## 5. Concrete Implementation Blueprint

### Blueprint Part 1: `public/js/layout.js`

#### Diff A: Laterals in `computeLayout`
```diff
--- public/js/layout.js
+++ public/js/layout.js
@@ -156,5 +156,5 @@
   // Lateral izquierdo exterior
   const leftLatH = colHeights[0] + 2 * s.overhang;
-  add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: leftLatH, sz: D, col: 0 });
+  add({ name: 'Lateral exterior', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: leftLatH, sz: D, col: 0, sideType: 'outer-left' });
   x += t;
   xs.push(x);
   x += cols[0].width;

   // Laterales intermedios compartidos y divisores de columna
   for (let i = 0; i < cols.length - 1; i++) {
     const sharedH = Math.max(colHeights[i], colHeights[i + 1]) + 2 * s.overhang;
-    add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: sharedH, sz: D, col: i + 1 });
+    add({ name: 'Lateral interior', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: sharedH, sz: D, col: i + 1, sideType: 'intermediate' });
     const d = { type: 'col', axis: 'h', colIdx: i, x, y: -s.overhang, w: t, h: sharedH, col: i, cursor: 'ew-resize' };
     dividers.push(d);
     colDividers.push(d);
     x += t;
     xs.push(x);
     x += cols[i + 1].width;
   }

   // Lateral derecho exterior
   const rightLatH = colHeights[cols.length - 1] + 2 * s.overhang;
-  add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: rightLatH, sz: D, col: cols.length });
+  add({ name: 'Lateral exterior', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: rightLatH, sz: D, col: cols.length, sideType: 'outer-right' });
```

#### Diff B: ROLE Mapping
```diff
--- public/js/layout.js
+++ public/js/layout.js
@@ -391,6 +391,9 @@
 const ROLE = {
   Lateral: 'vertical-side',
+  'Lateral exterior': 'vertical-side',
+  'Lateral interior': 'vertical-side',
+  side: 'vertical-side',
   'División vertical': 'vertical-side',
   'Tapa superior': 'horizontal-deck',
   Base: 'horizontal-deck',
```

### Blueprint Part 2: `test/stepped_layout.test.js`

#### Diff C: Test 11 in `test/stepped_layout.test.js`
```diff
--- test/stepped_layout.test.js
+++ test/stepped_layout.test.js
@@ -408,12 +408,16 @@
   // Check itemized cutlist rows for laterals
-  // Height 840 (Left lateral): qty 1
-  const lat840 = cl.rows.find((r) => r.name === 'Lateral' && r.length === 840);
-  assert.ok(lat840, 'Must have a cutlist row for 840mm lateral');
-  assert.equal(lat840.qty, 1);
+  // Height 840 (Left lateral exterior): qty 1
+  const latExt840 = cl.rows.find((r) => r.name === 'Lateral exterior' && r.length === 840);
+  assert.ok(latExt840, 'Must have a cutlist row for 840mm lateral exterior');
+  assert.equal(latExt840.qty, 1);
 
-  // Height 1640 (Shared and right laterals): qty 2
-  const lat1640 = cl.rows.find((r) => r.name === 'Lateral' && r.length === 1640);
-  assert.ok(lat1640, 'Must have a cutlist row for 1640mm laterals');
-  assert.equal(lat1640.qty, 2);
+  // Height 1640 (Right outer lateral exterior): qty 1
+  const latExt1640 = cl.rows.find((r) => r.name === 'Lateral exterior' && r.length === 1640);
+  assert.ok(latExt1640, 'Must have a cutlist row for 1640mm lateral exterior');
+  assert.equal(latExt1640.qty, 1);
+
+  // Height 1640 (Intermediate shared lateral interior): qty 1
+  const latInt1640 = cl.rows.find((r) => r.name === 'Lateral interior' && r.length === 1640);
+  assert.ok(latInt1640, 'Must have a cutlist row for 1640mm lateral interior');
+  assert.equal(latInt1640.qty, 1);
```

---

## 6. Verification Method

To independently verify this implementation:
1. **Inspection**:
   - Check `public/js/layout.js` lines 158, 166, 177 to confirm `Lateral exterior` and `Lateral interior` naming.
   - Check `ROLE` dictionary in `public/js/layout.js` to confirm `'Lateral exterior'` and `'Lateral interior'` map to `'vertical-side'`.
2. **Execute Full Test Suite**:
   ```powershell
   npm test
   ```
   Or run the specific cutlist test suites:
   ```powershell
   node --test test/stepped_layout.test.js
   node --test test/cutlist_print.test.js
   node --test test/cutlist_stress_adversarial.test.js
   node --test test/e2e_acceptance_complete.test.js
   ```
3. **Pass Criteria**:
   - 100% pass across all unit and adversarial test suites.
   - Panel cutlist rows contain granular `Lateral exterior` and `Lateral interior` with prefix `S`.
   - Grand total arithmetic identity `panelsTotal + hardwareTotal === total` is strictly maintained.
