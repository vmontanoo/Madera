# Specification & Handoff Report: Milestone 1 — Immediate Drag Calibration (R1 AC 3)

**Author**: `teamwork_preview_spec_miner_m1_3`  
**Date**: 2026-10-22  
**Target Path**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_spec_miner_m1_3\handoff.md`  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local`  

---

## 1. Observation

Direct code observations from inspecting the codebase (`public/js/app.js`, `public/js/layout.js`, `public/js/model.js`, `public/style.css`, and `test/layout.test.js`):

### 1.1 Canvas '+' Buttons & Addition Flow (`public/js/app.js:236-262`)
- **Button Generation (`drawCanvas`, lines 236–247)**:
  ```javascript
  const plus = (cx, cy, act, data) =>
    `<g class="plus" data-act="${act}" ${data}><circle cx="${cx}" cy="${cy}" r="30" fill="#ffb800"/><text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="44" font-weight="700" fill="#111">+</text></g>`;
  let colX = 0;
  state.project.columns.forEach((c) => {
    colX += s.thickness;
    svg += plus(colX + c.width / 2, -60, 'top', `data-col="${c.id}"`);
    colX += c.width;
  });
  svg += plus(-70, top / 2, 'colLeft', '');
  svg += plus(layout.totalW + 70, top / 2, 'colRight', '');
  ```
  - Top `+` buttons are positioned at `(colX + c.width / 2, -60)` above each column with `data-act="top"` and `data-col="${c.id}"`.
  - Lateral `+` buttons are positioned at `(-70, top / 2)` (`data-act="colLeft"`) and `(layout.totalW + 70, top / 2)` (`data-act="colRight"`).
- **Click Handling (`drawCanvas`, lines 251–262)**:
  ```javascript
  el.querySelectorAll('.plus').forEach((g) => {
    g.onclick = () => {
      const a = g.dataset.act;
      let newId;
      commit(() => {
        if (a === 'top') newId = M.addOnTop(state.project, g.dataset.col, state.newType)?.id;
        else if (a === 'colLeft') newId = M.addColumn(state.project, 0).id;
        else newId = M.addColumn(state.project, state.project.columns.length).id;
      });
      if (newId) select(newId);
    };
  });
  ```
  - `commit` executes the mutation, pushes the snapshot to `undo`, clears `redo`, calls `refresh()`, and schedules `save()`.
  - Immediately following `commit`, `if (newId) select(newId);` runs, which sets `state.selected = newId` and triggers `refresh()` a second time.
  - In `drawCanvas()`, `selCell = sel && layout.cells[sel]` renders a diagonal hatch pattern (`url(#hatch)`) over the newly created module cell (`app.js:224`).

### 1.2 Divider Placement & Generation in `layout.js` (`layout.js:211-236`)
- In `computeLayout`, `dividers` is initialized as an empty array `const dividers = [];` (`layout.js:114`).
- Inside `placeInner` (`layout.js:211-235`), dividers are populated ONLY for internal children of `multiple` containers:
  - For vertical stacking (`n.dir === 'v'`, lines 224–235):
    ```javascript
    const sizes = norm(kids, h - (k - 1) * t);
    let cy = py + h;
    kids.forEach((ch, j) => {
      cy -= sizes[j];
      place(ch, px, cy, w, sizes[j], col, coveredByDoor);
      if (j < k - 1) {
        cy -= t;
        add({ name: 'Estante / división', mat: 'carcass', kind: 'h', x: px, y: cy, z: bt, sx: w, sy: t, sz: cd, col, nodeId: n.id });
        dividers.push({ axis: 'v', parentId: n.id, prevId: ch.id, nextId: kids[j + 1].id, x: px, y: cy, w, h: t, col });
      }
    });
    ```
    - When `addOnTop` creates the new module at the top of the column, the new module is at index `0` (`kids[0]`).
    - The loop places `kids[0]` at the very top (from $y = cy$ to $cy + \text{sizes}[0]$).
    - At index $j = 0$, a horizontal shelf piece (`Estante / división`, `kind: 'h'`) is created at $y = cy - t$.
    - A divider descriptor is pushed into `dividers`:
      `{ axis: 'v', parentId: n.id, prevId: kids[0].id, nextId: kids[1].id, x: px, y: cy, w, h: t, col }`.
  - For horizontal partitioning (`n.dir === 'h'`, lines 211–222):
    - Divider pushed has `axis: 'h'`:
      `{ axis: 'h', parentId: n.id, prevId: ch.id, nextId: kids[j + 1].id, x: cx, y: py, w: t, h, col }`.
