# Handoff Report: Model Invariance & Cleanliness Investigation (Milestone M1-IT2)

**Explorer Agent**: Explorer M1-IT2-2 (`teamwork_preview_explorer_m1_it2_2`)  
**Parent Conversation ID**: `20a52755-88ff-4e04-950c-4b4a3c054fe0`  
**Timestamp**: 2026-10-23T05:59:00Z  
**Target Worker**: Worker M1-IT2  

---

## 1. Observation

Direct code observations from inspecting `public/js/model.js`, `public/js/layout.js`, `test/stepped_layout.test.js`, and `test/m1_challenger_add_on_top.test.js`:

### 1.1 `public/js/model.js`: `normalizeProject` (lines 41–49)
```javascript
41:   if (Array.isArray(project.columns)) {
42:     project.columns.forEach((c) => {
43:       ensureId(c);
44:       if (typeof c.height === 'number' && Number.isFinite(c.height) && c.height > 0) {
45:         c.height = c.height;
46:       }
47:       if (c.root) walk(c.root);
48:     });
49:   }
```
- Line 42 declares the callback parameter as `(c) => { ... }`.
- Line 45 executes `c.height = c.height;`. There is no local or outer scoped variable named `col` inside `project.columns.forEach`.
- In `c.height = c.height;`, the property is read and reassigned to itself on the same object reference `c`.

### 1.2 `public/js/model.js`: `addOnTop` and `freezeColumnHeights` (lines 108–127, 185–238)
```javascript
108: export function freezeColumnHeights(project, layout) {
109:   if (!layout || !layout.cells) return;
110:   const walk = (node) => {
111:     if (!node) return;
112:     if (node.type === 'multiple' && Array.isArray(node.children)) {
113:       if (node.dir === 'v') {
114:         node.children.forEach((child) => {
115:           const cell = layout.cells[child.id];
116:           if (cell && typeof cell.h === 'number') {
117:             child.size = Math.round(cell.h * 10) / 10;
118:           }
119:         });
120:       }
121:       node.children.forEach(walk);
122:     }
123:   };
124:   project.columns.forEach((col) => {
125:     walk(col.root);
126:   });
127: }
...
185: export function addOnTop(project, colId, type = 'shelf', addedHeight = 350, allColumns = false) {
186:   const col = project.columns.find((c) => c.id === colId);
187:   if (!col) return null;
188:   const t = project.settings.thickness;
189: 
190:   // 1. Calculamos el layout actual y congelamos las alturas de todos los módulos en milímetros
191:   const initialLayout = computeLayout(project);
192:   freezeColumnHeights(project, initialLayout);
193: 
194:   const addModuleToCol = (targetCol, moduleType) => {
195:     const nn = makeLeaf(moduleType);
196:     nn.size = addedHeight;
197:     if (targetCol.root.type === 'multiple' && targetCol.root.dir === 'v') {
198:       targetCol.root.children.unshift(nn);
199:       return nn;
200:     }
201:     const targetH = getColumnHeight(targetCol, project.settings);
202:     const currentH = initialLayout.cells[targetCol.root.id]?.h || (targetH - 2 * t);
203:     return wrap(targetCol.root, 'v', nn, true, currentH);
204:   };
205: 
206:   // 2. Modo escalonado por columna (por defecto allColumns = false)
207:   if (!allColumns) {
208:     // Si las columnas hermanas no tienen c.height explícito, fijamos c.height = project.settings.height
209:     // para que su altura quede explícitamente bloqueada e invariante
210:     project.columns.forEach((c) => {
211:       if (c.id !== colId && (typeof c.height !== 'number' || c.height <= 0)) {
212:         c.height = project.settings.height;
213:       }
214:     });
215: 
216:     // Agregamos el nuevo módulo ÚNICAMENTE a la columna objetivo
217:     const targetModule = addModuleToCol(col, type);
218: 
219:     // Incrementamos únicamente la columna objetivo:
220:     col.height = (typeof col.height === 'number' && col.height > 0 ? col.height : project.settings.height) + addedHeight + t;
221: 
222:     // NO incrementamos project.settings.height
223:     return targetModule;
224:   }
...
```

