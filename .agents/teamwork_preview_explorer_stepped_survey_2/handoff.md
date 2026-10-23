# Handoff Report: Explorer 2 (Stepped 2D Editor & Drag Interactions)

## 1. Observation

### 1.1 Existing 2D SVG Canvas Architecture in `public/js/app.js`
In `public/js/app.js` (lines 769–838), `drawCanvas()` computes SVG coordinates based on a single global height parameter `H = s.height`:
```javascript
769:   function drawCanvas() {
770:     const s = layout.settings;
771:     const H = s.height;
772:     const ov = s.overhang;
773:     const top = H + ov;
774:     const Y = (y, sy) => top - (y + sy);
775:     const sel = state.selected;
776:     const selCell = sel && layout.cells[sel];
777:     let svg = `<svg viewBox="${-120} ${-110} ${layout.totalW + 240} ${H + 2 * ov + 200}" preserveAspectRatio="xMidYMid meet">
...
827:     // botones +
828:     const plus = (cx, cy, act, data) =>
829:       `<g class="plus" data-act="${act}" ${data}><circle cx="${cx}" cy="${cy}" r="30" fill="#ffb800"/><text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="44" font-weight="700" fill="#111">+</text></g>`;
830:     let colX = 0;
831:     state.project.columns.forEach((c) => {
832:       colX += s.thickness;
833:       svg += plus(colX + c.width / 2, -60, 'top', `data-col="${c.id}"`);
834:       colX += c.width;
835:     });
836:     svg += plus(-70, top / 2, 'colLeft', '');
837:     svg += plus(layout.totalW + 70, top / 2, 'colRight', '');
838:     svg += '</svg>';
```
- **Limitation Observed**: All column `(+)` buttons are hardcoded to `cy = -60`, assuming every column reaches the global top $y = H$. When columns have staggered heights (e.g. Column 0 = 700mm, Column 1 = 1400mm), the (+) button for Column 0 floats in empty space 700mm above its actual top cap line.
- **ViewBox Limitation**: The SVG viewBox height is hardcoded to `H + 2 * ov + 200` using `s.height`. If any column is taller than `s.height`, its top cap will clip outside the SVG viewBox.

### 1.2 Layout & Piece Generation in `public/js/layout.js`
In `public/js/layout.js` (lines 145–160 and 329–338):
```javascript
145:   cols.forEach((c, i) => {
146:     add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: H + 2 * s.overhang, sz: D, col: i });
147:     x += t;
148:     xs.push(x);
149:     x += c.width;
150:     if (i < cols.length - 1) {
151:       const d = { type: 'col', axis: 'h', colIdx: i, x, y: -s.overhang, w: t, h: H + 2 * s.overhang, col: i, cursor: 'ew-resize' };
152:       dividers.push(d);
153:       colDividers.push(d);
154:     }
155:   });
...
329:   cols.forEach((c, i) => {
330:     const x0 = xs[i];
331:     const W = c.width;
332:     add({ name: 'Tapa superior', mat: 'carcass', kind: 'h', x: x0, y: H - t, z: bt, sx: W, sy: t, sz: cd, col: i });
333:     add({ name: 'Base', mat: 'carcass', kind: 'h', x: x0, y: 0, z: bt, sx: W, sy: t, sz: cd, col: i });
334:     const g = s.grooveClearance;
335:     add({ name: 'Fondo', mat: 'back', kind: 'back', x: x0 - 10 + g, y: t - 10 + g, z: 0, sx: W + 20 - 2 * g, sy: H - 2 * t + 20 - 2 * g, sz: bt, col: i });
336:     place(c.root, x0, t, W, H - 2 * t, i);
337:   });
```
- **Limitation Observed**: Every lateral is assigned height `sy: H + 2 * s.overhang` regardless of column height. Every top cap is assigned $y = H - t$. Every column root module is passed height $H - 2 * t$. There is currently no representation of individual column heights (`c.height`).

### 1.3 Module Addition on Top in `public/js/model.js`
In `public/js/model.js` (lines 178–214):
```javascript
178: export function addOnTop(project, colId, type = 'shelf', addedHeight = 350, allColumns = true) {
...
201:   // 3. Si allColumns es true, añadimos estante superior a las demás columnas para preservar 100% sus medidas
202:   if (allColumns) {
203:     project.columns.forEach((c) => {
204:       if (c.id !== colId) {
205:         addModuleToCol(c, 'shelf');
206:       }
207:     });
208:   }
209: 
210:   // 4. Incrementamos la altura exterior del mueble exactamente en (addedHeight + t)
211:   project.settings.height += addedHeight + t;
212: 
213:   return targetModule;
214: }
```
- **Limitation Observed**: Previously, `addOnTop` forced `allColumns = true` and increased `project.settings.height`, preventing independent column heights. For stepped modular furniture, adding a module over a column must increment **only** that column's height (`c.height`), leaving adjacent columns untouched.

### 1.4 Interactive Drag Handlers in `public/js/app.js`
In `public/js/app.js` (lines 855–980):
```javascript
855:     // Control de arrastre (drag to resize) sobre divisiones internas y bordes de columna
856:     el.querySelectorAll('.drag-handle').forEach((handle) => {
857:       handle.onmousedown = (e) => {
858:         e.preventDefault();
859:         e.stopPropagation();
860:         const d = layout.dividers[parseInt(handle.dataset.didx, 10)];
...
866:         const getSvgCoords = (evt) => {
867:           pt.x = evt.clientX;
868:           pt.y = evt.clientY;
869:           if (invCTM) return pt.matrixTransform(invCTM);
...
877:         document.body.style.cursor = cursor;
878:         document.body.style.userSelect = 'none';
879:         handle.classList.add('dragging');
880:         const initialSnapshot = snapshot();
881:         let hasMoved = false;
...
884:         // Arrastre de divisor de columna o borde exterior
885:         if (d.type === 'col' || d.type === 'col-outer') {
...
922:         const parent = M.find(state.project, d.parentId);
...
951:           const minSize = 50;
952:           const effectiveMin = Math.min(minSize, Math.floor(totalPair / 2));
...
972:           if (hasMoved) {
973:             pushUndo(initialSnapshot);
974:           }
```
- **Strengths Observed**: The drag interaction infrastructure already has:
  1. Coordinate transformation via `getSvgCoords` using `svg.getScreenCTM().inverse()`.
  2. Safety boundary clamping (`minSize = 50` for shelf modules, `minW = 150` for columns).
  3. Zero-movement click protection (`if (hasMoved) pushUndo(initialSnapshot)`).
  4. Global window listener attachment with proper cleanup on `mouseup`.
- **Missing Interaction**: There is currently no `col-top` divider or handler to drag the top border of a column to adjust `col.height`.

### 1.5 Styling in `public/style.css`
In `public/style.css` (lines 55–58):
```css
55: svg .cell { fill:transparent; cursor:pointer; }
56: svg .plus { cursor:pointer; }
57: svg .drag-handle { fill: transparent; transition: fill 0.15s ease; }
58: svg .drag-handle:hover, svg .drag-handle.dragging { fill: rgba(255, 184, 0, 0.4); }
```

---

## 2. Logic Chain

### Step 2.1: Mathematical Coordinate Transformation for Stepped Furniture
1. From Observation 1.1, the SVG Y coordinate is defined as $Y(y, sy) = \text{top} - (y + sy)$, where $y$ is the physical coordinate in mm from ground ($y = 0$).
2. In stepped furniture, each column $i$ has individual height $H_i = c_i\text{.height} || s\text{.height}$.
3. To render all columns anchored to the same ground plane ($y = 0$) while allowing different heights, the master SVG coordinate reference must use the maximum column height:
   $$\text{maxH} = \max_{i} (H_i)$$
   $$\text{top} = \text{maxH} + ov$$
4. Under this transformation:
   - Ground level for all columns is at SVG $Y = \text{top} - 0 = \text{maxH} + ov$.
   - The top edge of column $i$ is at $y = H_i$, which maps to SVG $Y = \text{top} - H_i = \text{maxH} + ov - H_i$.
   - For a short column (e.g. $H_i = 700$, $\text{maxH} = 1400$), its top edge renders at SVG $Y = 1400 + 20 - 700 = 720$.
   - For a tall column ($H_i = 1400$), its top edge renders at SVG $Y = 1400 + 20 - 1400 = 20$.
   - This automatically creates the stepped silhouette directly from the physical millimeter coordinates without distorting the internal cells!

### Step 2.2: Stepped Silhouette Rendering (Laterals and Caps)
1. From Observation 1.2, laterals and top caps must reflect the stepped profile.
2. The left exterior lateral (column 0) has height $H_0 + 2 \times ov$.
3. The right exterior lateral (column $N-1$) has height $H_{N-1} + 2 \times ov$.
4. The intermediate lateral between column $i$ and column $i+1$ must rise to the taller of the two columns:
   $$H_{\text{intermediate}} = \max(H_i, H_{i+1}) + 2 \times ov$$
   This matches the reference images: the taller column's side panel is visible where it steps down to the shorter column.
5. Each column $i$ has its own top cap piece (`Tapa superior`) at $y = H_i - t$ with height $t$, which renders at SVG $Y = \text{top} - H_i$.

### Step 2.3: Per-Column (+) Button Positioning
1. From Observation 1.1, top (+) buttons were fixed at $cy = -60$.
2. For column $i$, its horizontal center is $cx = x_i + c_i\text{.width} / 2$.
3. Its top border in SVG coordinates is at $Y_{\text{top}} = \text{top} - H_i$.
4. Positioning the (+) button with radius $r = 30$ floating 50mm above the top border gives:
   $$cy_i = \text{top} - H_i - 50 = \text{maxH} + ov - H_i - 50$$
5. When $H_i = \text{maxH}$, $cy_i = ov - 50 = -30$, comfortably below the $-110$ viewBox ceiling.
6. When $H_i < \text{maxH}$, the (+) button floats directly above column $i$'s individual top cap line.
7. Lateral (+) buttons:
   - Left lateral (+): $cx = -70$, $cy = \text{top} - H_0 / 2$ (centered at the first column's height).
   - Right lateral (+): $cx = \text{layout.totalW} + 70$, $cy = \text{top} - H_{N-1} / 2$ (centered at the last column's height).

### Step 2.4: Real-Time Interactive Drag-and-Drop for Column Heights
1. We define a top border drag handle for each column:
   `type: 'col-top'`, `colIdx: i`, `x = x_i`, `y = H_i - t`, `w = c_i.width`, `h = t`.
2. In SVG coordinates, this handle sits at $Y = \text{top} - H_i$, covering the entire width of column $i$ with vertical padding `pad = 8`.
3. Cursor is styled as `ns-resize`.
4. On `mousedown`:
   - Prevent default, stop propagation.
   - Capture `startPt = getSvgCoords(e)`.
   - Capture `initialSnapshot = snapshot()`.
   - Set `document.body.style.cursor = 'ns-resize'`, `document.body.style.userSelect = 'none'`.
   - Record `startH = col.height || settings.height`.
5. On `mousemove`:
   - `curPt = getSvgCoords(moveEvt)`.
   - In SVG space, upward mouse movement decreases SVG Y ($curPt.y < startPt.y$).
   - Therefore, height delta is:
     $$\Delta H = startPt.y - curPt.y$$
   - New height is:
     $$H_{\text{new}} = \text{round}(\text{clamp}(startH + \Delta H, H_{\min}, H_{\max}))$$
   - Safety clamping:
     $H_{\min} = \max(150, 2t + K \times 50 + (K - 1)t)$, where $K$ is the number of vertical modules in the column.
     This guarantees that internal modules never shrink below 50mm and pieces never invert.
     $H_{\max} = 4000\text{mm}$.
   - Mutate `col.height = H_{\text{new}}` and call `refresh()`.
   - 2D canvas and 3D viewer update in real time!
6. On `mouseup`:
   - Remove listeners, restore cursor and user-select.
   - If `hasMoved === true`, call `pushUndo(initialSnapshot)`: pushes previous snapshot to `undo`, clears `redo`, and autosaves.
   - If zero movement occurred, undo/redo stacks remain completely untouched.

### Step 2.5: Internal Divider Dragging with Stepped Geometry
1. Existing shelf divider dragging (Observation 1.4) operates on `d.axis === 'v'`, moving a horizontal shelf between `prevNode` and `nextNode`.
2. Because `layout.cells` will be computed using each column's independent height, `layout.cells[ch.id].h` accurately reflects the millimeter height of the internal modules within that column.
3. The deferred normalization in `onMouseMove` reads `ch.size = cell.h`, ensuring that divider deltas are applied directly in real millimeters relative to that column.
4. Clamping to `effectiveMin = Math.min(50, Math.floor(totalPair / 2))` preserves safety minimum $\ge 50$mm.

---

## 3. Caveats

1. **ViewBox Scaling Dynamics**: When a column is dragged higher than the existing `maxH`, `maxH` increases, and the SVG viewBox expands. Using the fixed `invCTM` captured at `mousedown` ensures screen-to-millimeter delta calculations remain stable without feedback flutter.
2. **Dock Height Input Synchronization**: In the dock panel, when editing project settings, changing global `settings.height` acts as a default for columns that lack an explicit `c.height`. When an individual module is selected, the dock shows the module's dimensions ($w \times h$); if desired, a column height field can be surfaced when the column root or column container is selected.
3. **Data Compatibility**: Existing projects saved without `c.height` continue to work without migration because $H_i = c_i\text{.height} || s\text{.height}$ falls back gracefully to `s.height`.

---

## 4. Conclusion & Concrete Implementation Blueprint

### 4.1 Summary of Architecture
- **Silhouette**: Dynamic `maxH = Math.max(...columns.map(c => c.height || s.height))` with shared ground $y = 0$.
- **Laterals**: Stepped side panels with intermediate dividers rising to $\max(H_i, H_{i+1}) + 2 \times ov$.
- **Caps & Silhouette**: Per-column top caps at $y = H_i - t$.
- **(+) Buttons**: Positioned dynamically at $(x_i + W_i/2, \text{top} - H_i - 50)$ above each column's top cap line. Lateral (+) buttons centered at column 0 and column $N-1$ midpoints.
- **Top Border Dragging**: `col-top` divider handles with `ns-resize`, real-time delta $\Delta H = startPt.y - curPt.y$, $H_{\min}$ clamping, and atomic undo recording.
- **Internal Dividers**: Preserved with $\ge 50$mm invariant.

---

### 4.2 Implementation Blueprint: File-by-File Changes

#### File 1: `public/js/layout.js`
In `computeLayout(project)`:
1. Extract column heights:
```javascript
const cols = project.columns;
const colHeights = cols.map((c) => (typeof c.height === 'number' && c.height > 0 ? c.height : H));
const maxH = Math.max(...colHeights);
```
2. Laterals and intermediate column dividers:
```javascript
cols.forEach((c, i) => {
  const colH = colHeights[i];
  const sideH = i === 0 
    ? colH + 2 * s.overhang 
    : Math.max(colHeights[i - 1], colH) + 2 * s.overhang;
  add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: sideH, sz: D, col: i });
  x += t;
  xs.push(x);
  x += c.width;
  if (i < cols.length - 1) {
    const nextH = colHeights[i + 1];
    const divH = Math.max(colH, nextH) + 2 * s.overhang;
    const d = { type: 'col', axis: 'h', colIdx: i, x, y: -s.overhang, w: t, h: divH, col: i, cursor: 'ew-resize' };
    dividers.push(d);
    colDividers.push(d);
  }
});
const lastColH = colHeights[cols.length - 1];
add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: lastColH + 2 * s.overhang, sz: D, col: cols.length });
const outerD = { type: 'col-outer', axis: 'h', colIdx: cols.length - 1, x, y: -s.overhang, w: t, h: lastColH + 2 * s.overhang, col: cols.length - 1, cursor: 'ew-resize' };
dividers.push(outerD);
colDividers.push(outerD);
```
3. Column caps, bases, back panels, and top border drag handles:
```javascript
cols.forEach((c, i) => {
  const x0 = xs[i];
  const W = c.width;
  const colH = colHeights[i];
  add({ name: 'Tapa superior', mat: 'carcass', kind: 'h', x: x0, y: colH - t, z: bt, sx: W, sy: t, sz: cd, col: i });
  add({ name: 'Base', mat: 'carcass', kind: 'h', x: x0, y: 0, z: bt, sx: W, sy: t, sz: cd, col: i });
  const g = s.grooveClearance;
  add({ name: 'Fondo', mat: 'back', kind: 'back', x: x0 - 10 + g, y: t - 10 + g, z: 0, sx: W + 20 - 2 * g, sy: colH - 2 * t + 20 - 2 * g, sz: bt, col: i });
  place(c.root, x0, t, W, colH - 2 * t, i);

  // Top border drag handle for adjusting column height
  dividers.push({ type: 'col-top', axis: 'v', colIdx: i, colId: c.id, x: x0, y: colH - t, w: W, h: t, col: i, cursor: 'ns-resize' });
});
```
4. Return `maxH` and `colHeights`:
```javascript
return { settings: s, pieces, cells, dividers, colDividers, totalW, maxH, colHeights, hardware: hw, cutlist: buildCutlist(pieces, s, hw) };
```

#### File 2: `public/js/model.js`
Update `addOnTop` to add modules to the specific column only:
```javascript
export function addOnTop(project, colId, type = 'shelf', addedHeight = 350, allColumns = false) {
  const col = project.columns.find((c) => c.id === colId);
  if (!col) return null;
  const t = project.settings.thickness;

  const initialLayout = computeLayout(project);
  freezeColumnHeights(project, initialLayout);

  const addModuleToCol = (targetCol, moduleType) => {
    const nn = makeLeaf(moduleType);
    nn.size = addedHeight;
    if (targetCol.root.type === 'multiple' && targetCol.root.dir === 'v') {
      targetCol.root.children.unshift(nn);
      return nn;
    }
    const currentH = initialLayout.cells[targetCol.root.id]?.h || ((targetCol.height || project.settings.height) - 2 * t);
    return wrap(targetCol.root, 'v', nn, true, currentH);
  };

  const targetModule = addModuleToCol(col, type);

  // If allColumns is explicitly true (legacy mode), expand all; otherwise expand only target column
  if (allColumns) {
    project.columns.forEach((c) => {
      if (c.id !== colId) {
        addModuleToCol(c, 'shelf');
      }
    });
    project.settings.height += addedHeight + t;
  } else {
    // Stepped furniture: increment ONLY target column height
    const curH = col.height || project.settings.height;
    col.height = curH + addedHeight + t;
  }

  return targetModule;
}
```

#### File 3: `public/js/app.js`
In `drawCanvas()`:
1. Coordinate setup:
```javascript
const s = layout.settings;
const maxH = layout.maxH || Math.max(...state.project.columns.map((c) => c.height || s.height));
const ov = s.overhang;
const top = maxH + ov;
const Y = (y, sy) => top - (y + sy);
const sel = state.selected;
const selCell = sel && layout.cells[sel];
let svg = `<svg viewBox="${-120} ${-110} ${layout.totalW + 240} ${maxH + 2 * ov + 200}" preserveAspectRatio="xMidYMid meet">
...
```
2. Stepped (+) buttons:
```javascript
const plus = (cx, cy, act, data) =>
  `<g class="plus" data-act="${act}" ${data}><circle cx="${cx}" cy="${cy}" r="30" fill="#ffb800"/><text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="44" font-weight="700" fill="#111">+</text></g>`;
let colX = 0;
state.project.columns.forEach((c, idx) => {
  colX += s.thickness;
  const colH = c.height || s.height;
  const cy = top - colH - 50; // Centered immediately above this column's top cap
  svg += plus(colX + c.width / 2, cy, 'top', `data-col="${c.id}"`);
  colX += c.width;
});
const col0H = state.project.columns[0]?.height || s.height;
const lastColH = state.project.columns[state.project.columns.length - 1]?.height || s.height;
svg += plus(-70, top - col0H / 2, 'colLeft', '');
svg += plus(layout.totalW + 70, top - lastColH / 2, 'colRight', '');
```
3. Top border drag handler in `drag-handle.onmousedown`:
```javascript
if (d.type === 'col-top') {
  const colIdx = d.colIdx;
  const col = state.project.columns[colIdx];
  const startH = col.height || state.project.settings.height;
  const childCount = col.root.type === 'multiple' && col.root.dir === 'v' ? (col.root.children?.length || 1) : 1;
  const minH = Math.max(150, 2 * s.thickness + childCount * 50 + (childCount - 1) * s.thickness);
  const maxH = 4000;

  const onMouseMove = (moveEvt) => {
    hasMoved = true;
    const curPt = getSvgCoords(moveEvt);
    // In SVG, upward drag (curPt.y < startPt.y) increases column height
    const deltaY = startPt.y - curPt.y;
    col.height = Math.round(Math.max(minH, Math.min(maxH, startH + deltaY)));
    refresh();
  };

  const onMouseUp = () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    handle.classList.remove('dragging');
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    if (hasMoved) {
      pushUndo(initialSnapshot);
    }
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  return;
}
```

#### File 4: `public/style.css`
Enhance drag handle visual feedback:
```css
svg .drag-handle { fill: transparent; transition: fill 0.15s ease; }
svg .drag-handle:hover, svg .drag-handle.dragging { fill: rgba(255, 184, 0, 0.45); }
svg .col-top-handle { cursor: ns-resize; }
```

---

## 5. Verification Method

### 5.1 Verification Commands
Run the Node.js test runner against layout and drag suites:
```bash
node --test test/drag_bounds_empirical.test.js
node --test test/m2_challenger_drag_history.test.js
node --test test/layout.test.js
```

### 5.2 Specific Test Cases to Verify
1. **Stepped Silhouette Invariants**:
   - Create a project with Column 0 (height 700mm) and Column 1 (height 1400mm).
   - Verify `layout.pieces` contains top cap for Column 0 at $y = 700 - 18 = 682\text{mm}$, and top cap for Column 1 at $y = 1400 - 18 = 1382\text{mm}$.
   - Verify intermediate lateral between Column 0 and Column 1 has height $\max(700, 1400) + 2 \times 20 = 1440\text{mm}$.
2. **Top Border Dragging Simulation**:
   - Simulate dragging the top border of Column 0 with $\Delta Y = +300\text{mm}$.
   - Verify Column 0 height becomes $1000\text{mm}$.
   - Verify Column 1 height remains strictly $1400\text{mm}$.
   - Verify Column 0 internal modules expand proportionally without dropping below 50mm.
3. **Safety Clamping**:
   - Simulate dragging top border downward with $\Delta Y = -10000\text{mm}$.
   - Verify Column 0 clamps at $H_{\min} \ge 150\text{mm}$.
   - Verify zero negative piece dimensions in `layout.pieces`.
4. **History & Undo/Redo**:
   - Perform a drag, verify `undo.length === 1`.
   - Dispatch `Ctrl+Z`, verify Column 0 restores to original height character-for-character.
   - Dispatch `Ctrl+Y`, verify Column 0 restores to post-drag height.
   - Perform a zero-movement click, verify `undo.length` does not change and `redo` is not cleared.

### 5.3 Invalidation Conditions
- Any column height adjustment mutating other columns.
- Any (+) button positioned at a fixed global $Y$ instead of floating at its column's height.
- Any internal module size dropping below 50mm during drag.
- Undo stack growing or redo stack clearing on zero-movement clicks.
