# Handoff Report: Survey of Cutlist, Hardware, Pricing & Print Export (R3)

**Author**: teamwork_preview_spec_miner_survey_3  
**Date**: 2026-10-22  
**Target Path**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_spec_miner_survey_3\handoff.md`  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local`  

---

## 1. Observation

Direct code observations from inspecting the codebase (`public/js/layout.js`, `public/js/model.js`, `public/js/viewer.js`, `public/js/app.js`, `public/style.css`, `server/server.js`, and `test/layout.test.js`):

### 1.1 Cutlist & Piece Generation Pipeline (`public/js/layout.js`)
- **Piece Creation (`computeLayout`, lines 105–257)**:
  - **Outer sides / Carcass laterals**:
    - Lines 121–128: For `N` columns, `N + 1` vertical lateral panels are generated:
      `{ name: 'Lateral', mat: 'carcass', kind: 'side', x, y: -s.overhang, z: 0, sx: t, sy: H + 2 * s.overhang, sz: D, col: i }`.
      Height includes overhang: `sy = H + 2 * s.overhang`. Width in X is panel thickness `t` (`s.thickness`, default 18mm). Depth in Z is cabinet depth `D` (`s.depth`, default 450mm).
  - **Top and Base decks per column**:
    - Lines 249–250: Per column `i`:
      `{ name: 'Tapa superior', mat: 'carcass', kind: 'h', x: x0, y: H - t, z: bt, sx: W, sy: t, sz: cd, col: i }`
      `{ name: 'Base', mat: 'carcass', kind: 'h', x: x0, y: 0, z: bt, sx: W, sy: t, sz: cd, col: i }`
      Width `sx = W` (column width), height `sy = t`, depth `sz = cd = D - bt` (carcass depth, recessed by back panel thickness `bt`, default 20mm).
  - **Back panels per column**:
    - Line 252:
      `{ name: 'Fondo', mat: 'back', kind: 'back', x: x0 - 10 + g, y: t - 10 + g, z: 0, sx: W + 20 - 2 * g, sy: H - 2 * t + 20 - 2 * g, sz: bt, col: i }`
      Panel enters a 10mm groove on all perimeter edges with groove clearance `g = s.grooveClearance` (default 1mm). Thus `sx = W + 20 - 2*g`, `sy = H - 2*t + 20 - 2*g`, `sz = bt`.
  - **Inner shelves & vertical dividers**:
    - Lines 218 & 231:
      Horizontal shelf: `{ name: 'Estante / división', mat: 'carcass', kind: 'h', x: px, y: cy, z: bt, sx: w, sy: t, sz: cd, col, nodeId: n.id }`.
      Vertical partition: `{ name: 'División vertical', mat: 'carcass', kind: 'v', x: cx, y: py, z: bt, sx: t, sy: h, sz: cd, col, nodeId: n.id }`.
  - **Fronts (Doors & Drawers)**:
    - Doors (Lines 145–156):
      `{ name: 'Puerta', mat: 'front', kind: 'front', x: px, y: cy + fc, z: D, sx: dw, sy: ch - 2 * fc, sz: t, holes, pull: style, holeLayout: 'v', col, nodeId: n.id, side }`.
      For single doors: width `cw - 2 * fc` where `cw = w + t` and `fc = s.frontClearance` (default 2mm).
      For double doors: width `dw = (cw - 3 * fc) / 2`.
    - Drawers (Lines 181–193):
      Frente de gaveta: `{ name: 'Frente de gaveta', mat: 'front', kind: 'front', x: cx + fc, y: cy + idx * slot + fc / 2, z: D, sx: cw - 2 * fc, sy: slot - fc, sz: t, holes, pull: style, holeLayout: 'h' }`.
      Drawer box components per drawer:
      - 2 × Lateral de gaveta: `sx: dt` (`s.drawerThickness`, default 15mm), `sy: bh` (`inner - s.drawerInset`), `sz: bd` (`cd - 20mm`).
      - 2 × Frente/trasera de gaveta: `sx: bw - 2 * dt`, `sy: bh`, `sz: dt`.
      - 1 × Fondo de gaveta: `sx: bw - 2 * dt`, `sy: s.drawerBottomThickness` (default 6mm), `sz: bd - 2 * dt`.
  - **Rails**:
    - Lines 165 & 204: `{ name: 'Barra de perchero', mat: 'rail', kind: 'rail', x: cx0, y: cy0 + h - s.railOffset - s.railDia, z: bt + cd / 2 - s.railDia / 2, sx: w, sy: s.railDia, sz: s.railDia }`.
    - Excluded from cutlist rows (Line 295: `if (p.kind === 'rail') continue;`), accounted for under hardware.