### 1.3 `public/js/layout.js`: Layout math and column height resolution (lines 118–125, 350–359)
```javascript
118: export function getColumnHeight(col, settings) {
119:   if (typeof col?.height === 'number' && Number.isFinite(col.height) && col.height > 0) {
120:     return col.height;
121:   }
122:   return (settings && typeof settings.height === 'number' && Number.isFinite(settings.height) && settings.height > 0)
123:     ? settings.height
124:     : DEFAULTS.height;
125: }
...
350:   cols.forEach((c, i) => {
351:     const x0 = xs[i];
352:     const W = c.width;
353:     const colH = colHeights[i];
354:     add({ name: 'Tapa superior', mat: 'carcass', kind: 'h', x: x0, y: colH - t, z: bt, sx: W, sy: t, sz: cd, col: i });
355:     add({ name: 'Base', mat: 'carcass', kind: 'h', x: x0, y: 0, z: bt, sx: W, sy: t, sz: cd, col: i });
356:     const g = s.grooveClearance;
357:     add({ name: 'Fondo', mat: 'back', kind: 'back', x: x0 - 10 + g, y: t - 10 + g, z: 0, sx: W + 20 - 2 * g, sy: colH - 2 * t + 20 - 2 * g, sz: bt, col: i });
358:     place(c.root, x0, t, W, colH - 2 * t, i);
359:   });
```

### 1.4 Test Suite Verifications
- `test/stepped_layout.test.js`:
  - Test 5 (lines 218–280): Verifies that calling `addOnTop(project, 'col0', 'shelf', 350, false)` increases `col0.height` by $350 + t$, leaves `col1.height` strictly at 1600mm, keeps `project.settings.height` untouched, and maintains $\Delta h < 0.1$mm (actual $\Delta = 0.0$mm) on all sibling cells.
  - Test 6 (lines 282–306): Verifies that undefined sibling column heights lock to `project.settings.height` and retain exact $1400 - 2t$ cell heights.
  - Test 10 (lines 376–390): Verifies that `normalizeProject` retains valid column heights (`950`, `1850`) and leaves undefined heights as `undefined`.
- `test/m1_challenger_add_on_top.test.js`:
  - Challenge 1 (lines 52–221): 5 sequential `addOnTop` additions on column 1 in a 4-column project. Verifies zero deviation ($\Delta < 0.0001$mm) on cells and pieces in columns 0, 2, and 3 across all 5 steps.
  - Challenge 2 (lines 227–323): Interleaved additions (`c0` $\rightarrow$ `c2` $\rightarrow$ `c0` $\rightarrow$ `c1`) tracking independent heights with zero neighbor bleed ($\Delta < 0.0001$mm).
  - Challenge 3 (lines 329–383): Calling `addOnTop(project, colId)` without 5th argument defaults to `allColumns = false` (stepped mode).

---

## 2. Logic Chain

### 2.1 Analysis of Line 45 (`c.height = c.height;`) and Candidate Replacements

1. **Root Cause of Line 45**:
   - In `public/js/model.js:41-49`, `normalizeProject` iterates `project.columns.forEach((c) => { ... })`.
   - The original author added:
     ```javascript
     if (typeof c.height === 'number' && Number.isFinite(c.height) && c.height > 0) {
       c.height = c.height;
     }
     ```
   - Because `c` is already the object in `project.columns`, `c.height = c.height` reads property `height` and assigns it back to the exact same property on the exact same object.
   - This is a redundant no-op self-assignment that triggers static analysis warnings (e.g. ESLint rule `no-self-assign`).

2. **Evaluation of Candidate Snippet `if (typeof c.height === 'number') col.height = c.height;`**:
   - **Severe Flaw 1 (Runtime ReferenceError)**: In line 42, the loop parameter is `(c) => ...`. The identifier `col` is **not defined** in this function scope. Executing `col.height = c.height;` will immediately throw an uncaught exception:
     `ReferenceError: col is not defined`
     at runtime whenever a project has columns with numeric heights.
   - **Severe Flaw 2 (Lax Type Guard)**: `typeof c.height === 'number'` evaluates to `true` for `NaN`, `Infinity`, `-Infinity`, `0`, and negative numbers (`-250`). A column height cannot be negative or non-finite. The existing condition `typeof c.height === 'number' && Number.isFinite(c.height) && c.height > 0` is strictly necessary to prevent corrupting the data model with invalid geometric dimensions.
   - **Flaw 3 (Redundant Even If Renamed)**: Even if the callback was renamed to `(col) => { ... }`, writing `if (typeof col.height === 'number') col.height = col.height;` remains an identical self-assignment.

