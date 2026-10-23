# Handoff Report: Stepped 3D Geometry, Kinematics & Cutlist Architecture

**Agent**: Explorer 3 (Stepped 3D Geometry, Kinematics & Cutlist)  
**Parent Conversation ID**: 20a52755-88ff-4e04-950c-4b4a3c054fe0  
**Timestamp**: 2026-10-23T05:31:00Z  
**Type**: Hard Handoff  

---

## 1. Observation

Direct observations from examining the codebase (`public/js/layout.js`, `public/js/viewer.js`, `public/js/app.js`, `test/viewer_3d.test.js`, `test/cutlist_print.test.js`, and test execution):

### 1.1 Global Uniform Height in `layout.js`
- **Lines 121, 144–160**: In `computeLayout`, lateral generation uses a single uniform height variable `const H = s.height`:
  ```javascript
  cols.forEach((c, i) => {
    add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: H + 2 * s.overhang, sz: D, col: i });
    ...
  });
  add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: H + 2 * s.overhang, sz: D, col: cols.length });
  ```
  Every lateral is forced to the same height `H + 2 * s.overhang`, ignoring column-specific heights.
- **Lines 329–338**: Top caps, bases, back panels, and root module placement use `H` globally:
  ```javascript
  cols.forEach((c, i) => {
    const x0 = xs[i];
    const W = c.width;
    add({ name: 'Tapa superior', mat: 'carcass', kind: 'h', x: x0, y: H - t, z: bt, sx: W, sy: t, sz: cd, col: i });
    add({ name: 'Base', mat: 'carcass', kind: 'h', x: x0, y: 0, z: bt, sx: W, sy: t, sz: cd, col: i });
    const g = s.grooveClearance;
    add({ name: 'Fondo', mat: 'back', kind: 'back', x: x0 - 10 + g, y: t - 10 + g, z: 0, sx: W + 20 - 2 * g, sy: H - 2 * t + 20 - 2 * g, sz: bt, col: i });
    place(c.root, x0, t, W, H - 2 * t, i);
  });
  ```
  Consequently, all columns are enclosed in a single rectangular box of height `H`. When a column has fewer modules or different heights, empty cavities or stretched modules are produced.

### 1.2 3D Geometry and Positioning in `viewer.js`
- **Lines 526–550**: The 3D scene assumes `const H = layout.settings.height`:
  ```javascript
  const yBase = -(H * S) / 2;
  this.floorShadow.position.y = yBase;
  this.floorGrid.position.y = yBase + 0.0005;
  ...
  this.group.position.set(-cx * S, yBase, -(layout.settings.depth / 2) * S);
  ```
  The floor plane and group origin are centered using `H`. If columns have different heights, vertical centering and camera framing in `resetCamera()` (`lines 434–442`) must reference the bounding maximum column height `maxH = Math.max(...cols.map(c => c.height || H), H)`.
- **Lines 738–746**: Explosion mode for horizontal decks:
  ```javascript
  if (p.name === 'Tapa superior' || pcy > cy + H * 0.3) {
    expOy = E_BASE * 0.8;
  } else if (p.name === 'Base' || pcy < cy - H * 0.3) {
    expOy = -E_BASE * 0.8;
  }
  ```
  Any piece named `'Tapa superior'` receives an upward explosion offset `+E_BASE * 0.8`, which correctly handles independent caps as long as their individual rest heights are correct.

### 1.3 Kinematics: Drawers and Swing Doors
- **Drawers in `viewer.js` (lines 588, 611–648)**:
  - Drawer pieces are partitioned by key: `const key = `${p.nodeId}_${Math.round(p.y / 15) * 15}`;`.
  - In `layout.js` (lines 262–276), drawer front has `y = cy + idx * slot + fc / 2`, while drawer box components have `by = cy0 + idx * inner + (inner - bh) / 2`. The difference `y - by` can cross a 15mm quantization threshold, causing subtle partitioning splits unless tagged with an explicit index `p.drawerIndex = idx`.
  - Kinematic staircase progression:
    ```javascript
    list.sort((a, b) => a.y - b.y);
    const N = list.length;
    list.forEach((dg, idx) => {
      const openRatio = N > 1 ? (0.75 - (idx / (N - 1)) * 0.40) : 0.65;
      ...
      const openOffsetZ = openRatio * D * oT * S;
      dGroup.position.set(0, 0, openOffsetZ + explodeOffsetZ);
    });
    ```
    Bottom drawer (`idx = 0`) opens to 75% depth ($0.75 \cdot D$), top drawer (`idx = N - 1`) opens to 35% depth ($0.35 \cdot D$). This graduated cascade provides full visibility into all drawers.
