# Handoff Report: Milestone 2 Implementation (R2 - 2D Drag Resizing & Undo/Redo)

**Agent**: `teamwork_preview_worker_m2`  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_worker_m2`  
**Date**: 2026-10-22  
**Milestone**: M2 (R2 - 2D Drag Resizing, Drawer Clamping, Coordinate Resilience, Pair Invariance, Cross-Platform Undo/Redo)  
**Status**: COMPLETE (Hard Handoff)  

---

## 1. Observation

### 1.1 Drawer Height Vulnerability Under Boundary Clamping
In `public/js/layout.js:193-194`, prior to modification:
```javascript
const by = cy0 + idx * inner + s.drawerInset / 2;
const bh = inner - s.drawerInset;
```
When a multi-drawer module (e.g. `count = 3` or `4`) was clamped to minimum module dimension `minSize = 50mm`:
- For $cnt = 3$: $inner = \frac{50}{3} \approx 16.667\text{ mm}$.
- With default `s.drawerInset = 20mm`: $bh = 16.667 - 20 = -3.333\text{ mm} < 0$.
- This caused negative component dimensions on drawer sides (`Lateral de gaveta`, `sy = -3.333`), front/back boxes (`Frente/trasera de gaveta`, `sy = -3.333`), inverted thickness sorting in `orientationOf`, and corrupted cutlist pricing.

### 1.2 Coordinate Transformation Matrix & SVG Detachment During Drag
In `public/js/app.js:271-277`, prior to modification:
```javascript
const svgEl = el.querySelector('svg');
const pt = svgEl.createSVGPoint();
const getSvgCoords = (evt) => {
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  return pt.matrixTransform(svgEl.getScreenCTM().inverse());
};
```
When a drag began, the first mousemove triggered `refresh()`, which re-rendered `#canvas.innerHTML = svg`. The original element referenced by `svgEl` became disconnected from the document tree (`svgEl.isConnected === false`). Calling `svgEl.getScreenCTM()` on a disconnected SVG element returned `null`, triggering:
`Uncaught TypeError: Cannot read properties of null (reading 'inverse')`.

### 1.3 Spurious Undo Capture on Zero-Displacement Clicks
In `public/js/app.js:283, 331-337, 367-372`:
On `mousedown`, the editor recorded `initialSnapshot = snapshot()`, and immediately ran eager sibling normalization:
```javascript
if (parent.node.children) {
  parent.node.children.forEach((ch) => {
    const cell = layout.cells[ch.id];
    if (cell) ch.size = isV ? cell.h : cell.w;
  });
}
```
If the user merely clicked a divider handle without moving the mouse:
- `initialSnapshot` contained un-normalized relative values (e.g. `size: 1`).
- `snapshot()` on `mouseup` contained normalized millimeter values (e.g. `size: 650`).
- `snapshot() !== initialSnapshot` evaluated to `true`, pushing an unneeded undo entry, wiping the `redo` stack (`redo.length = 0`), and sending an unnecessary HTTP PUT save request.

### 1.4 1mm Rounding Drift in Sibling Pair Redistribution
In `public/js/app.js:357-358`:
```javascript
prevNode.size = Math.round(newPrev);
nextNode.size = Math.round(newNext);
```
When `newPrev` and `newNext` both rounded upwards (e.g. $100.5 \to 101$ and $99.5 \to 100$, sum = $201$ vs $totalPair = 200$), a $1\text{ mm}$ drift accumulated per drag operation.