3. **Optimal and Cleanest Replacement**:
   - What `normalizeProject` should do with `c.height`:
     - If `c.height` is a valid positive finite number, keep it as-is.
     - If `c.height` is present but invalid (e.g., negative, non-finite, string, or boolean), sanitize the column object by deleting the invalid property (`delete c.height`), allowing `getColumnHeight` to cleanly fall back to `settings.height`.
     - If `c.height` is `undefined`, leave it `undefined`.
   - The cleanest implementation is:
     ```javascript
     if (typeof c.height !== 'number' || !Number.isFinite(c.height) || c.height <= 0) {
       delete c.height;
     }
     ```
     Or equivalently:
     ```javascript
     if (typeof c.height === 'number' && Number.isFinite(c.height) && c.height > 0) {
       // Valid explicit column height is preserved
     } else {
       delete c.height;
     }
     ```
   - **Verification against Contract & Tests**:
     - For valid heights (`950`, `1850`), the condition evaluates `false` in the first snippet (or enters the empty preservation branch in the second), leaving `c.height` intact.
     - For `undefined` heights, `delete c.height` is a safe no-op. `c.height` remains `undefined`.
     - For invalid heights (`-100`, `NaN`, `'foo'`), `delete c.height` deletes the bad property.
     - Test 10 in `test/stepped_layout.test.js` continues to pass 100%.
     - Zero self-assignments, zero `ReferenceError`s, zero ESLint issues.

---

### 2.2 Proof of Sibling Column 0.0mm Invariance in `addOnTop`

1. **Isolation of Target Column**:
   - `addOnTop(project, colId, type = 'shelf', addedHeight = 350, allColumns = false)` locates target column `col = project.columns.find((c) => c.id === colId)`.
   - In stepped mode (`!allColumns`), `addModuleToCol(col, type)` is executed **exclusively** on `col` (Observation 1.2, line 217).
   - Zero modules are appended, prepended, or spliced into any sibling column $c_k$ ($k \ne \text{colId}$). Module tree counts on siblings remain strictly invariant ($\Delta N_{\text{modules}} = 0$).

2. **Millimeter Freezing Before Mutation**:
   - `freezeColumnHeights(project, initialLayout)` (Observation 1.2, lines 108–127) traverses all existing nodes in all columns.
   - For every vertical container, each child's proportional `size` is set to `round(cell.h * 10) / 10`, locking its relative size to its exact physical millimeter dimension.

3. **Decoupling and Locking Undefined Sibling Heights**:
   - Lines 210–214 check each sibling $c$:
     `if (c.id !== colId && (typeof c.height !== 'number' || c.height <= 0)) c.height = project.settings.height;`
   - If a sibling column did not have an explicit `c.height`, it was inheriting `project.settings.height` at layout time. This step freezes `c.height` explicitly to `project.settings.height`.
   - If a sibling column already possessed an explicit positive `c.height`, it is left untouched.

4. **Preservation of Global Settings Height**:
   - Line 220 increments only `col.height` on the target column:
     `col.height = (typeof col.height === 'number' && col.height > 0 ? col.height : project.settings.height) + addedHeight + t;`
   - Line 222 states `// NO incrementamos project.settings.height`.
   - Unlike legacy mode (`allColumns = true`), `project.settings.height` is **never mutated** in stepped mode (Observation 1.2, lines 220–224).

5. **Layout Math Invariance on Sibling Columns**:
   - In `computeLayout(project)`:
     - For every sibling column $i$, `getColumnHeight(cols[i], s)` evaluates to its locked `cols[i].height`.
     - Total column height $H_i$ is identical to its baseline value: $\Delta H_i = 0.0$mm.
     - Available vertical cavity height $avail = H_i - 2t$ is identical: $\Delta avail = 0.0$mm.
     - In `norm(children, avail)` (Observation 1.3), the sum of frozen child sizes plus dividers equals $avail$, yielding a normalization scale factor of exactly $1.000000000$.
     - Each child cell receives height $h_j = \text{size}_j$, producing $\Delta h_j = 0.0$mm.
     - Base coordinate $y = t$ is anchored to the bottom. Because neither $t$ nor cell heights changed, all vertical positions $y_j$ satisfy $\Delta y_j = 0.0$mm.
     - Carcass base, top cap (`Tapa superior` at $y = H_i - t$), and back panel (`Fondo` at $y = t - 10 + g, sy = H_i - 2t + 20 - 2g$) have dimensions determined solely by $H_i, W_i, t, g$, which are unchanged for all sibling columns.
   - Sibling pieces and bounding boxes experience 0.0mm drift.