- **Swing Doors in `viewer.js` (lines 766–790) & `layout.js` (lines 201–212)**:
  - For double doors (`n.front === 'doors'`):
    - Left leaf: `x = cx + fc`, `side = 'right'` (handle on right edge). In `viewer.js`, `isLeftHinge = true`, `hingeX = p.x` (outer left edge). Rotation: `-(Math.PI / 2) * oT` (-90°).
    - Right leaf: `x = cx + 2 * fc + dw`, `side = 'left'` (handle on left edge). In `viewer.js`, `isLeftHinge = false`, `hingeX = p.x + p.sx` (outer right edge). Rotation: `+(Math.PI / 2) * oT` (+90°).
    - Double doors pivot strictly at outer carcass edges and swing outward away from center.
  - For single doors (`left-door` / `right-door`):
    - `left-door`: `side = 'right'`, pivot at `p.x` (left edge), swings -90°.
    - `right-door`: `side = 'left'`, pivot at `p.x + p.sx` (right edge), swings +90°.

### 1.4 Cutlist Aggregation & Print Layout in `layout.js`
- **Lines 388–404**:
  ```javascript
  const key = [role, p.name, ori.o, w, h, T].join('|');
  let r = map.get(key);
  if (!r) {
    const area = (w * h) / 1e6;
    const [L, W] = [Math.max(w, h), Math.min(w, h)];
    const priceKey = PRICE_KEY[p.mat] || PRICE_KEY[p.kind] || 'priceFront';
    r = { name: p.name, role, orientation: ori.o, mat: p.mat, w, h, length: L, width: W, thickness: T, qty: 0, holes: p.holes || 0, unitPrice: area * (s[priceKey] || 0), unitArea: area };
    map.set(key, r);
  }
  r.qty += 1;
  ```
  Cutlist grouping key includes `w` and `h`. Pieces with different dimensions (such as laterals of unequal heights or top caps of varying widths) do not collapse into each other; they produce distinct tabular rows with exact millimeter measurements and individual quantities.
- **Lines 469–472**: Total price is computed as:
  ```javascript
  const panelsTotal = rows.reduce((a, r) => a + r.total, 0);
  const hardwareTotal = hardware.reduce((a, r) => a + r.total, 0);
  return { rows, machining, hardware, panelsTotal, hardwareTotal, total: panelsTotal + hardwareTotal, area, m2: area };
  ```
  The arithmetic identity `panelsTotal + hardwareTotal === total` holds under all configurations.
- **Suite Results**: `npm test` passed 269/269 tests across all suites (`test/viewer_3d.test.js`, `test/cutlist_print.test.js`, `test/cutlist_stress_adversarial.test.js`, `test/layout.test.js`).

---

## 2. Logic Chain

1. **Independent Column Heights Model ($H_i$)**:
   - From Obs 1.1, `layout.js` uses `s.height`. To support stepped cabinets, each column $i$ must declare its own height $H_i = \text{column}[i].\text{height} || s.\text{height}$.
   - The furniture bounding height is $H_{\max} = \max_{i}(H_i, s.\text{height})$.

2. **Stepped Intermediate Laterals ($H_{\text{shared}}$)**:
   - For $N$ columns, there are $N+1$ vertical laterals:
     - Lateral 0 (outer left): Adjacent only to column 0. Height: $H_0 + 2 \cdot ov$.
     - Lateral $i$ ($1 \le i \le N-1$): Shared divider between column $i-1$ and column $i$. If $H_{i-1} \ne H_i$, the physical cabinet requires the shared divider to rise to the height of the taller column to support its top cap: $H_{\text{shared}, i} = \max(H_{i-1}, H_i) + 2 \cdot ov$.
     - Lateral $N$ (outer right): Adjacent only to column $N-1$. Height: $H_{N-1} + 2 \cdot ov$.
   - On the side of the shorter column (e.g. $H_{i-1} < H_i$), the shared lateral extends above the shorter top cap ($H_{i-1} - t$) up to $H_i + ov$, remaining naturally exposed on the step without extra filler pieces.

