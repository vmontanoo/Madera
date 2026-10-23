# Investigation Report: App.js Module Export Scoping & Hoisting Blueprint

**Explorer**: Explorer M2-IT2-1 (App.js Module Export Scoping Investigation)  
**Target File**: `public/js/app.js`  
**Reference Patch**: `.agents/teamwork_preview_explorer_m2_it2_1/app_module_export_scoping.patch`  
**Status**: Ready for Implementation  

---

## 1. Observation

### 1.1 Forensic Audit Evidence
From `.agents/teamwork_preview_auditor_m2_stepped_1/handoff.md` (§ 1 & § 2.1):
The Forensic Auditor issued an **INTEGRITY VIOLATION** due to illegal ES module export declarations nested inside function scope in `public/js/app.js`.

### 1.2 Empirical Lexical Scoping in `public/js/app.js`
1. `editorView` begins at line 682:
   ```javascript
   681: /* ---------------- Editor ---------------- */
   682: async function editorView(id) {
   683:   let rec;
   684:   try {
   685:     rec = await api('GET', '/api/projects/' + id);
   ```
   and terminates at line 1593:
   ```javascript
   1592:   refresh();
   1593: }
   ```
2. At lines 769, 776, and 787 (strictly inside the function body of `editorView`), three functions are declared with the `export` keyword:
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
   ...
   863:   svg += '</svg>';
   864:   return svg;
   865: }
   ```
3. Immediately following line 865, `editorView` defines `drawCanvas()` at line 867:
   ```javascript
   867:   function drawCanvas() {
   868:     const s = layout.settings;
   869:     const svg = buildCanvasSvg(state.project, layout, state.selected);
   870:     const el = $('#canvas');
   ```
4. In the drag event handler inside `drawCanvas()` at lines 926–934:
   ```javascript
   926:           const onMouseMove = (moveEvt) => {
   927:             hasMoved = true;
   928:             const curPt = getSvgCoords(moveEvt);
   929:             // En SVG, mover hacia arriba disminuye curPt.y, lo que aumenta la altura del mueble
   930:             const deltaH = startPt.y - curPt.y;
   931:             const newH = Math.round(Math.min(maxH, Math.max(minH, startH + deltaH)));
   932:             col.height = newH;
   933:             refresh();
   934:           };
   ```
   Line 931 implements inline clamping identical to `calculateTopBorderDrag(startH, deltaH, t, childCount)`.

5. Preceding lines around 670–682:
   ```javascript
   670:     btnOut.onclick = async () => {
   671:       try {
   672:         await api('POST', '/api/auth/logout').catch(() => api('POST', '/api/logout'));
   673:       } catch {}
   674:       localStorage.removeItem('madera_token');
   675:       currentUser = null;
   676:       route();
   677:     };
   678:   }
   679: }
   680: 
   681: /* ---------------- Editor ---------------- */
   682: async function editorView(id) {
   ```
   Line 679 closes `dashboardView()`. Line 680 is an empty line at the top level of the module. Line 681 is comment header `/* ---------------- Editor ---------------- */`.

6. Downstream imports in test suites:
   `test/stepped_2d_editor.test.js` (lines 36–40), `test/m2_challenger_drag_stepped.test.js` (lines 54–58), and `test/m2_challenger_svg_stepped.test.js` (lines 37–41) all import:
   ```javascript
   import {
     buildCanvasSvg,
     calculateTopBorderDrag,
     simulateTopBorderDrag,
   } from '../public/js/app.js';
   ```

---

## 2. Logic Chain

1. **Step 1 (Grammar Specification)**: Under ECMA-262 § 16.2.3, `export` declarations are strictly `ModuleItem` productions. A `FunctionBody` produces `StatementListItem`, which forbids `ExportDeclaration`. V8 and browser module parsers reject nested exports unconditionally prior to code execution with `SyntaxError: Unexpected token 'export'`.
2. **Step 2 (Scope Dependency Verification)**:
   - `calculateTopBorderDrag(startH, deltaH, thickness, childCount)` is completely pure; it relies solely on `Math` built-ins and parameters.
   - `simulateTopBorderDrag(project, colIdx, deltaH)` relies on its parameters and calls `calculateTopBorderDrag`. It accesses no outer closure variables.
   - `buildCanvasSvg(project, layout, selected = null)` operates strictly on its passed arguments, standard JS primitives, and module-level import `M` (`import * as M from './model.js'`, line 2). It references neither `state`, `undo`, `redo`, `$`, nor any other variable inside `editorView`.
3. **Step 3 (Placement Resolution)**:
   - Line 680 (between `dashboardView` at line 679 and `editorView` at line 682) is module top level.
   - All module imports (`M`, `computeLayout`, `DEFAULTS`, etc.) are declared at lines 1–5, preceding line 680.
   - Placing `calculateTopBorderDrag`, `simulateTopBorderDrag`, and `buildCanvasSvg` at module top level right before line 681 satisfies the ECMA-262 grammar without altering module evaluation order.
4. **Step 4 (Internal Callability from `editorView`)**:
   - In ECMAScript lexical scoping, module top-level declarations enclose functions declared within the module.
   - `editorView` and its inner functions (`drawCanvas`, drag listeners) have direct, unobstructed lexical access to top-level functions `buildCanvasSvg` and `calculateTopBorderDrag`.
   - In `drawCanvas()`, `buildCanvasSvg(state.project, layout, state.selected)` (line 869) calls the top-level function directly.
   - In `onMouseMove` (line 931), calling `calculateTopBorderDrag(startH, deltaH, t, childCount)` directly invokes the hoisted helper and guarantees exact formula parity.

---

## 3. Caveats

- **No Closure Variables Needed**: No closures from `editorView` need to be passed down or re-bound; the three functions were already written with explicit parameter lists (`project, layout, selected` and `project, colIdx, deltaH`).
- **Read-Only Explorer Scope**: In accordance with the Explorer archetype rules, no source files were directly edited. All concrete changes have been formatted into `.agents/teamwork_preview_explorer_m2_it2_1/app_module_export_scoping.patch` and documented below for Worker M2.
- No other caveats.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Summary of Changes
1. **Move Definitions to Top Level**: Relocate `calculateTopBorderDrag`, `simulateTopBorderDrag`, and `buildCanvasSvg` from lines 769–865 to line 680 (before `/* ---------------- Editor ---------------- */`).
2. **Remove Illegal Nested Exports**: Delete lines 769–865 from inside `editorView`.
3. **Clean Drag Handler Call**: In `drawCanvas()`, replace line 931 inline clamping with `calculateTopBorderDrag(startH, deltaH, t, childCount)` for consistent code reuse.

### 4.2 Exact Code Snippets (Before -> After)

#### Chunk 1: Module Top Level (Line 678–682)
**Before**:
```javascript
678:   }
679: }
680: 
681: /* ---------------- Editor ---------------- */
682: async function editorView(id) {
```

**After**:
```javascript
  }
}

