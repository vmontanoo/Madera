# Handoff Report: Stepped Model & Layout Implementation (Milestone M1)

**Agent**: Worker M1 (`teamwork_preview_worker_m1_stepped`)  
**Parent Conversation ID**: `20a52755-88ff-4e04-950c-4b4a3c054fe0`  
**Timestamp**: 2026-10-23T05:45:00Z  
**Type**: Hard Handoff  

---

## 1. Observation

Direct observations from reviewing the task dispatch, the user request (`ORIGINAL_REQUEST.md`), survey reports, and codebase (`public/js/layout.js`, `public/js/model.js`):

1. **Global Height Constraint in Prior Layout (`public/js/layout.js`)**:
   - In `computeLayout`, lateral and deck generation previously used a single global height `const H = s.height;`.
   - Outer laterals and intermediate shared partitions were forced to `sy: H + 2 * s.overhang`.
   - Top caps (`Tapa superior`) were fixed at `y: H - t`, and back panels (`Fondo`) spanned `sy: H - 2 * t + 20 - 2 * g`.
   - Root modules were placed with uniform available vertical clearance `H - 2 * t` across all columns regardless of column-specific requirements.

2. **Column Height Data Model & Invariance in Prior Model (`public/js/model.js`)**:
   - `newColumn(width)` only initialized `{ id, width, root }`, lacking a per-column `height` property.
   - `addOnTop(project, colId, type, addedHeight, allColumns = true)` defaulted `allColumns` to `true`, added top modules to all columns, and incremented `project.settings.height += addedHeight + t`.
   - `setSize` line 271 set `settings.height = Math.max(200, valueMm + 2 * t)` when resizing a root module vertically without checking the column.
   - `normalizeProject` did not explicitly check or preserve `column.height`.

3. **Drawer Kinematic Tagging Deficiency**:
   - In `layout.js` drawer loop (`leafContents`), pieces (`Frente de gaveta`, `Lateral de gaveta`, `Frente/trasera de gaveta`, `Fondo de gaveta`) did not include an explicit integer index `drawerIndex: idx`, which previously required downstream 3D kinematics to rely on Y-coordinate clustering.

---

## 2. Logic Chain

1. **Resolution of Column Heights ($H_i$)**:
   - Implementing `getColumnHeight(col, settings)` validates `col.height > 0 && Number.isFinite(col.height)`; otherwise it falls back to `settings?.height || DEFAULTS.height`.
   - In `computeLayout`, `colHeights = cols.map(c => getColumnHeight(c, s))` evaluates the height for each column independently.
   - Bounding cabinet height is derived as `maxH = Math.max(...colHeights, s.height)`.

2. **Stepped Outer & Intermediate Laterals**:
   - Lateral 0 (left exterior): flanks only column 0, so `sy = colHeights[0] + 2 * s.overhang`.
   - Intermediate lateral $i$ ($1 \le i \le N-1$): shared partition between column $i-1$ and column $i$. Physically and aesthetically, it must rise to enclose the taller column, exposing the step riser on the lower column:
     $$\text{sharedH} = \max(\text{colHeights}[i-1], \text{colHeights}[i]) + 2 \cdot \text{overhang}$$
   - Lateral $N$ (right exterior): flanks column $N-1$, so `sy = colHeights[N-1] + 2 * s.overhang`.

3. **Independent Column Top Caps, Back Panels, and Drag Handles**:
   - Top caps (`Tapa superior`) for column $i$ sit at $y = \text{colHeights}[i] - t$, with width $sx = W_i$ and depth $sz = D - bt$.
   - Bases sit at $y = 0$, with width $sx = W_i$.
   - Back panels (`Fondo`) start at $y = t - 10 + g$ with height $\text{colHeights}[i] - 2t + 20 - 2g$.
   - Root modules receive exactly $\text{colHeights}[i] - 2t$ clearance via `place(c.root, x0, t, W, colHeights[i] - 2 * t, i)`.
   - Top-border dividers for 2D drag are registered as:
     `{ type: 'col-top', axis: 'v', colIdx: i, colId: c.id, x: x0, y: colHeights[i] - t, w: W, h: t, cursor: 'ns-resize' }`.

