# Handoff Report: Stepped Model & Layout Architecture (Explorer 1)

**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_stepped_survey_1`  
**Task**: Stepped Model & Layout Architecture Investigation for Independent Column Heights (R1)  
**Parent Conversation ID**: `20a52755-88ff-4e04-950c-4b4a3c054fe0`  
**Date**: 2026-10-23  

---

## 1. Observation

### 1.1 Column Data Model & Height Determination
- **Current Data Model in `public/js/model.js` (lines 13, 46–60)**:
  ```javascript
  13: export const newColumn = (width = 600) => ({ id: uid(), width, root: leaf('shelf') });
  ```
  `newColumn` only defines `{ id, width, root }`. Columns currently do NOT store their own `height`.
  In `defaultProject()` (lines 46–60), columns are created solely with `id`, `width: 764`, and `root`.
- **Normalization in `public/js/model.js` (lines 16–44)**:
  `normalizeProject(project)` guarantees `settings` defaults and assigns unique IDs to columns and nodes. It does not validate, sanitize, or assign `column.height`.
- **Validation in `public/js/app.js` (lines 72–82)**:
  `validateProjectData(data)` strictly verifies that `col.width` is a finite positive number, but does not check or expect `col.height`.

### 1.2 Current Height Evaluation in `public/js/layout.js`
- **Global Height Binding in `computeLayout(project)` (lines 118–121, 145–160, 329–337)**:
  ```javascript
  121: const H = s.height;
  ...
  146: add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: H + 2 * s.overhang, sz: D, col: i });
  ...
  151: const d = { type: 'col', axis: 'h', colIdx: i, x, y: -s.overhang, w: t, h: H + 2 * s.overhang, col: i, cursor: 'ew-resize' };
  ...
  332: add({ name: 'Tapa superior', mat: 'carcass', kind: 'h', x: x0, y: H - t, z: bt, sx: W, sy: t, sz: cd, col: i });
  333: add({ name: 'Base', mat: 'carcass', kind: 'h', x: x0, y: 0, z: bt, sx: W, sy: t, sz: cd, col: i });
  335: add({ name: 'Fondo', mat: 'back', kind: 'back', x: x0 - 10 + g, y: t - 10 + g, z: 0, sx: W + 20 - 2 * g, sy: H - 2 * t + 20 - 2 * g, sz: bt, col: i });
  336: place(c.root, x0, t, W, H - 2 * t, i);
  ```
  **Direct Observation**:
  - Every lateral (outer and intermediate) is instantiated with `sy: H + 2 * s.overhang`.
  - Every column top deck (`Tapa superior`) is placed at fixed coordinate `y: H - t`.
  - Every back panel (`Fondo`) is sized with height `sy: H - 2 * t + 20 - 2 * g`.
  - Internal module layout (`place`) is allotted uniform height `H - 2 * t` across all columns.
  - This hardcodes the entire cabinet into a single bounding rectangle of uniform height `H`, creating the defect identified in the prompt ("All columns trapped inside a single global height rectangle with empty cavities").

### 1.3 Analysis of `addOnTop(project, colId, type, addedHeight)` in `public/js/model.js`
- **Existing Implementation (lines 178–214)**:
  ```javascript
  178: export function addOnTop(project, colId, type = 'shelf', addedHeight = 350, allColumns = true) {
  ...
  184:   const initialLayout = computeLayout(project);
  185:   freezeColumnHeights(project, initialLayout);
  ...
  199:   const targetModule = addModuleToCol(col, type);
  200: 
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
  **Direct Observation**:
  1. `allColumns` defaults to `true`.
  2. When `allColumns` is `true`, it iterates through all other columns and adds a shelf module to each of them (`addModuleToCol(c, 'shelf')`).
  3. It increments the global setting `project.settings.height += addedHeight + t`.
  4. In `public/js/app.js` (line 847), `addOnTop` is called as `M.addOnTop(state.project, g.dataset.col, state.newType)`. Because `allColumns` was omitted, it defaulted to `true`, forcing all columns to grow and gain shelves.

### 1.4 Downstream Invocations in Canvas, Dock, Viewer, and Cutlist
- **`public/js/app.js` Canvas Rendering (lines 769–777, 830–835)**:
  - `drawCanvas()` assumes a single top bound: `const H = layout.settings.height; const top = H + ov; const Y = (y, sy) => top - (y + sy);`.
  - The `(+)` buttons for all columns are placed at a single fixed Y: `svg += plus(colX + c.width / 2, -60, 'top', 'data-col="' + c.id + '"')`.
- **`public/js/viewer.js` Scene Centering & Kinematics (lines 526–549, 736–745)**:
  - Viewer relies on `layout.settings.height` for `yBase = -(H * S) / 2` and floor positioning.
  - Explode displacement `expOy` for `Tapa superior` and shelves tests against `H`.
- **`public/js/layout.js` Cutlist (lines 379–473)**:
  - `buildCutlist` groups panels by `[role, p.name, ori.o, w, h, T].join('|')`. When pieces have different heights (`ori.h`), it automatically separates them into distinct itemized rows.

---

## 2. Logic Chain

1. **Premise 1 (Data Independence)**: To allow stepped furniture where columns have independent heights, the data model must support a per-column height attribute (`column.height`), with a guaranteed fallback to `project.settings.height` when `column.height` is `undefined`, `null`, or unassigned.
2. **Premise 2 (Preserving Column Invariance on Addition)**: When a user clicks `(+)` above column $K$:
   - Only column $K$ should receive the new module of default height (e.g. 350mm).
   - Only column $K$'s height should increase by $(addedHeight + thickness)$.
   - Neighboring columns must not receive any new modules and their heights must remain unchanged.
   - To prevent sibling columns from unintentionally inheriting a changed global `settings.height` or drifting during layout recalculation, any column lacking an explicit `column.height` must be locked to the current baseline height before modifying the target column.
3. **Premise 3 (Geometric Soundness in `computeLayout`)**:
   - Each column $i \in [0, N-1]$ has height $H_i = \text{getColumnHeight}(c_i, s)$.
   - All columns share a common bottom datum at $y = 0$ (`Base` deck at $y = 0, \dots, t$).
   - The top cap (`Tapa superior`) for column $i$ is situated at $y = H_i - t$.
   - The back panel (`Fondo`) for column $i$ spans from $y = t - 10 + g$ with height $H_i - 2t + 20 - 2g$.
   - The vertical compartment space for column $i$ is exactly $H_i - 2t$, passed to `place(c.root, x0, t, W, Hi - 2 * t, i)`.
4. **Premise 4 (Intermediate Partition / Stepped Lateral Geometry)**:
   - Lateral 0 (left exterior) flanks only column 0, so its height is $H_0 + 2 \cdot overhang$.
   - Lateral $N$ (right exterior) flanks only column $N-1$, so its height is $H_{N-1} + 2 \cdot overhang$.
   - Intermediate lateral $i$ (between column $i-1$ and column $i$) separates two columns of heights $H_{i-1}$ and $H_i$. To structurally enclose the taller column and leave the stepped riser exposed as depicted in the reference design, this lateral must rise to:
     $$H_{\text{lateral}, i} = \max(H_{i-1}, H_i) + 2 \cdot overhang$$
5. **Premise 5 (Interactive Drag & Viewport Compatibility)**:
   - The total bounding height for 2D canvas and 3D viewer is $\max(H_0, \dots, H_{N-1}, s.height)$.
   - Each column $i$ requires its own top-edge drag handle divider (`type: 'col-top'`) at $y = H_i - t$ with `cursor: 'ns-resize'` and its own `(+)` button positioned directly above its top cap at $y = H_i + overhang$.

---

## 3. Caveats

1. **Legacy Test Compatibility**:
   - Earlier tests in `test/layout.test.js` written for M1 (e.g. line 61, 213, 346) explicitly passed or assumed `allColumns = true` and asserted that `project.settings.height` expanded globally.
   - To prevent regressions when running `npm test`, `addOnTop(project, colId, type, addedHeight, allColumns = false)` should default to `false` (stepped column mode), but maintain support for `allColumns === true` if explicitly passed by legacy test cases.
2. **Dock Height Input Synchronization**:
   - In `public/js/model.js` line 271, `setSize` previously fell back to setting `settings.height = Math.max(200, valueMm + 2 * t)` when modifying a root module in height. In stepped mode, modifying the height of a column root module should update `f.col.height`.
3. **Minimum Height Constraint**:
   - When dragging a column's top border down, it must clamp to a safe minimum height $H_{min} = 200\text{mm}$ (or $2t + 50\text{mm}$) to prevent negative or zero cell heights.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Data Structure Specification
Each column in `project.columns` supports:
```typescript
interface Column {
  id: string;
  width: number;           // in mm, min 150
  height?: number;         // in mm, optional individual height (fallback to project.settings.height)
  root: Node;              // root of hierarchical module tree
}
```

### 4.2 Helper Function: `getColumnHeight` in `public/js/layout.js`
```javascript
export function getColumnHeight(col, settings) {
  if (typeof col?.height === 'number' && Number.isFinite(col.height) && col.height > 0) {
    return col.height;
  }
  return (settings && typeof settings.height === 'number' && settings.height > 0)
    ? settings.height
    : DEFAULTS.height;
}
```

### 4.3 Modified `computeLayout(project)` in `public/js/layout.js`
1. **Column Heights Array & Max Height**:
   ```javascript
   const colHeights = cols.map((c) => getColumnHeight(c, s));
   const maxH = Math.max(...colHeights, s.height);
   ```
2. **Laterals Generation**:
   ```javascript
   // Lateral 0 (left exterior)
   add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: colHeights[0] + 2 * s.overhang, sz: D, col: 0 });
   x += t;
   xs.push(x);
   x += cols[0].width;

   // Intermediate laterals and dividers
   for (let i = 0; i < cols.length - 1; i++) {
     const sharedH = Math.max(colHeights[i], colHeights[i + 1]) + 2 * s.overhang;
     add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: sharedH, sz: D, col: i + 1 });
     const d = { type: 'col', axis: 'h', colIdx: i, x, y: -s.overhang, w: t, h: sharedH, col: i, cursor: 'ew-resize' };
     dividers.push(d);
     colDividers.push(d);
     x += t;
     xs.push(x);
     x += cols[i + 1].width;
   }

   // Lateral N (right exterior)
   const lastH = colHeights[cols.length - 1] + 2 * s.overhang;
   add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: lastH, sz: D, col: cols.length });
   const outerD = { type: 'col-outer', axis: 'h', colIdx: cols.length - 1, x, y: -s.overhang, w: t, h: lastH, col: cols.length - 1, cursor: 'ew-resize' };
   dividers.push(outerD);
   colDividers.push(outerD);
   ```
3. **Column Top Edge Dividers (for 2D border drag)**:
   ```javascript
   cols.forEach((c, i) => {
     const x0 = xs[i];
     const W = c.width;
     const colH = colHeights[i];
     dividers.push({
       type: 'col-top',
       axis: 'v',
       colIdx: i,
       colId: c.id,
       x: x0,
       y: colH - t,
       w: W,
       h: t,
       cursor: 'ns-resize',
     });
   });
   ```
4. **Column Decks, Backs & Children**:
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
   });
   ```
5. **Return Bundle**:
   Expose `maxH` alongside `totalW`: `{ settings: s, pieces, cells, dividers, colDividers, totalW, maxH, hardware: hw, cutlist: buildCutlist(pieces, s, hw) }`.

### 4.4 Modified `addOnTop` in `public/js/model.js`
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
    const targetH = getColumnHeight(targetCol, project.settings);
    const currentH = initialLayout.cells[targetCol.root.id]?.h || (targetH - 2 * t);
    return wrap(targetCol.root, 'v', nn, true, currentH);
  };

  const targetModule = addModuleToCol(col, type);

  if (allColumns) {
    project.columns.forEach((c) => {
      if (c.id !== colId) {
        addModuleToCol(c, 'shelf');
      }
    });
    project.settings.height += addedHeight + t;
  } else {
    // Lock explicit heights on any column lacking one so they remain strictly invariant
    project.columns.forEach((c) => {
      if (c.height == null) {
        c.height = project.settings.height;
      }
    });
    col.height = (col.height || project.settings.height) + addedHeight + t;
  }

  return targetModule;
}
```

