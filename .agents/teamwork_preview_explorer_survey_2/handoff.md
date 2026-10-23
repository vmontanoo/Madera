# Handoff Report: Frontend Architecture, Dashboard, Demos & Doors Catalog (R2 & R3)

**Author**: Explorer Survey 2 (Frontend Architecture, Dashboard, Demos & Doors Catalog)  
**Date**: 2026-10-23T00:55:00Z  
**Target Milestone**: 2026-10-23 Evolution Survey (Requirements R2 & R3)  
**Scope**: 
1. Main Dashboard UI (Two tabs: "Galería de Demos" & "Mis Proyectos" with rename, duplicate, delete)
2. Four Pre-designed Modular Demos (Closet, Nightstand, TV Center, Kitchen Base)
3. Header Actions ("+ Nuevo mueble" & "Importar archivo" JSON)
4. UI Control Cleanup (Dock control panel streamlining)
5. Expanded Door Types (Sliding, Bi-fold, Lift-up Flap, Batientes)
6. Cutlist & Hardware Integration (Itemized specific hardware and cutlist math)

---

## 1. Observation

### 1.1 Host HTML and App Mounting (`public/index.html`)
- `public/index.html` lines 1-22:
  ```html
  17: <body>
  18:   <div id="app"></div>
  19:   <script type="module" src="/js/app.js"></script>
  20: </body>
  ```
- **Direct observation**: `index.html` is a clean, minimal shell containing only `<div id="app"></div>`. All views (`authView`, `listView`, `editorView`) are dynamically rendered into `#app` by `public/js/app.js`. There are no hardcoded views or legacy templates in `index.html`.

### 1.2 Current Project List View & Header (`public/js/app.js`)
- `public/js/app.js` lines 64-100:
  ```javascript
  64: async function listView() {
  65:   const projects = await api('GET', '/api/projects');
  66:   $app.innerHTML = `<div class="list">
  67:     <header><h2 style="margin:0">Mis proyectos</h2>
  68:     <div class="row"><button class="primary" id="new">+ Nuevo mueble</button><button id="out">Salir</button></div></header>
  69:     ${projects.length ? '' : '<p class="muted">Aún no tienes proyectos.</p>'}
  70:     ${projects
  71:       .map(
  72:         (p) => `<div class="proj" data-id="${p.id}"><span class="name" data-a="open">${esc(p.name)}</span>
  73:       <span class="muted">${new Date(p.updated_at).toLocaleString()}</span>
  74:       <button data-a="dup">Duplicar</button><button data-a="del" class="danger">Eliminar</button></div>`
  75:       )
  76:       .join('')}
  77:   </div>`;
  ...
  86:   $app.querySelectorAll('.proj').forEach((el) => {
  87:     const id = el.dataset.id;
  88:     el.querySelector('[data-a=open]').onclick = () => (location.hash = '#/p/' + id);
  89:     el.querySelector('[data-a=dup]').onclick = async () => {
  90:       await api('POST', `/api/projects/${id}/duplicate`);
  91:       listView();
  92:     };
  93:     el.querySelector('[data-a=del]').onclick = async () => {
  94:       if (confirm('¿Eliminar este proyecto?')) {
  95:         await api('DELETE', '/api/projects/' + id);
  96:         listView();
  97:       }
  98:     };
  99:   });
  100: }
  ```
- **Direct observations**:
  1. No tabs exist in `listView()`. It only renders a single list called "Mis proyectos".
  2. In the header row (line 68), there is only `+ Nuevo mueble` and `Salir`. There is NO "Importar archivo" button.
  3. In each `.proj` card (lines 72-74), there is `Duplicar` and `Eliminar`, but NO `Renombrar` (rename) action.
  4. The backend in `server/server.js` line 128 already implements `PUT /api/projects/:id` accepting `{ name, data }`:
     ```javascript
     128: app.put('/api/projects/:id', auth, (req, res) => {
     129:   const p = own(req);
     ...
     132:   const { name, data } = req.body || {};
     133:   db.prepare('UPDATE projects SET name = ?, data = ?, updated_at = ? WHERE id = ?').run(
     134:     name ?? p.name,
     135:     data ? JSON.stringify(data) : p.data,
     136:     Date.now(),
     137:     p.id
     138:   );
     ```
     Therefore, the backend is 100% ready to support project renaming without any server API changes.

### 1.3 Module Control Dock Panel Clutter (`public/js/app.js`)
- `public/js/app.js` lines 427-448:
  ```javascript
  427: const typeOpts = (cur, list) => list.map((t) => `<option value="${t}" ${t === cur ? 'selected' : ''}>${LABELS[t] || PULLS[t]?.label || t}</option>`).join('');
  428: const node = f.node;
  429: const hasFront = node.type !== 'drawer';
  430: const showPull = node.type === 'drawer' || (node.front && node.front !== 'none');
  431: dock.innerHTML = `<b>1 seleccionado</b>
  432:   <div class="row"><label>Contenido</label><select id="type">${typeOpts(node.type, TYPES)}</select></div>
  433:   ${hasFront ? `<div class="row"><label>Puertas</label><select id="front">${typeOpts(node.front || 'none', FRONTS)}</select></div>` : ''}
  434:   ${showPull ? `<div class="row"><label>Manilla</label><select id="pull">${typeOpts(node.pull || 'default', ['default', ...Object.keys(PULLS)])}</select></div>` : ''}
  435:   <div class="row"><label>Ancho</label><input id="w" value="${m3(c.w)}"><span class="muted">m</span></div>
  436:   <div class="row"><label>Alto</label><input id="h" value="${m3(c.h)}"><span class="muted">m</span></div>
  437:   ${node.type === 'drawer' ? `<div class="row"><label>Gavetas</label><input id="cnt" type="number" min="1" max="10" value="${node.count || 1}"></div>` : ''}
  438:   ${node.type === 'multiple' ? `<div class="row"><label>Dirección</label><select id="dir"><option value="v" ${node.dir === 'v' ? 'selected' : ''}>vertical (apilados)</option><option value="h" ${node.dir === 'h' ? 'selected' : ''}>horizontal (lado a lado)</option></select></div>` : ''}
  439:   <div class="row"><label>Nuevo módulo</label><select id="newType">${typeOpts(state.newType, ['shelf', 'rail', 'drawer', 'doors', 'left-door', 'right-door'])}</select></div>
  440:   <div class="btns">
  441:     <button id="inV">＋ Dentro ↕ (apilar)</button><button id="inH">＋ Dentro ↔ (lado a lado)</button>
  442:     <button id="sibTop">＋ Arriba</button><button id="sibV">＋ Debajo</button><button id="sibH">＋ Al lado</button>
  443:     ${f.parent ? '<button id="parentTop">＋ Sobre módulo padre</button>' : ''}
  444:     ${f.parent ? '<button id="up">↑ Seleccionar padre</button>' : ''}
  445:     <button id="none">Deseleccionar</button>
  446:   </div>
  447:   <button class="danger" id="del">🗑 Eliminar módulo</button>`;
  ```