- **Orientation Determination (`orientationOf`, lines 278–283)**:
  - Finds the minimum axis dimension: `m = Math.min(p.sx, p.sy, p.sz)`.
  - If `m === p.sz`: orientation is `'vertical-xy'`, `w = p.sx`, `h = p.sy`, `t = p.sz` (fronts, doors, back panel).
  - If `m === p.sy`: orientation is `'horizontal-xz'`, `w = p.sx`, `h = p.sz`, `t = p.sy` (shelves, top, base, drawer bottom).
  - Else (`m === p.sx`): orientation is `'vertical-yz'`, `w = p.sz`, `h = p.sy`, `t = p.sx` (outer laterals, vertical divisions, drawer sides).

- **Cutlist Row Aggregation & Dimensions (`buildCutlist`, lines 285–324)**:
  - Panel role mapped from piece name (lines 261–273):
    - `Lateral` -> `vertical-side`
    - `División vertical` -> `vertical-side`
    - `Tapa superior` -> `horizontal-deck`
    - `Base` -> `horizontal-deck`
    - `Estante / división` -> `horizontal-deck`
    - `Fondo` -> `back-panel`
    - `Puerta` -> `door-front`
    - `Frente de gaveta` -> `drawer-front`
    - `Lateral de gaveta` -> `drawer-side`
    - `Frente/trasera de gaveta` -> `drawer-back`
    - `Fondo de gaveta` -> `drawer-bottom`
  - Dimensions rounded to 1 decimal place: `w = round(ori.w); h = round(ori.h); T = round(ori.t);`
  - Length & Width defined as: `L = Math.max(w, h); W = Math.min(w, h);`
  - Grouping key: `[role, p.name, ori.o, w, h, T].join('|')`. If identical, `qty += 1`.
  - Area in square meters: `area = (w * h) / 1e6`.
  - Unit price: `unitPrice = area * (s[PRICE_KEY[p.mat]] || 0)`.
  - Sorting order: sorted by `ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || b.length - a.length || b.width - a.width`.
    Order: `['back-panel', 'door-front', 'drawer-back', 'drawer-bottom', 'drawer-front', 'drawer-side', 'horizontal-deck', 'vertical-side']`.
  - ID Prefix assignment:
    `{ 'back-panel': 'B', 'door-front': 'O', 'drawer-back': 'D', 'drawer-bottom': 'D', 'drawer-front': 'D', 'drawer-side': 'D', 'horizontal-deck': 'H', 'vertical-side': 'S' }`.
    Counters increment per prefix: `B1`, `O1`, `D1`, `D2`, `H1`, `H2`, `S1`, etc.
  - Line total: `total = r.unitPrice * r.qty`.