3. **Independent Top Caps (`Tapa superior`)**:
   - Each column $i$ must generate its top cap at $y = H_i - t$ with span $x \in [x_i, x_i + W_i]$, thickness $sy = t$, and depth $sz = D - bt$.
   - Because $y$ and $H_i$ differ across stepped columns, each column's top cap is rendered at its respective elevation in 3D.

4. **Staggered Back Panels (`Fondo`)**:
   - For column $i$, the back panel spans $x \in [x_i - 10 + g, x_i + W_i + 10 - g]$ with height $sy = H_i - 2t + 20 - 2g$, starting at $y = t - 10 + g$.
   - Each back panel matches the individual height of its column, forming a stepped back silhouette that fits into the carcass grooves.

5. **Kinematic Precision & Stability**:
   - In `layout.js`, assigning `drawerIndex: idx` to all pieces of a drawer unit guarantees that in `viewer.js`, grouping by `${p.nodeId}_${p.drawerIndex}` eliminates any rounding error from float `y` coordinates.
   - The staircase ratio $0.75 - \frac{idx}{N-1} \times 0.40$ (bottom 75%, top 35%) and outer-hinge door pivots (-90° left, +90° right) meet all kinematics requirements.

6. **Cutlist Classification & Printing**:
   - In `layout.js`, naming laterals based on position—`'Lateral exterior'` for outer boundaries ($i=0, N$) and `'Lateral interior'` for intermediate dividers ($1 \le i \le N-1$)—while mapping all to canonical role `'vertical-side'` (prefix `'S'`), provides clear architectural classification.
   - Because `buildCutlist` groups by dimension `(w, h)`, laterals of different heights and top caps of different widths are itemized into separate rows with accurate square meter area and cost. The arithmetic pricing invariant `panelsTotal + hardwareTotal === total` is maintained.

---

## 3. Caveats

1. **Backwards Compatibility**: Existing test fixtures in `test/layout.test.js` or `test/e2e_acceptance_complete.test.js` may query `p.name === 'Lateral'`. If laterals are named `'Lateral exterior'` and `'Lateral interior'`, any test checking exact string `=== 'Lateral'` would need either `p.name.includes('Lateral')` or maintaining `name: 'Lateral'` with a classification property `role: 'vertical-side'` and `label: isOuter ? 'Lateral exterior' : 'Lateral interior'`. Both approaches are documented in the blueprint.
2. **2D Drag Constraints**: When dragging the top border of a column in 2D, the height must be clamped to a minimum safe height (e.g., $\ge 200$ mm or $\ge 2 \cdot t + 50$ mm) to prevent inverted geometry.
3. **No Code Modification During Survey**: As an Explorer, no production files were modified. All proposals are presented via precise blueprints.

---

## 4. Conclusion

The stepped furniture architecture requires coordinated updates in `public/js/layout.js`, `public/js/viewer.js`, and `public/js/app.js`:

1. **`layout.js`**:
   - Add column height resolution: $H_i = c.\text{height} || s.\text{height}$ and $H_{\max} = \max_i(H_i)$.
   - Calculate outer laterals at $H_0 + 2ov$ and $H_{N-1} + 2ov$, and shared intermediate laterals at $\max(H_{i-1}, H_i) + 2ov$.
   - Generate independent top caps at $H_i - t$ and back panels at $H_i - 2t + 20 - 2g$.
   - Add `drawerIndex: idx` to drawer pieces to guarantee 100% stable kinematic grouping.
   - Extend `ROLE` with `'Lateral exterior'` and `'Lateral interior'` mapping to `'vertical-side'`.

2. **`viewer.js`**:
   - Base floor and group vertical placement on $H_{\max}$ (`const maxH = layout.maxH || layout.settings.height`).
   - Center camera in `resetCamera()` using $H_{\max}$.
   - Group drawers using `p.drawerIndex !== undefined ? `${p.nodeId}_${p.drawerIndex}` : ...`.
   - Explode mode displaces each independent `'Tapa superior'` upward by $+E_{\text{BASE}} \cdot 0.8$.