- **Direct observations**:
  1. Line 439 includes `['doors', 'left-door', 'right-door']` in `newType`. In `model.js` line 18, `doors`, `left-door`, `right-door` were migrated to `front` attributes on modules. Keeping them in `newType` is obsolete legacy clutter.
  2. Lines 441-445 have 8 disorganized, redundant buttons:
     - `parentTop` ("＋ Sobre módulo padre") is confusing and duplicates `addOnTop` (+ icons on canvas) and `sibTop`.
     - `none` ("Deseleccionar") is redundant because clicking anywhere on the background canvas or re-clicking the cell already deselects (`select(id)` line 402: `state.selected = state.selected === id ? null : id`).
     - Six separate addition buttons (`inV`, `inH`, `sibTop`, `sibV`, `sibH`, `parentTop`) overwhelm the user.

### 1.4 Door Types and Hardware Calculation Engine (`public/js/layout.js`)
- `public/js/layout.js` lines 82-93:
  ```javascript
  82: export const FRONTS = ['none', 'doors', 'left-door', 'right-door'];
  83: export const LABELS = {
  84:   multiple: 'Contenedor (varios módulos)',
  85:   shelf: 'Abierto / estante',
  86:   rail: 'Perchero',
  87:   drawer: 'Gaveta',
  88:   none: 'Sin puertas',
  89:   doors: 'Dos puertas',
  90:   'left-door': 'Puerta (bisagra izquierda)',
  91:   'right-door': 'Puerta (bisagra derecha)',
  92:   default: 'Por defecto del proyecto',
  93: };
  ```
- `public/js/layout.js` lines 145-165:
  ```javascript
  145:   const doorOverlay = (n, cx0, cy0, w, h, col) => {
  146:     const cx = cx0 - t / 2;
  147:     const cy = cy0 - t / 2;
  148:     const cw = w + t;
  149:     const ch = h + t;
  150:     const fc = s.frontClearance;
  151:     const style = pullOf(n);
  152:     const holes = PULLS[style].holes;
  153:     const hingesPer = ch > 1800 ? 4 : ch > 1000 ? 3 : 2;
  154:     const door = (px, dw, side) => {
  155:       add({ name: 'Puerta', mat: 'front', kind: 'front', x: px, y: cy + fc, z: D, sx: dw, sy: ch - 2 * fc, sz: t, holes, pull: style, holeLayout: 'v', col, nodeId: n.id, side });
  156:       countPull(style);
  157:       hw.hinges += hingesPer;
  158:     };
  159:     if (n.front === 'doors') {
  160:       const dw = (cw - 3 * fc) / 2;
  161:       door(cx + fc, dw, 'right');
  162:       door(cx + 2 * fc + dw, dw, 'left');
  163:     } else if (n.front === 'left-door') door(cx + fc, cw - 2 * fc, 'right');
  164:     else if (n.front === 'right-door') door(cx + fc, cw - 2 * fc, 'left');
  165:   };
  ```
- `public/js/layout.js` lines 115, 335-350:
  ```javascript
  115: const hw = { slides: 0, hinges: 0, pulls: {}, rails: 0, brackets: 0 };
  ...
  345: if (hw.slides) hardware.push({ name: 'Corredera (par)', qty: hw.slides, unitPrice: s.slidePrice, total: hw.slides * s.slidePrice });
  346: if (hw.hinges) hardware.push({ name: 'Bisagra', qty: hw.hinges, unitPrice: s.hingePrice, total: hw.hinges * s.hingePrice });
  ```
- **Direct observations**:
  1. `FRONTS` only has `['none', 'doors', 'left-door', 'right-door']`.
  2. There is NO support for sliding doors (`sliding`), bi-fold doors (`bifold`), or lift-up flap doors (`lift-up`).
  3. `hw` hardware object only tracks `slides`, `hinges`, `pulls`, `rails`, `brackets`. It does not calculate track sets, bi-fold hinges, or gas struts.
  4. In `SETTING_META` and `DEFAULTS`, there are no price settings for sliding tracks, bi-fold hinges, or gas pistons.

---

## 2. Logic Chain