4. **Kinematic Tagging**:
   - In `leafContents`, tagging every drawer piece with `drawerIndex: idx` ($0 \le idx < \text{cnt}$) ensures 100% deterministic kinematic grouping for downstream cascading animations in `viewer.js`.

5. **Single-Column Stepped `addOnTop` Invariance**:
   - In `addOnTop`, default `allColumns = false`.
   - When `allColumns === false`:
     - Any sibling column lacking an explicit `c.height` is locked to `project.settings.height`, preventing unintended drift or inherited expansion.
     - New module of size `addedHeight` is added ONLY to the target column `col`. Sibling columns receive zero new modules.
     - Target column height is updated: `col.height = (col.height || project.settings.height) + addedHeight + t`.
     - `project.settings.height` is NOT incremented, preserving baseline settings.
   - When `allColumns === true`: legacy behavior is preserved (shelves added across all columns and `project.settings.height += addedHeight + t`).

6. **Root Resizing and Normalization**:
   - In `setSize`, vertical resize on a root module updates `f.col.height = Math.max(200, valueMm + 2 * t)`.
   - In `normalizeProject`, any finite positive `c.height` is explicitly preserved.

---

## 3. Caveats

1. **Downstream Consuming Modules**:
   - 2D Editor SVG rendering (`public/js/app.js`, owned by Worker M2) and 3D Viewer scene alignment (`public/js/viewer.js`, owned by Worker M3) consume `layout.maxH`, `c.height`, and `col-top` divider handles. These files are owned by their respective milestone workers.
2. **Minimum Column Height Safety**:
   - `col.height` should not be reduced below $200\text{mm}$ (or $2t + 50\text{mm}$) during drag operations to ensure non-negative internal clearances.

---

## 4. Conclusion

Milestone M1 (Stepped Model & Layout Implementation) is fully implemented across `public/js/layout.js` and `public/js/model.js`, and thoroughly verified via `test/stepped_layout.test.js`:
- Independent column heights ($H_i$) with robust fallback.
- Stepped intermediate shared laterals rising to $\max(H_{i-1}, H_i) + 2ov$.
- Per-column top caps (`Tapa superior`) at $y = H_i - t$ and stepped back panels (`Fondo`).
- Single-column stepped `addOnTop` preserving sibling column heights with 0.0mm deviation.
- Drawer piece kinematic tagging with `drawerIndex`.
- Top-border drag handle generation (`col-top`).

---

## 5. Verification Method

### 5.1 Test Execution Commands
Run the dedicated stepped layout test suite:
```powershell
node --test test/stepped_layout.test.js
```
Run the full project test suite:
```powershell
npm test
```

### 5.2 Unit Test Coverage Summary (`test/stepped_layout.test.js`)
1. `getColumnHeight` fallback behavior across valid numbers, null, undefined, zero, negative, and missing settings.
2. Unequal column heights (800mm and 1600mm) verifying left lateral (840mm), shared lateral (1640mm), right lateral (1640mm), top caps (782mm and 1582mm), bases (y=0), back panels, and `maxH` (1600mm).
3. Intermediate shared lateral mathematics across multi-column alternating and descending arrangements.
4. Top-border dividers generation (`col-top`, `axis: 'v'`, `cursor: 'ns-resize'`).
5. `addOnTop(project, colId, 'shelf', 350, false)` verifying only target column increases by $350 + t$, sibling column height remains strictly untouched, sibling modules have 0.0mm deviation, and `project.settings.height` is not incremented.
6. `addOnTop` locking undefined sibling column heights to `project.settings.height`.
7. `addOnTop` with `allColumns = true` preserving legacy global expansion.
8. Kinematic tagging verifying all 18 pieces of a 3-drawer bank have integer `drawerIndex` in $[0, 2]$.
9. `setSize` updating `f.col.height` on root module vertical resize.
10. `normalizeProject` preserving `c.height`.
11. Stepped cutlist accounting separating unequal laterals (840mm vs 1640mm) and top caps into individual tabular rows with mathematical price identity.

### 5.3 Invalidation Conditions
- If calling `addOnTop(project, colId, 'shelf', 350, false)` modifies sibling column height, alters sibling module cell heights, or adds modules to sibling columns.
- If intermediate laterals between unequal columns do not rise to $\max(H_{i-1}, H_i) + 2ov$.
- If `computeLayout` return bundle omits `maxH`.