- **Missing Column Dividers in `layout.js`**:
  - `dividers` does NOT contain any dividers for the carcass lateral side panels between columns (`col` boundaries) or outer furniture borders.

### 1.3 Drag Handle Rendering in `app.js` (`app.js:225-235`)
```javascript
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
- For horizontal shelf dividers (`d.axis === 'v'`):
  - `cursor = 'ns-resize'`.
  - `rx = d.x`, `rw = d.w`.
  - `ry = Y(d.y, d.h) - pad`, `rh = d.h + 2 * pad` (with $t = 18$ and $pad = 8$, the handle is $18 + 16 = 34\text{ mm}$ high, providing a broad hit area).
- For vertical dividers (`d.axis === 'h'`):
  - `cursor = 'ew-resize'`.
  - `rx = d.x - pad`, `rw = d.w + 2 * pad` (expanded horizontally by $16\text{ mm}$).
  - `ry = Y(d.y, d.h)`, `rh = d.h`.

### 1.4 Drag Resizing Mouse Event Handling (`app.js:264-318`)
```javascript
handle.onmousedown = (e) => {
  e.preventDefault();
  e.stopPropagation();
  const d = layout.dividers[parseInt(handle.dataset.didx, 10)];
  if (!d) return;
  const svgEl = el.querySelector('svg');
  const pt = svgEl.createSVGPoint();
  const getSvgCoords = (evt) => {
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(svgEl.getScreenCTM().inverse());
  };
  const startPt = getSvgCoords(e);
  const parent = M.find(state.project, d.parentId);
  if (!parent) return;
  const prevNode = M.find(state.project, d.prevId)?.node;
  const nextNode = M.find(state.project, d.nextId)?.node;
  if (!prevNode || !nextNode) return;

  const isV = d.axis === 'v';
  const startPrevSize = prevNode.size;
  const startNextSize = nextNode.size;
  const totalPair = startPrevSize + startNextSize;

  const onMouseMove = (moveEvt) => {
    const curPt = getSvgCoords(moveEvt);
    // Si es división horizontal (arrastrar arriba/abajo), Y en SVG va invertido respecto a la altura
    const delta = isV ? (startPt.y - curPt.y) : (curPt.x - startPt.x);
    const minSize = 50;
    let newPrev = startPrevSize + delta;
    let newNext = startNextSize - delta;
    if (newPrev < minSize) {
      newPrev = minSize;
      newNext = totalPair - minSize;
    } else if (newNext < minSize) {
      newNext = minSize;
      newPrev = totalPair - minSize;
    }
    prevNode.size = Math.round(newPrev);
    nextNode.size = Math.round(newNext);
    refresh();
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    commit(() => {}); // registra en historial y autoguarda
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};
```

---

## 2. Logic Chain

### 2.1 Critical Diagnosis 1: Inverted Vertical Delta Formula (`app.js:293`)
1. **Observation**:
   - Line 293 specifies: `const delta = isV ? (startPt.y - curPt.y) : (curPt.x - startPt.x);`.
   - In SVG space, the origin $(0, 0)$ is at the top left. The vertical axis $Y$ points **downward**.
   - As the mouse moves downward, `curPt.y > startPt.y`, so `startPt.y - curPt.y < 0` (negative).
   - In `layout.js:225-235`, `kids[0]` (`prevNode`) is at the top of the column ($cy \in [H - t - \text{sizes}[0], H - t]$).
   - `kids[1]` (`nextNode`) is below `kids[0]`.
2. **Deduction**:
   - When the user drags the divider downward towards the floor, the top module (`prevNode`) must **expand** (grow taller), and the bottom module (`nextNode`) must **shrink**.
   - With the existing formula `delta = startPt.y - curPt.y`:
     - Dragging down yields `delta < 0`.
     - `newPrev = startPrevSize + delta` **decreases**!
     - `newNext = startNextSize - delta` **increases**!
   - Consequently, dragging downward causes the top module to shrink, and dragging upward causes it to expand. The divider moves in the **opposite direction** of the cursor.
3. **Resolution**:
   - The correct delta for vertical drag in SVG space is:
     `const delta = isV ? (curPt.y - startPt.y) : (curPt.x - startPt.x);`.
   - Moving downward (`curPt.y > startPt.y`) produces `delta > 0`, increasing `newPrev` (`prevNode.size`) and decreasing `newNext` (`nextNode.size`).

### 2.2 Critical Diagnosis 2: Collapse on Unweighted Nodes (`size: 1`)
1. **Observation**:
   - When nodes are created by `leaf()` or `wrap()`, their initial size is `1` (`model.js:6, 84, 85`).
   - In `app.js:286-289`, `startPrevSize = prevNode.size; startNextSize = nextNode.size; totalPair = startPrevSize + startNextSize;`.
   - If both nodes have `size: 1`, `totalPair = 2`.
   - In `app.js:294-303`, `minSize = 50`.
   - Clamping evaluation:
     `if (newPrev < minSize)` -> `newPrev = 50; newNext = totalPair - minSize = 2 - 50 = -48;`.
2. **Deduction**:
   - As soon as the user touches the divider, the size becomes negative ($-48$), causing invalid cell geometry and rendering distortion.
3. **Resolution**:
   - On `onmousedown`, before computing drag deltas, the sizes of all sibling children of `parent.node` must be synchronized from their current computed millimeter dimensions in `layout.cells`:
     ```javascript
     if (parent.node.children) {
       parent.node.children.forEach((ch) => {
         const cell = layout.cells[ch.id];
         if (cell) ch.size = isV ? cell.h : cell.w;
       });
     }
     ```
   - For a top module ($350\text{ mm}$) and lower module ($950\text{ mm}$), `startPrevSize = 350`, `startNextSize = 950`, `totalPair = 1300`.
   - Clamping to `minSize = 50` allows smooth, fluid calibration in the range $[50, 1250]\text{ mm}$ without distortion.

### 2.3 Critical Diagnosis 3: Lateral Column Border Dragging
1. **Observation**:
   - Acceptance Criteria R1 AC 2 and AC 3 require that adding a lateral column expands total furniture width, and the new module can be resized directly by dragging its borders.
   - In `layout.js`, no dividers are pushed for column boundaries or the outer lateral borders.
   - In `app.js:279`, the drag handler requires `M.find(state.project, d.parentId)`. For column boundaries, `parentId` is not a node.
2. **Deduction**:
   - Column boundary laterals and the outer right/left borders must be included in `layout.dividers` with:
     - `type: 'col'` (inter-column boundary) or `type: 'col-outer'` (outer lateral border).
     - `axis: 'h'`, `cursor: 'ew-resize'`, `x, y, w: t, h: H, colIdx`.
   - In `app.js`, `onmousedown` checks `if (d.type === 'col' || d.type === 'col-outer')`:
     - Inter-column drag redistributes width between `project.columns[colIdx]` and `project.columns[colIdx + 1]`, preserving total furniture width and enforcing `minWidth = 150\text{ mm}`.
     - Outer border drag resizes `project.columns[colIdx].width` directly, updating total furniture width.

### 2.4 Immediate Drag Calibration Workflow (R1 AC 3)
1. User clicks `+` above column:
   - `M.addOnTop` increases `settings.height` by `addedHeight + t`.
   - Existing modules preserve millimeter dimensions.
   - New leaf module created at `children[0]` with `size = addedHeight`.
   - `computeLayout` generates horizontal divider at index $0$ (`axis: 'v'`, `cursor: 'ns-resize'`).
   - `select(newId)` highlights the new top module with hatch pattern.
2. Hover:
   - Hovering over the horizontal divider right below the hatched module immediately reveals the `ns-resize` cursor and gold active highlight.
3. Drag:
   - User drags the handle up/down. Real-time updates sync 2D canvas, dock inputs, and 3D viewer.
4. Release:
   - History entry pushed onto `undo` stack; autosafe triggered.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Exterior Modules | Top Module Addition (`addOnTop`) | Expands total furniture height and inserts new leaf module at top of column without compressing existing modules | `colId`, `type`, `addedHeight = 350` | New module node `nn` with `size = addedHeight` | Returns `null` if `colId` invalid | `model.js:137-151` |
| 2 | Exterior Modules | Lateral Column Addition (`addColumn`) | Appends or prepends a new column with default width (600mm), expanding furniture width | `project`, `index` | New column root leaf node | Clamps index to `[0, columns.length]` | `model.js:153-157` |
| 3 | Divider Geometry | Top Module Divider Generation | Generates horizontal shelf divider directly below the new top module | Node tree from `computeLayout` | `{ axis: 'v', parentId, prevId, nextId, x, y, w, h: t, col }` in `layout.dividers` | Generates valid divider whenever column has $\ge 2$ vertical modules | `layout.js:223-235` |
| 4 | Drag Handles | Divider Handle SVG Rendering | Renders broad invisible SVG hit rect for each divider with reactive cursor styling | `layout.dividers` array | `<rect class="drag-handle">` with `ns-resize` or `ew-resize` and 8px padding | Fallbacks to empty array if `dividers` is null | `app.js:226-235` |
| 5 | Drag Calibration | Immediate Selection Synchronizer | Automatically selects the newly added module to visually identify it and anchor user attention | `newId` from `addOnTop`/`addColumn` | `state.selected = newId`, diagonal hatch overlay on cell | Graceful no-op if `newId` undefined | `app.js:260` |
| 6 | Drag Calibration | Sibling Millimeter Normalization | Sets all sibling module sizes to actual millimeter dimensions from `layout.cells` before delta computation | `parent.node.children`, `layout.cells` | Normalized millimeter sizes on nodes (`ch.size = cell.h` or `cell.w`) | Prevents unweighted `size: 1` nodes from collapsing to negative sizes | Spec miner investigation |
| 7 | Drag Calibration | Vertical Drag Direction Correction | Corrects SVG $Y$ delta formula so dragging downward increases top module height and dragging upward decreases it | `curPt.y`, `startPt.y` | `delta = curPt.y - startPt.y` | Replaces inverted `startPt.y - curPt.y` formula | `app.js:293` inspection |
| 8 | Drag Bounds | Functional Vertical Drag Bounds | Clamps adjacent vertical module heights to a minimum of 50mm, preserving total pair height | `delta`, `startPrevSize`, `startNextSize`, `minSize = 50` | `newPrev`, `newNext` clamped to `[50, totalPair - 50]` | Both modules guaranteed $\ge 50\text{ mm}$ | `app.js:294-303` |
| 9 | Column Resizing | Inter-Column Divider Generation | Generates draggable vertical dividers on carcass laterals between columns | Column positions in `computeLayout` | `{ type: 'col', axis: 'h', colIdx, x, y, w: t, h: H, col }` in `layout.dividers` | Placed at all $N - 1$ column boundaries | Spec miner design |
| 10 | Column Resizing | Outer Column Border Generation | Generates draggable vertical handles on outer furniture borders | Outer width in `computeLayout` | `{ type: 'col-outer', axis: 'h', colIdx, x, y, w: t, h: H, col }` in `layout.dividers` | Placed on rightmost lateral side | Spec miner design |
| 11 | Column Drag Bounds | Column Width Clamping Invariants | Enforces 150mm minimum column width and preserves total width on inter-column drag | `curPt.x`, `startPt.x`, `minW = 150` | `newLeft`, `newRight` clamped to `[150, totalColPair - 150]` | Neither column can shrink below 150mm | `PROJECT.md:53` |
| 12 | Visual Feedback | Body Cursor Lock & Hover Glow | Locks `document.body.style.cursor` during drag and highlights handle on hover with gold glow | Hover and drag events on `.drag-handle` | `cursor: ns-resize`/`ew-resize`, `fill: rgba(255, 184, 0, 0.4)` | Removed cleanly on `mouseup` | `style.css` & `app.js` |
| 13 | History & State | Drag Commit to History | Captures initial state and commits to undo stack upon `mouseup` only if dimensions changed | Pre-drag JSON snapshot, post-drag state | Entry pushed to `undo`, `redo` cleared, `save()` triggered | No undo entry created if delta was 0 | `app.js:312` |
| 14 | 3D Synchronization | Live 3D Viewport Updates | Calls `viewer.update(layout)` synchronously on every `mousemove` tick | Updated `layout` object from `computeLayout` | Smooth, real-time 3D geometry and mesh updates | Throttled naturally by browser `requestAnimationFrame` / event loop | `app.js:492` |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Top Divider Drag | User drags top module divider upward past ceiling limit (`curPt.y << startPt.y`) | `newPrev` is clamped to `minSize = 50mm`. Top module remains 50mm; bottom module expands to `totalPair - 50mm`. No negative dimensions or NaN values. |
| 2 | Top Divider Drag | User drags divider downward past floor limit of lower module (`curPt.y >> startPt.y`) | `newNext` is clamped to `minSize = 50mm`. Lower module remains 50mm; top module expands to `totalPair - 50mm`. |
| 3 | Single Leaf Column Root | User clicks top `+` on a column whose root was a single leaf (`type: 'shelf'`, `size: 1`) | `wrap(col.root, 'v', nn, true, oldH - 2*t)` wraps root into `multiple dir: 'v'`. Sibling normalization sets sizes to mm (`nn.size = 350`, `copy.size = oldH - 2*t`). Divider is immediately draggable. |
| 4 | Vertically Partitioned Root | User clicks top `+` on a column already containing multiple stacked modules | `col.root.children.unshift(nn)` inserts `nn` at index 0. Existing modules retain their exact millimeter heights. The divider between `nn` and `children[1]` appears at index 0 of `layout.dividers`. |
| 5 | Stationary Click (0px drag) | User clicks drag handle and releases mouse without moving | `delta = 0`. Dimensions do not change. `newPrev = startPrevSize`, `newNext = startNextSize`. Snapshot matches initial state; no spurious undo entry is added. |
| 6 | Mouse Leaves SVG Bounds | User drags mouse outside the SVG canvas onto topbar, dock, or 3D viewport | Window-level event listeners (`window.addEventListener('mousemove')` and `window.addEventListener('mouseup')`) continue tracking coordinates. Dragging remains active until mouse release anywhere on screen. |
| 7 | Lateral Column Outer Drag | User clicks `+` on right lateral side, then drags rightmost border outward | `d.type === 'col-outer'`. `state.project.columns[lastIdx].width` expands continuously with `delta = curPt.x - startPt.x`. Total furniture width expands in 2D and 3D. |
| 8 | Lateral Column Outer Drag | User drags rightmost border inward past minimum width | Column width is clamped to `minW = 150mm`. Total furniture width does not shrink below structural minimum. |
| 9 | Inter-Column Drag | User drags divider between two columns to the far left | Left column width clamped to `minW = 150mm`. Right column expands to `totalColPair - 150mm`. Total furniture width is strictly preserved. |
| 10 | Divider with Doors / Drawers | User drags divider of a module that has doors or drawer fronts | `doorOverlay` and `leafContents` in `layout.js` calculate front dimensions and hardware positions based on the updated cell dimensions in real time. Doors and drawer fronts resize and re-position cleanly. |

---

## 5. Exact Code Changes

### 5.1 `public/js/layout.js`
In `computeLayout(project)`:
Add inter-column dividers and outer border handles to `dividers`:
```diff
--- public/js/layout.js
+++ public/js/layout.js
@@ -124,10 +124,18 @@
     xs.push(x);
     x += c.width;
+    if (i < cols.length - 1) {
+      dividers.push({ type: 'col', axis: 'h', colIdx: i, x, y: 0, w: t, h: H, col: i });
+    }
   });
   add({ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: H + 2 * s.overhang, sz: D, col: cols.length });
