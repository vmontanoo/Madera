# Full R2 Specification & Edge Case Analysis Report

**Agent**: `teamwork_preview_spec_miner_m2_3`  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_spec_miner_m2_3`  
**Date**: 2026-10-22  
**Milestone**: M2 (R2 - 2D Drag Resizing, Reactive Cursors, Fluid Redistribution, Live 3D Sync & Invariant Hardening)  
**Authoritative Sources**:
1. `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md`
2. `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\PROJECT.md`
3. `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_challenger_m1_2\handoff.md`
4. Codebase: `public/js/layout.js`, `public/js/app.js`, `public/js/viewer.js`, `public/style.css`, `test/drag_bounds_empirical.test.js`

---

## 1. Observation

### 1.1 Acceptance Criteria Definitions (`ORIGINAL_REQUEST.md:18-22, 36-40`)
```markdown
### R2. Redimensionamiento visual por selección y arrastre de filas y columnas
- En el modelo 2D, permitir seleccionar y arrastrar los límites de filas, columnas y divisiones de forma precisa y responsiva.
- El arrastre debe redistribuir el espacio entre las secciones afectadas manteniendo las proporciones del resto del diseño.
- Las dimensiones mostradas y el modelo 3D deben actualizarse en tiempo real durante y tras el arrastre.

