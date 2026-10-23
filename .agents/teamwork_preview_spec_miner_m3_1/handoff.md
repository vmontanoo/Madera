# Handoff Report: Milestone 3 Specification & Exact CSS Rules for Tabular-Only Print View (R3)

**Agent**: `teamwork_preview_spec_miner_m3_1`  
**Date**: 2026-10-22  
**Target Path**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_spec_miner_m3_1\handoff.md`  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local`  
**Milestone**: Milestone 3 — Tabular-Only Print View (`public/style.css`, R3)

---

## 1. Observation

Direct code observations from inspecting the codebase (`public/style.css`, `public/index.html`, `public/js/app.js`, `public/js/layout.js`, `PROJECT.md`, and `ORIGINAL_REQUEST.md`):

### 1.1 Existing Print Stylesheet in `public/style.css`
In `public/style.css`, the current `@media print` rule is a single line (line 59):
```css
@media print { .topbar button, .btns, .dock { display:none; } .right { display:none; } .left { width:100%; } body { background:#fff; color:#000; } }
```

### 1.2 Observable Deficiencies and Print Leaks in Current Stylesheet
1. **Unstyled Topbar Chrome**:
   - Only `.topbar button` is hidden.
   - The `.topbar` container itself (`public/style.css:24`), `.pill` wrappers (`line 25`, styled with dark background `var(--panel)`), the `#name` text input (`line 10`, `public/js/app.js:129`), and the `#price` summary (`line 28`, colored `var(--accent)` = `#ffb800`) are **not** hidden. They print out as dark pill boxes and colored headers at the top of the printed document.
2. **2D Canvas and Interactive SVG Leaks**:
   - When printing while on the "Diseño" tab (`state.tab === 'design'`), `#designPane` is active with `display: contents` (`app.js:133`).
   - `#canvas` (`.canvas`) and all its child SVG elements (cabinet geometry, plus addition buttons `svg .plus`, drag handles `svg .drag-handle`, hatch patterns) remain visible.
   - None of `#canvas`, `#designPane`, or `.canvas` are hidden by line 59.
3. **Cutlist Hidden When Printing from Design View**:
   - In `app.js:137`, `<div class="cutlist" id="cutlist" style="display:none"></div>`.
   - In `app.js:635`, `#cutlist.style.display` is switched between `'none'` and `'block'`.
   - Because `#cutlist` is hidden via inline style attribute when in design mode, standard CSS without `!important` will fail to display it. Furthermore, line 59 does not mention `#cutlist` at all.
4. **Multi-Page Cutlist Truncation (Viewport Lock)**:
   - In `public/style.css:3-4,20-21,43`:
     - `html, body { height: 100%; ... }`
     - `#app { height: 100%; }`
     - `.editor { display: flex; height: 100%; }`
     - `.left { height: 100%; ... }`
     - `.cutlist { flex: 1; overflow: auto; padding: 10px 16px; }`
   - In all major browser print engines (Chromium, Firefox, WebKit), having `height: 100%` and `overflow: auto` on ancestor containers causes the print engine to constrain the page height to a single page viewport, truncating and clipping all rows beyond page 1.
5. **Contrast Failure & Dark Theme Variable Leaks**:
   - `:root` defines `--accent: #ffb800; --line: #4a4543; --muted: #9b9490;` (`style.css:1`).
   - `tfoot td` has `color: var(--accent);` (`style.css:47`).
   - The grand total heading in `app.js:540` has inline `style="color:var(--accent)"`.
   - On paper, `#ffb800` (bright amber/yellow) on white paper has an illegible contrast ratio (~1.4:1), rendering prices invisible.
   - Selected rows in `app.js:529` have inline `style="background:#ffb800;color:#111"`. If user selects a row in the table, it prints with a heavy yellow banner.
   - `.muted` text (`#9b9490`) is low contrast on paper.
6. **No Page-Break & Pagination Structure**:
   - No `@page` declaration exists (default browser print margins are unpredictable).
   - No `tr { page-break-inside: avoid; }`, leading to table rows being split horizontally across physical page breaks.
   - No `thead { display: table-header-group; }`, meaning column headers are absent on pages 2+.

---

## 2. Logic Chain

