# Handoff Report: Tabular Presentation, Cutlist Math & Print Formatting (M4-2)

**Agent**: Explorer M4-2 (Tabular Presentation & Print Explorer)  
**Date**: 2026-10-23T07:31:00Z  
**Target Milestone**: Milestone 4 (Despiece Tabular y Hoja de Corte — R4)  
**Parent Conversation ID**: `20a52755-88ff-4e04-950c-4b4a3c054fe0`  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m4_2`  
**Project Root**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local`

---

## 1. Observation

### 1.1 Source Files & Exact Code References

#### A. Cutlist Rendering in `public/js/app.js` (lines 1301–1483)
- `drawCutlist()` extracts `cl = layout.cutlist`, `s = layout.settings`, and `cur = s.currency || '$'`.
- **Print Header** (lines 1309–1322):
  ```javascript
  <div class="print-header">
    <div class="print-header-top">
      <h1 class="print-title">${esc(state.name || 'Mueble modular')} — Hoja de Corte</h1>
      <div class="print-header-total">
        <span class="print-total-label">PRECIO TOTAL:</span>
        <span class="print-total-val">${fmtMoney(cl.total)}</span>
      </div>
    </div>
    <div class="print-meta">
      <span><b>Dimensiones generales:</b> ${layout.totalW} × ${s.height} × ${s.depth} mm</span>
      <span class="sep">·</span>
      <span><b>Fecha:</b> ${dateStr}</span>
    </div>
  </div>
  ```
  *Observation*: In stepped modular furniture with staggered column heights, line 1318 uses `${s.height}` (the project default height, e.g. 1400mm) instead of `layout.maxH` (e.g. 1600mm or 2000mm, the actual bounding height calculated by `computeLayout`).
- **Panels Cutlist Table** (lines 1330–1368):
  - Table ID: `cutlistTable`, class: `cutlist-table`.
  - Columns: ID (`r.id`), Pieza / Rol (`r.name (r.role)`), Orientación (`r.orientation`), Largo (mm) (`r.length`), Ancho (mm) (`r.width`), Espesor (mm) (`r.thickness`), Cant. (`r.qty`), Precio unit. (`fmtMoney(r.unitPrice)`), Precio total (`fmtMoney(r.total)`).
  - All numerical columns have `.n` class for right alignment and tabular numeric alignment.
  - Table footer `<tfoot>` computes subtotal area and panels total:
    `<td colspan="7">Subtotal Paneles (${cl.area.toFixed(2)} m²)</td><td colspan="2" class="n">${fmtMoney(cl.panelsTotal)}</td>`.
- **Hardware Table** (lines 1370–1398):
  - Table ID: `hardwareTable`, class: `hardware-table`.
  - Columns: Herraje (`r.name`), Cantidad (`r.qty`), Precio unit. (`fmtMoney(r.unitPrice)`), Precio total (`fmtMoney(r.total)`).
  - Footer `<tfoot>`: Subtotal Herrajes -> `fmtMoney(cl.hardwareTotal)`.
- **Machining Operations Table** (lines 1400–1429):
  - Section ID: `machiningSection`, class: `machining-section`, table ID: `machiningTable`.
  - Columns: Operación / Mecanizado, Pieza / Cara, Especificación, Detalle.
  - Toggled interactively via checkbox `#mach` (`state.showMach`), but forced visible in `@media print`.
- **Grand Total Banner** (lines 1431–1446):
  - Container class: `print-grand-total`.
  - Displays: Subtotal Paneles / Piezas (`cl.panelsTotal`), Subtotal Herrajes y Accesorios (`cl.hardwareTotal`), and PRECIO TOTAL DEL PROYECTO (`cl.total`).
- **Interactive Sync with 3D Preview Cards** (lines 1448–1460):
  - In screen cutlist mode, selecting any row in `#cutlistTable` (`tr[data-id]`) or card in `#cards` (`.pcard[data-id]`) updates `state.cutSel = r.id`, which highlights the row in yellow (`#ffb800`) and promotes the card to `.pcard.big.sel`.