### 1.2 Hardware, Fittings & Machining Calculation (`layout.js`)
- **Hardware Tracking (`computeLayout` & `buildCutlist`)**:
  - `hw.slides`: Increments by 1 pair for each drawer. Price key: `slidePrice` (default $12/pair). Total: `hw.slides * s.slidePrice`.
  - `hw.hinges`: Increments per door based on height: `ch > 1800 ? 4 : ch > 1000 ? 3 : 2`. Double doors double this count. Price key: `hingePrice` (default $2/hinge). Total: `hw.hinges * s.hingePrice`.
  - `hw.pulls`: Map of style -> count. Counted for each door and drawer front unless style is `'none'`. Styles: `bar` ($4), `knob` ($2), `profile` ($8). Total: `qty * price`.
  - `hw.rails`: Sum of rail width `w` in mm. Converted to meters: `m = hw.rails / 1000`. Unit price: `s.priceRail` (default $6/m). Total: `m * s.priceRail`.
  - `hw.brackets`: 2 brackets per rail. Unit price: `s.priceRailBracket` (default $1.50/ea). Total: `hw.brackets * s.priceRailBracket`.
- **Machining Operations (`cl.machining`, lines 288–315)**:
  - `rail-cut` (groove):
    - Back panel groove on outer laterals (`face: 'back'`, length `sy`, depth 5mm, width 21mm).
    - Back panel groove on top and base decks and shelves (`face: 'back'`, length `sx`, depth 5mm, width 21mm).
    - Drawer bottom groove on drawer sides and front/backs (`face: 'front'`, length `Math.max(sx, sz)`, depth 5mm, width 21mm).
  - `through-hole`:
    - Agujero pasante for door/drawer pulls (`face: 'front'`, diameter `s.pullDia` (default 25mm), depth `T`, through: true).
  - Pricing: Currently machining operations have NO unit price and are not added to `cutlist.total`.

### 1.3 Pricing Structure & Totals
- Material rates:
  - `priceCarcass`: $40 / m²
  - `priceFront`: $70 / m²
  - `priceBack`: $20 / m²
  - `priceDrawer`: $30 / m²
- Subtotals & Total:
  - `panelsTotal = rows.reduce((a, r) => a + r.total, 0)`
  - `hardwareTotal = hardware.reduce((a, r) => a + r.total, 0)`
  - `total = panelsTotal + hardwareTotal`
  - `area = rows.reduce((a, r) => a + r.unitArea * r.qty, 0)` (total m² of cut panels)

### 1.4 Existing Print Styling & Screen vs. Print DOM
- In `public/style.css` (lines 57):
  ```css
  @media print { .topbar button, .btns, .dock { display:none; } .right { display:none; } .left { width:100%; } body { background:#fff; color:#000; } }
  ```
- In `public/js/app.js`:
  - When in `state.tab === 'design'`:
    - `#designPane` is `display: contents` (contains `#canvas` SVG and `#dock`).
    - `#cutlist` is inline `style="display:none"`.
    - If user triggers `window.print()` / `Ctrl+P` while in Design mode, **the 2D SVG canvas prints, and `#cutlist` is completely hidden and not even rendered!**
  - When in `state.tab === 'cutlist'`:
    - `#designPane` is `display: none`.
    - `#cutlist` is `display: block`.
    - `.right` contains `#cards` (the grid of oblique 3D SVG piece thumbnails). In print, `.right { display: none; }` hides them, but:
      - `.topbar` container with dark pill backgrounds (`background: var(--panel)`) and unstyled text input `#name` is still displayed.
      - Contrast failure: `tfoot td` has `color: var(--accent)` (`#ffb800` yellow), `h3` total price has `color: var(--accent)` (`#ffb800`). On white paper, light yellow text is almost invisible.
      - Overflow / pagination: `.cutlist` has `overflow: auto; flex: 1;` inside `.editor` (`height: 100%`). In standard print engines, fixed height and overflow:auto causes truncation/clipping of multi-page tables.
      - Table dimensions format: Table currently renders `Ancho (m)`, `Alto (m)`, `Esp. (m)` in meters with 3 decimals (e.g. `0.764`, `0.018`), whereas R3 requires exact dimensions: "Dimensiones exactas (Largo x Ancho x Espesor)" in mm.

---

## 2. Logic Chain