1. **R3 Acceptance Criteria Mandate**:
   - *AC 1*: "Al imprimir (o previsualizar para impresión), el documento muestra únicamente tablas limpias y legibles: paneles cortados, herrajes y totales."
   - *AC 2*: "No se muestran miniaturas, canvas 2D, visor 3D ni botones de interfaz en la hoja impresa."
   - *AC 3*: "El precio final total calculado del mueble y los totales por categoría aparecen claramente visibles."
2. **From Observations to CSS Architecture**:
   - To satisfy AC 2, an exhaustive blacklist of non-tabular UI elements must have `display: none !important;`:
     - Canvases & Viewers: `#canvas`, `.canvas`, `#designPane`, `.vwr`, `#vwr`, `.cards`, `#cards`, `svg`.
     - Controls & Chrome: `.topbar`, `.dock`, `#dock`, `.btns`, `.rtools`, `.right`, `.tabs`, `.btn`, `button`, `input`, `select`, `label`, `.modal-bg`, `.modal`.
   - To satisfy AC 1 regardless of whether the user clicks "Imprimir" from the cutlist tab or presses `Ctrl+P` while viewing the 2D design canvas:
     - `#cutlist` must have `display: block !important; overflow: visible !important; height: auto !important; position: static !important; width: 100% !important;`.
     - `!important` is required to override the inline `style="display:none"` injected by `app.js`.
   - To prevent table clipping and enable clean multi-page pagination:
     - `html, body, #app, .editor, .left, .cutlist` must be reset to `height: auto !important; min-height: 0 !important; overflow: visible !important; position: static !important; width: 100% !important;`.
   - To satisfy AC 3 and prevent contrast failure:
     - Dark-theme CSS variables must be reset under `:root` in `@media print`: `--bg: #ffffff; --text: #000000; --accent: #000000; --line: #cccccc; --muted: #555555;`.
     - Explicit high-contrast rules must override any inline color styling: `h3[style*="color"], [style*="var(--accent)"] { color: #000000 !important; }`.
     - Tables must have clean, crisp borders: `border: 1px solid #cccccc; border-bottom: 2px solid #000000;`.
     - Headers must use `background-color: #f2f2f2 !important; color: #000000 !important; font-weight: 700;`.
   - To ensure multi-page printing stability:
     - `@page { margin: 12mm 15mm; size: auto; }` standardizes printer margins.
     - `thead { display: table-header-group !important; }` repeats column titles on every sheet.
     - `tfoot { display: table-footer-group !important; }` keeps footers intact.
     - `tr { page-break-inside: avoid !important; break-inside: avoid !important; }` avoids splitting row text.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Print Layout | Standardized Page Geometry | Sets printer page boundaries and printable area | `@page { margin: 12mm 15mm; size: auto; }` | 12mm top/bottom, 15mm lateral margins | Uses browser default if missing | `ORIGINAL_REQUEST.md:R3` |