/* ---------------- 2D Canvas & Editor Math Helpers ---------------- */
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

/* ---------------- Editor ---------------- */
async function editorView(id) {
```

#### Chunk 2: Inside `editorView` (Line 766–870)
**Before**:
```javascript
  const fmtMoney = (v) => state.project.settings.currency + v.toFixed(2);
  const m3 = (mm) => (mm / 1000).toFixed(3).replace(/\.?0+$/, '') || '0';

export function calculateTopBorderDrag(startH, deltaH, thickness = 18, childCount = 1) {
  ...
  return svg;
}

  function drawCanvas() {
    const s = layout.settings;
    const svg = buildCanvasSvg(state.project, layout, state.selected);
    const el = $('#canvas');
```

**After**:
```javascript
  const fmtMoney = (v) => state.project.settings.currency + v.toFixed(2);
  const m3 = (mm) => (mm / 1000).toFixed(3).replace(/\.?0+$/, '') || '0';

  function drawCanvas() {
    const s = layout.settings;
    const svg = buildCanvasSvg(state.project, layout, state.selected);
    const el = $('#canvas');
```

#### Chunk 3: Inside `drawCanvas` `onMouseMove` (Line 928–935)
**Before**:
```javascript
            const deltaH = startPt.y - curPt.y;
            const newH = Math.round(Math.min(maxH, Math.max(minH, startH + deltaH)));
            col.height = newH;
            refresh();
```

**After**:
```javascript
            const deltaH = startPt.y - curPt.y;
            const newH = calculateTopBorderDrag(startH, deltaH, t, childCount);
            col.height = newH;
            refresh();
```

---

## 5. Verification Method

1. **Static Syntax Parse Verification**:
   Inspect `public/js/app.js` to ensure zero `export` statements exist within any function block.
2. **Execution Verification (Node.js Test Runner)**:
   Run:
   ```bash
   node --test test/stepped_2d_editor.test.js
   node --test test/m2_challenger_drag_stepped.test.js
   node --test test/m2_challenger_svg_stepped.test.js
   ```
   All test suites must parse `public/js/app.js` cleanly and pass 100% without `SyntaxError`.
3. **Browser Verification**:
   Load `public/index.html` via static web server. Verify the browser console exhibits zero `Uncaught SyntaxError` errors, the UI loads properly, and `#p/<id>` editor view renders the SVG silhouette and handles top border drag operations without runtime exceptions.
4. **Invalidation Condition**:
   If any `export` keyword remains inside `editorView` or any other function scope, or if `drawCanvas` fails with `ReferenceError: buildCanvasSvg is not defined`, the remediation is invalid.