- **Print Action** (lines 1479–1482):
  - Button `#print` directly calls `window.print()`.

#### B. Currency Formatting `fmtMoney` in `public/js/app.js` (line 866)
- Existing implementation:
  ```javascript
  const fmtMoney = (v) => state.project.settings.currency + v.toFixed(2);
  ```
  *Observation*: If `state.project.settings.currency` is omitted or `v` is null/undefined/NaN, it produces string concatenation issues like `undefined12.34` or throws a TypeError.

#### C. Pricing Mathematics & Invariants in `public/js/layout.js` (lines 419–513)
- `buildCutlist(pieces, s, hw)` calculates:
  ```javascript
  const panelsTotal = rows.reduce((a, r) => a + r.total, 0);
  const hardwareTotal = hardware.reduce((a, r) => a + r.total, 0);
  const area = rows.reduce((a, r) => a + r.unitArea * r.qty, 0);
  return { rows, machining, hardware, panelsTotal, hardwareTotal, total: panelsTotal + hardwareTotal, area, m2: area };
  ```
- *Observation*: `total` is strictly computed as `panelsTotal + hardwareTotal`.
- Laterals of unequal heights (e.g. 840mm vs 1640mm in stepped columns) have distinct keys `[role, p.name, ori.o, w, h, T].join('|')` due to differing `h`, guaranteeing independent itemized cutlist rows.
- Top caps of differing column widths have differing `w`, guaranteeing independent itemized rows.

#### D. CSV Export in `public/js/layout.js` (lines 515–524)
- `cutlistCSV(cl, currency = '$')`:
  ```javascript
  export function cutlistCSV(cl, currency = '$') {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = [['Pieza', 'Material', 'Largo mm', 'Ancho mm', 'Espesor mm', 'Cantidad', 'Precio unit.', 'Total'].map(q).join(',')];
    cl.rows.forEach((r) =>
      lines.push([r.name, r.mat, r.length, r.width, r.thickness, r.qty, r.unitPrice.toFixed(2), r.total.toFixed(2)].map(q).join(','))
    );
    cl.hardware.forEach((r) => lines.push([r.name, 'herraje', '', '', '', r.qty, r.unitPrice.toFixed(2), r.total.toFixed(2)].map(q).join(',')));
    lines.push(['TOTAL (' + currency + ')', '', '', '', '', '', '', cl.total.toFixed(2)].map(q).join(','));
    return lines.join('\n');
  }
  ```
- In `public/js/app.js` (lines 1471–1477):
  ```javascript
  const blob = new Blob([cutlistCSV(cl, cur)], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (state.name || 'mueble') + '-cutlist.csv';
  a.click();
  ```
  *Observation*: Windows Excel defaults to ANSI unless a UTF-8 BOM (`\uFEFF`) is present; without it, Spanish characters with accents (e.g. "Espesor", "Perforación", "m²") can show character corruption in Excel.

#### E. Print Stylesheet `@media print` in `public/style.css` (lines 75–325)
- **Hiding UI Chrome & 3D / 2D Canvas**:
  Lines 114–137 hide all non-printable elements:
  `#canvas, .canvas, #designPane, .topbar, .dock, #dock, .btns, .rtools, .cards, #cards, .vwr, #vwr, .right, .tabs, .btn, button, input, select, label, .modal-bg, .modal, svg { display: none !important; }`.
- **Cutlist Container Display**:
  Lines 102–111 explicitly set `#cutlist` to `display: block !important; overflow: visible !important; width: 100% !important; margin: 0 !important; padding: 0 !important;`.