### 4.5 Modified `setSize` in `public/js/model.js`
When no vertical parent is present (resizing root module in height):
```javascript
if (axis === 'w') {
  f.col.width = Math.max(100, valueMm);
} else {
  f.col.height = Math.max(200, valueMm + 2 * t);
}
```

---

## 5. Verification Method

To verify the stepped model and layout architecture independently:

1. **Run Full Test Suite**:
   ```bash
   node --test test/*.test.js
   ```
   Must pass 100% without failures.

2. **Automated Unit Verification for Stepped Column Geometry**:
   Create a dedicated test case `test/stepped_layout.test.js` checking:
   - **Different Column Heights**:
     Create project with Col 0 (height: 800), Col 1 (height: 1600).
     Verify:
     `pieces.find(p => p.kind === 'side' && p.col === 0).sy === 800 + 2 * overhang`
     `pieces.find(p => p.kind === 'side' && p.col === 1).sy === 1600 + 2 * overhang`
     `pieces.find(p => p.kind === 'side' && p.col === 2).sy === 1600 + 2 * overhang`
     `pieces.filter(p => p.name === 'Tapa superior')[0].y === 800 - t`
     `pieces.filter(p => p.name === 'Tapa superior')[1].y === 1600 - t`
   - **`addOnTop` Invariance**:
     Call `addOnTop(p, col0.id, 'shelf', 350)`.
     Verify:
     `col0.height === 800 + 350 + t`
     `col1.height === 1600` (strictly untouched)
     `p.columns[1].root.children.length` unchanged
     All cells in Col 1 retain exact millimeter height with 0.0mm deviation.
   - **Fallback Invariance**:
     Create project without `height` on columns.
     Verify `computeLayout` evaluates every column at `s.height` (1400mm).

3. **Invalidation Conditions**:
   - If calling `addOnTop` on one column mutates cell heights or children of any other column, the implementation is invalid.
   - If intermediate laterals between unequal columns do not rise to $\max(H_{left}, H_{right})$, the 3D model will have missing outer sidewall geometry at the step riser.