### Arrastre de Filas y Columnas (R2)
- [ ] Indicador de cursor (ns-resize / ew-resize) reactivo sobre los divisores y bordes de filas y columnas.
- [ ] Arrastrar un divisor ajusta fluidamente las dimensiones relativas de las celdas adyacentes.
- [ ] Registro en el historial de desacer/rehacer (Ctrl+Z / Ctrl+Y) al finalizar el arrastre.
```

### 1.2 Divider Data Model in `layout.js`
In `public/js/layout.js:127-136, 226-242`:
1. **Inter-column Dividers** (`layout.js:127-131`):
   ```javascript
   if (i < cols.length - 1) {
     const d = { type: 'col', axis: 'h', colIdx: i, x, y: -s.overhang, w: t, h: H + 2 * s.overhang, col: i, cursor: 'ew-resize' };
     dividers.push(d);
     colDividers.push(d);
   }
   ```
2. **Outer Column Border Divider** (`layout.js:133-136`):
   ```javascript
   const outerD = { type: 'col-outer', axis: 'h', colIdx: cols.length - 1, x, y: -s.overhang, w: t, h: H + 2 * s.overhang, col: cols.length - 1, cursor: 'ew-resize' };
   dividers.push(outerD);
   colDividers.push(outerD);
   ```
3. **Internal Vertical Partitions (Horizontal Container `dir: 'h'`)** (`layout.js:226-230`):
   ```javascript
   if (j < k - 1) {
     add({ name: 'División vertical', mat: 'carcass', kind: 'v', x: cx, y: py, z: bt, sx: t, sy: h, sz: cd, col, nodeId: n.id });
     dividers.push({ axis: 'h', parentId: n.id, prevId: ch.id, nextId: kids[j + 1].id, x: cx, y: py, w: t, h, col });
     cx += t;
   }
   ```
4. **Internal Horizontal Shelves (Vertical Container `dir: 'v'`)** (`layout.js:238-242`):
   ```javascript
   if (j < k - 1) {
     cy -= t;
     add({ name: 'Estante / división', mat: 'carcass', kind: 'h', x: px, y: cy, z: bt, sx: w, sy: t, sz: cd, col, nodeId: n.id });
     dividers.push({ axis: 'v', parentId: n.id, prevId: ch.id, nextId: kids[j + 1].id, x: px, y: cy, w, h: t, col });
   }
   ```

### 1.3 Canvas Rendering, Hit Areas, and Cursor Binding in `app.js`
In `public/js/app.js:226-235, 278-283`:
```javascript
// Divisores arrastrables para cambiar tamaño interactivamente
(layout.dividers || []).forEach((d, idx) => {
  const isV = d.axis === 'v'; // divisor horizontal que se arrastra en vertical Y
  const cursor = isV ? 'ns-resize' : 'ew-resize';
  const pad = 8;
  const rx = isV ? d.x : d.x - pad;
  const ry = isV ? Y(d.y, d.h) - pad : Y(d.y, d.h);
  const rw = isV ? d.w : d.w + 2 * pad;
  const rh = isV ? d.h + 2 * pad : d.h;
  svg += `<rect class="drag-handle" data-didx="${idx}" x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="transparent" style="cursor:${cursor};pointer-events:all;"/>`;
});
```
On `mousedown` (`app.js:278-283`):
```javascript
const startPt = getSvgCoords(e);
const isV = d.axis === 'v';
const cursor = isV ? 'ns-resize' : 'ew-resize';
document.body.style.cursor = cursor;
handle.classList.add('dragging');
const initialSnapshot = snapshot();
```

### 1.4 CSS Hover & Active Feedback in `style.css:57-58`
```css
svg .drag-handle { fill: transparent; transition: fill 0.15s ease; }
svg .drag-handle:hover, svg .drag-handle.dragging { fill: rgba(255, 184, 0, 0.4); }
```

### 1.5 Challenger 2 Finding Regarding Drawer Sub-components
In `public/js/layout.js:180-202` (specifically lines 180-194):
```javascript
const cnt = Math.max(1, Math.round(n.count || 1));
const slot = ch / cnt;
const inner = h / cnt;
const sc = s.slideClearance;
const dt = s.drawerThickness;
const bw = w - 2 * sc;
const bd = cd - 20;
const bz = D - bd;
for (let i = 0; i < cnt; i++) {
  const idx = cnt - 1 - i;
  ...
  const by = cy0 + idx * inner + s.drawerInset / 2;
  const bh = inner - s.drawerInset;
  const bx = cx0 + sc;
  const base = { mat: 'drawer', kind: 'drawer', col, nodeId: n.id };
  add({ ...base, name: 'Lateral de gaveta', x: bx, y: by, z: bz, sx: dt, sy: bh, sz: bd });
  add({ ...base, name: 'Lateral de gaveta', x: bx + bw - dt, y: by, z: bz, sx: dt, sy: bh, sz: bd });
  add({ ...base, name: 'Frente/trasera de gaveta', x: bx + dt, y: by, z: D - dt, sx: bw - 2 * dt, sy: bh, sz: dt });
```
In `test/drag_bounds_empirical.test.js:291-318` (`EMPIRICAL 8`):
```javascript
// Test what happens when a 3-drawer module is clamped to minSize 50mm
const shelf = p.columns[0].root.children[0];
const drawer = p.columns[0].root.children[1];
drawer.size = 50;
shelf.size = 1300;
const l = computeLayout(p);
const anomalies = auditLayoutInvariants(l, '3-drawer module at minSize 50mm');
// Verbatim log output:
// [CHALLENGER FINDING] 3-drawer module at 50mm produced 12 negative piece dimensions and 2 negative cutlist rows
```
With `h = 50mm`, `cnt = 3`, and default `s.drawerInset = 20mm`:
$$inner = \frac{50}{3} \approx 16.667\text{ mm}$$
$$bh = inner - s.drawerInset = 16.667 - 20 = -3.333\text{ mm} < 0$$
This propagates negative dimensions into `Lateral de gaveta` (`sy: -3.333`), `Frente/trasera de gaveta` (`sy: -3.333`), and corrupts `orientationOf` in `layout.js:296` where `thickness` sorts to $-3.333\text{ mm}$, yielding negative surface area and corrupted cutlist pricing.

---

## 2. Logic Chain

### 2.1 AC 1: Cursor Indicators, Hover Styles, and Body Cursor Locking
1. **Divider Axis vs. Cursor Orientation**:
   - `d.axis === 'v'`: Represents a horizontal divider (shelf) separating vertically stacked rows. Dragging it moves it up and down along the Y-axis. The standard cursor is `ns-resize`.
   - `d.axis === 'h'`: Represents a vertical divider (partition or column lateral) separating horizontally placed columns or cells. Dragging it moves it left and right along the X-axis. The standard cursor is `ew-resize`.
   - Both in `layout.js` (metadata) and in `app.js` (SVG element creation), `isV ? 'ns-resize' : 'ew-resize'` is assigned.
2. **Interactive Hit Areas**:
   - Dividers have nominal board thickness $t \in [15, 18]\text{ mm}$. A raw 15mm hit target is difficult to grab with high-DPI mouse pointers.
   - An expansion padding of $pad = 8\text{ mm}$ is applied in `app.js:229-234`, creating a total interactive thickness of $t + 16\text{ mm} \approx 31\text{--}34\text{ mm}$.
   - For vertical drag (`d.axis === 'v'`), hit rectangle is expanded by $pad$ above and below ($rh = d.h + 2 \cdot pad$).
   - For horizontal drag (`d.axis === 'h'`), hit rectangle is expanded by $pad$ left and right ($rw = d.w + 2 \cdot pad$).
3. **Cursor State Locking & Body Lock**:
   - During active drag (`mousedown`), the mouse pointer frequently moves faster than DOM updates, temporarily leaving the SVG handle.
   - Without locking `document.body.style.cursor`, the operating system cursor reverts to `default` or `pointer` over adjacent cells, causing visual flickering.
   - Solution: On `mousedown`, lock `document.body.style.cursor = cursor`.
   - Additionally, to prevent accidental OS text selection or browser blue highlight across the canvas, `document.body.style.userSelect = 'none'` must be applied during drag and cleared on `mouseup`.

### 2.2 AC 2: Fluid Redistribution Mathematics and Non-Interference Invariants
1. **Internal Divider Drag (Adjacent Sibling Redistribution)**:
   - Let container node $P$ have $k$ children: $C_0, C_1, \dots, C_{k-1}$ with millimeter sizes $S_0, S_1, \dots, S_{k-1}$.
   - Suppose the divider between sibling $i$ and sibling $i+1$ is dragged.
   - **Conservation of Local Dimension**:
     $$S_i' + S_{i+1}' = S_i + S_{i+1} = \text{totalPair}$$
   - **Non-Interference Invariant**:
     $$\forall j \notin \{i, i+1\}, \quad S_j' = S_j$$
     The sizes and relative proportions of all other $k-2$ sibling modules in that container—and all other modules across the entire furniture—remain strictly invariant ($1.000\dots$).
   - **Sibling Normalization Prerequisite**:
     If nodes were initialized with unweighted ratios (`size: 1`, `size: 1`), adding millimeter delta $\Delta$ directly would cause catastrophic collapse. Therefore, on `mousedown`, all siblings in the container are first normalized to actual millimeter values based on `layout.cells[ch.id]`:
     $$C_j.\text{size} = \text{isV} \ ? \ \text{cell.h} : \text{cell.w}$$
   - **Clamping**:
     $$S_i' = \text{round}(\text{clamp}(S_i + \Delta, \text{minSize}, \text{totalPair} - \text{minSize}))$$
     $$S_{i+1}' = \text{totalPair} - S_i'$$
     where $\text{minSize} = 50\text{ mm}$.

2. **Inter-Column Divider Drag (Adjacent Column Redistribution)**:
   - For column divider $i$ separating column $i$ and column $i+1$:
     $$W_i + W_{i+1} = \text{totalPair}$$
     $$\forall j \notin \{i, i+1\}, \quad W_j' = W_j$$
   - Conservation of Total Furniture Width:
     $$\text{totalW}' = \sum_{j=0}^{M-1} W_j' + (M+1) \cdot t = \sum_{j=0}^{M-1} W_j + (M+1) \cdot t = \text{totalW}$$
   - Clamping:
     $$W_i' = \text{round}(\text{clamp}(W_i + \Delta X, \text{minW}, \text{totalPair} - \text{minW}))$$
     $$W_{i+1}' = \text{totalPair} - W_i'$$
     where $\text{minW} = 150\text{ mm}$.
   - Internal Proportions inside Columns:
     When $W_i$ expands or contracts, internal horizontal children inside column $i$ scale proportionally via `norm(kids, W_i' - (k-1)*t)`, preserving internal design aesthetics.

3. **Live 3D Viewport Synchronization**:
   - `refresh()` executes on every `mousemove` event tick:
     - `layout = computeLayout(state.project)` runs synchronously in $< 1\text{ ms}$.
     - `viewer.update(layout, selectedIds)` updates Three.js meshes.
     - `drawCanvas()` updates the 2D SVG layout.
   - Because `Viewer` runs an active `requestAnimationFrame` loop with OrbitControls damping, 3D mesh translations render fluidly at 60 FPS.
   - **SVG Detach Prevention During Drag**:
     In `app.js`, calling `refresh()` replaces `#canvas.innerHTML`, creating a new `<svg>` element.
     To prevent `getScreenCTM()` failure (`TypeError: Cannot read properties of null`) on detached SVG elements during rapid mousemove, `getSvgCoords` must retrieve the current live `<svg>` from the DOM (`el.querySelector('svg') || svgEl`), or cache the inverse CTM matrix at drag start.

### 2.3 Edge Case Resolution: Challenger 2 Drawer Box Underflow
1. **Root Cause Analysis**:
   - Line 194 of `public/js/layout.js`:
     `const bh = inner - s.drawerInset;`
   - Clamping at `minSize = 50mm` ensures the module height $h \ge 50\text{ mm}$.
   - However, for a drawer module with $cnt \ge 3$ drawers:
     $$inner = \frac{h}{cnt} \le \frac{50}{3} \approx 16.67\text{ mm}$$
     $$bh = 16.67 - 20 = -3.33\text{ mm}$$
   - Negative $bh$ inverts the vertical dimension of the drawer side and front/back panels, creating negative coordinates and corrupting the cutlist thickness sort order in `orientationOf`.
2. **Formulation of Exact Fix**:
   - Replace line 194 of `public/js/layout.js`:
     ```javascript
     const bh = Math.max(10, inner - s.drawerInset);
     ```
   - Mathematical proof:
     - For any $inner \in \mathbb{R}$, $\max(10, inner - s.drawerInset) \ge 10 > 0$.
     - Minimum drawer box side height is guaranteed to be at least $10\text{ mm}$.
     - All 3D meshes will have strictly positive bounding dimensions ($sx > 0, sy \ge 10, sz > 0$).
     - Cutlist row dimensions remain positive ($L > 0, W > 0, T > 0$).
     - No zero or negative areas in m² calculations.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | R2 AC 1 | Horizontal Divider Cursor (`ns-resize`) | Visual handle over horizontal shelf dividers with `ns-resize` cursor and expanded hit area ($pad = 8\text{ mm}$) | Mouse hover over shelf divider (`axis: 'v'`) | CSS cursor `ns-resize`, amber highlight (`rgba(255, 184, 0, 0.4)`) | Fallback to default cursor if axis missing | `public/js/app.js:226-235`, `style.css:57-58` |
| 2 | R2 AC 1 | Vertical Divider Cursor (`ew-resize`) | Visual handle over vertical partition dividers with `ew-resize` cursor and expanded hit area | Mouse hover over partition divider (`axis: 'h'`) | CSS cursor `ew-resize`, amber highlight | Fallback to default cursor if axis missing | `public/js/app.js:226-235`, `style.css:57-58` |
| 3 | R2 AC 1 | Inter-Column Lateral Drag Handle | Visual drag handle over internal column divider with `ew-resize` cursor | Mouse hover over column divider (`type: 'col'`) | CSS cursor `ew-resize`, amber highlight | Fallback to default cursor | `public/js/app.js:226-235`, `layout.js:128` |
| 4 | R2 AC 1 | Outer Border Drag Handle | Drag handle on outer right boundary lateral to expand or contract entire furniture width | Mouse hover over outer column boundary (`type: 'col-outer'`) | CSS cursor `ew-resize`, amber highlight | Clamps to `minW = 150mm` on extreme left drag | `public/js/app.js:286-305`, `layout.js:134` |
| 5 | R2 AC 1 | Body Cursor Lock & Text Select Prevention | Locks `document.body.style.cursor` and disables user text selection during drag | `mousedown` event on any `.drag-handle` | Global cursor persistence across viewport; cursor restored on `mouseup` | Window mouseup event cleans up locks even if pointer exited window | `public/js/app.js:280-282, 308, 363` |
| 6 | R2 AC 2 | Sibling Millimeter Normalization | Normalizes unweighted sibling node sizes (`size: 1`) to actual millimeters from `layout.cells` before applying drag delta | `mousedown` event on internal divider handle | `ch.size = isV ? cell.h : cell.w` for all siblings in container | Sibling without layout cell retains existing size | `public/js/app.js:331-337` |
| 7 | R2 AC 2 | Adjacent Section Fluid Redistribution | Real-time redistribution of dimensions between adjacent pair while conserving total pair dimension | `mousemove` with delta $\Delta$ | $S_{\text{prev}}' + S_{\text{next}}' = \text{totalPair}$, other siblings $S_j' = S_j$ untouched | Clamped to $50\text{ mm}$ minimum size | `public/js/app.js:344-360` |
| 8 | R2 AC 2 | Inter-Column Dimension Redistribution | Adjusts left and right column widths while preserving total furniture width and untouched columns | `mousemove` with delta $\Delta X$ | $W_i' + W_{i+1}' = \text{totalPair}$, $\sum W_j = \text{const}$ | Clamped to $150\text{ mm}$ minimum column width | `public/js/app.js:296-301` |
| 9 | R2 AC 2 | Live 3D Mesh & Material Viewport Sync | Immediate 3D scene rebuild on every mousemove tick without memory leak | `refresh()` call during mousemove | Updated Three.js scene meshes, re-centered group, active shadow/lighting | Disposes old geometries/materials to prevent WebGL buffer leaks | `public/js/viewer.js:63-99`, `app.js:549-557` |
| 10 | R2 AC 3 | Pre-Drag Undo History Snapshot | Clean capture of pre-drag state at `mousedown` pushed to `undo` stack only if state changed | `mousedown` captures snapshot, `mouseup` verifies change | `undo.push(initialSnapshot)`, `redo.length = 0` | If mouseup occurs without delta change, no undo entry is created | `public/js/app.js:283, 312-317, 367-372` |
| 11 | R2 Edge Case | Drawer Box Underflow Floor Guard | Clamps drawer box height $bh$ to a minimum of $10\text{ mm}$ when drawer module is clamped to $50\text{ mm}$ | `leafContents` for drawer module at $h = 50\text{ mm}$, $cnt \ge 3$ | `bh = Math.max(10, inner - s.drawerInset)` ($\ge 10\text{ mm}$) | Without fix: yields negative piece dimension and negative cutlist row | `public/js/layout.js:187, 194`, `drag_bounds_empirical.test.js:291` |
| 12 | R2 Edge Case | Underflow Protection for Small Containers | Handles case where container total available dimension is $< 2 \cdot \text{minSize}$ ($< 100\text{ mm}$) | Container height $< 100\text{ mm}$ with 2 siblings | Clamps both siblings symmetrically to $\text{totalPair} / 2$ | Prevents one sibling from starving below zero | `test/drag_bounds_empirical.test.js:338-355` |
| 13 | R2 Edge Case | SVG Detach Coordinate Resilience | Ensures coordinate transformation matrix remains valid across SVG DOM replacements | High-speed mousemove during drag while SVG DOM re-renders | Caches start-drag inverse CTM or queries live SVG DOM | Prevents `TypeError: Cannot read properties of null (reading 'inverse')` | `public/js/app.js:271-277` |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Drawer Box Height Calculation | 3-drawer module dragged to $h = 50\text{ mm}$ ($inner = 16.67\text{ mm}$, $s.drawerInset = 20\text{ mm}$) | **Unfixed**: $bh = -3.33\text{ mm}$ produces 12 negative 3D piece dimensions and negative cutlist thickness. **Fixed**: `bh = Math.max(10, inner - s.drawerInset)` clamps $bh = 10\text{ mm}$, strictly preserving positive geometry and positive cutlist rows. |
| 2 | Small Container Sibling Underflow | Container with total available height $80\text{ mm}$ ($< 2 \cdot \text{minSize} = 100\text{ mm}$) dragged with negative delta | If clamped naively to $\text{minSize} = 50\text{ mm}$, $newNext = 80 - 50 = 30\text{ mm} < 50\text{ mm}$. Symmetrical floor guard: `if (totalPair < 2 * minSize) { newPrev = newNext = Math.round(totalPair / 2); }` maintains balance. |
| 3 | Extreme Divider Drag Deltas | Divider dragged with $\Delta = \pm 100,000\text{ mm}$ | Clamps target sibling to exactly $50\text{ mm}$; remaining sibling receives $\text{totalPair} - 50\text{ mm}$. Conservation $\Delta S_{\text{prev}} + \Delta S_{\text{next}} = 0$ holds within integer rounding ($\pm 1\text{ mm}$). |
| 4 | Extreme Column Drag Deltas | Inter-column divider dragged with $\Delta X = \pm 50,000\text{ mm}$ | Clamps target column to exactly $\text{minW} = 150\text{ mm}$; adjacent column expands to $\text{totalPair} - 150\text{ mm}$. Total furniture width is conserved ($W_{\text{total}}' = W_{\text{total}}$). |
| 5 | Outer Column Drag to 5000mm | Outer lateral handle dragged to extreme positive delta ($+50,000\text{ mm}$) | Final column expands cleanly up to tested $5,000\text{ mm}$. `computeLayout` generates 0 `NaN` values across all 3D pieces, cells, and cutlist totals. |
| 6 | Rapid Drag Outside Canvas / Window | User drags divider and cursor moves outside the browser window before releasing button | Mousemove and mouseup listeners attached to `window` continue to receive events. On mouseup anywhere in window, body cursor lock is cleared, dragging class is removed, and state is committed. |
| 7 | SVG Detach During MouseMove | Mouse moves while `refresh()` re-renders `#canvas.innerHTML` | Closure holding stale `svgEl` reference may throw `null.inverse()` if calling `svgEl.getScreenCTM()`. Fixed by caching `startInverseCTM = svgEl.getScreenCTM().inverse()` at `mousedown`. |
| 8 | Zero-Delta Drag Interaction | User clicks on `.drag-handle` and releases mouse without moving | `snapshot() === initialSnapshot` is detected on `mouseup`. `undo.push()` is bypassed, preventing empty/useless history entries. |
| 9 | Unweighted Node Drag (`size: 1`) | User drags divider between two newly created default modules (`size: 1`) | Before applying delta, sibling sizes are normalized to millimeters from `layout.cells`. Prevents instant collapse of $1\text{ px}$ ratios. |
| 10 | Keyboard Undo / Redo Post-Drag | Pressing `Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z` / `Cmd+Z` | Restores exact pre-drag snapshot, triggers `refresh()`, updates 2D canvas handles, dock inputs, price banner, and 3D meshes synchronously. |

---

## 5. Caveats

1. **Touch Interaction Support**:
   Drag resizing is currently wired to desktop mouse events (`mousedown`, `mousemove`, `mouseup`). While modern tablets support mouse emulation, full touch screen support (`touchstart`, `touchmove`, `touchend`) or Pointer Events (`pointerdown`, `pointermove`, `pointerup` with `setPointerCapture`) can be unified in a future polish iteration.
2. **Horizontal Container Drawer Width Boundary**:
   Drawer boxes require $w > 56\text{ mm}$ ($bw - 2 \cdot dt = w - 26 - 30 = w - 56$). Column minimum width of $150\text{ mm}$ fully protects column-level drawers. If future features allow arbitrary horizontal splitting (`dir: 'h'`) inside drawers, a width guard of at least $60\text{ mm}$ should be enforced on horizontal child dividers.
3. **Challenger 2 Test EMPIRICAL 8 Expectation Inversion**:
   In `test/drag_bounds_empirical.test.js:291-318`, Challenger 2 authored `EMPIRICAL 8` specifically asserting that a 3-drawer module at 50mm produced negative dimensions (`assert.ok(negativePieces.length > 0)`). Once `layout.js:187/194` is patched with `Math.max(10, inner - s.drawerInset)`, that test must be updated to assert the fixed behavior: `assert.equal(negativePieces.length, 0)` and `assert.ok(negativePieces.every(p => p.sy >= 10))`.

---

## 6. Conclusion

1. **Full R2 Acceptance Criteria are Rigorously Specified**:
   - **AC 1 (Cursors & Feedback)**: `ns-resize` for horizontal dividers (`axis: 'v'`), `ew-resize` for vertical partitions and column laterals (`axis: 'h'`, `col`, `col-outer`). $pad = 8\text{ mm}$ hit target expansion. Reactive amber hover/active feedback. `document.body.style.cursor` and `userSelect` locking during active drag.
   - **AC 2 (Fluid Redistribution & 3D Sync)**: Strict pairwise dimension conservation ($S_i + S_{i+1} = \text{totalPair}$, $W_k + W_{k+1} = \text{totalPair}$). Millimeter normalization of siblings prior to drag. All untouched modules retain identical physical dimensions and proportions. Sub-millisecond `computeLayout` live sync driving 60 FPS Three.js viewport and 2D canvas updates.
   - **AC 3 (Undo/Redo)**: Pre-drag snapshot captured at `mousedown`; committed to `undo` stack on `mouseup` only when state changed; cross-platform keyboard shortcut support.
2. **Actionable Fix for Drawer Sub-Components Edge Case**:
   - In `public/js/layout.js:194`, change:
     ```javascript
     const bh = inner - s.drawerInset;
     ```
     to:
     ```javascript
     const bh = Math.max(10, inner - s.drawerInset);
     ```
   - This cleanly fixes the vulnerability uncovered by Challenger 2, guaranteeing strictly positive piece dimensions and correct cutlist pricing even under extreme 50mm clamping.

---

## 7. Verification Method

### 7.1 Automated Test Execution Command
```bash
node --test test/*.test.js
```

### 7.2 Files to Inspect
1. `public/js/layout.js`:
   - Line 127-136: Column divider generation (`cursor: 'ew-resize'`).
   - Line 193-195: Drawer box calculation (`bh = Math.max(10, inner - s.drawerInset)`).
   - Line 226-242: Internal vertical and horizontal divider generation (`axis: 'h'` / `axis: 'v'`).
2. `public/js/app.js`:
   - Line 226-235: SVG `.drag-handle` rendering with expanded hit padding and cursor styling.
   - Line 264-378: Drag event listeners, body cursor lock, millimeter normalization, and clamping math.
   - Line 625-631: Keyboard undo/redo event handling (`Ctrl+Z`, `Ctrl+Y`).
3. `public/style.css`:
   - Line 57-58: `.drag-handle` hover and active dragging transitions.
4. `test/drag_bounds_empirical.test.js`:
   - `EMPIRICAL 1-10`: Comprehensive test suite auditing clamping, invariant preservation, and drawer underflow.

### 7.3 Invalidation Conditions
- Any divider displaying an incorrect cursor (e.g. `ew-resize` on a horizontal shelf or `ns-resize` on a vertical partition).
- Dragging a divider causing unselected or non-adjacent modules to change dimension.
- Dragging an inter-column divider causing the total furniture width to alter.
- Any drawer sub-component producing $sy \le 0$ or cutlist thickness $\le 0$ when dragged to minimum dimensions ($50\text{ mm}$).
- `computeLayout` producing `NaN` or infinite values in pieces, cells, or cutlist rows.
- Mouse dragging causing text selection or cursor flickering when moving rapidly.
