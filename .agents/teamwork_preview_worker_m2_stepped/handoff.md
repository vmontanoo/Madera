# Handoff Report: Worker M2 (Stepped 2D Editor & Top Border Dragging Implementation)

## 1. Observation

### 1.1 Existing 2D SVG Canvas & Fixed Y Top Coordinates in `public/js/app.js`
In `public/js/app.js` (lines 769–838 prior to modification):
- `drawCanvas()` hardcoded its reference height to `H = s.height`, computing `top = H + ov` and viewBox `${-120} ${-110} ${layout.totalW + 240} ${H + 2 * ov + 200}`.
- All column top `(+)` buttons were hardcoded to `cy = -60`:
  ```javascript
  state.project.columns.forEach((c) => {
    colX += s.thickness;
    svg += plus(colX + c.width / 2, -60, 'top', `data-col="${c.id}"`);
    colX += c.width;
  });
  ```
- Clicking the top `(+)` button called `M.addOnTop(state.project, g.dataset.col, state.newType)` without the stepped flags `(..., 350, false)`.
- If a project had columns with staggered heights (e.g. Column 0 = 800mm, Column 1 = 1800mm), Column 0's top button floated 1000mm in empty space above its actual top cap piece, and any column taller than `s.height` clipped outside the viewBox ceiling.

### 1.2 Drag-Handle Event Listener Infrastructure in `public/js/app.js`
In `public/js/app.js` (lines 855–980 prior to modification):
- Handlers existed only for `d.type === 'col'` and `d.type === 'col-outer'` (horizontal column width resizing) and internal dividers with `d.parentId`.
- There was no handler for `d.type === 'col-top'`, meaning dragging a column's top cap line had zero effect.
- The drag infrastructure already had:
  1. Coordinate conversion: `getSvgCoords(evt)` using `svgEl.getScreenCTM().inverse()`.
  2. Snapshot capture: `initialSnapshot = snapshot()`.
  3. `hasMoved` movement tracking.
  4. Global window listener registration with cleanup on `mouseup`.

### 1.3 CSS Drag Handle Styling in `public/style.css`
In `public/style.css` (lines 55–58):
```css
svg .cell { fill:transparent; cursor:pointer; }
svg .plus { cursor:pointer; }
svg .drag-handle { fill: transparent; transition: fill 0.15s ease; }
svg .drag-handle:hover, svg .drag-handle.dragging { fill: rgba(255, 184, 0, 0.4); }
```
- Missing explicit styling for `.col-top-handle` to enforce `cursor: ns-resize`.

---

## 2. Logic Chain

### Step 2.1: Dynamic Coordinate Anchoring & Stepped Silhouette Rendering
1. In stepped modular furniture, each column $i$ can have an independent height $H_i = c_i\text{.height} || s\text{.height}$.
2. As established in `PROJECT.md` § Interface Contracts, all columns stand on a common ground baseline ($y = 0$).
3. Setting the SVG top anchor to:
   $$\text{maxH} = \text{layout.maxH} || \max_{i} (H_i)$$
   $$\text{top} = \text{maxH} + ov$$
   and the SVG coordinate transformation to $Y(y, sy) = \text{top} - (y + sy)$ ensures:
   - Common ground $y = 0$ renders at $Y = \text{top} - t$ for bases.
   - Column $i$'s top cap piece (`Tapa superior`), located at physical coordinate $y = H_i - t$ with thickness $t$, renders at SVG $Y = \text{top} - (H_i - t + t) = \text{top} - H_i$.
   - For a short column ($H_0 = 800$, $\text{maxH} = 1800$, $ov = 20$, $\text{top} = 1820$), its top cap line renders at SVG $Y = 1820 - 800 = 1020$.
   - For a tall column ($H_1 = 1800$), its top cap line renders at SVG $Y = 1820 - 1800 = 20$.
   - This produces an exact, mathematically faithful stepped silhouette in 2D SVG space.

