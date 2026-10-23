# Handoff Report: JSON Import & Blank Project Creation (Milestone M2-3)

**Author**: Replacement Explorer M2-3 (JSON Import & Blank Project Creation)  
**Date**: 2026-10-23T01:34:00Z  
**Target Milestone**: M2 — Main Dashboard, Demos & Projects JSON (Requirement R2)  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m2_v2_3_rep`  
**Scope**: Header actions in `public/js/app.js` and data normalization/validation in `public/js/model.js`:
1. **"+ Nuevo mueble"**: Creation of blank project via `M.defaultProject()` and `POST /api/projects` with redirection to `#/p/${id}`.
2. **"Importar archivo"**: Hidden file input triggered by button, file reading with `FileReader.readAsText()`, format detection (`{ columns }` vs `{ name, data: { columns } }`), deep numeric and structural validation, legacy normalization via `M.normalizeProject()`, server persistence, and redirection to editor.

---

## 1. Observation

### 1.1 Current Header and Project Creation in `public/js/app.js`
In `public/js/app.js`, lines 248–288:
```javascript
248: async function listView() {
249:   const projects = await api('GET', '/api/projects');
250:   $app.innerHTML = `<div class="list">
251:     <header class="list-header">
252:       <div class="brand-row">
253:         <h2 style="margin:0">Mis proyectos</h2>
254:       </div>
255:       <div class="header-actions">
256:         <button class="primary" id="new">+ Nuevo mueble</button>
257:         <div class="user-profile-chip" id="userProfileChip">
258:           ${renderUserAvatar(currentUser, 32)}
259:           <div class="user-profile-info">
260:             <span class="user-name">${esc(currentUser?.name || currentUser?.email?.split('@')[0] || 'Usuario')}</span>
261:             <span class="user-email muted">${esc(currentUser?.email || '')}</span>
262:           </div>
263:           <button id="out" class="btn-logout" title="Cerrar sesión">Salir</button>
264:         </div>
265:       </div>
266:     </header>
...
276:   document.getElementById('new').onclick = async () => {
277:     const r = await api('POST', '/api/projects', { name: 'Sin título', data: M.defaultProject() });
278:     location.hash = '#/p/' + r.id;
279:   };
```
**Direct observations**:
1. Line 256 defines `<button class="primary" id="new">+ Nuevo mueble</button>`.
2. Lines 276–279 bind `document.getElementById('new').onclick` to post `M.defaultProject()` to `POST /api/projects` and navigate to `#/p/${r.id}`. However, it lacks button debouncing / disabling during in-flight requests (risking double project creation if clicked rapidly), and does not handle API errors gracefully with user alerts.
3. In lines 255–265, there is **NO "Importar archivo" button** and **NO `<input type="file">`** element anywhere in the DOM. The file import functionality is currently completely absent from `app.js`.

### 1.2 Model Defaults and Normalization in `public/js/model.js`
In `public/js/model.js`, lines 16–42:
```javascript
16: export function normalizeProject(project) {
17:   const walk = (n) => {
18:     if (['doors', 'left-door', 'right-door'].includes(n.type)) {
19:       n.front = n.type;
20:       n.type = 'shelf';
21:     }
22:     (n.children || []).forEach(walk);
23:   };
24:   project.columns.forEach((c) => walk(c.root));
25:   return project;
26: }
27: 
28: export function defaultProject() {
29:   const col = (children) => ({
30:     id: uid(),
31:     width: 764,
32:     root: { id: uid(), type: 'multiple', dir: 'v', size: 1, children },
33:   });
34:   return {
35:     settings: { ...DEFAULTS },
36:     columns: [
37:       col([leaf('shelf', { size: 650 }), leaf('drawer', { size: 500, count: 3 })]),
38:       col([leaf('shelf', { size: 650 }), leaf('shelf', { size: 500, front: 'left-door' })]),
39:       col([leaf('shelf', { size: 300 }), leaf('shelf', { size: 300 }), leaf('shelf', { size: 300 })]),
40:     ],
41:   };
42: }
```
**Direct observations**:
1. `M.defaultProject()` produces a valid project object with `settings: { ...DEFAULTS }` and 3 columns, each with a generated `uid()` and default modules (shelf, drawers, left-door front).
2. `M.normalizeProject(project)` walks through `project.columns` and migrates older door types (`'doors'`, `'left-door'`, `'right-door'`) from `n.type` to `n.front`, changing `n.type` to `'shelf'`.
3. If an imported project has missing or duplicate IDs, `normalizeProject` does not currently ensure node IDs are present and unique.
4. If an imported project has missing `settings`, `normalizeProject` does not default them to `{ ...DEFAULTS }`.