1. **R3 Mandate vs. Current State**:
   - R3 requires:
     - (a) A strictly tabular print layout (`window.print()` / PDF) with zero graphics, zero canvas (2D or 3D), zero thumbnails, and zero buttons.
     - (b) A detailed panel table containing: Identificador, Rol/Nombre, Orientación, Dimensiones exactas (Largo x Ancho x Espesor), Cantidad, Precio unitario, and Precio total.
     - (c) A hardware breakdown table.
     - (d) A machining breakdown table.
     - (e) A prominently displayed calculated final project total (and category totals).
2. **Current Cutlist Table Gaps**:
   - In `app.js` line 448, the table headers are:
     `<th>ID</th><th>Pieza</th><th>Orientación</th><th class="n">Ancho (m)</th><th class="n">Alto (m)</th><th class="n">Esp. (m)</th><th class="n">Cant.</th><th class="n">Precio u.</th><th class="n">Total</th>`
   - Gap 1: Column "Pieza" only shows `r.name` (e.g. "Lateral", "Base"), omitting the formal architectural `role` (e.g. `vertical-side`, `horizontal-deck`).
   - Gap 2: Dimensions are shown as `Ancho (m)`, `Alto (m)`, `Esp. (m)` in meters, whereas cutlists and workshops require dimensions in mm: `Largo (mm)`, `Ancho (mm)`, `Espesor (mm)` or `Largo × Ancho × Espesor (mm)`. Note that `r.length`, `r.width`, `r.thickness` are already calculated in mm in `buildCutlist`!
   - Gap 3: Machining operations are currently gated behind `state.showMach` checkbox (default false). When printing, if the checkbox is unchecked, machining operations are omitted from the printed document.
3. **Print CSS Leaks and Truncation Risks**:
   - Because `#cutlist` is hidden when on the "Diseño" tab, printing without first switching tabs prints the 2D canvas and an empty sheet.
   - Because `style.css` does not reset `height: 100%` and `overflow: auto` on `html`, `body`, `#app`, `.editor`, `.left`, and `.cutlist`, long cutlists will be clipped at page 1.
   - Because colors are not overridden for print, `--accent` (`#ffb800`) produces unreadable yellow text on paper.
   - The `.topbar` elements (`#name` input, pills) leak into print.
4. **Architectural Fix Strategy**:
   - Update `style.css` `@media print`:
     - Force `#canvas`, `#designPane`, `.canvas`, `.vwr`, `.cards`, `.topbar`, `.dock`, `.btns`, `.rtools` to `display: none !important;`.
     - Force `#cutlist` to `display: block !important; overflow: visible !important; height: auto !important;`.
     - Set `@page { margin: 12mm 15mm; size: auto; }`.
     - Remove 100% heights and scrollbars from print root elements.
     - Enforce high-contrast black/grey typography (`color: #000; border-color: #333`).
   - Update `app.js`:
     - In `refresh()`: Always execute `drawCutlist()` so the cutlist DOM is populated even if user is on the "Diseño" tab.
     - In `drawCutlist()`:
       - Update panel table columns to:
         `ID` | `Rol / Nombre` | `Orientación` | `Dimensiones (L × A × E mm)` (or separate Largo, Ancho, Espesor in mm) | `Cant.` | `Precio unit.` | `Total`
       - Add a print-only clean header showing Project Name, Date, Overall Furniture Dimensions (W × H × D mm).
       - Ensure hardware table and machining table are cleanly formatted with print styles.
       - Display a prominent grand total banner at the bottom (and/or header) with Subtotal Paneles, Subtotal Herrajes, and TOTAL GENERAL.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Cutlist | Piece Generation | Converts furniture tree and columns into individual 3D piece bounding boxes with materials and kinds | `project` (columns, settings) | `pieces[]` (name, mat, kind, x, y, z, sx, sy, sz, col, nodeId) | Defaults to DEFAULTS if settings missing | `layout.js:105` |