### 1.5 Keyboard Event Incompatibilities
In `public/js/app.js:625-630`:
- Only `e.ctrlKey` was checked; macOS `Cmd` (`e.metaKey`) was unsupported.
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` produced uppercase `'Z'`, which failed `e.key === 'z'`.
- Missing `e.preventDefault()` allowed native browser shortcut collisions.

---

## 2. Logic Chain

### 2.1 Drawer Box Clamping & Centering (`layout.js`)
1. By updating `bh = Math.max(10, inner - s.drawerInset)`, `bh` is mathematically guaranteed to be $\ge 10\text{ mm}$ for any input height, eliminating negative dimensions across all drawer pieces and cutlist rows.
2. Centering the box via `by = cy0 + idx * inner + (inner - bh) / 2`:
   - Under normal heights where $inner - s.drawerInset \ge 10$: $(inner - bh)/2 = (inner - (inner - s.drawerInset))/2 = s.drawerInset / 2$, which exactly preserves the original layout coordinate.
   - Under boundary clamping ($inner - s.drawerInset < 10$): centers the $10\text{ mm}$ drawer box symmetrically within the available inner slot.

### 2.2 SVG Coordinate Matrix Caching & Fallback (`app.js`)
1. On `mousedown`, cache `invCTM = svgEl.getScreenCTM()?.inverse()`.
2. Inside `getSvgCoords(evt)`:
   - If `invCTM` exists, evaluate purely in memory: `pt.matrixTransform(invCTM)`, completely decoupled from SVG DOM replacements during `refresh()`.
   - If not cached, fallback queries `el.querySelector('svg')?.getScreenCTM()?.inverse()`.
3. Detached SVG coordinate exceptions are eliminated.

### 2.3 Lazy Sibling Normalization & Zero-Displacement Guard (`app.js`)
1. On `mousedown`, initialize `hasMoved = false` and `normalized = false`.
2. Sibling normalization (`ch.size = isV ? cell.h : cell.w`) is deferred to the first `mousemove` event tick inside `if (!normalized)`.
3. If a user clicks without moving, `hasMoved` remains `false`.
4. On `mouseup`, `if (hasMoved) { pushUndo(initialSnapshot); }`:
   - Clicking without moving never touches `state.project`, never pushes to `undo`, and never clears `redo`.
5. Inside `pushUndo(prevSnapshot)`:
   - Evaluates `if (snapshot() !== prevSnapshot)`. If the user drags and returns to the exact starting coordinate, no entry is pushed.

### 2.4 Algebraic Pair Invariance (`app.js`)
1. Calculate `roundedPrev = Math.round(newPrev)`.
2. Calculate `roundedNext = totalPair - roundedPrev`.
3. Algebraic identity:
   $$\text{roundedPrev} + \text{roundedNext} = \text{roundedPrev} + (\text{totalPair} - \text{roundedPrev}) = \text{totalPair}$$
   Guarantees exact $0\text{ mm}$ rounding drift across arbitrary floating-point drag deltas.
4. Apply container underflow protection: `effectiveMin = Math.min(minSize, Math.floor(totalPair / 2))` to prevent container starvation when available height is $< 100\text{ mm}$.

### 2.5 Cross-Platform Keyboard Event Handling (`app.js`)
1. Detect modifier: `const isMod = e.ctrlKey || e.metaKey;` (Windows/Linux `Ctrl` + macOS `Cmd`).
2. Case-insensitive key comparison: `const key = e.key.toLowerCase();`.
3. Branching:
   - `key === 'z'`:
     - `e.shiftKey === false` $\implies$ Undo $\implies$ `restore(undo, redo)`.
     - `e.shiftKey === true` $\implies$ Redo $\implies$ `restore(redo, undo)`.
   - `key === 'y' && !e.shiftKey` $\implies$ Redo $\implies$ `restore(redo, undo)`.
4. Call `e.preventDefault()` on all handled shortcuts.
5. Guard against input tags and `contentEditable` elements.

---

## 3. Caveats

- **Mouse Pointer vs Touch Events**: Drag interactions are attached to mouse events (`mousedown`, `mousemove`, `mouseup`) with window-level drag tracking. Mobile touch events or unified Pointer Events (`pointerdown`, `pointermove`, `pointerup` with `setPointerCapture`) remain available for future mobile-first expansions.
- **Minimum Dimensional Limits**: Minimum column width is enforced at $150\text{ mm}$; minimum module divider size is enforced at $50\text{ mm}$. Dragging beyond these thresholds clamps safely without corrupting geometry.
- No other caveats.

---

## 4. Conclusion

All Milestone 2 requirements have been implemented cleanly with genuine logic:
1. `public/js/layout.js`: Drawer sub-components clamped to `Math.max(10, inner - s.drawerInset)` and vertically centered with `by = cy0 + idx * inner + (inner - bh) / 2`.
2. `public/js/app.js`: Inverse CTM caching with fallback, lazy sibling normalization with `hasMoved` tracking, clean `pushUndo`, algebraic pair invariance, body cursor locking, and cross-platform keyboard handling.
3. `test/layout.test.js`: Added comprehensive automated unit tests covering drawer clamping invariance, fluid pair redistribution without drift, and undo/redo state integrity.

---

## 5. Verification Method

### 5.1 Verification Commands
Run the Node.js native test runner:
```bash
node --test test/layout.test.js
```
And the complete test suite:
```bash
node --test test/*.test.js
```

### 5.2 Files to Inspect
- `public/js/layout.js`: Lines 193-194.
- `public/js/app.js`: Lines 156-164 (`pushUndo`), 174-177 (`restore`), 280-291 (CTM caching), 299 (`hasMoved`), 301-337 (column drag), 346-393 (divider drag with lazy normalization and pair invariance), and 645-667 (`onKey`).
- `test/layout.test.js`: Lines 575-830 (3 new M2 unit tests).

### 5.3 Invalidation Conditions
- Any drawer component piece producing `sy < 10` or cutlist row producing negative dimensions when module is clamped to 50mm.
- Any drag operation producing a sum difference $\ne \text{totalPair}$ (rounding drift).
- Zero-displacement click polluting `undo` or clearing `redo`.
- Detached SVG exceptions thrown on mouse movements.
- `Ctrl+Shift+Z` or `Cmd+Z` failing to undo/redo.