### 2.1 Dashboard Architecture & Routing
1. **Observation 1.1 & 1.2**: In `public/js/app.js`, routing switches between `authView()`, `editorView(id)`, and `listView()`. Currently, `listView()` is a bare-bones list.
2. **Requirement R2**: The user expects a full Dashboard with two tabs:
   - "Galería de Demos" (Pre-designed furniture templates)
   - "Mis Proyectos" (user's saved projects with duplicate, rename, delete actions, shaded/active tab styling)
   - Header actions: `+ Nuevo mueble` and `Importar archivo` (JSON).
3. **Logic**:
   - `listView()` should be evolved into a stateful `dashboardView()`.
   - Maintain active tab state `let currentTab = 'projects' | 'demos'` (defaulting to `'projects'` with shaded/active styling).
   - Render persistent navigation tabs:
     ```html
     <div class="dash-tabs">
       <button class="dash-tab ${currentTab === 'projects' ? 'active' : ''}" data-tab="projects">Mis Proyectos</button>
       <button class="dash-tab ${currentTab === 'demos' ? 'active' : ''}" data-tab="demos">Galería de Demos</button>
     </div>
     ```
   - When `currentTab === 'projects'`:
     - Render user projects with action buttons: `Abrir`, `Renombrar`, `Duplicar`, `Eliminar`.
     - Renaming calls `api('PUT', '/api/projects/' + id, { name: newName })` (verified ready in server.js line 128).
   - When `currentTab === 'demos'`:
     - Render a responsive 2x2 grid of the 4 pre-designed furniture demos.
     - Each card displays preview diagram, dimensions, features, and an "Abrir plantilla" button.
     - Clicking "Abrir plantilla" sends `POST /api/projects` with `{ name: demo.name, data: demo.data }` and redirects to `#/p/${newId}`.
   - Header actions:
     - `+ Nuevo mueble`: calls `POST /api/projects` with default blank project and redirects to `#/p/${id}`.
     - `Importar archivo`: opens file picker (`<input type="file" accept=".json,application/json">`), parses JSON, validates `columns` array, normalizes via `M.normalizeProject()`, posts to `/api/projects`, and redirects to `#/p/${id}`.

### 2.2 Four Pre-Designed Demos Specification
From Requirement R2, four specific furniture demos are required. Their modular tree structures must adhere strictly to Madera Local's geometry rules:

#### Demo 1: Closet Modular Completo (`closet-modular`)
- **Category**: Dormitorio / Almacenaje
- **Dimensions**: Alto: 2100 mm, Fondo: 550 mm, Ancho total: 2022 mm (3 columnas: 750 mm, 750 mm, 450 mm + 4 laterales de 18 mm).
- **Column 1 (750 mm)**:
  - Top maletero shelf: `shelf`, size: 400 mm
  - Hanging rail section: `rail`, size: 1050 mm (holds shirts, jackets)
  - Bottom drawer block: `drawer`, count: 3, size: 550 mm (cajonera de 3 gavetas)
- **Column 2 (750 mm)**:
  - Top maletero shelf: `shelf`, size: 400 mm
  - Double hanging section: two hanging rods (`rail`), size 800 mm and 800 mm
- **Column 3 (450 mm)**:
  - Shelf tower (torre de estantes): 5 shelves (`shelf`), sizes: 380, 380, 380, 380, 480 mm
- **Settings**: `height: 2100`, `depth: 550`, `thickness: 18`, `pullStyle: 'bar'`.

#### Demo 2: Mesa de Noche Moderna (`mesa-noche`)
- **Category**: Dormitorio / Auxiliar
- **Dimensions**: Alto: 550 mm, Fondo: 400 mm, Ancho total: 536 mm (1 columna: 500 mm + 2 laterales de 18 mm).
- **Structure**: Single column (500 mm), vertical split:
  - Upper open niche: `shelf`, size: 180 mm (ideal for phone, books, clock)
  - Lower drawers: `drawer`, count: 2, size: 334 mm (2 gavetas modernas)
- **Settings**: `height: 550`, `depth: 400`, `thickness: 18`, `overhang: 0` (minimalist flush lines), `pullStyle: 'profile'`.

#### Demo 3: Centro de Entretenimiento / TV Rack (`centro-tv`)
- **Category**: Sala de estar / Multimedia
- **Dimensions**: Alto: 600 mm, Fondo: 420 mm, Ancho total: 1872 mm (3 columnas: 500 mm, 800 mm, 500 mm + 4 laterales de 18 mm).
- **Column 1 (500 mm)**:
  - Upper open niche: `shelf`, size: 220 mm
  - Lower closed cabinet: `shelf`, size: 344 mm, with `front: 'left-door'`
- **Column 2 (800 mm - Center Media Bay)**:
  - Upper soundbar / console niche: `shelf`, size: 220 mm (open for airflow & remotes)
  - Lower wide media drawers: `drawer`, count: 2, size: 344 mm (for cables, remotes, games)
- **Column 3 (500 mm)**:
  - Upper open niche: `shelf`, size: 220 mm
  - Lower closed cabinet: `shelf`, size: 344 mm, with `front: 'right-door'`
- **Settings**: `height: 600`, `depth: 420`, `thickness: 18`, `overhang: 0`, `pullStyle: 'profile'`.

#### Demo 4: Mueble Bajo de Cocina Modular (`cocina-bajo`)
- **Category**: Cocina / Repostero
- **Dimensions**: Alto: 850 mm, Fondo: 580 mm, Ancho total: 1254 mm (2 columnas: 450 mm, 750 mm + 3 laterales de 18 mm).
- **Column 1 (450 mm - Cajonera Cacerolero)**:
  - Triple kitchen drawer unit: `drawer`, count: 3, size: 814 mm (1 cubiertero superior + 2 caceroleros hondos)
- **Column 2 (750 mm - Módulo Bajo Doble Puerta)**:
  - Two-door cabinet with intermediate storage shelf: container with `front: 'doors'`, containing two shelves of sizes 400 mm and 396 mm.
- **Settings**: `height: 850`, `depth: 580`, `thickness: 18`, `overhang: 0` (flush top for granite/quartz countertop), `pullStyle: 'profile'`.

### 2.3 UI Control Cleanup & Streamlining
1. **Observation 1.3**: The current dock has 9 uncoordinated buttons (`inV`, `inH`, `sibTop`, `sibV`, `sibH`, `parentTop`, `up`, `none`, `del`) and obsolete door front strings in the `newType` dropdown.
2. **Logic**:
   - Clean up `newType` select options to only legitimate module body types:
     `const VALID_NEW_TYPES = ['shelf', 'drawer', 'rail'];`
     Labels: "Estante abierto", "Gaveta(s)", "Barra perchero".
   - Group the button actions into a streamlined, intuitive 2-level tool palette:
     1. **Subdivisión (Dentro del módulo)**:
        - `[ ⬍ Dividir en altura ]` (creates internal vertical split / shelf)
        - `[ ⬌ Dividir en ancho ]` (creates internal horizontal split / partition)
     2. **Adición adyacente**:
        - `[ ＋ Añadir adyacente ]` (adds sibling module in parent's direction)
     3. **Navegación y Gestión**:
        - `f.parent ? '[ ↑ Seleccionar contenedor ]' : ''`
        - `[ 🗑 Eliminar módulo ]` (danger styling)
   - Remove obsolete `parentTop` (redundant with canvas top `+` and `sibTop`) and `none` (redundant with clicking canvas).
   - This eliminates 4 redundant buttons, reduces clutter by >45%, and clarifies the user interaction model.

### 2.4 Expanded Door Types Architecture
1. **Observation 1.4**: `FRONTS` in `layout.js` only has batiente options: `['none', 'doors', 'left-door', 'right-door']`.
2. **Requirement R3**:
   - `sliding`: Puertas corredizas superpuestas con riel
   - `bifold`: Puertas plegables / acordeón
   - `lift-up`: Puertas abatibles hacia arriba con pistones a gas
   - Keep existing `doors`, `left-door`, `right-door`
3. **Geometry and Mechanics**:
   - **`sliding` (Puertas corredizas)**:
     - 2 panels running on double parallel tracks.
     - Overlap (traslape central): `overlap = 26 mm`.
     - Individual door width: `dw = (cw + overlap - 2 * fc) / 2`.
     - Height: `dh = ch - 2 * fc`.
     - Z-positioning in 3D:
       - Door 1 (inner): `z = D`
       - Door 2 (outer): `z = D + t + 2`
       - This prevents 3D z-fighting and gives realistic depth for the two sliding tracks!
     - Pull: outer edge pulls on each door.
   - **`bifold` (Puertas plegables / acordeón)**:
     - 2 panels joined down the center by bi-fold hinges.
     - Individual leaf width: `dw = (cw - 3 * fc) / 2`.
     - Height: `dh = ch - 2 * fc`.
     - Leaf 1 is anchored to lateral (`side = 'bifold-anchor'`); Leaf 2 folds over (`side = 'bifold-fold'`).
     - Z-positioning: `z = D`.
     - Pull: central pull near the folding joint.
   - **`lift-up` (Puertas abatibles hacia arriba)**:
     - 1 full-width horizontal flap panel.
     - Width: `dw = cw - 2 * fc`.
     - Height: `dh = ch - 2 * fc`.
     - Hinged at top edge (`side = 'lift-up'`); supported by 2 pneumatic gas struts on the left and right.
     - Pull: centered along the bottom edge (`holeLayout = 'h'`).

### 2.5 Cutlist and Hardware Integration
1. **Observation 1.4**: `hw` in `computeLayout()` only records slides, hinges, pulls, rails, and brackets.
2. **Logic**:
   - Expand `hw` structure in `layout.js`:
     ```javascript
     const hw = {
       slides: 0,
       hinges: 0,
       pulls: {},
       rails: 0,
       brackets: 0,
       slidingTracks: 0, // Kit de rieles y carros para corredizas
       bifoldHinges: 0,  // Bisagras de libro para unión central plegable
       bifoldGuides: 0,  // Guías corredizas superiores plegables
       gasStruts: 0      // Pistones amortiguadores a gas
     };
     ```
   - Hardware calculation per door type:
     - For `sliding`: `hw.slidingTracks += 1;` (1 complete kit with top/bottom tracks and rolling carriages per sliding module).
     - For `bifold`:
       - Lateral carcass hinges: `hw.hinges += (ch > 1200 ? 3 : 2);`
       - Central bi-fold hinges: `hw.bifoldHinges += (ch > 1200 ? 3 : 2);`
       - Upper roller guide: `hw.bifoldGuides += 1;`
     - For `lift-up`:
       - Top carcass hinges: `hw.hinges += 2;`
       - Gas struts: `hw.gasStruts += 2;` (pair of gas lift pistons).
   - Price settings in `DEFAULTS`:
     - `slidingTrackPrice: 28` (por kit de rieles y carros)
     - `bifoldHingePrice: 4` (por bisagra de libro)
     - `bifoldGuidePrice: 8` (por guía superior)
     - `gasStrutPrice: 6` (por pistón a gas)
   - Table rows in Cutlist:
     - Map new door names to `role: 'door-front'` in `ROLE` dictionary:
       ```javascript
       'Puerta corrediza': 'door-front',
       'Puerta plegable': 'door-front',
       'Puerta abatible arriba': 'door-front',
       ```
     - These automatically appear with ID prefix `O1`, `O2` in the cutlist table, with exact mm dimensions `dh × dw × t`, material `front`, and unit pricing based on square meters.
     - Itemize all hardware rows in the `hardware-table` with quantity, unit price, and subtotal.
     - Grand total banner and print view reflect the comprehensive price accurately.

---

## 3. Caveats

1. **Simulated vs Production Google OAuth**:
   - While Survey 1 investigates Google OAuth, the frontend dashboard actions must work seamlessly whether authenticated via local session, simulated Google OAuth, or production OAuth. The dashboard uses `GET /api/me` and `GET /api/projects`.
2. **Z-Order in 2D SVG**:
   - In the 2D SVG canvas (`drawCanvas()`), sliding doors overlap. Drawing an overlap stroke line (`stroke="#222" stroke-width="2"`) ensures the two distinct sliding panels remain visually clear in 2D.
3. **No Database Migration Needed**:
   - The project data stored in SQLite's `projects.data` column is JSON text (`JSON.stringify(data)`). Therefore, adding new door types (`front: 'sliding' | 'bifold' | 'lift-up'`) requires zero database schema modifications or migrations.
4. **3D Animation Coordination (Survey 3)**:
   - This survey establishes the geometry and semantic properties (`side: 'sliding-inner'|'sliding-outer'`, `side: 'bifold-anchor'|'bifold-fold'`, `side: 'lift-up'`) needed for open door animations. Explorer Survey 3 will utilize these exact tags for animating render states in `viewer.js`.

---

## 4. Conclusion & Actionable Proposals

### 4.1 Concrete File Blueprint for Pre-Designed Demos (`public/js/demos.js`)
Create a new ESM file `public/js/demos.js` containing the 4 validated pre-designed furniture models:

```javascript
// public/js/demos.js
import { DEFAULTS, uid } from './layout.js';

export const DEMOS = [
  {
    id: 'closet-modular',
    name: 'Closet modular completo',
    category: 'Dormitorio',
    description: 'Armario ropero completo de 3 columnas con repisas superiores, percheros dobles para abrigos y cajonera triple.',
    dimensions: '2022 × 2100 × 550 mm',
    tags: ['Perchero doble', 'Cajonera (x3)', 'Torre estantes'],
    data: {
      settings: { ...DEFAULTS, height: 2100, depth: 550, thickness: 18, overhang: 0, pullStyle: 'bar' },
      columns: [
        {
          id: 'c1',
          width: 750,
          root: {
            id: 'm-c1',
            type: 'multiple',
            dir: 'v',
            size: 1,
            children: [
              { id: 'c1-top', type: 'shelf', size: 400 },
              { id: 'c1-rail', type: 'rail', size: 1050 },
              { id: 'c1-drawers', type: 'drawer', size: 550, count: 3 }
            ]
          }
        },
        {
          id: 'c2',
          width: 750,
          root: {
            id: 'm-c2',
            type: 'multiple',
            dir: 'v',
            size: 1,
            children: [
              { id: 'c2-top', type: 'shelf', size: 400 },
              { id: 'c2-rail1', type: 'rail', size: 800 },
              { id: 'c2-rail2', type: 'rail', size: 800 }
            ]
          }
        },
        {
          id: 'c3',
          width: 450,
          root: {
            id: 'm-c3',
            type: 'multiple',
            dir: 'v',
            size: 1,
            children: [
              { id: 'c3-s1', type: 'shelf', size: 380 },
              { id: 'c3-s2', type: 'shelf', size: 380 },
              { id: 'c3-s3', type: 'shelf', size: 380 },
              { id: 'c3-s4', type: 'shelf', size: 380 },
              { id: 'c3-s5', type: 'shelf', size: 480 }
            ]
          }
        }
      ]
    }
  },
  {
    id: 'mesa-noche',
    name: 'Mesa de noche moderna',
    category: 'Dormitorio',
    description: 'Mesa de noche compacta y estilizada con nicho superior abierto para libros/móvil y dos gavetas inferiores.',
    dimensions: '536 × 550 × 400 mm',
    tags: ['Nicho abierto', '2 Gavetas', 'Tirador perfil gola'],
    data: {
      settings: { ...DEFAULTS, height: 550, depth: 400, thickness: 18, overhang: 0, pullStyle: 'profile' },
      columns: [
        {
          id: 'col-n',
          width: 500,
          root: {
            id: 'm-n',
            type: 'multiple',
            dir: 'v',
            size: 1,
            children: [
              { id: 'n-niche', type: 'shelf', size: 180 },
              { id: 'n-drawers', type: 'drawer', size: 334, count: 2 }
            ]
          }
        }
      ]
    }
  },
  {
    id: 'centro-tv',
    name: 'Centro de entretenimiento TV',
    category: 'Living / TV',
    description: 'Rack para televisores de hasta 75 pulgadas con nicho central para consola/soundbar, gavetas amplias y gabinetes laterales.',
    dimensions: '1872 × 600 × 420 mm',
    tags: ['Nicho consola', 'Puertas batientes', '2 Gavetas amplias'],
    data: {
      settings: { ...DEFAULTS, height: 600, depth: 420, thickness: 18, overhang: 0, pullStyle: 'profile' },
      columns: [
        {
          id: 'col-tv1',
          width: 500,
          root: {
            id: 'm-tv1',
            type: 'multiple',
            dir: 'v',
            size: 1,
            children: [
              { id: 'tv1-open', type: 'shelf', size: 220 },
              { id: 'tv1-door', type: 'shelf', size: 344, front: 'left-door' }
            ]
          }
        },
        {
          id: 'col-tv2',
          width: 800,
          root: {
            id: 'm-tv2',
            type: 'multiple',
            dir: 'v',
            size: 1,
            children: [
              { id: 'tv2-niche', type: 'shelf', size: 220 },
              { id: 'tv2-drawers', type: 'drawer', size: 344, count: 2 }
            ]
          }
        },
        {
          id: 'col-tv3',
          width: 500,
          root: {
            id: 'm-tv3',
            type: 'multiple',
            dir: 'v',
            size: 1,
            children: [
              { id: 'tv3-open', type: 'shelf', size: 220 },
              { id: 'tv3-door', type: 'shelf', size: 344, front: 'right-door' }
            ]
          }
        }
      ]
    }
  },
  {
    id: 'cocina-bajo',
    name: 'Mueble bajo de cocina modular',
    category: 'Cocina',
    description: 'Módulo bajo de cocina estándar para encimera: cajonera de 3 niveles (cubiertero + caceroleros) y gabinete de 2 puertas con repisa interna.',
    dimensions: '1254 × 850 × 580 mm',
    tags: ['Cajonera triple', '2 Puertas', 'Enrasado para encimera'],
    data: {
      settings: { ...DEFAULTS, height: 850, depth: 580, thickness: 18, overhang: 0, pullStyle: 'profile' },
      columns: [
        {
          id: 'col-k1',
          width: 450,
          root: {
            id: 'm-k1',
            type: 'drawer',
            size: 814,
            count: 3
          }
        },
        {
          id: 'col-k2',
          width: 750,
          root: {
            id: 'm-k2',
            type: 'multiple',
            dir: 'v',
            size: 1,
            front: 'doors',
            children: [
              { id: 'k2-s1', type: 'shelf', size: 400 },
              { id: 'k2-s2', type: 'shelf', size: 396 }
            ]
          }
        }
      ]
    }
  }
];

export function cloneDemoProject(demoId) {
  const demo = DEMOS.find((d) => d.id === demoId);
  if (!demo) return null;
  const copy = JSON.parse(JSON.stringify(demo.data));
  const reassign = (node) => {
    node.id = uid();
    (node.children || []).forEach(reassign);
  };
  copy.columns.forEach((c) => {
    c.id = uid();
    reassign(c.root);
  });
  return { name: demo.name, data: copy };
}
```

### 4.2 Concrete Implementation Plan for Dashboard (`public/js/app.js`)
Replace `listView()` in `public/js/app.js` with:

```javascript
import { DEMOS, cloneDemoProject } from './demos.js';

let dashboardTab = 'projects'; // 'projects' | 'demos'

async function listView() {
  const projects = await api('GET', '/api/projects').catch(() => []);
  
  $app.innerHTML = `
    <div class="list">
      <header>
        <div class="brand-row">
          <h2 style="margin:0">Madera local</h2>
          <span class="muted user-email" id="userEmail"></span>
        </div>
        <div class="row">
          <button class="primary" id="new">+ Nuevo mueble</button>
          <button id="importBtn">Importar archivo</button>
          <input type="file" id="importInput" accept=".json,application/json" style="display:none">
          <button id="out">Salir</button>
        </div>
      </header>

      <div class="dash-tabs">
        <button class="dash-tab ${dashboardTab === 'projects' ? 'active' : ''}" id="tabProjects">Mis Proyectos (${projects.length})</button>
        <button class="dash-tab ${dashboardTab === 'demos' ? 'active' : ''}" id="tabDemos">Galería de Demos (${DEMOS.length})</button>
      </div>

      <div id="tabContentProjects" style="${dashboardTab === 'projects' ? '' : 'display:none'}">
        ${projects.length ? '' : `
          <div class="empty-state">
            <p class="muted">Aún no tienes proyectos guardados.</p>
            <p>Crea un mueble desde cero o elige una plantilla de la <b>Galería de Demos</b>.</p>
          </div>
        `}
        ${projects.map((p) => `
          <div class="proj" data-id="${p.id}">
            <div class="proj-info">
              <span class="name" data-a="open" title="Abrir en el editor">${esc(p.name)}</span>
              <span class="muted">${new Date(p.updated_at).toLocaleString()}</span>
            </div>
            <div class="proj-actions">
              <button data-a="open">Abrir</button>
              <button data-a="rename">Renombrar</button>
              <button data-a="dup">Duplicar</button>
              <button data-a="del" class="danger">Eliminar</button>
            </div>
          </div>
        `).join('')}
      </div>

      <div id="tabContentDemos" style="${dashboardTab === 'demos' ? '' : 'display:none'}">
        <div class="demos-grid">
          ${DEMOS.map((d) => `
            <div class="demo-card" data-demo="${d.id}">
              <div class="demo-badge">${esc(d.category)}</div>
              <h3 class="demo-title">${esc(d.name)}</h3>
              <p class="demo-desc">${esc(d.description)}</p>
              <div class="demo-meta">
                <span><b>Medidas:</b> ${esc(d.dimensions)}</span>
              </div>
              <div class="demo-tags">
                ${d.tags.map((t) => `<span class="demo-tag">${esc(t)}</span>`).join('')}
              </div>
              <div class="demo-actions">
                <button class="primary" data-a="use-demo" data-id="${d.id}">Abrir plantilla</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Fetch current user email
  api('GET', '/api/me').then((u) => {
    const el = document.getElementById('userEmail');
    if (el && u.email) el.textContent = `· ${u.email}`;
  }).catch(() => {});

  // Tab switching
  const tabProjects = document.getElementById('tabProjects');
  const tabDemos = document.getElementById('tabDemos');
  tabProjects.onclick = () => {
    dashboardTab = 'projects';
    listView();
  };
  tabDemos.onclick = () => {
    dashboardTab = 'demos';
    listView();
  };

  // Header actions
  document.getElementById('new').onclick = async () => {
    const r = await api('POST', '/api/projects', { name: 'Sin título', data: M.defaultProject() });
    location.hash = '#/p/' + r.id;
  };

  const importInput = document.getElementById('importInput');
  document.getElementById('importBtn').onclick = () => importInput.click();
  importInput.onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const raw = JSON.parse(evt.target.result);
        const name = raw.name || file.name.replace(/\.[^/.]+$/, '') || 'Proyecto importado';
        const data = raw.columns ? raw : (raw.data && raw.data.columns ? raw.data : null);
        if (!data || !Array.isArray(data.columns)) {
          throw new Error('Estructura inválida: debe contener el arreglo de columnas ("columns").');
        }
        const normalized = M.normalizeProject(data);
        const r = await api('POST', '/api/projects', { name, data: normalized });
        location.hash = '#/p/' + r.id;
      } catch (err) {
        alert('Error al importar archivo: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  document.getElementById('out').onclick = async () => {
    await api('POST', '/api/logout');
    route();
  };

  // Project item actions
  $app.querySelectorAll('.proj').forEach((el) => {
    const id = el.dataset.id;
    el.querySelector('[data-a=open]').onclick = () => (location.hash = '#/p/' + id);
    el.querySelector('[data-a=rename]').onclick = async () => {
      const curName = el.querySelector('.name').textContent;
      const newName = prompt('Nuevo nombre del proyecto:', curName);
      if (newName && newName.trim() && newName.trim() !== curName) {
        await api('PUT', `/api/projects/${id}`, { name: newName.trim() });
        listView();
      }
    };
    el.querySelector('[data-a=dup]').onclick = async () => {
      await api('POST', `/api/projects/${id}/duplicate`);
      listView();
    };
    el.querySelector('[data-a=del]').onclick = async () => {
      if (confirm('¿Eliminar este proyecto?')) {
        await api('DELETE', '/api/projects/' + id);
        listView();
      }
    };
  });

  // Demo item actions
  $app.querySelectorAll('[data-a=use-demo]').forEach((btn) => {
    btn.onclick = async () => {
      const demoId = btn.dataset.id;
      const demoProject = cloneDemoProject(demoId);
      if (!demoProject) return;
      const r = await api('POST', '/api/projects', demoProject);
      location.hash = '#/p/' + r.id;
    };
  });
}
```

### 4.3 Concrete Implementation Plan for UI Control Cleanup (`drawDock` in `public/js/app.js`)
Streamline `drawDock()` to eliminate obsolete types and simplify the 9 buttons to an organized 2-tier layout:

```javascript
    const VALID_NEW_TYPES = ['shelf', 'drawer', 'rail'];
    dock.innerHTML = `<b>1 seleccionado</b>
      <div class="row"><label>Contenido</label><select id="type">${typeOpts(node.type, TYPES)}</select></div>
      ${hasFront ? `<div class="row"><label>Puertas</label><select id="front">${typeOpts(node.front || 'none', FRONTS)}</select></div>` : ''}
      ${showPull ? `<div class="row"><label>Manilla</label><select id="pull">${typeOpts(node.pull || 'default', ['default', ...Object.keys(PULLS)])}</select></div>` : ''}
      <div class="row"><label>Ancho</label><input id="w" value="${m3(c.w)}"><span class="muted">m</span></div>
      <div class="row"><label>Alto</label><input id="h" value="${m3(c.h)}"><span class="muted">m</span></div>
      ${node.type === 'drawer' ? `<div class="row"><label>Gavetas</label><input id="cnt" type="number" min="1" max="10" value="${node.count || 1}"></div>` : ''}
      ${node.type === 'multiple' ? `<div class="row"><label>Dirección</label><select id="dir"><option value="v" ${node.dir === 'v' ? 'selected' : ''}>vertical (apilados)</option><option value="h" ${node.dir === 'h' ? 'selected' : ''}>horizontal (lado a lado)</option></select></div>` : ''}
      <div class="row"><label>Tipo a añadir</label><select id="newType">${typeOpts(state.newType, VALID_NEW_TYPES)}</select></div>
      
      <div class="dock-actions-group">
        <span class="group-label">Subdividir módulo:</span>
        <div class="btns">
          <button id="inV">⬍ Dividir en altura (estante)</button>
          <button id="inH">⬌ Dividir en ancho (partición)</button>
        </div>
      </div>

      <div class="dock-actions-group">
        <span class="group-label">Estructura y acciones:</span>
        <div class="btns">
          <button id="sibAdd">＋ Añadir adyacente</button>
          ${f.parent ? '<button id="up">↑ Seleccionar contenedor</button>' : ''}
          <button class="danger" id="del">🗑 Eliminar módulo</button>
        </div>
      </div>`;
```

### 4.4 Concrete Implementation Plan for Expanded Door Types (`public/js/layout.js`)
Update `FRONTS`, `LABELS`, `DEFAULTS`, `doorOverlay()`, and `buildCutlist()`:

1. `FRONTS` and `LABELS`:
```javascript
export const FRONTS = ['none', 'doors', 'left-door', 'right-door', 'sliding', 'bifold', 'lift-up'];
export const LABELS = {
  multiple: 'Contenedor (varios módulos)',
  shelf: 'Abierto / estante',
  rail: 'Perchero',
  drawer: 'Gaveta',
  none: 'Sin puertas',
  doors: 'Dos puertas batientes',
  'left-door': 'Puerta batiente izquierda',
  'right-door': 'Puerta batiente derecha',
  sliding: 'Puertas corredizas (con riel)',
  bifold: 'Puerta plegable / acordeón',
  'lift-up': 'Puerta abatible hacia arriba (pistón a gas)',
  default: 'Por defecto del proyecto',
};
```

2. `DEFAULTS` and `SETTING_META`:
```javascript
// Add to DEFAULTS:
slidingTrackPrice: 28,  // por juego de rieles y carros
bifoldHingePrice: 4,    // por bisagra de libro para unión plegable
bifoldGuidePrice: 8,    // por guía corrediza superior
gasStrutPrice: 6,       // por pistón amortiguador a gas

// Add to SETTING_META:
['slidingTrackPrice', 'Precio kit corredizo', '/juego', 'Rieles y carros para puertas corredizas'],
['bifoldHingePrice', 'Precio bisagra plegable', '/u', 'Bisagras articuladas para puertas acordeón'],
['bifoldGuidePrice', 'Precio guía plegable', '/u', 'Guía y carro superior para puerta plegable'],
['gasStrutPrice', 'Precio pistón a gas', '/u', 'Pistones amortiguadores para puertas abatibles'],
```

3. Expanded `doorOverlay()` logic in `layout.js`:
```javascript
  const doorOverlay = (n, cx0, cy0, w, h, col) => {
    const cx = cx0 - t / 2;
    const cy = cy0 - t / 2;
    const cw = w + t;
    const ch = h + t;
    const fc = s.frontClearance;
    const style = pullOf(n);
    const holes = PULLS[style].holes;
    const hingesPer = ch > 1800 ? 4 : ch > 1000 ? 3 : 2;

    const door = (name, px, py, dw, dh, side, holeLayout = 'v', zOffset = 0) => {
      add({
        name,
        mat: 'front',
        kind: 'front',
        x: px,
        y: py,
        z: D + zOffset,
        sx: dw,
        sy: dh,
        sz: t,
        holes,
        pull: style,
        holeLayout,
        col,
        nodeId: n.id,
        side,
      });
      countPull(style);
    };

    if (n.front === 'doors') {
      const dw = (cw - 3 * fc) / 2;
      door('Puerta', cx + fc, cy + fc, dw, ch - 2 * fc, 'right');
      door('Puerta', cx + 2 * fc + dw, cy + fc, dw, ch - 2 * fc, 'left');
      hw.hinges += hingesPer * 2;
    } else if (n.front === 'left-door') {
      door('Puerta', cx + fc, cy + fc, cw - 2 * fc, ch - 2 * fc, 'right');
      hw.hinges += hingesPer;
    } else if (n.front === 'right-door') {
      door('Puerta', cx + fc, cy + fc, cw - 2 * fc, ch - 2 * fc, 'left');
      hw.hinges += hingesPer;
    } else if (n.front === 'sliding') {
      const overlap = 26;
      const dw = (cw + overlap - 2 * fc) / 2;
      const dh = ch - 2 * fc;
      // Puerta interior (carril interno)
      door('Puerta corrediza', cx + fc, cy + fc, dw, dh, 'sliding-inner', 'v', 0);
      // Puerta exterior (carril externo, desplazada en Z para no colisionar en 3D)
      door('Puerta corrediza', cx + cw - fc - dw, cy + fc, dw, dh, 'sliding-outer', 'v', t + 2);
      hw.slidingTracks = (hw.slidingTracks || 0) + 1;
    } else if (n.front === 'bifold') {
      const dw = (cw - 3 * fc) / 2;
      const dh = ch - 2 * fc;
      door('Puerta plegable', cx + fc, cy + fc, dw, dh, 'bifold-anchor');
      door('Puerta plegable', cx + 2 * fc + dw, cy + fc, dw, dh, 'bifold-fold');
      hw.hinges += hingesPer; // Bisagras al lateral
      hw.bifoldHinges = (hw.bifoldHinges || 0) + (ch > 1200 ? 3 : 2); // Bisagras de unión central
      hw.bifoldGuides = (hw.bifoldGuides || 0) + 1; // Guía superior
    } else if (n.front === 'lift-up') {
      const dw = cw - 2 * fc;
      const dh = ch - 2 * fc;
      door('Puerta abatible arriba', cx + fc, cy + fc, dw, dh, 'lift-up', 'h');
      hw.hinges += 2; // Bisagras en borde superior
      hw.gasStruts = (hw.gasStruts || 0) + 2; // Par de pistones a gas
    }
  };
```

4. Expanded `ROLE` and `buildCutlist()` in `layout.js`:
```javascript
const ROLE = {
  Lateral: 'vertical-side',
  'División vertical': 'vertical-side',
  'Tapa superior': 'horizontal-deck',
  Base: 'horizontal-deck',
  'Estante / división': 'horizontal-deck',
  Fondo: 'back-panel',
  Puerta: 'door-front',
  'Puerta corrediza': 'door-front',
  'Puerta plegable': 'door-front',
  'Puerta abatible arriba': 'door-front',
  'Frente de gaveta': 'drawer-front',
  'Lateral de gaveta': 'drawer-side',
  'Frente/trasera de gaveta': 'drawer-back',
  'Fondo de gaveta': 'drawer-bottom',
};

// In buildCutlist hardware section:
  if (hw.slidingTracks) {
    hardware.push({
      name: 'Kit corredizo (rieles y carros)',
      qty: hw.slidingTracks,
      unitPrice: s.slidingTrackPrice || 28,
      total: hw.slidingTracks * (s.slidingTrackPrice || 28),
    });
  }
  if (hw.bifoldHinges) {
    hardware.push({
      name: 'Bisagra de libro para puerta plegable',
      qty: hw.bifoldHinges,
      unitPrice: s.bifoldHingePrice || 4,
      total: hw.bifoldHinges * (s.bifoldHingePrice || 4),
    });
  }
  if (hw.bifoldGuides) {
    hardware.push({
      name: 'Guía superior para puerta plegable',
      qty: hw.bifoldGuides,
      unitPrice: s.bifoldGuidePrice || 8,
      total: hw.bifoldGuides * (s.bifoldGuidePrice || 8),
    });
  }
  if (hw.gasStruts) {
    hardware.push({
      name: 'Pistón a gas para puerta abatible',
      qty: hw.gasStruts,
      unitPrice: s.gasStrutPrice || 6,
      total: hw.gasStruts * (s.gasStrutPrice || 6),
    });
  }
```

### 4.5 CSS Additions (`public/style.css`)
Add the following classes to `public/style.css`:
```css
/* Dashboard Tabs */
.dash-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 8px;
}
.dash-tab {
  background: transparent;
  border: none;
  font-size: 15px;
  font-weight: 600;
  color: var(--muted);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.dash-tab:hover {
  color: var(--text);
  background: var(--panel2);
}
.dash-tab.active {
  background: var(--panel2);
  color: var(--accent);
  box-shadow: inset 0 -2px 0 var(--accent);
}

/* Demo Gallery Grid */
.demos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
.demo-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.demo-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}
.demo-badge {
  font-size: 11px;
  text-transform: uppercase;
  background: rgba(255, 184, 0, 0.15);
  color: var(--accent);
  padding: 3px 8px;
  border-radius: 6px;
  width: fit-content;
  font-weight: 700;
}
.demo-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}
.demo-desc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
  margin: 0;
}
.demo-meta {
  font-size: 12px;
  color: var(--muted);
}
.demo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.demo-tag {
  font-size: 11px;
  background: var(--panel2);
  padding: 3px 8px;
  border-radius: 4px;
  color: #ddd;
}
.demo-actions {
  margin-top: auto;
  padding-top: 10px;
}
.demo-actions button {
  width: 100%;
}

/* Clean Dock Actions Grouping */
.dock-actions-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}
.dock-actions-group .group-label {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

---

## 5. Verification Method

### 5.1 Verification Commands and Steps for Implementers
1. **Unit Test Layout & Hardware Calculations**:
   - Create a test file `test/doors_and_demos.test.js`:
     ```javascript
     import test from 'node:test';
     import assert from 'node:assert/strict';
     import { computeLayout } from '../public/js/layout.js';
     import * as M from '../public/js/model.js';
     import { DEMOS } from '../public/js/demos.js';

     test('Four demos generate valid layout, cutlist, and positive total', () => {
       assert.equal(DEMOS.length, 4);
       DEMOS.forEach((d) => {
         const l = computeLayout(d.data);
         assert.ok(l.pieces.length > 5, `Demo ${d.name} pieces check`);
         assert.ok(l.cutlist.total > 0, `Demo ${d.name} total price check`);
         assert.ok(l.cutlist.rows.length > 0, `Demo ${d.name} cutlist rows check`);
       });
     });

     test('Sliding doors generate 2 panels and kit corredizo hardware', () => {
       const p = M.defaultProject();
       p.columns[0].root.front = 'sliding';
       const l = computeLayout(p);
       const slidingPieces = l.pieces.filter((pc) => pc.name === 'Puerta corrediza');
       assert.equal(slidingPieces.length, 2);
       assert.ok(l.cutlist.hardware.some((h) => h.name.includes('corredizo')));
     });

     test('Bi-fold doors generate 2 panels, hinges, bifold hinges, and top guide', () => {
       const p = M.defaultProject();
       p.columns[0].root.front = 'bifold';
       const l = computeLayout(p);
       const bifoldPieces = l.pieces.filter((pc) => pc.name === 'Puerta plegable');
       assert.equal(bifoldPieces.length, 2);
       assert.ok(l.cutlist.hardware.some((h) => h.name.includes('plegable')));
     });

     test('Lift-up flap doors generate 1 panel and 2 gas struts', () => {
       const p = M.defaultProject();
       p.columns[0].root.front = 'lift-up';
       const l = computeLayout(p);
       const flapPieces = l.pieces.filter((pc) => pc.name === 'Puerta abatible arriba');
       assert.equal(flapPieces.length, 1);
       assert.ok(l.cutlist.hardware.some((h) => h.name.includes('pistón') || h.name.includes('Pistón')));
     });
     ```
   - Run: `node --test test/doors_and_demos.test.js` and `node --test test/*.test.js`.

2. **Frontend UI Verification**:
   - Open browser at `http://localhost:3000`.
   - Log in and verify Dashboard displays tabs: "Mis Proyectos" and "Galería de Demos".
   - Click "Galería de Demos": verify 4 cards render (Closet, Mesa de noche, Centro TV, Cocina).
   - Click "Abrir plantilla" on any demo: verify it creates a new project and loads into 2D editor and 3D viewer.
   - Verify Header "+ Nuevo mueble" creates a blank project.
   - Verify Header "Importar archivo" loads a valid JSON file and routes to the new project.
   - In "Mis Proyectos", click "Renombrar", enter a new name, verify update persists across refreshes.
   - In Editor dock, select a module: verify clean button layout without duplicate buttons, and verify "Puertas" dropdown contains: `Sin puertas`, `Dos puertas batientes`, `Puerta batiente izquierda`, `Puerta batiente derecha`, `Puertas corredizas (con riel)`, `Puerta plegable / acordeón`, `Puerta abatible hacia arriba (pistón a gas)`.
   - Select `corredizas`, `acordeón`, and `abatible arriba`: switch to "Cutlist" tab and verify hardware items (`Kit corredizo`, `Bisagra de libro`, `Pistón a gas`) and door panels are listed with exact mm dimensions and correct subtotal prices.

### 5.2 Invalidation Conditions
- If `FRONTS.includes(front)` does not include `sliding`, `bifold`, or `lift-up`, door selection will revert or fail validation.
- If `ROLE` dictionary does not map `'Puerta corrediza'`, `'Puerta plegable'`, `'Puerta abatible arriba'` to `'door-front'`, cutlist IDs will prefix with fallback `'X'` instead of `'O'`.
- If `newType` options are not cleaned up, legacy string options will pollute module definitions.