### 1.3 Server Persistence Endpoint in `server/server.js`
In `server/server.js`, lines 654–661:
```javascript
654: app.post('/api/projects', auth, (req, res) => {
655:   const { name, data, description, thumbnail } = req.body || {};
656:   const now = Date.now();
657:   const r = db
658:     .prepare('INSERT INTO projects (user_id, name, data, description, thumbnail, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
659:     .run(req.user.id, name || 'Sin título', JSON.stringify(data || {}), description || '', thumbnail || '', now, now);
660:   res.status(201).json({ id: Number(r.lastInsertRowid), name: name || 'Sin título', updated_at: now });
661: });
```
**Direct observations**:
1. `POST /api/projects` accepts JSON body `{ name, data, description, thumbnail }`.
2. It assigns the authenticated `req.user.id`, serializes `data` as a string (`JSON.stringify(data || {})`), and stores it in the SQLite database.
3. It responds with HTTP 201 and `{ id: Number(r.lastInsertRowid), name: ..., updated_at: ... }`.
4. The client receives `{ id }` directly from `api('POST', '/api/projects', ...)` without additional unpacking.

### 1.4 JSON Export Source in `public/js/app.js`
In `public/js/app.js`, line 960:
```javascript
960: bg.querySelector('#copy').onclick = () => navigator.clipboard?.writeText(JSON.stringify(state.project, null, 2));
```
**Direct observations**:
1. In the editor's settings modal, "Copiar JSON" copies `state.project`, which has the raw structure `{ settings: { ... }, columns: [ ... ] }`.
2. When users or backend systems export projects, they may wrap this in an envelope: `{ name: "...", data: { settings: ..., columns: [...] } }`, or export flat `{ name: "...", columns: [...] }`.
3. The import logic must transparently handle both raw project objects and wrapped envelopes.

---

## 2. Logic Chain

### 2.1 Blank Project Creation ("+ Nuevo mueble")
1. **Trigger**: The user clicks `<button class="primary" id="new">+ Nuevo mueble</button>` in `.header-actions`.
2. **Debounce / In-Flight Protection**: Disabling the button or guarding with an `isCreating` flag prevents duplicate submissions if the user double-clicks.
3. **Payload Generation**: Calls `M.defaultProject()`. This returns:
   - `settings`: copy of `DEFAULTS` (height 800 mm, depth 500 mm, thickness 18 mm, etc.).
   - `columns`: 3 standard columns (widths 764 mm each) with distinct modules and unique IDs.
4. **API Request**: `api('POST', '/api/projects', { name: 'Sin título', data: M.defaultProject() })`.
5. **Redirection**: On HTTP 201 response with `{ id }`, executes `location.hash = '#/p/' + res.id`.
6. **Error Handling**: If the API call fails (network issue or 401 session expiry), catch the error, re-enable the button, and display `alert('Error al crear nuevo mueble: ' + (err.message || 'Error de conexión'))`.

### 2.2 File Selection via Hidden Input ("Importar archivo")
1. **DOM Integration**:
   - Visible button: `<button id="importBtn" class="btn-import">Importar archivo</button>`
   - Hidden input: `<input type="file" id="importInput" accept=".json,application/json" style="display:none">`
