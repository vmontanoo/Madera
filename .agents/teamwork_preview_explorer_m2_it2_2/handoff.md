# Handoff Report: Browser and Node ESM Compatibility Investigation (M2-IT2-2)

**Explorer**: Explorer M2-IT2-2 (Browser and Node ESM Compatibility Explorer)  
**Parent Agent**: 20a52755-88ff-4e04-950c-4b4a3c054fe0  
**Artifact Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m2_it2_2`  
**Target Files**: `public/js/app.js`, `public/index.html`, `test/stepped_2d_editor.test.js`

---

## 1. Observation

### 1.1 Current Function Placement in `public/js/app.js`
In `public/js/app.js`:
- Line 682 opens `async function editorView(id) {`.
- Lines 769–865 define the three functions inside `editorView`:
  ```javascript
  769: export function calculateTopBorderDrag(startH, deltaH, thickness = 18, childCount = 1) {
  770:   const childMin = 2 * thickness + childCount * 50 + (childCount - 1) * thickness;
  771:   const minH = Math.max(200, 2 * thickness + 50, childMin);
  772:   const maxH = 4000;
  773:   return Math.round(Math.min(maxH, Math.max(minH, startH + deltaH)));
  774: }
  775: 
  776: export function simulateTopBorderDrag(project, colIdx, deltaH) {
  777:   const col = project.columns[colIdx];
  778:   if (!col) return null;
  779:   const t = project.settings?.thickness || 18;
  780:   const startH = (typeof col.height === 'number' && col.height > 0) ? col.height : (project.settings?.height || 1400);
  781:   const childCount = col.root?.type === 'multiple' && col.root?.dir === 'v' ? (col.root.children?.length || 1) : 1;
  782:   const newH = calculateTopBorderDrag(startH, deltaH, t, childCount);
  783:   col.height = newH;
  784:   return newH;
  785: }
  786: 
  787: export function buildCanvasSvg(project, layout, selected = null) {
  788:   const s = layout.settings;
  ...
  864:   return svg;
  865: }
  ```
- Line 1593 closes `editorView`:
  ```javascript
  1592:   refresh();
  1593: }
  ```
- `calculateTopBorderDrag`, `simulateTopBorderDrag`, and `buildCanvasSvg` are lexical children of `editorView` decorated with the `export` keyword.

### 1.2 Import Statements in Test Suites
- In `test/stepped_2d_editor.test.js` (lines 36–40):
  ```javascript
  36: import {
  37:   buildCanvasSvg,
  38:   calculateTopBorderDrag,
  39:   simulateTopBorderDrag,
  40: } from '../public/js/app.js';
  ```
- In `test/m2_challenger_drag_stepped.test.js` (lines 54–58):
  ```javascript
  54: import {
  55:   calculateTopBorderDrag,
  56:   simulateTopBorderDrag,
  57:   buildCanvasSvg,
  58: } from '../public/js/app.js';
  ```
- In `test/m2_challenger_svg_stepped.test.js` (lines 37–41):
  ```javascript
  37: import {
  38:   buildCanvasSvg,
  39:   calculateTopBorderDrag,
  40:   simulateTopBorderDrag,
  41: } from '../public/js/app.js';
  ```

### 1.3 Client-Side Module Loading in `public/index.html`
- In `public/index.html` (lines 16–21):
  ```html
  17: <body>
  18:   <div id="app"></div>
  19:   <script type="module" src="/js/app.js"></script>
  20: </body>
  ```
- Line 8–15 provides the native importmap:
  ```html
  <script type="importmap">
  {
    "imports": {
      "three": "/vendor/three/build/three.module.js",
      "three/addons/": "/vendor/three/examples/jsm/"
    }
  }
  </script>
  ```

### 1.4 Variable and Identifier Audit Inside `buildCanvasSvg`
Inspection of every identifier in lines 787–865 reveals:
1. Arguments:
   - `project`: accessed via `project.columns`, `project.columns.map(...)`, `project.columns.forEach(...)`.
   - `layout`: accessed via `layout.settings`, `layout.maxH`, `layout.totalW`, `layout.cells`, `layout.pieces`, `layout.dividers`, `layout.colHeights`.
   - `selected`: default `null`, accessed via `const sel = selected; const selCell = sel && layout.cells[sel];`.
2. Module Imports:
   - `M`: `import * as M from './model.js'` (line 2 of `app.js`), called via `M.find(project, c.id)`.
3. Local Helplers & Variables:
   - `Y = (y, sy) => top - (y + sy)`
   - `plus = (cx, cy, act, data) => ...`
   - `dot = (x, y) => ...`
   - Local constants: `s`, `maxH`, `ov`, `top`, `sel`, `selCell`, `svg`, `cols`, `colHeights`, `colX`, `col0H`, `lastColH`.
4. Outer Lexical Closures:
   - Does NOT reference `state`.
   - Does NOT reference `el`.
   - Does NOT reference `document` or `window`.
   - Does NOT reference any `editorView` local variables (`id`, `undo`, `redo`, `saveTimer`, `snapshot`, `pushUndo`, `commit`, `restore`, `viewer`, `refresh`).

### 1.5 Call Site Inside `editorView`
Lines 867–871 of `public/js/app.js`:
```javascript
867:   function drawCanvas() {
868:     const s = layout.settings;
869:     const svg = buildCanvasSvg(state.project, layout, state.selected);
870:     const el = $('#canvas');
871:     el.innerHTML = svg;
```
`drawCanvas()` already explicitly passes `state.project`, `layout`, and `state.selected`.

### 1.6 Headless Runtime Discovery: Module-End Router Call
In `public/js/app.js` line 1595:
```javascript
1595: if (typeof window !== 'undefined') route();
```
In `test/stepped_2d_editor.test.js` lines 8–33:
```javascript
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    getElementById() { return null; },
    ...
  };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
    location: { hash: '' },
  };
}
```
When `globalThis.window` is defined in Node.js test suites, line 1595 executes `route()`.
Inside `route()` (lines 122–132):
`fetchSession()` catches `localStorage`/network rejection and returns `null`.
`route()` then calls `authView()` (lines 150–153), which executes `$app.innerHTML = ...`.
Because `document.getElementById('app')` returns `null`, `$app` is `null`.
Without a guard on line 1595 or inside `route()`, this triggers `TypeError: Cannot set properties of null (setting 'innerHTML')` as an unhandled promise rejection.

---

## 2. Logic Chain

1. **ECMA-262 Module Grammar**: Under the ECMAScript Standard (ECMA-262 §16.2.3), `ExportDeclaration` is exclusively a `ModuleItem`. Inside a `FunctionDeclaration`, statements are parsed as `StatementListItem`, which forbids `ExportDeclaration`. Placing `export` at lines 769, 776, 787 inside `editorView` produces an unavoidable static parse error (`SyntaxError: Unexpected token 'export'`) in any standard engine prior to execution.
2. **Elimination of SyntaxError via Hoisting**: Hoisting `calculateTopBorderDrag`, `simulateTopBorderDrag`, and `buildCanvasSvg` to the module top level (e.g. right before line 681) converts all three into valid top-level `ExportDeclaration`s. Both Node.js ESM parser and Browser `<script type="module">` parser will parse `public/js/app.js` cleanly with zero SyntaxErrors.
3. **Purity and Independence of `buildCanvasSvg`**: The identifier audit in Observation 1.4 confirms that `buildCanvasSvg` relies exclusively on its three formal parameters `(project, layout, selected = null)` and the module-level import `M`. It has zero closures over `state`, `el`, or other `editorView` variables.
4. **Invocation Invariance**: In `drawCanvas()` (line 869), the call is already `buildCanvasSvg(state.project, layout, state.selected)`. Because `buildCanvasSvg` at module scope is accessible to nested functions, this call continues to function with identical semantics and zero modifications needed at the call site.
5. **Headless Safety Guard**: When Node tests mock `window`, `if (typeof window !== 'undefined') route();` evaluates to true. Guarding line 1595 with `if (typeof window !== 'undefined' && $app) route();` and/or adding `if (!$app) return;` at the beginning of `route()` guarantees that `route()` executes only in browser environments where `<div id="app"></div>` is present, eliminating headless unhandled promise rejections.

---

## 3. Caveats

1. **Read-Only Protocol**: In accordance with the Explorer mandate, no project source code was modified during this investigation. Implementation must be carried out by Worker M2.
2. **Three.js Resolution**: In Node.js, `node_modules/three/package.json` specifies `"exports": { "./addons/*": "./examples/jsm/*" }`. In browser, `public/index.html` specifies `<script type="importmap">`. Both resolve `three/addons/` identically, confirming full cross-runtime compatibility.
3. **No other closures**: Spot-checking `calculateTopBorderDrag` and `simulateTopBorderDrag` confirmed that both are pure arithmetic and model-mutation helpers with no outer closures.

---

## 4. Conclusion

1. **Feasibility and Correctness**: Hoisting `calculateTopBorderDrag`, `simulateTopBorderDrag`, and `buildCanvasSvg` to module top level in `public/js/app.js` is 100% syntactically valid and completely resolves the forensic auditor's rejection.
2. **Closure Safety**: `buildCanvasSvg` is completely decoupled from `state`, `el`, and DOM elements. Its current parameter signature `(project, layout, selected = null)` is already perfectly tailored to both test suite imports and `drawCanvas()` call sites.
3. **Headless Execution Guard (Crucial Recommendation for Worker M2)**: To ensure that Node.js test suites do not crash on unhandled promise rejections due to mocked `globalThis.window`, Worker M2 should also guard the auto-route trigger at line 1595:
   ```javascript
   if (typeof window !== 'undefined' && $app) route();
   ```
   and add `if (!$app) return;` at the start of `async function route()`.

### Concrete Proposed Code Placement for Worker M2:

#### A. Place at Module Top Level (e.g. before line 681, right before `/* ---------------- Editor ---------------- */`):
```javascript
/* ---------------- 2D Canvas SVG Builder & Stepped Drag Handlers ---------------- */