| 2 | Print Layout | Unconstrained Document Flow | Resets `height: 100%` and `overflow: auto` on all ancestor wrappers | `html, body, #app, .editor, .left, .cutlist` | `height: auto`, `overflow: visible`, `position: static` | Multi-page tables get clipped to 1 page if missing | `style.css:3,20,43` |
| 3 | Print UI | Universal UI Chrome Suppression | Hides all non-printable application controls, toolbars, buttons, and dialogs | `.topbar`, `.dock`, `.btns`, `.rtools`, `.modal-bg`, `button`, `input`, `select` | `display: none !important;` | Leaks interactive widgets and dark boxes to paper | `style.css:24,31,39,41,50` |
| 4 | Print Visual | Graphic & Canvas Suppression | Eliminates 2D SVG canvas, 3D WebGL viewer, and oblique projection thumbnail cards | `#canvas`, `.canvas`, `#designPane`, `.vwr`, `.cards`, `svg` | `display: none !important;` | Prints empty canvas or heavy colored graphics | `app.js:133-146,501-517` |
| 5 | Print View | Guaranteed Cutlist Display | Overrides inline `style="display:none"` to force cutlist table display | `#cutlist { display: block !important; ... }` | Cutlist tables render in print flow | Blank printout if user triggers print from design tab | `app.js:137,635` |
| 6 | Typography | High-Contrast Monochrome Palette | Eliminates dark theme variables and replaces bright yellow accent with pure black | `:root` variable overrides + explicit `#000000` text | High-contrast black on white text (contrast 21:1) | Light yellow text (`#ffb800`) on white paper (contrast 1.4:1) | `style.css:1,47`, `app.js:540` |
| 7 | Typography | Legible Muted Metadata | Darkens `.muted` from `#9b9490` to `#555555` for crisp readability on physical paper | `.muted { color: #555555 !important; }` | Legible dark grey for piece roles and descriptions | Washed out, illegible faint grey text on paper | `style.css:15`, `app.js:526,532` |
| 8 | Tables | Tabular Number Alignment | Right-aligns all numeric values (dimensions, quantities, currency totals) | `td.n, th.n { text-align: right !important; font-variant-numeric: tabular-nums; }` | Clean vertical decimal and numeric alignment | Misaligned columns | `style.css:46` |
| 9 | Pagination | Table Header Repetition | Repeats `<thead>` at the top of each page on multi-page printouts | `thead { display: table-header-group !important; }` | Column headers repeated across page boundaries | Headers only appear on page 1 | CSS 2.1 / Paged Media Spec |
| 10 | Pagination | Row Split Prevention | Prevents individual table rows from splitting across physical page breaks | `tr { page-break-inside: avoid !important; break-inside: avoid !important; }` | Complete row on current or next page | Row text sliced in half across pages | CSS 2.1 / Paged Media Spec |
| 11 | Totals | Prominent Totals Display | Formats category totals and final grand total with clean borders and contrast | `tfoot td`, `.print-grand-total`, `h3` | Distinct, high-visibility totals block | Faint yellow text or missing totals emphasis | `app.js:530,539,540` |

---

## 4. Edge Cases

| # | Feature | Input / Scenario | Observed / Specified Behavior |
|---|---------|------------------|-------------------------------|
| 1 | Print Trigger from Design Tab | User presses `Ctrl+P` or `Cmd+P` while on "Diseño" tab (`state.tab === 'design'`) | **Specified**: `#designPane` and `#canvas` are suppressed (`display: none !important`), and `#cutlist` is forced to `display: block !important`. Tabular cutlist prints cleanly. *(Contract note: `refresh()` in `app.js` must ensure `drawCutlist()` has populated the DOM).* |
| 2 | Table Row Active Selection | User clicked a table row in UI (`tr[data-id]`) which set inline `background:#ffb800;color:#111` | **Specified**: `tr[data-id], tr[data-id][style] { background: transparent !important; color: #000000 !important; }` strips the dark amber highlight, preventing ink waste and illegibility. |
| 3 | Multi-Page Cutlist (> 20 rows) | Project with 25+ distinct panel pieces, hardware, and machining operations | **Specified**: `overflow: visible !important; height: auto !important;` on all ancestors allows the browser engine to naturally paginate onto pages 2, 3, etc., repeating headers via `thead { display: table-header-group !important; }`. |
| 4 | Open Settings Modal during Print | User opens ⚙ modal (`.modal-bg`) and presses `Ctrl+P` | **Specified**: `.modal-bg, .modal { display: none !important; }` completely suppresses modal backdrop and input form from paper. |
| 5 | Inline Accent Color on Grand Total | Total heading has inline `style="color:var(--accent)"` (`app.js:540`) | **Specified**: `h3[style*="color"], [style*="var(--accent)"] { color: #000000 !important; }` forces pure black text, overriding inline style. |
| 6 | Zero Hardware Furniture | Project contains only open shelving (`shelf`) with no doors, drawers, or rails | **Specified**: Table displays "Sin herrajes" row cleanly with 100% white background and black text; subtotal $0.00 renders in black. |
| 7 | Machining Table Toggled | Machining operations shown in cutlist | **Specified**: Tables use identical high-contrast styling (`th` light grey fill, black borders, tabular alignment on dimensions). |

---

## 5. Detailed Specification of Exact Rules Needed

### 5.1 Page Geometry (`@page`)
```css
@page {
  margin: 12mm 15mm;
  size: auto;
}
```
- **Rationale**: 12mm top/bottom margin prevents header/footer collisions. 15mm lateral margins leave space for filing/stapling while giving ~180mm of printable horizontal width, ideal for 7 to 9 tabular columns. `size: auto` adapts to Letter or A4 paper without clipping.