2. **Click Propagation**: Clicking `#importBtn` executes:
   ```javascript
   importInput.value = ''; // Reset input to allow selecting the same file repeatedly
   importInput.click();
   ```
3. **Change Event Listener**: When the user selects a file, `importInput.onchange` fires.
   - Guard against empty selection (`if (!file) return;`).
   - Guard against non-JSON file extensions if desired: check `file.name.toLowerCase().endsWith('.json')`.

### 2.3 File Reading with `FileReader`
1. Use `const reader = new FileReader();`.
2. Register `reader.onerror = () => alert('Error al leer el archivo desde el disco.');`.
3. Register `reader.onload = async (evt) => { ... }`.
4. Initiate read with `reader.readAsText(file);`.

### 2.4 Parsing and Format Detection
1. **JSON Parsing**:
   ```javascript
   let parsed;
   try {
     parsed = JSON.parse(evt.target.result);
   } catch (jsonErr) {
     alert('Error de formato JSON:\nEl archivo seleccionado no contiene una estructura JSON válida.\n\nDetalle: ' + jsonErr.message);
     return;
   }
   ```
2. **Root Object Check**: Reject primitives, null, or arrays:
   ```javascript
   if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
     alert('Error de formato:\nEl archivo JSON debe contener un objeto con la definición del proyecto.');
     return;
   }
   ```
3. **Envelope vs Direct Format Detection**:
   - Extract project name:
     - Check `parsed.name` (if string and non-empty).
     - Otherwise derive from `file.name.replace(/\.[^/.]+$/, '').trim()`.
     - Fallback default: `'Proyecto importado'`.
   - Extract project data:
     - **Format A (Direct Project)**: `Array.isArray(parsed.columns)` → `data = parsed`.
     - **Format B (Envelope with Object Data)**: `parsed.data && typeof parsed.data === 'object' && Array.isArray(parsed.data.columns)` → `data = parsed.data`.
     - **Format C (Envelope with Serialized String Data)**: `typeof parsed.data === 'string'` → try `JSON.parse(parsed.data)`. If it has `columns` array, `data = nested`.
     - If none match: Reject immediately with an informative alert:
       `alert('Estructura de proyecto inválida:\nEl archivo debe contener el arreglo de columnas ("columns") o una envoltura con "{ name, data: { columns } }".');`
4. **Column Count Check**:
   - If `data.columns.length === 0`:
     `alert('Estructura inválida:\nEl proyecto importado no contiene ninguna columna (arreglo "columns" vacío).');`

### 2.5 Strict Numeric and Structural Validation
To ensure malformed files do not break 2D SVG canvas math, 3D Three.js geometry, or SQLite storage:
1. **Settings Numeric Checks**:
   - If `data.settings` exists:
     - Required strictly positive finite numbers: `height`, `depth`, `thickness`. If any is `<=` 0, `NaN`, or non-numeric, reject:
       `alert('Ajuste numérico inválido:\nEl parámetro "settings.${key}" tiene un valor inválido (${val}). Debe ser un número positivo mayor que cero.');`
     - Required non-negative finite numbers: `overhang`, `backThickness`, `frontClearance`. If any is `<` 0 or `NaN`, reject.
2. **Columns Numeric Checks**:
   - For each column in `data.columns`:
     - Must be an object.
     - `col.width` must be a finite number `> 0`. If `NaN`, `<= 0`, or missing, reject:
       `alert('Ancho de columna inválido:\nLa columna ${idx + 1} tiene un ancho inválido (${col.width}). Debe ser un número positivo en milímetros.');`
     - `col.root` must be an object.
3. **Module Tree Recursive Checks**:
   - Walk `col.root` recursively:
     - If `node.size` is defined: must be a finite number `> 0`. If `NaN` or `<= 0`, reject:
       `alert('Medida de módulo inválida:\nEl módulo "${node.id || 'sin id'}" tiene un tamaño inválido (${node.size}). Debe ser un número positivo.');`
     - If `node.type === 'drawer'` and `node.count` is defined: must be a finite number `>= 1` and `<= 20`. If invalid, reject.
     - If `node.children` is defined: must be an array.