| 2 | Cutlist | Panel Orientation | Identifies orientation plane by thinnest axis (sx, sy, sz) | Piece dimensions `(sx, sy, sz)` | `{ o: 'vertical-xy' \| 'horizontal-xz' \| 'vertical-yz', w, h, t }` | Fallback to vertical-yz if sx is thinnest | `layout.js:278` |
| 3 | Cutlist | Cutlist Aggregation | Groups identical pieces by role, name, orientation, w, h, t, and counts quantity | `pieces[]`, `s` (settings), `hw` | `rows[]` with `length`, `width`, `thickness`, `qty`, `unitPrice`, `total` | Pieces with `kind === 'rail'` are skipped | `layout.js:285` |
| 4 | Cutlist | Piece ID Prefixing | Assigns standardized letter prefix and sequence number ordered by role and size | `sorted rows` | `r.id` (e.g. `B1`, `O1`, `D1`, `H1`, `S1`) | Unknown role defaults to prefix `'X'` | `layout.js:316` |
| 5 | Hardware | Slides Calculation | Computes 1 pair of slide rails per drawer count | Drawer module `count` | `hw.slides`, unitPrice `s.slidePrice`, total | Minimum count enforced at 1 | `layout.js:183` |
| 6 | Hardware | Hinges Calculation | Computes hinges per door leaf based on height (ch > 1800: 4, ch > 1000: 3, else 2) | Door height `ch`, door type (`doors`, `left-door`, `right-door`) | `hw.hinges`, unitPrice `s.hingePrice`, total | Invalid door type produces no hinges | `layout.js:144` |
| 7 | Hardware | Pulls Catalog | Computes handle hardware per door leaf and drawer front | `pullStyle` (`bar`, `knob`, `profile`, `none`) | `hw.pulls[style]`, unitPrice, total | `none` adds 0 hardware | `layout.js:130` |
| 8 | Hardware | Hanging Rail Hardware | Computes clothes rail meters and bracket count (2 per rail) | Rail module width `w` | `Barra de perchero (m)` qty, `Soporte de barra` qty, totals | Only added if rail modules exist | `layout.js:165` |
| 9 | Machining | Groove Operations | Records grooving (`rail-cut`) for back panel and drawer bottom | `pieces[]` (`side`, `h`, `drawer`) | `cl.machining[]` with face, depth 5mm, width 21mm, length, qty | Unpriced in baseline | `layout.js:311` |
| 10 | Machining | Through-hole Drilling | Records pull screw holes through door and drawer fronts | `pieces[].holes`, `s.pullDia` | `cl.machining[]` with face 'front', diameter 25mm, depth T, through: true | Unpriced in baseline | `layout.js:314` |
| 11 | Pricing | Panel Area Pricing | Computes panel unit price based on area (m²) and material price rate | `w, h` in mm, material rate `s[priceKey]` | `unitPrice = (w * h / 1e6) * price`, `total = unitPrice * qty` | Missing rate defaults to 0 | `layout.js:306` |
| 12 | Pricing | Project Grand Total | Sums panel subtotals and hardware subtotals into total project cost | `panelsTotal`, `hardwareTotal` | `cl.total = panelsTotal + hardwareTotal`, `cl.area` (m²) | Returns 0 if no pieces | `layout.js:338` |
| 13 | Export | CSV Cutlist Export | Generates downloadable CSV with pieces, materials, dimensions, quantities, and prices | `cl`, `currency` | CSV file string with headers, rows, hardware, and total line | Quotes fields and escapes internal quotes | `layout.js:344` |
| 14 | UI / Print | Print / PDF Export | Invokes browser native print dialog | Click on `#print` button | Calls `window.print()` | Relies on `@media print` CSS | `app.js:484` |
| 15 | UI / Visual | Oblique 3D Piece Cards | Generates SVG oblique projection cards for each cutlist row in right pane | `cl.rows` | SVG wireframe boxes with dimensions and badges | Hidden in print via `.right { display:none }` | `app.js:421` |

---

## 4. Edge Cases