- **Page Break Rules**:
  - `table { page-break-inside: auto !important; break-inside: auto !important; }`
  - `thead { display: table-header-group !important; }` (repeats headers on each page)
  - `tfoot { display: table-footer-group !important; }`
  - `tr { page-break-inside: avoid !important; break-inside: avoid !important; }` (prevents row splitting)
  - `h1, h2, h3, h4, h5, h6 { page-break-after: avoid !important; break-after: avoid !important; }`
  - `.print-grand-total { page-break-inside: avoid !important; break-inside: avoid !important; }`
- **Selection Highlight Removal**:
  Lines 214–224 strip yellow selection colors from `tr[data-id]` for black & white printing.
- **Machining Operations**:
  Lines 291–294 force `#machiningSection, .machining-section { display: block !important; }` in print mode.

---

## 2. Logic Chain

1. **Stepped Dimensions in Print Header**:
   - *Observation*: In `computeLayout`, `layout.maxH` is derived from `Math.max(...colHeights)` (e.g. 1600mm), whereas `s.height` remains the initial default (e.g. 1400mm).
   - *Logic*: In `drawCutlist()`, displaying `${layout.totalW} × ${s.height} × ${s.depth} mm` misreports the cabinet height for stepped furniture.
   - *Deduction*: Updating line 1318 to `${layout.totalW} × ${layout.maxH || s.height} × ${s.depth} mm` accurately reflects the stepped furniture geometry across all columns.

2. **Mathematical Pricing Consistency**:
   - *Observation*: `test/cutlist_print.test.js` (M3.3.1) and `test/cutlist_stress_adversarial.test.js` strictly verify `cutlist.panelsTotal + cutlist.hardwareTotal === cutlist.total`.
   - *Logic*: In `buildCutlist`, `total` is constructed directly as `panelsTotal + hardwareTotal`.
   - *Deduction*: Because both subtotals are preserved in full precision and formatted at presentation time with `.toFixed(2)`, IEEE-754 precision is preserved.
   - *Refinement*: `fmtMoney` should defensively handle undefined/null currencies and numbers: `(state.project?.settings?.currency || DEFAULTS.currency || '$') + Number(v || 0).toFixed(2)`.

3. **Print Layout Robustness**:
   - *Observation*: Screen mode sets `.left { min-width: 380px; }`.
   - *Logic*: On standard 8.5"x11" or A4 paper with margins, any fixed `min-width` could produce horizontal clipping if print margins are wide.
   - *Deduction*: In `style.css` `@media print`, adding `min-width: 0 !important;` to `.left` ensures complete responsiveness to printer margins.

4. **CSV Export Parity & Excel Compatibility**:
   - *Observation*: `cutlistCSV` creates valid comma-separated text.
   - *Logic*: Microsoft Excel on Windows interprets CSV files without a byte order mark as CP1252/ANSI, leading to garbled accents.
   - *Deduction*: Writing `'\uFEFF' + cutlistCSV(cl, cur)` into the Blob with type `text/csv;charset=utf-8;` guarantees flawless Excel rendering without altering unit test assertions on `cutlistCSV` output.

---

## 3. Caveats

- **No Source Code Direct Edits**: As an explorer subagent, no modifications were made directly to `public/js/app.js` or `public/style.css`.
- **DOM Test Execution in Terminal**: Interactive terminal permission checks time out in this subagent sandbox, so code verification was performed via static code analysis of existing unit tests (`test/cutlist_print.test.js` and `test/cutlist_stress_adversarial.test.js`).
- **Browser-Specific Print Dialogs**: While CSS `@media print` rules adhere strictly to CSS Paged Media standards (repeating `thead`, `break-inside: avoid`), actual page breaks depend on user-selected paper size (Letter vs A4) and printer margins.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 Implementation Blueprint for `public/js/app.js`

#### Change 1: Accurate Stepped Dimensions & Defensive `fmtMoney`
- **File**: `public/js/app.js`
- **Location**: Line 866 and line 1318