3. **`app.js`**:
   - Render 2D SVG canvas with staggered silhouette using $H_i$.
   - Position per-column `(+)` button above each column at $H_i$.
   - Add top border horizontal drag handle for vertical resizing per column.
   - Ensure Cutlist display and print layout reflect the stepped pieces.

---

## 5. Verification Method

### 5.1 Test Execution Commands
Run the complete regression suite in PowerShell:
```powershell
npm test
```
All 269 existing tests must pass without failure.

### 5.2 Stepped Furniture Unit Tests to Implement
Add a dedicated test suite (e.g. `test/stepped_furniture_3d.test.js`) verifying:
1. **Geometry Invariants**:
   - Project with Col 0 ($H=800$, $W=600$) and Col 1 ($H=1600$, $W=800$):
     - Left lateral: height $800 + 2 \cdot ov = 840$ mm.
     - Intermediate shared lateral: height $\max(800, 1600) + 2 \cdot ov = 1640$ mm.
     - Right lateral: height $1600 + 2 \cdot ov = 1640$ mm.
     - Col 0 top cap at $y = 800 - t = 782$ mm, Col 1 top cap at $y = 1600 - t = 1582$ mm.
     - Col 0 back panel height $800 - 2t + 20 - 2g$, Col 1 back panel height $1600 - 2t + 20 - 2g$.
2. **Kinematics Verification**:
   - Lower column with 3 drawers: verify in `renderMode = 'open'` that bottom drawer translates $+0.75 \cdot D$, middle translates $+0.55 \cdot D$, top translates $+0.35 \cdot D$.
   - Upper column with double doors: verify left leaf pivots at outer left hinge ($-90^\circ$) and right leaf pivots at outer right hinge ($+90^\circ$).
3. **Cutlist Accounting**:
   - Verify that `cutlist.rows` contains separate line items for laterals of height 840mm and height 1640mm.
   - Verify `panelsTotal + hardwareTotal === total`.
   - Verify tabular display and print styles format correctly.

---

# Concrete Implementation Blueprint

### A. Mathematical Specifications

$$\begin{aligned}
H_i &= c_i.\text{height} \;\; (\text{fallback to } s.\text{height}) \\
H_{\max} &= \max_{i=0}^{N-1}(H_i, s.\text{height}) \\
x_0 &= t, \quad x_i = x_{i-1} + W_{i-1} + t \\
\text{Lateral}_0.\text{height} &= H_0 + 2 \cdot ov \\
\text{Lateral}_i.\text{height} &= \max(H_{i-1}, H_i) + 2 \cdot ov \quad (1 \le i \le N-1) \\
\text{Lateral}_N.\text{height} &= H_{N-1} + 2 \cdot ov \\
\text{TapaSuperior}_i.\text{elevation} &= H_i - t \\
\text{TapaSuperior}_i.\text{width} &= W_i \\
\text{Fondo}_i.\text{height} &= H_i - 2 \cdot t + 20 - 2 \cdot g \\
\text{DrawerOpenRatio}(idx, N) &= \begin{cases} 0.65 & \text{if } N = 1 \\ 0.75 - \left(\frac{idx}{N - 1}\right) \times 0.40 & \text{if } N > 1 \end{cases}
\end{aligned}$$

### B. Exact Line Changes

#### 1. `public/js/layout.js`
- **Lines 121**:
  ```javascript
  // Before:
  const H = s.height;
  // After:
  const colHeights = cols.map((c) => (typeof c.height === 'number' && c.height > 0 ? c.height : s.height));
  const maxH = Math.max(...colHeights, s.height);
  ```