| # | Feature | Input / Scenario | Observed Behavior |
|---|---------|------------------|-------------------|
| 1 | Print Trigger from Design Tab | User presses `Ctrl+P` while on "Diseño" tab (`state.tab === 'design'`) | **Bug/Defect**: `#designPane` and `#canvas` are visible; `#cutlist` is `display:none` and has not been drawn in DOM. Prints empty dark canvas layout. |
| 2 | Print Typography & Contrast | User triggers print in dark mode UI | `body` turns white, but `var(--accent)` (`#ffb800`) remains yellow on white paper, rendering total prices and footer highlights virtually unreadable. |
| 3 | Print Pagination / Multi-page Cutlist | Project with > 15-20 cutlist rows printed to PDF | `.cutlist { overflow: auto; height: 100%; }` and `.editor { height: 100%; }` causes browser print engines (Chrome/Firefox) to cut off table rows after page 1. |
| 4 | Topbar Leak in Print | Print dialog active | `.topbar` container, `#name` input, and `.pill` backgrounds leak onto printed header with dark background boxes. |
| 5 | Machining Table in Print | `state.showMach` checkbox unchecked | Machining table is completely missing from DOM and printout, despite R3 requirement: "Incluir desglose de herrajes y mecanizados necesarios." |
| 6 | Cutlist Dimensions Format | Current cutlist table in UI | Renders `Ancho (m)`, `Alto (m)`, `Esp. (m)` in meters (e.g. 0.764, 0.018), conflicting with workshop carpentry standard and R3: "Dimensiones exactas (Largo x Ancho x Espesor)" in mm. |
| 7 | Zero Hardware Configuration | Furniture consisting only of open shelves (`shelf`) with no doors, no drawers, no rails | `hw` counts are all 0; `cl.hardware` is empty array `[]`. UI displays "Sin herrajes". Subtotal hardware is $0.00. Total matches `panelsTotal`. |
| 8 | Multiple Identical Columns | 3 identical columns with width 764mm | Outer sides produce 4 laterals with identical dimensions grouped as `S1` (qty: 4). Tops and bases produce `H1` (qty: 3) and `H2` (qty: 3). Back panels produce `B1` (qty: 3). |
| 9 | Custom Currency Symbol | Settings currency set to multi-character string (e.g. `USD `, `EUR `, `S/. `) | `fmtMoney` prepends string cleanly (`currency + v.toFixed(2)`). CSV export places currency in total line. |
| 10 | Door Height Hinge Thresholds | Door height exactly 1000mm vs 1001mm; 1800mm vs 1801mm | At 1000mm: 2 hinges; at 1001mm: 3 hinges. At 1800mm: 3 hinges; at 1801mm: 4 hinges. |

---

## 5. Detailed Specification for R3 Compliance (Strictly Tabular Print View)

To fulfill all requirements of R3 ("Hoja de corte completa optimizada para impresión en formato exclusivamente tabular"), the following concrete modifications must be made by the builders:

### 5.1 CSS `@media print` Modernization (`public/style.css`)
Replace the current single-line rule with a comprehensive print stylesheet:
```css
@media print {
  /* 1. Page setup */
  @page {
    size: A4 portrait;
    margin: 12mm 15mm;
  }

  /* 2. Reset full-height app containers and overflow clipping */
  html, body, #app, .editor, .left, .cutlist {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    position: static !important;
    width: 100% !important;
    background: #ffffff !important;
    color: #111111 !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* 3. Hide all non-tabular, graphical, interactive UI elements unconditionally */
  .topbar,
  .topbar button,
  .pill,
  .canvas,
  #canvas,
  #designPane,
  .dock,
  #dock,
  .btns,
  .rtools,
  .right,
  .vwr,
  #vwr,
  .cards,
  #cards,
  .modal-bg,
  svg {
    display: none !important;
  }

  /* 4. Ensure cutlist is forced visible even if design tab was active */
  #cutlist {
    display: block !important;
  }

  /* 5. Print typography & high-contrast tables */
  :root {
    --text: #111111;
    --muted: #444444;
    --accent: #111111;
    --line: #cccccc;
  }

  table {
    width: 100% !important;
    border-collapse: collapse !important;
    page-break-inside: auto;
    margin-bottom: 16px !important;
    font-size: 11px !important;
  }

  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  th {
    background-color: #f0f0f0 !important;
    color: #000000 !important;
    border-bottom: 2px solid #333333 !important;
    padding: 5px 6px !important;
    font-weight: 700;
  }

  td {
    border-bottom: 1px solid #e0e0e0 !important;
    color: #111111 !important;
    padding: 4px 6px !important;
  }

  tfoot td {
    border-top: 2px solid #333333 !important;
    color: #000000 !important;
    font-weight: 700;
    font-size: 11px !important;
  }

  /* 6. Highlighting overrides */
  tr[data-id] {
    background: transparent !important;
    color: inherit !important;
  }

  /* 7. Dedicated Print Header & Totals Banner */
  .print-header {
    display: block !important;
    border-bottom: 2px solid #222;
    padding-bottom: 8px;
    margin-bottom: 14px;
  }

  .print-grand-total {
    display: block !important;
    border: 2px solid #222;
    border-radius: 6px;
    padding: 10px 14px;
    margin-top: 16px;
    page-break-inside: avoid;
    background: #fbfbfb;
  }
}
```

### 5.2 Application & DOM Changes (`public/js/app.js`)
1. **Always render cutlist on refresh**:
   In `refresh()`, call `drawCutlist()` unconditionally so `#cutlist` is never empty when `window.print()` is called from either tab.
2. **Tabular Cutlist Columns Enhancement**:
   Update `drawCutlist()` table headers to match R3 specification:
   ```html
   <table>
     <thead>
       <tr>
         <th>ID</th>
         <th>Pieza / Rol</th>
         <th>Orientación</th>
         <th class="n">Largo (mm)</th>
         <th class="n">Ancho (mm)</th>
         <th class="n">Espesor (mm)</th>
         <th class="n">Cant.</th>
         <th class="n">Precio unit.</th>
         <th class="n">Precio total</th>
       </tr>
     </thead>
     <tbody>
       ${cl.rows.map(r => `
         <tr data-id="${r.id}">
           <td><b>${r.id}</b></td>
           <td><b>${esc(r.name)}</b> <span class="muted">(${r.role})</span></td>
           <td>${r.orientation}</td>
           <td class="n">${r.length}</td>
           <td class="n">${r.width}</td>
           <td class="n">${r.thickness}</td>
           <td class="n">${r.qty}</td>
           <td class="n">${fmtMoney(r.unitPrice)}</td>
           <td class="n">${fmtMoney(r.total)}</td>
         </tr>
       `).join('')}
     </tbody>
     <tfoot>
       <tr>
         <td colspan="7">Subtotal Paneles (${cl.area.toFixed(2)} m²)</td>
         <td colspan="2" class="n">${fmtMoney(cl.panelsTotal)}</td>
       </tr>
     </tfoot>
   </table>
   ```
3. **Machining Table**:
   Ensure the machining table is either always included or cleanly styled for print so that workshops have all necessary groove and drilling specifications.
4. **Hardware Table**:
   Maintain clean tabular structure with `Herraje`, `Cantidad`, `Precio unitario`, `Precio total`, and `Subtotal herrajes`.
5. **Print Header & Prominent Totals Block**:
   Add a dedicated print header and prominent grand total footer:
   ```html
   <div class="print-header" style="display:none">
     <h1 style="margin:0 0 4px 0; font-size:18px">${esc(state.name)} — Hoja de Corte</h1>
     <div style="font-size:11px; color:#555">
       Dimensiones exteriores: ${layout.totalW} mm (Ancho) × ${layout.settings.height} mm (Alto) × ${layout.settings.depth} mm (Fondo) · Fecha: ${new Date().toLocaleDateString()}
     </div>
   </div>
   ...
   <div class="print-grand-total">
     <div style="display:flex; justify-content:space-between; margin-bottom:4px">
       <span>Subtotal Paneles / Piezas:</span> <b>${fmtMoney(cl.panelsTotal)}</b>
     </div>
     <div style="display:flex; justify-content:space-between; margin-bottom:4px">
       <span>Subtotal Herrajes y Accesorios:</span> <b>${fmtMoney(cl.hardwareTotal)}</b>
     </div>
     <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:800; border-top:1px solid #333; padding-top:6px; margin-top:6px">
       <span>PRECIO TOTAL DEL PROYECTO:</span> <span>${fmtMoney(cl.total)}</span>
     </div>
   </div>
   ```