### Step 2.2: Per-Column Floating (+) Button Positioning
1. For each column $i$, its horizontal center is $cx_i = colX_i + c_i\text{.width} / 2$.
2. In SVG coordinates, column $i$'s top cap is at $Y_{\text{top}} = \text{top} - H_i$.
3. Positioning the (+) button to float 50mm directly above the column's top cap line requires:
   $$cy_i = \text{top} - H_i - 50$$
4. For Column 0 ($H_0 = 800$): $cy_0 = 1820 - 800 - 50 = 970$.
5. For Column 1 ($H_1 = 1800$): $cy_1 = 1820 - 1800 - 50 = -30$.
6. Lateral (+) buttons are centered relative to the outer columns:
   - Left lateral: $cx = -70, cy = \text{top} - H_0 / 2$.
   - Right lateral: $cx = \text{layout.totalW} + 70, cy = \text{top} - H_{N-1} / 2$.
7. When clicking a top (+) button, invoking `M.addOnTop(state.project, g.dataset.col, state.newType, 350, false)` increases only that column's height and adds a module exclusively to that column.

### Step 2.3: Interactive 2D Top Border Dragging (`col-top`)
1. In `layout.js`, `computeLayout` generates top border dividers:
   `{ type: 'col-top', axis: 'v', colIdx: i, colId: c.id, x: x0, y: H_i - t, w: W, h: t, cursor: 'ns-resize' }`.
2. In SVG coordinates, this handle renders as:
   `rx = d.x`, `ry = Y(d.y, d.h) - pad = top - H_i - 8`, `rw = d.w`, `rh = d.h + 2 * pad = t + 16`.
3. When the user initiates a drag on this handle:
   - Mousemove calculates SVG delta: `deltaH = startPt.y - curPt.y`. Upward mouse movement decreases SVG Y ($curPt.y < startPt.y$), producing $\Delta H > 0$ and increasing column height.
   - Safety clamping is enforced:
     $$H_{\min} = \max(200, 2t + 50, 2t + K \times 50 + (K - 1)t)$$
     $$H_{\max} = 4000$$
     where $K$ is the number of vertical child modules, guaranteeing that internal modules never shrink below 50mm and pieces never invert.
   - New height is assigned: `col.height = Math.round(Math.min(maxH, Math.max(minH, startH + deltaH)))`.
   - `refresh()` is called to re-render the 2D canvas, 3D viewer, and cutlist in real time.
   - On `mouseup`: if `hasMoved === true`, `pushUndo(initialSnapshot)` and `save()` record the change in undo history and persist the project. If zero movement occurred, undo/redo stacks remain completely untouched.

### Step 2.4: Preservation of Internal Horizontal Divider Dragging
1. Internal horizontal divider dragging (`d.axis === 'v'` inside a column) maintains the $\ge 50$mm safety clearance via `effectiveMin = Math.min(minSize, Math.floor(totalPair / 2))` where `minSize = 50`.
2. Movement updates both `prevNode.size` and `nextNode.size`, preserving their sum `totalPair`.
3. Completion records history cleanly via `if (hasMoved) pushUndo(initialSnapshot)`.

---

## 3. Caveats

- **No Caveats**: The implementation strictly adheres to the contracts defined in `PROJECT.md` and the blueprints in `survey_2/handoff.md`. Browser and Node.js environments are both fully supported via isomorphic guards on DOM variables.

---

## 4. Conclusion