### 2.6 Normalization and ID Guarantee
1. **Settings Defaults**:
   Ensure all default settings are populated:
   `data.settings = { ...DEFAULTS, ...(data.settings || {}) };`
2. **ID Sanitation**:
   Ensure every column and module node has a unique string ID:
   ```javascript
   const seen = new Set();
   data.columns.forEach((c) => {
     if (!c.id || typeof c.id !== 'string' || seen.has(c.id)) c.id = uid();
     seen.add(c.id);
     const walk = (n) => {
       if (!n.id || typeof n.id !== 'string' || seen.has(n.id)) n.id = uid();
       seen.add(n.id);
       (n.children || []).forEach(walk);
     };
     if (c.root) walk(c.root);
   });
   ```
3. **Call `M.normalizeProject(data)`**:
   Converts legacy door types to `{ type: 'shelf', front: ... }`.

### 2.7 Server Persistence and Editor Navigation
1. Call `const res = await api('POST', '/api/projects', { name, data });`.
2. On success: `location.hash = '#/p/' + res.id;`.
3. On error: Catch and alert `alert('Error al guardar proyecto importado:\n' + (err.message || 'Error del servidor'));`.

---

## 3. Caveats

1. **File Input Reset**:
   - Browsers do not trigger the `change` event if a user selects the same file twice in a row unless the input's `value` is reset (`input.value = ''`). Our implementation resets `input.value = ''` both prior to triggering `.click()` and in the `finally` block of the reader.
2. **Memory and File Size**:
   - Project JSON files are small (typically 2 KB to 50 KB). `FileReader.readAsText()` operates synchronously in client memory without memory pressure.
3. **Compatibility with Milestone M2 Dual Tabs**:
   - Milestone M2 introduces the "Galería de Demos" tab alongside "Mis Proyectos". The header buttons "+ Nuevo mueble" and "Importar archivo" belong to the permanent header of the dashboard view, accessible regardless of which tab is active.
4. **No Terminal Commands Executed**:
   - In strict compliance with instructions, no terminal commands (`run_command`) were executed during this investigation. All codebase inspections were conducted purely with `view_file`.

---

## 4. Conclusion & Actionable Implementation Plan

### 4.1 Changes in `public/js/model.js`

Enhance `normalizeProject` to ensure complete settings defaults and robust ID generation if missing:

```javascript
// In public/js/model.js
export function normalizeProject(project) {
  if (!project.settings) project.settings = { ...DEFAULTS };
  else project.settings = { ...DEFAULTS, ...project.settings };

  const seenIds = new Set();
  const ensureId = (obj) => {
    if (!obj.id || typeof obj.id !== 'string' || seenIds.has(obj.id)) {
      obj.id = uid();
    }
    seenIds.add(obj.id);
  };

  const walk = (n) => {
    ensureId(n);
    if (['doors', 'left-door', 'right-door', 'sliding', 'bifold', 'lift-up'].includes(n.type)) {
      n.front = n.type;
      n.type = 'shelf';
    }
    (n.children || []).forEach(walk);
  };

  if (Array.isArray(project.columns)) {
    project.columns.forEach((c) => {
      ensureId(c);
      if (c.root) walk(c.root);
    });
  }
  return project;
}
```

### 4.2 Changes in `public/js/app.js`

#### 4.2.1 Import `uid` from `./layout.js`
At line 1 of `public/js/app.js`:
```javascript
import { computeLayout, SETTING_META, DEFAULTS, TYPES, FRONTS, LABELS, PULLS, cutlistCSV, uid } from './layout.js';
```