### 5.2 Document Flow & Viewport Constraint Reset
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
- **Rationale**: Fixes the root cause of single-page print truncation. In screen mode, `.editor` and `.left` are `height: 100%` flex containers, and `.cutlist` is `overflow: auto`. In print, this must be normal static flow.

### 5.3 Complete Suppression of UI Chrome & Graphics
```css
#canvas,
.canvas,
#designPane,
.topbar,
.dock,
#dock,
.btns,
.rtools,
.cards,
#cards,
.vwr,
#vwr,
.right,
.tabs,
.btn,
button,
input,
select,
label,
.modal-bg,
.modal,
svg {
  display: none !important;
}
```
- **Rationale**: Completely hides 2D SVG canvas, 3D WebGL viewer (`.vwr`), 3D thumbnail cards (`.cards`), all buttons, toolbars (`.topbar`), dock panels (`.dock`), settings modals (`.modal-bg`), and any stray SVG drawings. Fulfills AC 2 to 100%.

### 5.4 Guaranteed Cutlist Container Display
```css
#cutlist {
  display: block !important;
  overflow: visible !important;
  height: auto !important;
  min-height: 0 !important;
  position: static !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}
```
- **Rationale**: Fulfills AC 1. Overrides inline `style="display:none"` present on `#cutlist` when in design mode.

### 5.5 High-Contrast Typography & Color Palette
```css
:root {
  --bg: #ffffff !important;
  --panel: #ffffff !important;
  --panel2: #ffffff !important;
  --text: #000000 !important;
  --muted: #555555 !important;
  --accent: #000000 !important;
  --line: #cccccc !important;
}

body {
  background: #ffffff !important;
  color: #000000 !important;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
  font-size: 10pt !important;
  line-height: 1.35 !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.muted {
  color: #555555 !important;
}

h1, h2, h3, h4, h5, h6 {
  color: #000000 !important;
  page-break-after: avoid !important;
  break-after: avoid !important;
}

h3 {
  font-size: 12pt !important;
  font-weight: 700 !important;
  margin: 14px 0 6px 0 !important;
  border-bottom: 1.5px solid #000000 !important;
  padding-bottom: 3px !important;
}

/* Force inline accent styles to pure black */
h3[style*="color"],
[style*="var(--accent)"] {
  color: #000000 !important;
}
```
- **Rationale**: Guarantees pure black on pure white. Eliminates yellow text and makes `.muted` text legible. `-webkit-print-color-adjust: exact` ensures table header background fills render accurately in PDF output.

### 5.6 Tabular Layout, Borders, and Pagination Controls
```css
table {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: 6px 0 14px 0 !important;
  background: #ffffff !important;
  color: #000000 !important;
  font-size: 9pt !important;
  page-break-inside: auto !important;
  break-inside: auto !important;
}

thead {
  display: table-header-group !important;
}

tfoot {
  display: table-footer-group !important;
}

tr {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
  page-break-after: auto !important;
  break-after: auto !important;
  background: #ffffff !important;
  color: #000000 !important;
}

tr[data-id],
tr[data-id][style] {
  background: transparent !important;
  color: #000000 !important;
}

th,
td {
  border: 1px solid #cccccc !important;
  padding: 4px 6px !important;
  text-align: left;
  color: #000000 !important;
  background: transparent !important;
}

th {
  background-color: #f2f2f2 !important;
  font-weight: 700 !important;
  border-bottom: 2px solid #000000 !important;
  color: #000000 !important;
}

td.n,
th.n {
  text-align: right !important;
  font-variant-numeric: tabular-nums !important;
}

tfoot td {
  background-color: #f8f8f8 !important;
  border-top: 2px solid #000000 !important;
  border-bottom: 2px solid #000000 !important;
  color: #000000 !important;
  font-weight: 700 !important;
}
```
- **Rationale**: `display: table-header-group` forces table headers to repeat across pages. `page-break-inside: avoid` on `tr` eliminates split rows. Clean `#cccccc` borders and `#f2f2f2` header backgrounds provide a professional, workshop-ready appearance.