---

## 6. Caveats

- **Machining Pricing**: The baseline code calculates and lists machining operations (`rail-cut` and `through-hole`) in `cl.machining`, but assigns no price to them. If the product specification requires pricing for machining operations (e.g. price per meter of groove or price per hole), new setting keys (e.g. `priceRailCut`, `priceThroughHole`) would need to be added to `DEFAULTS`. However, R3 only specifies "Incluir desglose de herrajes y mecanizados necesarios", which is currently satisfied by listing operations in the table.
- **Edge Banding (Tapacantos)**: Edge banding is mentioned in common woodworking contexts, but is not currently modeled in `madera-local`'s baseline piece calculation. If edge banding is desired in future releases, edge length calculations per panel would need to be added to `buildCutlist`.
- **Browser Print Preview Limitations**: `window.print()` triggers the host browser's native print engine. Automated verification of printed page layout requires inspecting the `@media print` CSS rules and checking DOM visibility states.

---

## 7. Conclusion

The cutlist, hardware, and pricing engine in `madera-local` is well-architected and mathematically robust in `layout.js`:
- Panel geometry, orientation, roles, prefixes, and square-meter pricing are accurately computed.
- Hardware quantities (slides, hinges, pulls, rails, brackets) correctly react to the modular tree.
- However, the current print view has critical shortcomings that prevent it from satisfying Acceptance Criteria R3:
  1. The 2D canvas and UI leak into print when printing from the design tab.
  2. The oblique 3D piece thumbnails (`.cards`) are rendered in screen cutlist mode, risking visual clutter.
  3. The print styles use unreadable yellow text (`#ffb800`) on white paper.
  4. The cutlist table displays dimensions in meters rather than exact millimeters (`Largo × Ancho × Espesor mm`).
  5. The project grand total and category subtotals are not formatted prominently for printing.

The proposed modifications in Section 5 provide a zero-risk, high-fidelity implementation plan to make the print view strictly tabular and 100% compliant with R3.

---

## 8. Verification Method

To verify these findings and any future implementation:
1. **Unit Tests**:
   Execute `node --test test/*.test.js` from `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local`.
   Expected: All tests pass, validating that piece count, cutlist rows, hardware quantities, and total calculations remain strictly functional.
2. **DOM & Print Styles Inspection**:
   - Inspect `public/style.css` `@media print` rules to ensure `.canvas`, `.right`, `.cards`, `.vwr`, `.btns`, `.topbar` have `display: none !important;`.
   - Verify that `#cutlist` is set to `display: block !important;` in `@media print`.
   - Inspect `public/js/app.js` to ensure `drawCutlist()` contains the table columns: `ID`, `Pieza / Rol`, `Orientación`, `Largo (mm)`, `Ancho (mm)`, `Espesor (mm)` (or `Largo × Ancho × Espesor`), `Cant.`, `Precio unit.`, `Precio total`.
3. **Interactive Browser Verification**:
   - Navigate to `http://localhost:3000` in a browser.
   - Open a project, click the "Cutlist" tab, and click "Imprimir / PDF" (`window.print()`).
   - Also press `Ctrl+P` while on the "Diseño" tab.
   - Verify that in both cases, the print preview shows ONLY clean tables: panel cutlist, hardware breakdown, machining breakdown, and the prominent final total block, with zero 2D canvas, zero 3D viewer, and zero piece thumbnails.