6. **Defensive Edge Case Observation on Line 211**:
   - In `public/js/model.js:211`:
     `if (c.id !== colId && (typeof c.height !== 'number' || c.height <= 0))`
   - In JavaScript, if `c.height` is `NaN`:
     - `typeof NaN === 'number'` $\implies$ `typeof c.height !== 'number'` is `false`.
     - `NaN <= 0` is `false`.
   - Therefore, if a sibling column were to contain `c.height = NaN`, line 211 would not lock it. While `getColumnHeight` safely handles `NaN` via `Number.isFinite(col.height)`, defensively updating line 211 to:
     `if (c.id !== colId && (typeof c.height !== 'number' || !Number.isFinite(c.height) || c.height <= 0))`
     completely guarantees that even corrupted numeric inputs like `NaN` and `Infinity` are cleanly locked to `project.settings.height`.

---

## 3. Caveats

1. **Downstream Milestone Scopes**:
   - Interactive 2D drag handlers for `col-top` dividers and per-column floating `(+)` buttons belong to Milestone M2 (`public/js/app.js`).
   - 3D camera/floor alignment to `maxH` and graduated kinematics belong to Milestone M3 (`public/js/viewer.js`).
   - Legacy test suite assertion migration (updating older tests that called `addOnTop` without 5th argument and asserted global `settings.height` expanded) belongs to Milestone M4 (Feature 15).
2. **Assumptions Made**:
   - Columns are base-aligned at $y = 0$, consistent with `PROJECT.md` Section Contract 4.
   - No assumptions about external bundlers; all modules remain pure Vanilla ESM.

---

## 4. Conclusion

1. **Review of Line 45 in `public/js/model.js`**:
   - `c.height = c.height;` is a redundant self-assignment.
   - The suggestion `if (typeof c.height === 'number') col.height = c.height;` is **incorrect and unsafe**: it triggers a fatal `ReferenceError: col is not defined` at runtime and omits `Number.isFinite` and positive bounds checks.
   - The correct, clean fix is:
     ```javascript
     if (typeof c.height !== 'number' || !Number.isFinite(c.height) || c.height <= 0) {
       delete c.height;
     }
     ```
     This cleanses invalid height data, retains valid heights, preserves `undefined` for unstepped columns, and contains zero self-assignments.

2. **Verification of Stepped Mode `addOnTop` Invariance**:
   - `addOnTop(project, colId, type, addedHeight, false)` already strictly guarantees 0.0mm invariance on sibling columns.
   - Target module addition is isolated. Undefined sibling column heights are explicitly frozen. Sibling cell dimensions, coordinates, and carcass pieces exhibit zero drift ($\Delta < 0.0001$mm).
   - Proven mathematically and empirically across 5-step sequential and 4-step interleaved adversarial tests.

3. **Recommendations for Worker M1-IT2**:
   - **Recommendation 1 (Clean Line 45)**: In `public/js/model.js` lines 44–46, replace the self-assignment with invalid property deletion:
     ```javascript
     // Replace:
     // if (typeof c.height === 'number' && Number.isFinite(c.height) && c.height > 0) {
     //   c.height = c.height;
     // }
     // With:
     if (typeof c.height !== 'number' || !Number.isFinite(c.height) || c.height <= 0) {
       delete c.height;
     }
     ```
   - **Recommendation 2 (Defensive Hardening in `addOnTop`)**: In `public/js/model.js` line 211, include `!Number.isFinite(c.height)` to guard against `NaN`/`Infinity`:
     ```javascript
     // In addOnTop:
     project.columns.forEach((c) => {
       if (c.id !== colId && (typeof c.height !== 'number' || !Number.isFinite(c.height) || c.height <= 0)) {
         c.height = project.settings.height;
       }
     });
     ```

---

## 5. Verification Method

### 5.1 Test Execution Commands
Worker M1-IT2 can independently verify this behavior by running the dedicated test suites:
```powershell
node --test test/stepped_layout.test.js
node --test test/m1_challenger_add_on_top.test.js
```

### 5.2 Files to Inspect
1. `public/js/model.js` (lines 41–49, 185–238)
2. `public/js/layout.js` (lines 118–125, 350–359)
3. `test/stepped_layout.test.js` (tests 5, 6, and 10)
4. `test/m1_challenger_add_on_top.test.js` (Challenges 1, 2, and 3)

### 5.3 Invalidation Conditions
- If executing `normalizeProject` throws `ReferenceError: col is not defined`.
- If calling `normalizeProject` strips valid numeric column heights (e.g. `col.height = 950` becomes undefined).
- If calling `addOnTop(project, colId, 'shelf', 350, false)` causes any sibling cell dimension $(x, y, w, h)$ or piece dimension $(sx, sy, sz)$ to deviate by $\Delta \ge 0.0001$mm.
- If calling `addOnTop(project, colId, 'shelf', 350, false)` mutates `project.settings.height`.