export function calculateTopBorderDrag(startH, deltaH, thickness = 18, childCount = 1) {
  const childMin = 2 * thickness + childCount * 50 + (childCount - 1) * thickness;
  const minH = Math.max(200, 2 * thickness + 50, childMin);
  const maxH = 4000;
  return Math.round(Math.min(maxH, Math.max(minH, startH + deltaH)));
}

export function simulateTopBorderDrag(project, colIdx, deltaH) {
  const col = project.columns[colIdx];
  if (!col) return null;
  const t = project.settings?.thickness || 18;
  const startH = (typeof col.height === 'number' && col.height > 0) ? col.height : (project.settings?.height || 1400);
  const childCount = col.root?.type === 'multiple' && col.root?.dir === 'v' ? (col.root.children?.length || 1) : 1;
  const newH = calculateTopBorderDrag(startH, deltaH, t, childCount);
  col.height = newH;
  return newH;
}

export function buildCanvasSvg(project, layout, selected = null) {
  const s = layout.settings;
  const maxH = layout.maxH || Math.max(...project.columns.map((c) => (typeof c.height === 'number' && c.height > 0 ? c.height : s.height)), s.height);
  const ov = s.overhang;
  const top = maxH + ov;
  const Y = (y, sy) => top - (y + sy);
  const sel = selected;
  const selCell = sel && layout.cells[sel];
  let svg = `<svg viewBox="${-120} ${-110} ${layout.totalW + 240} ${maxH + 2 * ov + 200}" preserveAspectRatio="xMidYMid meet">
    <defs><pattern id="hatch" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="60" height="60" fill="#ffb800"/><rect width="30" height="60" fill="#111"/></pattern></defs>`;
  // celdas hoja (clic)
  Object.values(layout.cells).forEach((c) => {
    const isLeaf = c.type !== 'multiple' || !M.find(project, c.id)?.node?.children?.length;
    if (isLeaf) svg += `<rect class="cell" data-id="${c.id}" x="${c.x}" y="${Y(c.y, c.h)}" width="${c.w}" height="${c.h}" fill="#151312" style="fill:#151312"/>`;
  });
  // piezas frontales
  layout.pieces.forEach((p) => {
    if (p.kind === 'drawer' || p.kind === 'back') return;
    const isF = p.kind === 'front' || p.kind === 'door-front';
    const fill = isF ? '#ffb800' : p.kind === 'rail' ? '#d4d7dc' : '#6e6763';
    svg += `<rect x="${p.x}" y="${Y(p.y, p.sy)}" width="${p.sx}" height="${p.sy}" fill="${fill}" pointer-events="none"/>`;
    if (isF) {
      const r = s.pullDia / 2;
      const top0 = Y(p.y, p.sy);
      const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#222" pointer-events="none"/>`;
      const edgeX = p.side === 'right' ? p.x + p.sx - s.pullInset : p.x + s.pullInset;
      if (p.pull === 'profile') {
        svg += `<rect x="${p.x}" y="${top0}" width="${p.sx}" height="14" fill="#222" pointer-events="none"/>`;
      } else if (p.holeLayout === 'v') {
        const midY = top0 + p.sy / 2;
        if (p.holes === 2) svg += dot(edgeX, midY - s.pullGap / 2) + dot(edgeX, midY + s.pullGap / 2);
        else if (p.holes === 1) svg += dot(edgeX, midY);
      } else {
        const cx = p.x + p.sx / 2;
        const cy = top0 + s.pullInset;
        if (p.holes === 2) svg += dot(cx - s.pullGap / 2, cy) + dot(cx + s.pullGap / 2, cy);
        else if (p.holes === 1) svg += dot(cx, cy);
      }
    }
  });
  // transparentes para clic sobre frentes
  Object.values(layout.cells).forEach((c) => {
    const isLeaf = c.type !== 'multiple' || !M.find(project, c.id)?.node?.children?.length;
    if (isLeaf) svg += `<rect class="cell" data-id="${c.id}" x="${c.x}" y="${Y(c.y, c.h)}" width="${c.w}" height="${c.h}" style="fill:transparent"/>`;
  });
  if (selCell) svg += `<rect x="${selCell.x}" y="${Y(selCell.y, selCell.h)}" width="${selCell.w}" height="${selCell.h}" fill="url(#hatch)" opacity="0.85" pointer-events="none"/>`;
  // Divisores arrastrables para cambiar tamaño interactivamente
  (layout.dividers || []).forEach((d, idx) => {
    const isV = d.axis === 'v'; // divisor horizontal que se arrastra en vertical Y
    const cursor = d.cursor || (isV ? 'ns-resize' : 'ew-resize');
    const pad = 8;
    const rx = isV ? d.x : d.x - pad;
    const ry = isV ? Y(d.y, d.h) - pad : Y(d.y, d.h);
    const rw = isV ? d.w : d.w + 2 * pad;
    const rh = isV ? d.h + 2 * pad : d.h;
    const extraClass = d.type === 'col-top' ? ' col-top-handle' : '';
    svg += `<rect class="drag-handle${extraClass}" data-didx="${idx}" x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="transparent" style="cursor:${cursor};pointer-events:all;"/>`;
  });
  // botones +
  const plus = (cx, cy, act, data) =>
    `<g class="plus" data-act="${act}" ${data}><circle cx="${cx}" cy="${cy}" r="30" fill="#ffb800"/><text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="44" font-weight="700" fill="#111">+</text></g>`;
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
  const col0H = colHeights[0] || (typeof cols[0]?.height === 'number' && cols[0].height > 0 ? cols[0].height : s.height);
  const lastColH = colHeights[cols.length - 1] || (typeof cols[cols.length - 1]?.height === 'number' && cols[cols.length - 1].height > 0 ? cols[cols.length - 1].height : s.height);
  svg += plus(-70, top - col0H / 2, 'colLeft', '');
  svg += plus(layout.totalW + 70, top - lastColH / 2, 'colRight', '');
  svg += '</svg>';
  return svg;
}
```

#### B. Remove lines 769–865 from inside `editorView`.

#### C. In `public/js/app.js`:
Add protective `$app` guards:
```javascript
// At line 122:
async function route() {
  if (!$app) return;
  ...
}