- **Lines 144–160**:
  ```javascript
  // Laterals calculation
  cols.forEach((c, i) => {
    const isFirst = i === 0;
    const latH = isFirst ? colHeights[0] : Math.max(colHeights[i - 1], colHeights[i]);
    const latName = isFirst ? 'Lateral exterior' : 'Lateral interior';
    add({ name: latName, mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: latH + 2 * s.overhang, sz: D, col: i });
    x += t;
    xs.push(x);
    x += c.width;
    if (i < cols.length - 1) {
      const sharedH = Math.max(colHeights[i], colHeights[i + 1]);
      const d = { type: 'col', axis: 'h', colIdx: i, x, y: -s.overhang, w: t, h: sharedH + 2 * s.overhang, col: i, cursor: 'ew-resize' };
      dividers.push(d);
      colDividers.push(d);
    }
  });
  const lastLatH = colHeights[cols.length - 1];
  add({ name: 'Lateral exterior', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: lastLatH + 2 * s.overhang, sz: D, col: cols.length });
  const outerD = { type: 'col-outer', axis: 'h', colIdx: cols.length - 1, x, y: -s.overhang, w: t, h: lastLatH + 2 * s.overhang, col: cols.length - 1, cursor: 'ew-resize' };
  dividers.push(outerD);
  colDividers.push(outerD);
  ```
- **Lines 262–276**:
  ```javascript
  // In drawer loop, attach drawerIndex: idx to each piece
  for (let i = 0; i < cnt; i++) {
    const idx = cnt - 1 - i;
    add({ ..., drawerIndex: idx });
  }
  ```
- **Lines 329–338**:
  ```javascript
  cols.forEach((c, i) => {
    const x0 = xs[i];
    const W = c.width;
    const Hi = colHeights[i];
    add({ name: 'Tapa superior', mat: 'carcass', kind: 'h', x: x0, y: Hi - t, z: bt, sx: W, sy: t, sz: cd, col: i });
    add({ name: 'Base', mat: 'carcass', kind: 'h', x: x0, y: 0, z: bt, sx: W, sy: t, sz: cd, col: i });
    const g = s.grooveClearance;
    add({ name: 'Fondo', mat: 'back', kind: 'back', x: x0 - 10 + g, y: t - 10 + g, z: 0, sx: W + 20 - 2 * g, sy: Hi - 2 * t + 20 - 2 * g, sz: bt, col: i });
    place(c.root, x0, t, W, Hi - 2 * t, i);
  });
  ```
- **Lines 340**:
  ```javascript
  return { settings: s, maxH, pieces, cells, dividers, colDividers, totalW, hardware: hw, cutlist: buildCutlist(pieces, s, hw) };
  ```
- **Lines 351–368 (ROLE mapping)**:
  ```javascript
  const ROLE = {
    Lateral: 'vertical-side',
    'Lateral exterior': 'vertical-side',
    'Lateral interior': 'vertical-side',
    'División vertical': 'vertical-side',
    ...
  };
  ```

#### 2. `public/js/viewer.js`
- **Lines 434–442 (`resetCamera`)**:
  ```javascript
  const maxH = layout.maxH || layout.settings.height;
  const W = layout.totalW * S;
  const H = maxH * S;
  const D = layout.settings.depth * S;
  const size = Math.max(W, H, D);
  ```
- **Lines 526–550 (`update`)**:
  ```javascript
  const maxH = layout.maxH || layout.settings.height;
  const H = maxH;
  const D = layout.settings.depth;
  const W = layout.totalW;
  const cx = W / 2;
  const cy = H / 2;
  const cz = D / 2;
  ...
  const yBase = -(H * S) / 2;
  this.floorShadow.position.y = yBase;
  this.floorGrid.position.y = yBase + 0.0005;
  ```
- **Line 588 (`drawer grouping`)**:
  ```javascript
  const key = p.drawerIndex !== undefined
    ? `${p.nodeId}_${p.drawerIndex}`
    : `${p.nodeId}_${Math.round(p.y / 15) * 15}`;
  ```
- **Lines 736–756 (`explode kinematics`)**:
  ```javascript
  if (p.kind === 'side') {
    expOx = Math.sign(pcx - cx) * E_BASE * 0.9;
  } else if (p.kind === 'h') {
    if (p.name === 'Tapa superior') {
      expOy = E_BASE * 0.8;
    } else if (p.name === 'Base') {
      expOy = -E_BASE * 0.8;
    } else {
      expOy = ((pcy - cy) / cy) * E_BASE * 0.4;
    }
  }
  ```