**Before (Line 866)**:
```javascript
const fmtMoney = (v) => state.project.settings.currency + v.toFixed(2);
```
**After**:
```javascript
const fmtMoney = (v) => (state.project?.settings?.currency || DEFAULTS.currency || '$') + Number(v || 0).toFixed(2);
```

**Before (Line 1318)**:
```javascript
<span><b>Dimensiones generales:</b> ${layout.totalW} × ${s.height} × ${s.depth} mm</span>
```
**After**:
```javascript
<span><b>Dimensiones generales:</b> ${layout.totalW} × ${layout.maxH || s.height} × ${s.depth} mm</span>
```

#### Change 2: Excel-Compatible CSV Export with UTF-8 BOM
- **File**: `public/js/app.js`
- **Location**: Lines 1471–1477

**Before**:
```javascript
      csvBtn.onclick = () => {
        const blob = new Blob([cutlistCSV(cl, cur)], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (state.name || 'mueble') + '-cutlist.csv';
        a.click();
      };
```
**After**:
```javascript
      csvBtn.onclick = () => {
        const blob = new Blob(['\uFEFF' + cutlistCSV(cl, cur)], { type: 'text/csv;charset=utf-8;' });
        const safeName = (state.name || 'mueble').trim().replace(/[/\\?%*:|"<>]/g, '_');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = safeName + '-cutlist.csv';
        a.click();
      };
```

---

### 4.2 Implementation Blueprint for `public/style.css`

#### Change 1: Responsive Print Reset for `.left`
- **File**: `public/style.css`
- **Location**: Line 89 (inside `@media print`)

**Before**:
```css
  html,
  body,
  #app,
  .editor,
  .left,
  .cutlist {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    position: static !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #000000 !important;
  }
```
**After**:
```css
  html,
  body,
  #app,
  .editor,
  .left,
  .cutlist {
    height: auto !important;
    min-height: 0 !important;
    min-width: 0 !important;
    overflow: visible !important;
    position: static !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #000000 !important;
  }
```

---

## 5. Verification Method

### 5.1 Automated Test Execution
Run the dedicated cutlist and print unit test suites:
```bash
node --test test/cutlist_print.test.js test/cutlist_stress_adversarial.test.js
```

### 5.2 Specific Test Cases to Verify
1. **`test/cutlist_print.test.js`**:
   - `M3.1.1`: `buildCutlist` returns all 10 panel fields with valid types and bounds.
   - `M3.3.1`: `panelsTotal + hardwareTotal === total` arithmetic identity across standard and stepped projects.
   - `M3.4.1` & `M3.4.2`: Exact millimeter dimensions (no fractional meters).
   - `M3.5.2`: Hiding of all 6 non-tabular UI elements (`#canvas`, `.dock`, `.cards`, `.vwr`, `.btns`, `.topbar`).
   - `M3.5.3`: `#cutlist` forced to `display: block !important`.
   - `M3.5.5`: Enforcing `#ffffff` background and `#000000` text in `@media print`.
2. **`test/cutlist_stress_adversarial.test.js`**:
   - `STRESS 1`: Multi-drawer banks (21 drawers) slide and box wall accounting.
   - `STRESS 2`: Door hinges itemization across height thresholds (<=1000mm, 1000–1800mm, >1800mm).
   - `STRESS 6`: Fuzz testing across 50 diverse randomized furniture configurations.
   - `STRESS 10`: CSV serialization parity matching `cutlist.total.toFixed(2)`.
3. **`test/stepped_layout.test.js`**:
   - `Test 11`: Stepped cutlist accounting separates unequal laterals and top caps into individual tabular rows.

### 5.3 Invalidation Conditions
- Any failure in `npm test` or assertion failure in `cutlist.panelsTotal + cutlist.hardwareTotal !== cutlist.total`.
- Presence of interactive canvas, 3D viewer, or buttons in print preview (`Ctrl + P`).
- Accidental omission of machining operations table in printable document.