// At line 1595:
if (typeof window !== 'undefined' && $app) route();
```

---

## 5. Verification Method

1. **Syntax Check**:
   Validate that `public/js/app.js` parses cleanly without `SyntaxError`:
   ```bash
   node --check public/js/app.js
   ```
2. **Execute Milestone 2 Stepped 2D Editor Test Suite**:
   ```bash
   node --test test/stepped_2d_editor.test.js
   ```
   Expect all 8 suites to pass with 0 failures:
   - Dynamic SVG viewBox
   - Distinct (+) buttons floating 50mm above each column top cap
   - `col-top` divider drag handles with `ns-resize`
   - Clamping bounds ($H_{min} \ge 200$, $H_{max} \le 4000$)
   - `simulateTopBorderDrag` modifying only target column
   - Undo/redo stack preservation
   - `addOnTop(..., false)` single-column elevation
   - Internal horizontal divider 50mm clearance
3. **Execute Challenger Drag and SVG Test Suites**:
   ```bash
   node --test test/m2_challenger_drag_stepped.test.js
   node --test test/m2_challenger_svg_stepped.test.js
   ```
   Expect 100% pass across all adversarial cycles.
4. **Browser Runtime Verification**:
   Load `public/index.html` via static web server or express server:
   - Check browser developer console: zero `Uncaught SyntaxError`.
   - Verify `<div id="app">` initializes and renders the login/dashboard/editor view smoothly.