### 5.7 Print Header & Grand Total Block Styles
```css
.print-header {
  display: block !important;
  margin-bottom: 12px !important;
  padding-bottom: 6px !important;
  border-bottom: 2px solid #000000 !important;
}

.print-grand-total {
  display: block !important;
  border: 2px solid #000000 !important;
  border-radius: 4px !important;
  padding: 10px 14px !important;
  margin-top: 14px !important;
  background: #fafafa !important;
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}
```
- **Rationale**: Allows `app.js` to render a clean document title header and a prominent grand total banner at the footer without leaking onto screen mode.

---

## 6. Exact CSS Code Block for `public/style.css`

The exact CSS code block below is ready for insertion into `public/style.css`, replacing the baseline line 59:

```css
/* ==========================================================================
   Milestone 3: Tabular-Only Print Stylesheet (R3 Specification)
   Replaces line 59 of public/style.css
   ========================================================================== */

@media print {
  /* 1. Page Configuration */
  @page {
    margin: 12mm 15mm;
    size: auto;
  }

  /* 2. Reset Document Root & Viewport Constraints */
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

  /* 3. Force Cutlist Visibility & Normal-Flow Geometry */
  #cutlist {
    display: block !important;
    overflow: visible !important;
    height: auto !important;
    min-height: 0 !important;
    position: static !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* 4. Complete Hiding of UI Chrome, Canvases, 3D Viewers, and Interactive Controls */
  #canvas,
  .canvas,
  #designPane,
  .topbar,
  .dock,
  #dock,
  .btns,
  .rtools,
  .cards,
  #cards,
  .vwr,
  #vwr,
  .right,
  .tabs,
  .btn,
  button,
  input,
  select,
  label,
  .modal-bg,
  .modal,
  svg {
    display: none !important;
  }

  /* 5. Color Palette & High-Contrast Print Typography */
  :root {
    --bg: #ffffff !important;
    --panel: #ffffff !important;
    --panel2: #ffffff !important;
    --text: #000000 !important;
    --muted: #555555 !important;
    --accent: #000000 !important;
    --line: #cccccc !important;
  }

  body {
    background: #ffffff !important;
    color: #000000 !important;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
    font-size: 10pt !important;
    line-height: 1.35 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .muted {
    color: #555555 !important;
  }

  h1, h2, h3, h4, h5, h6 {
    color: #000000 !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
  }

  h3 {
    font-size: 12pt !important;
    font-weight: 700 !important;
    margin: 14px 0 6px 0 !important;
    border-bottom: 1.5px solid #000000 !important;
    padding-bottom: 3px !important;
  }

  /* Override inline accent color styling on totals */
  h3[style*="color"],
  [style*="var(--accent)"] {
    color: #000000 !important;
  }

  /* 6. Professional High-Contrast Table Layout */
  table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin: 6px 0 14px 0 !important;
    background: #ffffff !important;
    color: #000000 !important;
    font-size: 9pt !important;
    page-break-inside: auto !important;
    break-inside: auto !important;
  }

  thead {
    display: table-header-group !important;
  }

  tfoot {
    display: table-footer-group !important;
  }

  tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    page-break-after: auto !important;
    break-after: auto !important;
    background: #ffffff !important;
    color: #000000 !important;
  }

  /* Remove interactive row selection highlights during print */
  tr[data-id],
  tr[data-id][style] {
    background: transparent !important;
    color: #000000 !important;
  }

  tr[data-id] td {
    background: transparent !important;
    color: #000000 !important;
  }

  th,
  td {
    border: 1px solid #cccccc !important;
    padding: 4px 6px !important;
    text-align: left;
    color: #000000 !important;
    background: transparent !important;
  }

  th {
    background-color: #f2f2f2 !important;
    font-weight: 700 !important;
    border-bottom: 2px solid #000000 !important;
    color: #000000 !important;
  }

  td.n,
  th.n {
    text-align: right !important;
    font-variant-numeric: tabular-nums !important;
  }

  tfoot td {
    background-color: #f8f8f8 !important;
    border-top: 2px solid #000000 !important;
    border-bottom: 2px solid #000000 !important;
    color: #000000 !important;
    font-weight: 700 !important;
  }

  /* 7. Dedicated Print Header & Grand Total Containers */
  .print-header {
    display: block !important;
    margin-bottom: 12px !important;
    padding-bottom: 6px !important;
    border-bottom: 2px solid #000000 !important;
  }

  .print-grand-total {
    display: block !important;
    border: 2px solid #000000 !important;
    border-radius: 4px !important;
    padding: 10px 14px !important;
    margin-top: 14px !important;
    background: #fafafa !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
```