#### 4.2.2 Validation Helper Function
Add `validateProjectData(data)` helper to `public/js/app.js`:
```javascript
function validateProjectData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('El contenido del proyecto no es un objeto válido.');
  }
  if (!Array.isArray(data.columns) || data.columns.length === 0) {
    throw new Error('El proyecto debe contener un arreglo "columns" con al menos una columna.');
  }

  // Validate settings if provided
  if (data.settings && typeof data.settings === 'object') {
    const requiredPositive = ['height', 'depth', 'thickness'];
    for (const key of requiredPositive) {
      if (data.settings[key] !== undefined) {
        const val = data.settings[key];
        if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) {
          throw new Error(`Ajuste inválido: "settings.${key}" (${val}) debe ser un número positivo mayor que cero.`);
        }
      }
    }
    const nonNegative = ['overhang', 'backThickness', 'frontClearance'];
    for (const key of nonNegative) {
      if (data.settings[key] !== undefined) {
        const val = data.settings[key];
        if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) {
          throw new Error(`Ajuste inválido: "settings.${key}" (${val}) debe ser un número mayor o igual a cero.`);
        }
      }
    }
  }

  // Validate columns and nodes
  data.columns.forEach((col, idx) => {
    if (!col || typeof col !== 'object') {
      throw new Error(`La columna #${idx + 1} no es un objeto válido.`);
    }
    if (typeof col.width !== 'number' || !Number.isFinite(col.width) || col.width <= 0) {
      throw new Error(`Ancho inválido en columna #${idx + 1}: ${col.width}. Debe ser un número positivo.`);
    }
    if (!col.root || typeof col.root !== 'object') {
      throw new Error(`Estructura incompleta en columna #${idx + 1}: falta el nodo "root".`);
    }

    const checkNode = (node, path) => {
      if (!node || typeof node !== 'object') {
        throw new Error(`Nodo inválido en ${path}.`);
      }
      if (node.size !== undefined) {
        if (typeof node.size !== 'number' || !Number.isFinite(node.size) || node.size <= 0) {
          throw new Error(`Medida (size) inválida en ${path}: ${node.size}. Debe ser un número positivo.`);
        }
      }
      if (node.type === 'drawer' && node.count !== undefined) {
        if (typeof node.count !== 'number' || !Number.isFinite(node.count) || node.count < 1) {
          throw new Error(`Cantidad de gavetas (count) inválida en ${path}: ${node.count}. Debe ser un número mayor o igual a 1.`);
        }
      }
      if (node.children !== undefined) {
        if (!Array.isArray(node.children)) {
          throw new Error(`"children" en ${path} debe ser un arreglo.`);
        }
        node.children.forEach((child, childIdx) => {
          checkNode(child, `${path} > hijo #${childIdx + 1}`);
        });
      }
    };

    checkNode(col.root, `Columna #${idx + 1}`);
  });
}
```

#### 4.2.3 Header HTML in `listView()`
Replace the header actions in `listView()`:
```html
      <div class="header-actions">
        <button class="primary" id="new">+ Nuevo mueble</button>
        <button id="importBtn" class="btn-import">Importar archivo</button>
        <input type="file" id="importInput" accept=".json,application/json" style="display:none">
        <div class="user-profile-chip" id="userProfileChip">
          ${renderUserAvatar(currentUser, 32)}
          <div class="user-profile-info">
            <span class="user-name">${esc(currentUser?.name || currentUser?.email?.split('@')[0] || 'Usuario')}</span>
            <span class="user-email muted">${esc(currentUser?.email || '')}</span>
          </div>
          <button id="out" class="btn-logout" title="Cerrar sesión">Salir</button>
        </div>
      </div>