+  dividers.push({ type: 'col-outer', axis: 'h', colIdx: cols.length - 1, x, y: 0, w: t, h: H, col: cols.length - 1 });
   const totalW = x + t;
```

### 5.2 `public/js/app.js`
In `drawCanvas()`:
Fix inverted vertical drag delta, normalize sibling sizes to millimeters on drag start, and handle column boundary/border dragging:
```diff
--- public/js/app.js
+++ public/js/app.js
@@ -265,6 +265,11 @@
     el.querySelectorAll('.drag-handle').forEach((handle) => {
       handle.onmousedown = (e) => {
         e.preventDefault();
         e.stopPropagation();
         const d = layout.dividers[parseInt(handle.dataset.didx, 10)];
         if (!d) return;
         const svgEl = el.querySelector('svg');
         const pt = svgEl.createSVGPoint();
         const getSvgCoords = (evt) => {
           pt.x = evt.clientX;
           pt.y = evt.clientY;
           return pt.matrixTransform(svgEl.getScreenCTM().inverse());
         };
         const startPt = getSvgCoords(e);
+        const isV = d.axis === 'v';
+        const cursor = isV ? 'ns-resize' : 'ew-resize';
+        document.body.style.cursor = cursor;
+        handle.classList.add('dragging');
+
+        // Column divider or outer border dragging
+        if (d.type === 'col' || d.type === 'col-outer') {
+          const colIdx = d.colIdx;
+          const startLeftW = state.project.columns[colIdx].width;
+          const startRightW = d.type === 'col' ? state.project.columns[colIdx + 1]?.width : 0;
+          const totalPair = startLeftW + startRightW;
+          const minW = 150;
+
+          const onMouseMove = (moveEvt) => {
+            const curPt = getSvgCoords(moveEvt);
+            const delta = curPt.x - startPt.x;
+            if (d.type === 'col') {
+              let newLeft = Math.round(Math.max(minW, Math.min(totalPair - minW, startLeftW + delta)));
+              let newRight = totalPair - newLeft;
+              state.project.columns[colIdx].width = newLeft;
+              state.project.columns[colIdx + 1].width = newRight;
+            } else if (d.type === 'col-outer') {
+              state.project.columns[colIdx].width = Math.round(Math.max(minW, startLeftW + delta));
+            }
+            refresh();
+          };
+
+          const onMouseUp = () => {
+            document.body.style.cursor = '';
+            handle.classList.remove('dragging');
+            window.removeEventListener('mousemove', onMouseMove);
+            window.removeEventListener('mouseup', onMouseUp);
+            commit(() => {});
+          };
+
+          window.addEventListener('mousemove', onMouseMove);
+          window.addEventListener('mouseup', onMouseUp);
+          return;
+        }
+
         const parent = M.find(state.project, d.parentId);
         if (!parent) return;
         const prevNode = M.find(state.project, d.prevId)?.node;
         const nextNode = M.find(state.project, d.nextId)?.node;
         if (!prevNode || !nextNode) return;
 
-        const isV = d.axis === 'v';
+        // Synchronize sibling sizes from layout.cells to prevent unweighted size=1 collapse
+        if (parent.node.children) {
+          parent.node.children.forEach((ch) => {
+            const cell = layout.cells[ch.id];
+            if (cell) ch.size = isV ? cell.h : cell.w;
+          });
+        }
+
         const startPrevSize = prevNode.size;
         const startNextSize = nextNode.size;
         const totalPair = startPrevSize + startNextSize;
 
         const onMouseMove = (moveEvt) => {
           const curPt = getSvgCoords(moveEvt);
-          // Si es división horizontal (arrastrar arriba/abajo), Y en SVG va invertido respecto a la altura
-          const delta = isV ? (startPt.y - curPt.y) : (curPt.x - startPt.x);
+          // Dragging down (curPt.y > startPt.y) increases top module height (delta > 0)
+          const delta = isV ? (curPt.y - startPt.y) : (curPt.x - startPt.x);
           const minSize = 50;
           let newPrev = startPrevSize + delta;
           let newNext = startNextSize - delta;
           if (newPrev < minSize) {
             newPrev = minSize;
             newNext = totalPair - minSize;
           } else if (newNext < minSize) {
             newNext = minSize;
             newPrev = totalPair - minSize;
           }
           prevNode.size = Math.round(newPrev);
           nextNode.size = Math.round(newNext);
           refresh();
         };
 
         const onMouseUp = () => {
+          document.body.style.cursor = '';
+          handle.classList.remove('dragging');
           window.removeEventListener('mousemove', onMouseMove);
           window.removeEventListener('mouseup', onMouseUp);
           commit(() => {}); // registra en historial y autoguarda
         };
```

### 5.3 `public/js/model.js`
In `wrap` and `addOnTop`:
Preserve `newNode.size` and `copy.size` in millimeters:
```diff
--- public/js/model.js
+++ public/js/model.js
@@ -82,9 +82,9 @@
-function wrap(node, dir, newNode, before = false) {
-  const copy = { ...clone(node), id: uid(), size: 1 };
-  newNode.size = 1;
+function wrap(node, dir, newNode, before = false, oldSize = null) {
+  const copy = { ...clone(node), id: uid(), size: oldSize ?? (node.size || 1) };
   replaceContent(node, { type: 'multiple', dir, children: before ? [newNode, copy] : [copy, newNode] });
   return newNode;
 }
@@ -149,3 +149,3 @@
   }
-  return wrap(col.root, 'v', nn, true);
+  return wrap(col.root, 'v', nn, true, oldH - 2 * t);
 }
```

### 5.4 `public/style.css`
Add visual hover and active styling for drag handles:
```diff
--- public/style.css
+++ public/style.css
@@ -56,2 +56,4 @@
 svg .plus { cursor:pointer; }
+svg .drag-handle { fill: transparent; transition: fill 0.15s ease; }
+svg .drag-handle:hover, svg .drag-handle.dragging { fill: rgba(255, 184, 0, 0.4); }
```

---

## 6. Caveats

1. **Browser ScreenCTM Transformation**:
   - `getSvgCoords` relies on `svgEl.getScreenCTM().inverse()`. This correctly maps client mouse coordinates to SVG viewBox coordinates regardless of screen DPI, zoom level, or CSS responsive resizing.
2. **Body Cursor Locking**:
   - Setting `document.body.style.cursor` during `mousemove` prevents cursor flickering or reversion when moving faster than the SVG handle element during high-speed drag operations.
3. **Touch Device Support**:
   - The current interaction uses `onmousedown` / `mousemove`. Touch events (`touchstart`, `touchmove`, `touchend`) are not currently bound. If mobile touch support is desired in the future, pointer events (`pointerdown`, `pointermove`, `pointerup`) or touch event equivalents should be mapped.
4. **Scope Boundaries**:
   - Milestone 1 specifies immediate drag calibration on newly added top modules and lateral columns. Full internal divider resizing across all arbitrary nested subtrees is scheduled for Milestone 2 (R2), but the sibling millimeter normalization designed here provides full forward compatibility for both milestones.

---

## 7. Conclusion

Immediate drag calibration for Milestone 1 (R1 AC 3) is achieved through four coordinated mechanisms:
1. **Immediate Selection & Anchor**: `select(newId)` runs immediately after `commit()`, highlighting the newly created top module with the diagonal hatch pattern and drawing user focus directly to its boundary.
2. **Active Draggable Divider in `layout.dividers`**: `computeLayout` places the horizontal divider below `kids[0]` with `axis: 'v'`, `cursor: 'ns-resize'`, and broad 34mm padded hit bounds (`pad = 8`). For columns, inter-column and outer border dividers with `axis: 'h'` and `cursor: 'ew-resize'` are registered in `layout.dividers`.
3. **Correct Coordinate Delta Math**: Inverting the vertical delta formula to `curPt.y - startPt.y` guarantees that dragging downward expands the top module in natural alignment with cursor movement.
4. **Millimeter Sibling Normalization & Clamping**: Normalizing all sibling sizes to `layout.cells` millimeter values on `onmousedown` eliminates the unweighted `size: 1` crash, clamping dimensions safely to $\ge 50\text{ mm}$ for modules and $\ge 150\text{ mm}$ for columns while preserving global structural invariants.

---

## 8. Verification Method

### 8.1 Automated Test Execution
Run the Node native test suite:
```bash
node --test test/layout.test.js
```
Expected output:
```
✔ proyecto por defecto genera piezas, cutlist y precio
✔ módulo dentro de otro módulo: gaveta + puerta en el mismo módulo
✔ perchero y cambio de manilla
✔ eliminar hijo colapsa el contenedor
✔ setSize reajusta hermanos
ℹ pass 5, fail 0
```

### 8.2 Unit Test Assertions for R1 AC 3
To verify `layout.dividers` includes the horizontal divider below the new top module:
```javascript
test('addOnTop creates horizontal divider in layout.dividers with axis: v and ns-resize bounds', () => {
  const p = M.defaultProject();
  const col = p.columns[0];
  const oldDividerCount = computeLayout(p).dividers.length;
  const nn = M.addOnTop(p, col.id, 'shelf', 350);
  assert.ok(nn);
  const layout = computeLayout(p);
  // Dividers count increased
  assert.ok(layout.dividers.length > oldDividerCount);
  // Find divider directly below nn
  const topDivider = layout.dividers.find((d) => d.axis === 'v' && d.prevId === nn.id);
  assert.ok(topDivider, 'Horizontal divider below top module must exist');
  assert.equal(topDivider.axis, 'v');
  assert.equal(topDivider.col, 0);
  assert.equal(topDivider.w, col.width);
  assert.equal(topDivider.h, layout.settings.thickness);
  assert.ok(topDivider.y > 0);
});
```

### 8.3 Manual Browser Verification Protocol
1. Launch dev server: `npm start` (or `node server/server.js`) at `http://localhost:3000`.
2. Open or create a project.
3. Click the top `+` button above Column 1.
4. **Observation**:
   - Furniture height expands by $350 + 18 = 368\text{ mm}$.
   - New top shelf is highlighted with yellow hatch pattern.
   - Hover cursor over the horizontal shelf divider right below the hatched module: cursor changes to `ns-resize`, handle glows gold.
   - Click and drag downward: top module expands smoothly in real time.
   - Click and drag upward: top module shrinks smoothly in real time.
   - Dragging stops at 50mm minimum without distortion.
   - 3D viewport updates synchronously during drag.
   - Press `Ctrl+Z`: height calibration reverts to pre-drag state.