All requirements for Milestone M2 are fully implemented and verified:
1. `public/js/app.js`:
   - `drawCanvas()` anchors coordinates to `maxH` and `top = maxH + ov`.
   - SVG viewBox is dynamically set to `${-120} ${-110} ${layout.totalW + 240} ${maxH + 2 * ov + 200}`.
   - Stepped silhouette rendering renders each column's top cap line at $Y = \text{top} - H_i$.
   - Dedicated (+) buttons per column float 50mm above each column's top cap line ($cy = \text{top} - H_i - 50$).
   - Lateral (+) buttons are centered to outer column heights.
   - Plus click handler calls `M.addOnTop(state.project, g.dataset.col, state.newType, 350, false)`.
   - Drag handle event listener handles `d.type === 'col-top'` with `ns-resize`, delta calculation $\Delta H = startPt.y - curPt.y$, safety clamping ($H_{\min} \ge 200$, $H_{\max} \le 4000$), live `refresh()`, and atomic undo capture on `mouseup`.
   - Internal horizontal divider dragging maintains $\ge 50$mm safety clearance.
   - Exported pure helpers `buildCanvasSvg`, `calculateTopBorderDrag`, and `simulateTopBorderDrag`.
2. `public/style.css`:
   - Added `.drag-handle.col-top-handle { cursor: ns-resize; }` and enhanced active/hover styles.
3. `test/stepped_2d_editor.test.js`:
   - Authored 8 comprehensive suites covering SVG generation, distinct (+) button positions matching each column's height, `col-top` divider handles and coordinates, height delta calculation and bounds clamping ($H_{\min} \ge 200, H_{\max} \le 4000$), undo stack capture, `addOnTop(..., false)` single-column reaction in SVG, and internal divider safety clearance $\ge 50$mm.

---

## 5. Verification Method

### 5.1 Independent Verification Commands
Run the Node.js test runner across all stepped test suites:
```bash
node --test test/stepped_2d_editor.test.js
node --test test/stepped_layout.test.js
node --test test/m1_challenger_stepped_layout.test.js
node --test test/m1_challenger_add_on_top.test.js
```

### 5.2 Specific Test Cases Verified
1. **Dynamic ViewBox & Stepped Cap Coordinates** (`test/stepped_2d_editor.test.js` Suite 1):
   - Verifies viewBox `-120 -110 2112 2040` for columns of heights 800, 1800, 1200mm.
   - Verifies top cap pieces rendered at SVG Y = 1020, 20, 620.
2. **Dedicated Floating (+) Buttons** (`test/stepped_2d_editor.test.js` Suite 2):
   - Verifies circles rendered at `cy = 970`, `cy = -30`, and `cy = 570`, floating 50mm above each column's top cap.
   - Verifies lateral buttons at $cy = 1420$ and $cy = 1220$.
3. **`col-top` Drag Handle Rectangles** (`test/stepped_2d_editor.test.js` Suite 3):
   - Verifies handles generated with `class="drag-handle col-top-handle"`, `cursor:ns-resize`, and padding of 8mm above and below.
4. **Height Delta Calculation & Bounds Clamping** (`test/stepped_2d_editor.test.js` Suite 4):
   - Verifies upward movement increases height ($\Delta Y = +150 \implies H = 1150$).
   - Verifies lower bound clamps strictly to $H_{\min} \ge 200$ and $2t + 50$.
   - Verifies upper bound clamps strictly to $H_{\max} \le 4000$.
5. **Target Column Mutation & Neighbor Invariance** (`test/stepped_2d_editor.test.js` Suite 5):
   - Verifies dragging column 0 does not alter column 1 height.
6. **Undo / Redo Stack State Capture** (`test/stepped_2d_editor.test.js` Suite 6):
   - Verifies successful drag records snapshot; restoring undo returns column to pre-drag height; zero-movement clicks leave undo/redo untouched.
7. **Single-Column `addOnTop` SVG Reaction** (`test/stepped_2d_editor.test.js` Suite 7):
   - Verifies `addOnTop(..., false)` updates only target column and its corresponding (+) button in SVG.
8. **Internal Divider Clearance** (`test/stepped_2d_editor.test.js` Suite 8):
   - Verifies internal module sizes never drop below 50mm under extreme drag.

### 5.3 Invalidation Conditions
- Any column top (+) button positioned at a fixed global $Y$ instead of floating at $Y = \text{top} - H_i - 50$.
- Any drag interaction altering non-target columns.
- Any column height allowed below 200mm or above 4000mm.
- Any undo stack push occurring when the mouse is clicked without moving.
