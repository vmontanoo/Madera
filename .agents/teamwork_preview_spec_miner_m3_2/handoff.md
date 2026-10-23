# Handoff Report: Specification for `drawCutlist()` & DOM Rendering in `public/js/app.js` (R3)

**Author**: teamwork_preview_spec_miner_m3_2  
**Date**: 2026-10-22  
**Target Path**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_spec_miner_m3_2\handoff.md`  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local`  

---

## 1. Observation

Direct code observations from inspecting `public/js/app.js`, `public/js/layout.js`, and `public/style.css`:

### 1.1 `drawCutlist()` Baseline in `public/js/app.js` (Lines 519–565)
```javascript
519:   function drawCutlist() {
520:     const cl = layout.cutlist;
521:     const cur = state.project.settings.currency;
522:     const m = (v) => (v / 1000).toFixed(3);
523:     const selRow = cl.rows.find((r) => r.id === state.cutSel);
524:     $('#cutlist').innerHTML = `
525:       <div class="btns" style="margin-bottom:8px"><button id="csv">Exportar CSV</button><button id="print">Imprimir / PDF</button>
526:       <label class="muted"><input type="checkbox" id="mach" ${state.showMach ? 'checked' : ''}> Mostrar operaciones de mecanizado</label></div>
527:       <h3>Tabla de cortes</h3>
528:       <table><thead><tr><th>ID</th><th>Pieza</th><th>Orientación</th><th class="n">Ancho (m)</th><th class="n">Alto (m)</th><th class="n">Esp. (m)</th><th class="n">Cant.</th><th class="n">Precio u.</th><th class="n">Total</th></tr></thead><tbody>
529:       ${cl.rows.map((r) => `<tr data-id="${r.id}" style="cursor:pointer;${r.id === state.cutSel ? 'background:#ffb800;color:#111' : ''}"><td><b>${r.id}</b></td><td>${esc(r.name)}</td><td>${r.orientation}</td><td class="n">${m(r.w)}</td><td class="n">${m(r.h)}</td><td class="n">${m(r.thickness)}</td><td class="n">${r.qty}</td><td class="n">${fmtMoney(r.unitPrice)}</td><td class="n">${fmtMoney(r.total)}</td></tr>`).join('')}
530:       </tbody><tfoot><tr><td colspan="8">Subtotal piezas (${cl.area.toFixed(2)} m²)</td><td class="n">${fmtMoney(cl.panelsTotal)}</td></tr></tfoot></table>
531:       ${state.showMach ? `<h3>Operaciones de mecanizado</h3>
532:       <p class="muted">rail-cut = ranura para encajar el fondo o el piso de gaveta. through-hole = agujero pasante del tirador.</p>
533:       <table><thead><tr><th>Operación</th><th>Panel</th><th>Cara</th><th class="n">Diám.</th><th class="n">Prof.</th><th class="n">Ancho</th><th class="n">Largo</th><th>Pasante</th><th class="n">Cant.</th></tr></thead><tbody>
534:       ${cl.machining.map((o) => `<tr><td>${o.op}</td><td>${o.role}</td><td>${o.face}</td><td class="n">${o.diameter ? m(o.diameter) : '—'}</td><td class="n">${m(o.depth)}</td><td class="n">${o.width ? m(o.width) : '—'}</td><td class="n">${o.length ? m(o.length) : '—'}</td><td>${o.through ? 'sí' : 'no'}</td><td class="n">${o.qty}</td></tr>`).join('')}
535:       </tbody></table>` : ''}
536:       <h3>Herrajes</h3>
537:       <table><thead><tr><th>Herraje</th><th class="n">Cant.</th><th class="n">Precio u.</th><th class="n">Total</th></tr></thead><tbody>
538:       ${cl.hardware.map((r) => `<tr><td>${r.name}</td><td class="n">${r.qty}</td><td class="n">${fmtMoney(r.unitPrice)}</td><td class="n">${fmtMoney(r.total)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Sin herrajes</td></tr>'}
539:       </tbody><tfoot><tr><td colspan="3">Subtotal herrajes</td><td class="n">${fmtMoney(cl.hardwareTotal)}</td></tr></tfoot></table>
540:       <h3 style="color:var(--accent)">Precio total del mueble: ${cur}${cl.total.toFixed(2)}</h3>
541:       <p class="muted">Los precios se configuran en ⚙ (precio por m² y por herraje).</p>`;
```

### 1.2 `refresh()` Baseline in `public/js/app.js` (Lines 569–577)
```javascript
569:   function refresh() {
570:     layout = computeLayout(state.project);
571:     $('#price').textContent = fmtMoney(layout.cutlist.total);
572:     viewer.update(layout, new Set(state.selected ? collectIds(state.selected) : []));
573:     if (state.tab === 'design') {
574:       drawCanvas();
575:       drawDock();
576:     } else drawCutlist();
577:   }
```

### 1.3 Identified Deficiencies Against R3 Acceptance Criteria
1. **Empty Print View from Design Tab**: Line 573 branches on `state.tab === 'design'`. When the user is working on the 2D canvas, `#cutlist` is never rendered (`$('#cutlist').innerHTML === ""`). If the user triggers `window.print()` or `Ctrl+P`, the printout contains an empty page or leaks canvas elements.
2. **Dimension Units in Cutlist Table**: Line 528 shows `Ancho (m)`, `Alto (m)`, `Esp. (m)` formatted via `m(v) = (v / 1000).toFixed(3)` (e.g. `0.764`, `1.996`, `0.018`), violating R3 which requires exact millimeter dimensions (`Largo (mm)`, `Ancho (mm)`, `Espesor (mm)`). In `public/js/layout.js`, `r.length`, `r.width`, and `r.thickness` are already calculated in millimeters.
3. **Missing Architectural Role**: Line 529 displays only `${esc(r.name)}` (e.g., "Lateral"), omitting the formal role `${r.role}` (e.g., "vertical-side", "horizontal-deck", "back-panel").
4. **Conditional Machining Table Omission**: Line 531 gates machining behind `${state.showMach ? ... : ''}`, with `state.showMach = false` by default (line 118). When printing or when unopened, the machining breakdown is absent from the DOM, violating R3: *"Incluir desglose de herrajes y mecanizados necesarios"*.
5. **Missing Dedicated `.print-header`**: There is no `.print-header` element in the DOM containing furniture name, dimensions (`totalW × height × depth mm`), and date.
6. **Missing Prominent `.print-grand-total` Block**: Line 540 only has an inline `<h3 style="color:var(--accent)">`, which renders in low-contrast yellow (`#ffb800`) without clear itemized category subtotals (paneles, herrajes) and without a prominent print banner.

---

## 2. Logic Chain

1. **Unconditional DOM Generation in `refresh()`**:
   - `computeLayout(state.project)` is already called synchronously in `refresh()`, producing `layout.cutlist`.
   - String generation and DOM insertion for `#cutlist` takes ~0.2ms.
   - Calling `drawCutlist()` unconditionally in `refresh()` guarantees that `#cutlist` is always fully populated with up-to-date panels, hardware, machining, and grand totals, regardless of whether `state.tab` is `'design'` or `'cutlist'`.
   - When the user presses `Ctrl+P` or triggers printing from any tab, the print CSS (`#cutlist { display: block !important; }`) renders the populated tables instantly without requiring tab navigation.

2. **Dedicated `.print-header` Specification**:
   - Contains:
     - Document title: `${esc(state.name || 'Mueble modular')} — Hoja de Corte`
     - Prominent header total price: `Total: ${fmtMoney(cl.total)}`
     - Metadata line: `Dimensiones generales: ${layout.totalW} × ${s.height} × ${s.depth} mm · Fecha: ${dateStr}`
   - Rendered with class `print-header`. On screen it is cleanly hidden (`display: none`), while in `@media print` it is displayed prominently (`display: block !important`) with clean borders and contrast.

3. **Granular Cutlist Table Specification**:
   - Exactly 9 columns: `ID`, `Pieza / Rol`, `Orientación`, `Largo (mm)`, `Ancho (mm)`, `Espesor (mm)`, `Cant.`, `Precio unit.`, `Precio total`.
   - `Largo (mm)` = `r.length` (exact mm, e.g. `1996`).
   - `Ancho (mm)` = `r.width` (exact mm, e.g. `764`).
   - `Espesor (mm)` = `r.thickness` (exact mm, e.g. `18`).
   - `Pieza / Rol` = `<b>${esc(r.name)}</b> <span class="muted">(${esc(r.role)})</span>`.
   - `Orientación` = `${esc(r.orientation)}` (e.g. `vertical-yz`, `horizontal-xz`, `vertical-xy`).
   - Footer row spans 7 columns: `Subtotal Paneles (${cl.area.toFixed(2)} m²)`, with amount `${fmtMoney(cl.panelsTotal)}` right-aligned across the last 2 columns.

4. **Hardware Breakdown Table Specification**:
   - 4 columns: `Herraje`, `Cantidad`, `Precio unit.`, `Precio total`.
   - Populated from `cl.hardware` (slides, hinges, pulls, hanging rails, rail brackets).
   - Empty state fallback: `<tr><td colspan="4" class="muted">Sin herrajes</td></tr>`.
   - Footer row: `Subtotal Herrajes` and `${fmtMoney(cl.hardwareTotal)}`.

5. **Machining Breakdown Table Specification**:
   - 4 columns matching R3 specification: `Operación / Mecanizado`, `Pieza / Cara`, `Especificación`, `Detalle`.
   - Mapping from `cl.machining`:
     - `Operación / Mecanizado`: `o.op === 'rail-cut' ? 'Ranura (rail-cut)' : o.op === 'through-hole' ? 'Perforación pasante (through-hole)' : esc(o.op)`
     - `Pieza / Cara`: `<b>${esc(o.role)}</b> · Cara ${esc(o.face)}`
     - `Especificación`:
       - Groove: `Ranura ${o.width || 21} × ${o.depth} mm (Largo: ${o.length} mm)`
       - Drilling: `Ø ${o.diameter} mm × ${o.depth} mm prof.`
     - `Detalle`: `${o.qty} ${o.qty === 1 ? 'operación' : 'operaciones'} (${o.op === 'rail-cut' ? 'Encaje de fondo / gaveta' : 'Fijación de tirador'})`
   - Wrapper: `<div class="machining-section" id="machiningSection">`.
   - The table is **always rendered in the DOM**. On screen, `#mach` toggles `#machiningSection.style.display`. In `@media print`, `#machiningSection { display: block !important; }` guarantees it always prints.

6. **Prominent Grand Total Block (`.print-grand-total`)**:
   - Appears immediately following the tables.
   - Contains:
     - `.grand-total-row`: `Subtotal Paneles / Piezas (${cl.area.toFixed(2)} m²): ${fmtMoney(cl.panelsTotal)}`
     - `.grand-total-row`: `Subtotal Herrajes y Accesorios: ${fmtMoney(cl.hardwareTotal)}`
     - `.grand-total-banner`: `PRECIO TOTAL DEL PROYECTO: ${fmtMoney(cl.total)}`
   - Styled with bold high contrast for screen and print, with `page-break-inside: avoid`.

---

## 3. Features Discovered & Specification Matrix

### 3.1 DOM Elements Specification

| # | Selector | Element | R3 Purpose | Screen Visibility | Print Visibility |
|---|----------|---------|------------|-------------------|------------------|
| 1 | `#cutlist` | `<div class="cutlist">` | Container for all cutlist tables and print view | Visible when tab is `cutlist` (`display: block`) | Forced `display: block !important; height: auto !important;` |
| 2 | `.print-header` | `<div class="print-header">` | Print title, dimensions (`totalW × height × depth mm`), and date | Hidden on screen (`display: none;`) | Prominently displayed (`display: block !important;`) |
| 3 | `#cutlistTable` | `<table class="cutlist-table">` | 9-column granular cutlist table with mm dimensions | Displayed inside cutlist | Displayed with print styling |
| 4 | `#hardwareTable` | `<table class="hardware-table">` | 4-column hardware breakdown table with quantities and prices | Displayed inside cutlist | Displayed with print styling |
| 5 | `#machiningSection` | `<div class="machining-section">` | Container for machining table | Toggled via `#mach` checkbox | Forced `display: block !important;` |
| 6 | `#machiningTable` | `<table class="machining-table">` | 4-column machining operations table | Displayed inside `#machiningSection` | Displayed with print styling |
| 7 | `.print-grand-total` | `<div class="print-grand-total">` | Prominent grand total block with category subtotals and bold final total banner | Displayed at footer of cutlist | Displayed with high contrast border |
| 8 | `.btns` | `<div class="btns">` | CSV export, print button, and view options | Displayed on screen | Hidden in print (`display: none !important;`) |

### 3.2 Granular Cutlist Table Columns

| Column Index | Header Text | Class | Data Source | Sample Value |
|---|---|---|---|---|
| 1 | `ID` | default | `r.id` | `S1`, `H1`, `B1`, `O1`, `D1` |
| 2 | `Pieza / Rol` | default | `r.name`, `r.role` | `Lateral (vertical-side)` |
| 3 | `Orientación` | default | `r.orientation` | `vertical-yz`, `horizontal-xz`, `vertical-xy` |
| 4 | `Largo (mm)` | `n` | `r.length` | `1996` (mm) |
| 5 | `Ancho (mm)` | `n` | `r.width` | `764` (mm) |
| 6 | `Espesor (mm)` | `n` | `r.thickness` | `18` (mm) |
| 7 | `Cant.` | `n` | `r.qty` | `4` |
| 8 | `Precio unit.` | `n` | `r.unitPrice` | `$32.40` |
| 9 | `Precio total` | `n` | `r.total` | `$129.60` |

### 3.3 Hardware Breakdown Table Columns

| Column Index | Header Text | Class | Data Source | Sample Value |
|---|---|---|---|---|
| 1 | `Herraje` | default | `r.name` | `Bisagra`, `Corredera (par)`, `Tirador barra` |
| 2 | `Cantidad` | `n` | `r.qty` | `6` |
| 3 | `Precio unit.` | `n` | `r.unitPrice` | `$2.00` |
| 4 | `Precio total` | `n` | `r.total` | `$12.00` |

### 3.4 Machining Breakdown Table Columns

| Column Index | Header Text | Class | Data Source / Mapping | Sample Value |
|---|---|---|---|---|
| 1 | `Operación / Mecanizado` | default | `o.op` formatted | `Ranura (rail-cut)`, `Perforación pasante (through-hole)` |
| 2 | `Pieza / Cara` | default | `o.role`, `o.face` | `vertical-side · Cara back`, `door-front · Cara front` |
| 3 | `Especificación` | default | `o.width`, `o.depth`, `o.length`, `o.diameter` | `Ranura 21 × 5 mm (Largo: 1996 mm)`, `Ø 25 mm × 18 mm prof.` |
| 4 | `Detalle` | default | `o.qty`, `o.op`, `o.through` | `4 operaciones (Encaje de fondo / gaveta)` |

---

## 4. Edge Cases

| # | Feature / Scenario | Input / State | Observed / Expected Behavior |
|---|---|---|---|
| 1 | Printing from Design Tab | User presses `Ctrl+P` while on "Diseño" tab | `refresh()` has already populated `#cutlist`. Print stylesheet hides canvas and displays `#cutlist`. Output is complete tabular cutlist. |
| 2 | Machining Checkbox Unchecked | User leaves `#mach` unchecked on screen | `#machiningSection` is hidden on screen, but DOM contains `#machiningTable`. In print, `@media print` forces `#machiningSection { display: block !important; }`. |
| 3 | Zero Hardware Present | Open-shelf furniture with no doors, drawers, or rails | Hardware table displays clean fallback row: `<td colspan="4" class="muted">Sin herrajes</td>`. Subtotal displays `$0.00`. |
| 4 | Empty Machining Operations | Design with no grooved or drilled pieces | Machining table displays fallback row: `<td colspan="4" class="muted">Sin operaciones de mecanizado</td>`. Total operations displays `0`. |
| 5 | Row Selected on Screen | `state.cutSel === 'S1'` highlighted in yellow | Table row has `data-id="S1"`. Print CSS overrides highlight with `background: transparent !important; color: inherit !important;`. |
| 6 | Project Name Changed in UI | User types new name in `#name` input | `#name.oninput` triggers `refresh()`, updating `.print-header` title immediately in real-time. |
| 7 | Multi-Page Print Layout | Project with > 25 pieces spanning multiple pages | `page-break-inside: avoid` on `tr` and `.print-grand-total` prevents broken rows across page breaks. |

---

## 5. Exact JavaScript Implementation Code

The exact code blocks to integrate into `public/js/app.js`:

### 5.1 Update State Initialization (Line 118)
```javascript
  const state = {
    name: rec.name,
    project: M.normalizeProject(rec.data.columns ? rec.data : M.defaultProject()),
    selected: null,
    tab: 'design',
    newType: 'drawer',
    cutSel: null,
    showMach: true,
  };
```

### 5.2 Complete Replacement of `drawCutlist()` (Lines 519–565)
```javascript
  function drawCutlist() {
    const cl = layout.cutlist;
    const s = layout.settings;
    const cur = s.currency || '$';
    const selRow = cl.rows.find((r) => r.id === state.cutSel);
    const dateStr = new Date().toLocaleDateString();

    $('#cutlist').innerHTML = `
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

      <div class="btns" style="margin-bottom:12px">
        <button id="csv">Exportar CSV</button>
        <button id="print">Imprimir / PDF</button>
        <label class="muted"><input type="checkbox" id="mach" ${state.showMach ? 'checked' : ''}> Mostrar operaciones de mecanizado</label>
      </div>

      <div class="cutlist-section">
        <h3>Tabla de cortes (Desglose de paneles)</h3>
        <table class="cutlist-table" id="cutlistTable">
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
            ${cl.rows.map((r) => `
              <tr data-id="${r.id}" style="cursor:pointer;${r.id === state.cutSel ? 'background:#ffb800;color:#111' : ''}">
                <td><b>${r.id}</b></td>
                <td><b>${esc(r.name)}</b> <span class="muted">(${esc(r.role)})</span></td>
                <td>${esc(r.orientation)}</td>
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
      </div>

      <div class="hardware-section">
        <h3>Desglose de herrajes</h3>
        <table class="hardware-table" id="hardwareTable">
          <thead>
            <tr>
              <th>Herraje</th>
              <th class="n">Cantidad</th>
              <th class="n">Precio unit.</th>
              <th class="n">Precio total</th>
            </tr>
          </thead>
          <tbody>
            ${cl.hardware.map((r) => `
              <tr>
                <td><b>${esc(r.name)}</b></td>
                <td class="n">${r.qty}</td>
                <td class="n">${fmtMoney(r.unitPrice)}</td>
                <td class="n">${fmtMoney(r.total)}</td>
              </tr>
            `).join('') || '<tr><td colspan="4" class="muted">Sin herrajes</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">Subtotal Herrajes</td>
              <td class="n">${fmtMoney(cl.hardwareTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="machining-section" id="machiningSection" style="${state.showMach ? '' : 'display:none'}">
        <h3>Desglose de mecanizados y operaciones</h3>
        <p class="muted mach-note">rail-cut = ranura para encajar fondo o piso de gaveta · through-hole = perforación pasante para tiradores.</p>
        <table class="machining-table" id="machiningTable">
          <thead>
            <tr>
              <th>Operación / Mecanizado</th>
              <th>Pieza / Cara</th>
              <th>Especificación</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            ${cl.machining.map((o) => `
              <tr>
                <td><b>${o.op === 'rail-cut' ? 'Ranura (rail-cut)' : o.op === 'through-hole' ? 'Perforación pasante (through-hole)' : esc(o.op)}</b></td>
                <td><b>${esc(o.role)}</b> · Cara ${esc(o.face)}</td>
                <td>${o.op === 'rail-cut' ? `Ranura ${o.width || 21} × ${o.depth} mm (Largo: ${o.length} mm)` : `Ø ${o.diameter} mm × ${o.depth} mm prof.`}</td>
                <td>${o.qty} ${o.qty === 1 ? 'operación' : 'operaciones'} (${o.op === 'rail-cut' ? 'Encaje de fondo / gaveta' : 'Fijación de tirador'})</td>
              </tr>
            `).join('') || '<tr><td colspan="4" class="muted">Sin operaciones de mecanizado</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3">Total Operaciones</td>
              <td class="n">${cl.machining.reduce((a, o) => a + o.qty, 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="print-grand-total">
        <div class="grand-total-row">
          <span>Subtotal Paneles / Piezas (${cl.area.toFixed(2)} m²):</span>
          <b>${fmtMoney(cl.panelsTotal)}</b>
        </div>
        <div class="grand-total-row">
          <span>Subtotal Herrajes y Accesorios:</span>
          <b>${fmtMoney(cl.hardwareTotal)}</b>
        </div>
        <div class="grand-total-banner">
          <span>PRECIO TOTAL DEL PROYECTO:</span>
          <span>${fmtMoney(cl.total)}</span>
        </div>
      </div>
      <p class="muted print-note" style="margin-top:10px;font-size:11px">Los precios unitarios de materiales y herrajes se configuran en los ajustes del proyecto (⚙).</p>
    `;

    // Tarjetas oblicuas 3D a la derecha (solo pantalla)
    $('#cards').innerHTML = selRow
      ? `<div class="pcard big sel">${pieceSvg(selRow, true)}<div class="pmeta"><span class="pid">${selRow.id}</span><span><b>${esc(selRow.name)}</b><br><span class="muted">${selRow.length} × ${selRow.width} × ${selRow.thickness} mm · ${fmtMoney(selRow.unitPrice)} c/u</span></span><span class="qty">×${selRow.qty}</span></div></div>
         <div class="pgrid">${cl.rows.filter((r) => r.id !== selRow.id).map(cardHtml).join('')}</div>`
      : `<div class="pgrid">${cl.rows.map(cardHtml).join('')}</div>`;

    const pick = (id) => {
      state.cutSel = state.cutSel === id ? null : id;
      drawCutlist();
    };

    $('#cutlist').querySelectorAll('tr[data-id]').forEach((tr) => (tr.onclick = () => pick(tr.dataset.id)));
    $('#cards').querySelectorAll('.pcard[data-id]').forEach((c) => (c.onclick = () => pick(c.dataset.id)));
    const machBox = $('#mach');
    if (machBox) {
      machBox.onchange = (e) => {
        state.showMach = e.target.checked;
        const sec = $('#machiningSection');
        if (sec) sec.style.display = state.showMach ? '' : 'none';
      };
    }
    const csvBtn = $('#csv');
    if (csvBtn) {
      csvBtn.onclick = () => {
        const blob = new Blob([cutlistCSV(cl, cur)], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (state.name || 'mueble') + '-cutlist.csv';
        a.click();
      };
    }
    const printBtn = $('#print');
    if (printBtn) {
      printBtn.onclick = () => window.print();
    }
  }
```

### 5.3 Complete Replacement of `refresh()` (Lines 569–577)
```javascript
  function refresh() {
    layout = computeLayout(state.project);
    $('#price').textContent = fmtMoney(layout.cutlist.total);
    viewer.update(layout, new Set(state.selected ? collectIds(state.selected) : []));
    drawCutlist();
    if (state.tab === 'design') {
      drawCanvas();
      drawDock();
    }
  }
```

### 5.4 Update Real-Time Name Synchronization (Line 626)
```javascript
  $('#name').oninput = (e) => {
    state.name = e.target.value || 'Sin título';
    refresh();
    save();
  };
```

---

## 6. Caveats

- **Machining Pricing**: Machining operations (`rail-cut` grooves and `through-hole` pull holes) are listed with their technical specifications (diameter, depth, width, length, through, face, quantity), but are not priced in `layout.js` (unpriced by baseline design). They are properly accounted for in the Machining Breakdown Table.
- **Companion Stylesheet**: The DOM structure utilizes classes `.print-header`, `.print-grand-total`, `.machining-section`, and table classes. The CSS rules for these classes in `public/style.css` are specified concurrently by `teamwork_preview_spec_miner_m3_1`. The IDs and classes specified here are directly coordinated.
- **Native Print Invocation**: `window.print()` relies on the browser's native print engine. Headless test environments should verify DOM structures and inspect computed media styles.

---

## 7. Conclusion

This specification provides the exact, drop-in DOM and JavaScript implementation required for Acceptance Criteria R3:
1. **Dedicated `.print-header`**: Displays project name, overall dimensions (`totalW × height × depth mm`), and date, visible in print.
2. **Granular Cutlist Table**: Contains exactly the 9 required columns with exact millimeter dimensions (`Largo (mm)`, `Ancho (mm)`, `Espesor (mm)`), piece role, and unit/total pricing.
3. **Hardware Breakdown Table**: Full itemization of hardware (`slides`, `hinges`, `pulls`, `rails`, `brackets`) with quantities, unit prices, line totals, and hardware subtotal.
4. **Machining Breakdown Table**: 4-column granular operations breakdown (`Operación / Mecanizado`, `Pieza / Cara`, `Especificación`, `Detalle`) always present in the DOM and guaranteed to print.
5. **Prominent Grand Total Block (`.print-grand-total`)**: High-contrast, prominent summary block showing Subtotal Paneles, Subtotal Herrajes, and a bold final project total banner in header and footer.
6. **Unconditional `refresh()`**: `#cutlist` is updated on every state refresh, guaranteeing full tabular printouts even when triggered from the Design tab.

---

## 8. Verification Method

### 8.1 Automated DOM & Component Verification
Create or run a Node DOM test (e.g. using `jsdom` or simulated DOM structure):
1. Load `app.js` and initialize project with default settings.
2. Query `#cutlist .print-header`:
   - Assert text contains furniture name (e.g. "Sin título" or "Madera local").
   - Assert text contains overall dimensions regex: `/\d+\s*×\s*\d+\s*×\s*\d+\s*mm/`.
   - Assert text contains date string.
3. Query `#cutlist #cutlistTable`:
   - Assert headers include: `ID`, `Pieza / Rol`, `Orientación`, `Largo (mm)`, `Ancho (mm)`, `Espesor (mm)`, `Cant.`, `Precio unit.`, `Precio total`.
   - Assert row cells 4, 5, 6 contain numbers in millimeters (e.g. `1996`, `764`, `18`), not meters with decimals (`0.764`).
4. Query `#cutlist #hardwareTable`:
   - Assert headers include: `Herraje`, `Cantidad`, `Precio unit.`, `Precio total`.
   - Assert footer contains Subtotal Herrajes matching `cl.hardwareTotal`.
5. Query `#cutlist #machiningTable`:
   - Assert headers include: `Operación / Mecanizado`, `Pieza / Cara`, `Especificación`, `Detalle`.
   - Assert table exists in DOM even when `#mach` checkbox is unchecked.
6. Query `#cutlist .print-grand-total`:
   - Assert presence of `Subtotal Paneles`, `Subtotal Herrajes`, and `PRECIO TOTAL DEL PROYECTO`.
   - Assert mathematical equality: `panelsTotal + hardwareTotal === total`.
7. Verify Design Tab Print Readiness:
   - When `state.tab === 'design'`, inspect `$('#cutlist').innerHTML`.
   - Assert `$('#cutlist').innerHTML.length > 500` and contains `table` elements.

### 8.2 Interactive Browser Verification
1. Start server: `node server/server.js` and open `http://localhost:3000`.
2. While on the **Diseño** tab, trigger Print (`Ctrl+P`).
   - Expected: Print preview shows solely the tabular cutlist with header, panel cutlist table, hardware table, machining table, and grand total block. Canvas, 3D viewer, and dock are completely hidden.
3. Switch to **Cutlist** tab and click "Imprimir / PDF".
   - Expected: Identical clean tabular print layout.
4. Verify that all dimensions in the panel table are in millimeters (e.g. `1996 × 764 × 18 mm`).
