# Project: Stepped Modular Furniture (Muebles Escalonados con Alturas Independientes por Columna)

## Architecture
- **Stack**: Vanilla ECMAScript Modules (ESM) running natively in browser via import maps (Three.js), served by Express, backed by SQLite (`node:sqlite`), tested with Node native test runner (`node --test`).
- **Core Modules**:
  1. `public/js/model.js`: Pure data mutations (`newColumn`, `addOnTop`, `addColumn`, `leaf`, `wrap`, `setSize`, `normalizeProject`).
  2. `public/js/layout.js`: Pure geometry and cutlist math (`getColumnHeight`, `computeLayout`, `buildCutlist`, `orientationOf`).
  3. `public/js/app.js`: Interactive 2D canvas SVG (`drawCanvas`), drag-and-drop handlers (top border `col-top` and shelf dividers), cursor management, undo/redo history, cutlist DOM (`drawCutlist`).
  4. `public/js/viewer.js`: Three.js 3D viewport rendering, stepped geometry (independent top caps, shared laterals), and kinematics (staircase drawer opening, outer-hinge swing doors).
  5. `public/style.css`: Screen UI styles and print stylesheet (`@media print`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Independent Column Height Data Model | Support `column.height` in data model with fallback to `project.settings.height` via `getColumnHeight` | M1 | R1 Spec & AC 1 |
| 2 | Stepped Geometry Calculation | `computeLayout` calculates coordinates, cells, pieces, and dividers for each column from common base $y = 0$ | M1 | R1 Spec & AC 1 |
| 3 | Single-Column Top Module Addition | `addOnTop(project, colId, type, 350, false)` increases only target column height and adds module only to target column without affecting neighbors | M1 | R1 Spec & AC 2 |
| 4 | Shared Intermediate Stepped Laterals | Intermediate lateral between col $i-1$ and col $i$ rises to $\max(H_{i-1}, H_i) + 2ov$, cleanly exposing the step riser | M1 | R1 & R3 Spec |
| 5 | Stepped 2D SVG Silhouette & Dynamic ViewBox | `drawCanvas` anchors to `top = maxH + ov` and renders staggered column tops and accurate viewBox | M2 | R2 Spec & AC 1 |
| 6 | Per-Column Dedicated (+) Buttons | Dedicated (+) button floating 50mm directly above each column's top cap line, plus lateral (+) buttons | M2 | R2 Spec & AC 2 |
| 7 | Interactive 2D Top Border Dragging | Dragging top border (`col-top`) interactively updates `col.height` in real time with `ns-resize` cursor and safety bounds | M2 | R2 Spec & AC 3 |
| 8 | Internal Divider Dragging with Bounds | Dragging horizontal dividers inside columns respects $\ge 50$mm safety clearance and updates history | M2 | R2 Spec & AC 4 |
| 9 | Stepped 3D Structure & Independent Top Caps | 3D viewer renders individual top caps (`Tapa superior`) at each column's height and aligns floor/camera to `maxH` | M3 | R3 Spec & AC 1 |
| 10 | Staggered Back Panels in 3D | Staggered back panels (`Fondo`) match the stepped silhouette in carcass grooves | M3 | R3 Spec & AC 1 |
| 11 | Cascading Drawer Kinematics | Drawers open in staircase cascade from bottom (75%) to top (35%) in "Puertas abiertas" mode | M3 | R3 Spec & AC 2 |
| 12 | Outer Hinge Swing Door Kinematics | Single and double doors pivot strictly on outer carcass hinges (-90° left, +90° right swinging outward) | M3 | R3 Spec & AC 3 |
| 13 | Stepped Cutlist Panel Classification | Laterals classified with actual individual heights (`Lateral exterior` vs `Lateral interior`), top caps itemized per column | M4 | R4 Spec & AC 1 |
| 14 | Cutlist Math & Print Consistency | Tabular format for Ctrl+P, exact mm dimensions, and strict mathematical pricing consistency (`panels + hw === total`) | M4 | R4 Spec & AC 1 |
| 15 | Full Test Suite 100% Pass Rate | All tests in `npm test` pass without regressions | M4 | R4 Spec & AC 2 |
| 16 | E2E Acceptance & Adversarial Hardening | Comprehensive multi-tier test coverage and adversarial stress testing for stepped furniture | M5 | Acceptance & Audit |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Modelo de Datos y Layout Escalonado (R1) | `model.js` & `layout.js`: `column.height`, fallback helper, `computeLayout` stepped geometry, `addOnTop(..., false)`, `col-top` dividers | none | **DONE (GATE PASSED)** |
| M2 | Editor 2D Interactivo y Arrastre de Bordes (R2) | `app.js`: dynamic SVG viewBox & coords, per-column floating (+) buttons, top border vertical drag, divider safety limits, undo/redo | M1 | **DONE (GATE PASSED)** |
| M3 | Renderizado 3D y Cinemática Escalonada (R3) | `viewer.js`: independent top caps, maxH floor/camera alignment, cascading drawer opening (75%-35%), outer-hinge door pivots | M1 | **DONE (GATE PASSED)** |
| M4 | Despiece Tabular y Hoja de Corte (R4) | `layout.js` & `app.js`: granular panel classification, per-column top caps, mathematical consistency, Ctrl+P layout, full `npm test` pass | M1, M2, M3 | IN_PROGRESS |
| M5 | Verificación E2E y Robustez Adversarial | Multi-tier tests (Tiers 1-5), boundary & corner conditions, adversarial stress testing, final forensic audit | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### 1. Column Data Contract
```typescript
interface Column {
  id: string;
  width: number;           // mm, min 150
  height?: number;         // mm, optional individual height; fallback to project.settings.height
  root: Node;
}
```

### 2. `getColumnHeight(col, settings)` ↔ `computeLayout`
- **Signature**: `getColumnHeight(col: Column, settings: Settings): number`
- **Behavior**: If `col?.height` is a positive finite number, returns `col.height`; otherwise returns `settings?.height || DEFAULTS.height`.

### 3. `addOnTop(project, colId, type, addedHeight, allColumns)` ↔ Model
- **Signature**: `addOnTop(project: Project, colId: string, type: string = 'shelf', addedHeight: number = 350, allColumns: boolean = false): Node`
- **Behavior**:
  - When `allColumns === false` (default stepped mode):
    - Locks unassigned sibling column heights to `settings.height`.
    - Adds new leaf of height `addedHeight` only to target column.
    - Increments only `targetCol.height = (targetCol.height || settings.height) + addedHeight + thickness`.
    - Neighboring columns experience 0.0mm height drift and zero new modules.
  - When `allColumns === true` (legacy mode):
    - Adds shelves across all columns and increments `settings.height += addedHeight + thickness`.

### 4. `computeLayout(project)` ↔ Geometry & Dividers
- **Returns**: `{ settings, pieces, cells, dividers, colDividers, totalW, maxH, hardware, cutlist }`
- **Invariants**:
  - `maxH === colHeights.length > 0 ? Math.max(...colHeights) : settings.height`
  - Left outer lateral: $y = -ov$, $sy = H_0 + 2ov$
  - Intermediate shared lateral $i$: $y = -ov$, $sy = \max(H_{i-1}, H_i) + 2ov$
  - Right outer lateral: $y = -ov$, $sy = H_{N-1} + 2ov$
  - Top cap for col $i$: $y = H_i - t$, $sy = t$, $sx = W_i$
  - Top border divider for col $i$: `{ type: 'col-top', axis: 'v', colIdx: i, x: x0, y: colH - t, w: W, h: t, cursor: 'ns-resize' }`

### 5. Kinematics Contract
- **Drawers**: Graduated cascade: $openRatio = N > 1 ? (0.75 - \frac{idx}{N-1} \times 0.40) : 0.65$. Bottom drawer opens to 75%, top drawer to 35%.
- **Swing Doors**: Hinge at outer lateral edges. Left leaf rotates -90°, right leaf rotates +90°.

## Code Layout
- `public/js/model.js`: Pure data mutations (`newColumn`, `addOnTop`, `addColumn`, `leaf`, `wrap`, `setSize`, `normalizeProject`).
- `public/js/layout.js`: Pure geometry and cutlist math (`getColumnHeight`, `computeLayout`, `buildCutlist`, `orientationOf`).
- `public/js/app.js`: Interactive 2D canvas, drag handlers, per-column buttons, cutlist DOM.
- `public/js/viewer.js`: Three.js 3D viewport rendering, stepped geometry, kinematics.
- `public/style.css`: UI styles and print stylesheet.
- `test/stepped_layout.test.js`: Dedicated unit test suite for stepped column layout and addOnTop invariance (11 tests, 100% pass).
- `test/m1_challenger_stepped_layout.test.js`: Adversarial challenger suite for stepped topologies (10 tests, 100% pass).
- `test/m1_challenger_add_on_top.test.js`: Adversarial challenger suite for addOnTop invariance (4 tests, 100% pass).
- `test/stepped_furniture_3d.test.js`: Dedicated test suite for stepped 3D geometry and kinematics (M3).