```

#### 4.2.4 Header Actions Event Handlers in `listView()`
```javascript
  // 1. "+ Nuevo mueble" action
  const btnNew = document.getElementById('new');
  if (btnNew) {
    btnNew.onclick = async () => {
      try {
        btnNew.disabled = true;
        const r = await api('POST', '/api/projects', { name: 'Sin título', data: M.defaultProject() });
        location.hash = '#/p/' + r.id;
      } catch (err) {
        alert('Error al crear nuevo mueble: ' + (err.message || 'Error de conexión'));
        btnNew.disabled = false;
      }
    };
  }

  // 2. "Importar archivo" action
  const importBtn = document.getElementById('importBtn');
  const importInput = document.getElementById('importInput');
  if (importBtn && importInput) {
    importBtn.onclick = () => {
      importInput.value = '';
      importInput.click();
    };

    importInput.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onerror = () => alert('Error al leer el archivo desde el disco.');
      reader.onload = async (evt) => {
        try {
          const text = evt.target.result;
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch (jsonErr) {
            throw new Error('El archivo no contiene un JSON válido.\nDetalle: ' + jsonErr.message);
          }

          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('El archivo JSON debe contener un objeto con la definición del proyecto.');
          }

          // Format detection: envelope vs direct project
          let name = (typeof parsed.name === 'string' && parsed.name.trim())
            ? parsed.name.trim()
            : file.name.replace(/\.[^/.]+$/, '').trim() || 'Proyecto importado';

          let data = null;
          if (Array.isArray(parsed.columns)) {
            data = parsed;
          } else if (parsed.data && typeof parsed.data === 'object' && Array.isArray(parsed.data.columns)) {
            data = parsed.data;
          } else if (typeof parsed.data === 'string') {
            try {
              const nested = JSON.parse(parsed.data);
              if (nested && Array.isArray(nested.columns)) data = nested;
            } catch {}
          }

          if (!data || !Array.isArray(data.columns)) {
            throw new Error('Estructura inválida: debe contener el arreglo de columnas ("columns") o un objeto "{ name, data: { columns } }".');
          }

          // Structural and numeric validation
          validateProjectData(data);

          // Normalization & ID sanitation
          const normalized = M.normalizeProject(data);

          // Save via POST /api/projects
          const res = await api('POST', '/api/projects', { name, data: normalized });
          if (!res || !res.id) {
            throw new Error('La respuesta del servidor no incluyó un ID de proyecto válido.');
          }

          // Redirect directly to editor
          location.hash = '#/p/' + res.id;
        } catch (err) {
          alert('Error al importar archivo:\n' + err.message);
        } finally {
          importInput.value = '';
        }
      };
      reader.readAsText(file);
    };
  }
```

---

## 5. Verification Method

### 5.1 Automated Unit & Integration Tests (`test/dashboard_and_doors.test.js`)
When implementing M2, verify these automated test scenarios:
1. **Direct JSON import**: Validate that `{ columns: [...] }` successfully parses, normalizes, and posts to `/api/projects`.
2. **Envelope JSON import**: Validate that `{ name: "Mueble A", data: { columns: [...] } }` preserves the project name and imports data.
3. **Invalid JSON syntax**: Verify that non-JSON strings trigger the descriptive error alert.
4. **Missing columns array**: Verify that `{ foo: "bar" }` is rejected with the missing columns error.
5. **Malformed numbers**: Verify that `{ columns: [{ width: -50, root: {} }] }` or `{ settings: { height: "abc" } }` is rejected with numeric validation errors.
6. **New Blank Project**: Verify that `POST /api/projects` with `M.defaultProject()` responds with status 201 and valid `id`.

### 5.2 Manual Browser Verification
1. Start local server: `node server/server.js` (port 3000).
2. Log in or use simulated Google login.
3. In dashboard:
   - Click "+ Nuevo mueble": Confirm a new project named "Sin título" is created and editor opens at `#/p/<id>`.
   - Click "Importar archivo": Select a valid `.json` export file. Confirm project is imported and editor immediately displays the geometry.
   - Click "Importar archivo": Select a `.txt` or corrupted `.json` file. Confirm informative `alert` appears and no broken project is created.
   - Click "Importar archivo": Select a JSON with `columns: [{ width: -100 }]`. Confirm alert identifies malformed column width.

### 5.3 Invalidation Conditions
- If the browser throws an unhandled exception when parsing invalid JSON instead of displaying an informative alert, the implementation is invalid.
- If importing a project fails to navigate to `#/p/${id}` upon success, the implementation is invalid.
- If importing a file without `columns` saves an unrenderable empty project to the SQLite database, the validation condition is violated.