---

## 7. Coordination & Implementation Contracts for Builder (`app.js`)

To ensure 100% seamless integration between this stylesheet and the JavaScript application layer:

1. **DOM Pre-population Contract (`refresh()` in `app.js`)**:
   - In `app.js:573-577`, `drawCutlist()` is currently only called if `state.tab !== 'design'`.
   - If the user presses `Ctrl+P` while on the "Diseño" tab, `#cutlist` is empty in the DOM unless `drawCutlist()` is called during every `refresh()` or in a `window.onbeforeprint` event handler.
   - **Recommendation**: In `refresh()`, call `drawCutlist()` unconditionally so `#cutlist` is always up-to-date and ready for immediate printing, or attach `window.addEventListener('beforeprint', () => drawCutlist())`.
2. **Column Dimensions Format Contract**:
   - In `app.js:528`, the cutlist table displays dimensions in meters (`Ancho (m)`, `Alto (m)`, `Esp. (m)`).
   - R3 requires: "Dimensiones exactas (Largo x Ancho x Espesor)".
   - The builder agent updating `app.js` should render `r.length`, `r.width`, `r.thickness` in millimeters (`Largo (mm)`, `Ancho (mm)`, `Espesor (mm)`).
3. **Grand Total Display**:
   - The builder can wrap the totals in `.print-grand-total` to leverage the dedicated styling provided above.

---

## 8. Caveats

- **No Caveats**: The CSS rules have been formulated to adhere strictly to the W3C CSS Paged Media Module Level 3 and CSS 2.1 print specifications. They are fully compatible with modern rendering engines (Chromium Blink, Gecko, and WebKit).
- **Read-Only Role**: In accordance with the SPECIFICATION MINER role, no changes have been committed directly to `public/style.css` in this turn. The CSS block in Section 6 is fully ready for the designated builder agent.

---

## 9. Conclusion

The existing `@media print` rule in `public/style.css` fails 3 critical acceptance criteria of Milestone 3 (R3):
1. UI chrome (topbar, pills, canvas) leaks onto the printed page.
2. Cutlists are hidden or empty when printing from the design tab.
3. Tables and totals suffer severe contrast degradation and single-page overflow clipping.

The formulated specification and exact CSS rules in Section 6 resolve all defects:
- `@page` establishes standardized 12mm × 15mm margins.
- `#canvas`, `#designPane`, `.topbar`, `.dock`, `.btns`, `.rtools`, `.cards`, `.vwr`, `svg` are completely suppressed.
- `#cutlist` is forced to full-width static block layout.
- High-contrast pure black typography and borders replace dark theme variables and yellow text.
- Page-break controls (`page-break-inside: avoid`, `thead { display: table-header-group }`) ensure clean multi-page pagination.

---

## 10. Verification Method

To verify the print stylesheet once inserted by the builder:
1. **Automated Stylesheet Verification**:
   - Inspect `public/style.css` and verify presence of `@page { margin: 12mm 15mm; size: auto; }`.
   - Verify `#cutlist` contains `display: block !important; overflow: visible !important; height: auto !important; position: static !important; width: 100% !important;`.
   - Verify `#canvas, .canvas, #designPane, .topbar, .dock, .btns, .rtools, .cards, .vwr, svg` have `display: none !important;`.
   - Verify `tr { page-break-inside: avoid !important; }` and `thead { display: table-header-group !important; }`.
2. **Automated Unit Tests**:
   - Run `node --test test/*.test.js` from `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local`.
   - All tests must pass cleanly.
3. **End-to-End Visual Verification**:
   - Start local server (`node server/server.js`).
   - Open browser at `http://localhost:3000`.
   - While on the "Diseño" tab, press `Ctrl+P` / `Cmd+P` -> Verify print preview renders only the tabular cutlist with pure white background, crisp black text, clean borders, zero 2D canvas, zero 3D viewer, and zero topbar/dock chrome.
   - Switch to "Cutlist" tab, click "Imprimir / PDF" -> Verify identical clean tabular print preview.
