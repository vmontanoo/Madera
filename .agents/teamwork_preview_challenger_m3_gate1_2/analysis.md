# Stepped Kinematics Adversarial Verification Analysis

**Agent**: Challenger M3-Gate1-2 (Stepped Kinematics Adversarial Verifier)  
**Date**: 2026-10-23  
**Target Milestone**: M3 (Renderizado 3D y Cinemática Escalonada)  
**Files Audited**:
- `public/js/viewer.js`
- `public/js/layout.js`
- `test/stepped_3d_viewer.test.js`
- `.agents/ORIGINAL_REQUEST.md`
- `.agents/orchestrator_4/PROJECT.md`

---

## 1. Cascading Drawers Analysis

### 1.1 Progression Formula Verification ($N \in [2, 6]$)
- **Specification**: In "Puertas abiertas" mode, multi-drawer stacks must follow a cascading staircase opening:
  $$\text{openRatio}(idx, N) = 0.75 - \frac{idx}{N - 1} \times 0.40$$
  where $idx = 0$ is the bottom drawer (opening to 75%) and $idx = N - 1$ is the top drawer (opening to 35%). Single drawers ($N = 1$) default to 65% ($0.65$).
- **Implementation Check (`public/js/viewer.js` line 632)**:
  ```javascript
  const openRatio = N > 1 ? (0.75 - (idx / (N - 1)) * 0.40) : 0.65;
  ```
- **Index Assignment Verification (`public/js/layout.js` lines 273-286)**:
  ```javascript
  const cnt = Math.max(1, Math.round(n.count || 1));
  const slot = ch / cnt;
  ...
  for (let i = 0; i < cnt; i++) {
    const idx = cnt - 1 - i; // el primero queda arriba
    add({ ..., y: cy + idx * slot + fc / 2, ..., drawerIndex: idx });
  }
  ```
  - For $i = 0$ (top iteration): $idx = cnt - 1$ with elevation $y = cy + (cnt - 1) \times slot$, highest elevation.
  - For $i = cnt - 1$ (bottom iteration): $idx = 0$ with elevation $y = cy$, lowest elevation.
  - In `viewer.js` line 621-626, drawers are sorted ascending by `drawerIndex`:
    - Position 0 has $idx = 0$ (bottom drawer).
    - Position $N - 1$ has $idx = N - 1$ (top drawer).
- **Evaluation Across Domain $N \in [2, 6]$**:
  | $N$ | Drawer Index $idx$ | Position | Exact Formula Value | Evaluated Ratio | Percentage | Step $\Delta$ |
  |---|---|---|---|---|---|---|
  | **2** | 0 | Bottom | $0.75 - 0$ | $0.7500$ | 75.00% | $-0.4000$ |
  | | 1 | Top | $0.75 - 0.40$ | $0.3500$ | 35.00% | |
  | **3** | 0 | Bottom | $0.75 - 0$ | $0.7500$ | 75.00% | $-0.2000$ |
  | | 1 | Middle | $0.75 - 0.20$ | $0.5500$ | 55.00% | $-0.2000$ |
  | | 2 | Top | $0.75 - 0.40$ | $0.3500$ | 35.00% | |
  | **4** | 0 | Bottom | $0.75 - 0$ | $0.7500$ | 75.00% | $-0.1333$ |
  | | 1 | Mid-low | $0.75 - 0.1333$ | $0.6167$ | 61.67% | $-0.1333$ |
  | | 2 | Mid-high | $0.75 - 0.2667$ | $0.4833$ | 48.33% | $-0.1333$ |
  | | 3 | Top | $0.75 - 0.40$ | $0.3500$ | 35.00% | |
  | **5** | 0 | Bottom | $0.75 - 0$ | $0.7500$ | 75.00% | $-0.1000$ |
  | | 1 | Shelf 2 | $0.75 - 0.10$ | $0.6500$ | 65.00% | $-0.1000$ |
  | | 2 | Shelf 3 | $0.75 - 0.20$ | $0.5500$ | 55.00% | $-0.1000$ |
  | | 3 | Shelf 4 | $0.75 - 0.30$ | $0.4500$ | 45.00% | $-0.1000$ |
  | | 4 | Top | $0.75 - 0.40$ | $0.3500$ | 35.00% | |
  | **6** | 0 | Bottom | $0.75 - 0$ | $0.7500$ | 75.00% | $-0.0800$ |
  | | 1 | Shelf 2 | $0.75 - 0.08$ | $0.6700$ | 67.00% | $-0.0800$ |
  | | 2 | Shelf 3 | $0.75 - 0.16$ | $0.5900$ | 59.00% | $-0.0800$ |
  | | 3 | Shelf 4 | $0.75 - 0.24$ | $0.5100$ | 51.00% | $-0.0800$ |
  | | 4 | Shelf 5 | $0.75 - 0.32$ | $0.4300$ | 43.00% | $-0.0800$ |
  | | 5 | Top | $0.75 - 0.40$ | $0.3500$ | 35.00% | |

- **Verification Result**: Across all $N \in [2, 6]$, the bottom drawer opens to exactly 75% and the top drawer opens to exactly 35%. The progression is strictly monotonic and linear.

### 1.2 Multi-Column Isolation and Non-Collision Across Stepped Heights
- **Data Partitioning**: In `viewer.js`, pieces are partitioned by composite key `${p.nodeId}_${p.drawerIndex}`. Drawer assemblies are grouped into `drawersByNode` keyed by `dg.nodeId`.
  Because every module node in `columns[i].root` has an immutable unique identifier (`nodeId`), drawer stacks in different columns belong to distinct keys and distinct arrays.
- **Transverse ($X$) Coordinate Disjointness**:
  - Column $i$ spans $x \in [X_i + t, X_i + t + W_i]$.
  - The drawer box width is $W_i - 2 \cdot sc$ where $sc = 13\,\text{mm}$ (slide clearance).
  - Column $i+1$ begins after the shared lateral panel of thickness $t = 18\,\text{mm}$.
  - Clearance between column $i$'s drawer and column $i+1$'s drawer along the $X$-axis:
    $$\Delta X = t + 2 \cdot sc = 18 + 2(13) = 44\,\text{mm}$$
- **Kinematic Displacement Independence**:
  - The drawer group's kinematic update executes:
    `dGroup.position.set(0, 0, openOffsetZ + explodeOffsetZ)`.
  - The displacement vector is purely along $\hat{z}$ (Z-axis). The $X$ and $Y$ displacements are identically 0.
  - Since the $X$-extents are strictly separated by $\Delta X \ge 44\,\text{mm}$, drawer columns across different stepped heights can NEVER collide or intermingle during any phase of opening or explosion.

---

## 2. Swing Doors Analysis

### 2.1 Double Doors Hinge Anchoring & Swing Direction
- **Specification**: Double doors must pivot around outer lateral edges and swing outward (-90° left leaf, +90° right leaf) away from the center.
- **Code Trace (`public/js/layout.js` lines 222-226)**:
  ```javascript
  if (n.front === 'doors') {
    const dw = (cw - 3 * fc) / 2;
    door('Puerta', cx + fc, cy + fc, dw, ch - 2 * fc, 'right');
    door('Puerta', cx + 2 * fc + dw, cy + fc, dw, ch - 2 * fc, 'left');
    hw.hinges += hingesPer * 2;
  }
  ```
  - Left Leaf: `p.side = 'right'` (handle on right edge).
  - Right Leaf: `p.side = 'left'` (handle on left edge).
- **Code Trace (`public/js/viewer.js` lines 780-805)**:
  ```javascript
  const isLeftHinge = p.side === 'right';
  const hingeX = isLeftHinge ? p.x : p.x + p.sx;
  ...
  const targetAngle = isLeftHinge ? -Math.PI / 2 : +Math.PI / 2;
  pivot.rotation.y = targetAngle * oT;
  ```
  - Left Leaf: `isLeftHinge = true`. Hinge position is $p.x = cx + fc$ (outer left edge). Rotation angle is $-\frac{\pi}{2}$ (-90°).
  - Right Leaf: `isLeftHinge = false`. Hinge position is $p.x + p.sx = cx + cw - fc$ (outer right edge). Rotation angle is $+\frac{\pi}{2}$ (+90°).

### 2.2 Proof of Non-Collision with Cabinet Interior
- **Coordinate Setup**:
  - Carcass depth interval: $z \in [0, D]$. Front edge of carcass: $z = D$.
  - Cabinet interior: $z < D$.
  - Door hinge position: $z_{\text{hinge}} = D + \frac{t}{2}$.
  - Door leaf local coordinates in pivot frame:
    - Left leaf: $x_{\text{loc}} \in [0, dw]$, $z_{\text{loc}} \in [-\frac{t}{2}, +\frac{t}{2}]$.
    - Right leaf: $x_{\text{loc}} \in [-dw, 0]$, $z_{\text{loc}} \in [-\frac{t}{2}, +\frac{t}{2}]$.
- **Left Leaf Trajectory**:
  $$\theta = -\frac{\pi}{2} \cdot oT \in [-\pi/2, 0]$$
  Let $\phi = -\theta \in [0, \pi/2]$. The world Z position of any point on the left door leaf is:
  $$z_{\text{world}}(x_{\text{loc}}, z_{\text{loc}}, \phi) = \left(D + \frac{t}{2}\right) + x_{\text{loc}} \sin\phi + z_{\text{loc}} \cos\phi$$
  Since $x_{\text{loc}} \ge 0$ and $\sin\phi \ge 0$, $x_{\text{loc}} \sin\phi \ge 0$.
  The minimum possible value of $z_{\text{world}}$ over the entire door volume is achieved at $x_{\text{loc}} = 0$ and $z_{\text{loc}} = -\frac{t}{2}$:
  $$\min z_{\text{world}}(\phi) = D + \frac{t}{2} - \frac{t}{2}\cos\phi = D + \frac{t}{2}(1 - \cos\phi)$$
  Since $\cos\phi \le 1$ for all $\phi \in [0, \pi/2]$, $1 - \cos\phi \ge 0$.
  Therefore:
  $$\min z_{\text{world}}(\phi) \ge D \quad \forall \phi \in [0, \pi/2]$$
  - At $\phi = 0$ (fully closed): $\min z_{\text{world}} = D$ (flush with carcass front edge).
  - At $\phi \in (0, \pi/2]$ (opening to open): $\min z_{\text{world}} > D$ (strictly ahead of carcass front edge).
  - At $\phi = \pi/2$ (fully open 90°): $z_{\text{world}} \in [D + \frac{t}{2}, D + \frac{t}{2} + dw]$.
- **Conclusion**: The doors swing entirely in the positive half-space $z \ge D$. It is mathematically impossible for the door leaf to intersect or collide with the cabinet interior ($z < D$) at any point during opening.

### 2.3 Single Doors Verification
- `left-door`: Handle on right (`p.side = 'right'`), `isLeftHinge = true`. Pivots at outer left edge $p.x$ and rotates $-90^\circ$ outward.
- `right-door`: Handle on left (`p.side = 'left'`), `isLeftHinge = false`. Pivots at outer right edge $p.x + p.sx$ and rotates $+90^\circ$ outward.
- Both single door variants swing outward around outer edges without interior collision.

---

## 3. Theme Switching Preservation

### 3.1 Theme Switching Mechanism (`public/js/viewer.js` lines 374-426)
- Method: `setVisualTheme(theme)` updates:
  - `this.scene.background`
  - `this.hemiLight` and `this.dirLight` colors and intensities
  - `this.floorGrid.visible`
  - Iterates `this.group.traverse` to update `material.color`, `roughness`, `metalness`, and `emissive` in-place on existing meshes and `LineSegments`.
- **Invariance Guarantees**:
  1. **Geometry Invariance**: No Three.js geometries are disposed, allocated, or modified. Dimensions ($sx, sy, sz$) and vertices remain identical.
  2. **Kinematic Node Invariance**: `this.kinematicNodes` array is untouched. All registered kinematic update closures for drawers, swing doors, bi-fold doors, sliding doors, and explode offsets remain active and unmodified.
  3. **State Invariance**: `openT`, `targetOpenT`, `explodeT`, `targetExplodeT`, and `renderMode` are completely preserved.
  4. **Spatial Invariance**: Floor shadow elevation at $yBase = -(maxH \times S) / 2$, group origin at $(-cx \cdot S, yBase, -cz \cdot S)$, and camera target at $(0, 0, 0)$ remain identical.

---

## 4. Adversarial Findings Summary

| Challenge Area | Target Invariant | Adversarial Finding | Severity | Status |
|---|---|---|---|---|
| Cascading Drawers | $0.75 - \frac{idx}{N-1} \times 0.40$ for $N \in [2, 6]$ | Strictly followed. All edge cases ($N=2$, $N=6$) produce exact endpoints 75% and 35%. | None | PASS |
| Column Independence | Multi-column drawer isolation | Columns partitioned by `nodeId`, disjoint along $X$ by $\ge 44\,\text{mm}$. No intermingling. | None | PASS |
| Swing Doors Hinge | Outer lateral edge hinge placement | Left hinge placed at $p.x$, right hinge placed at $p.x + p.sx$. Correct. | None | PASS |
| Swing Doors Outward | Left swings $-90^\circ$, right swings $+90^\circ$ | Angles strictly $-\pi/2$ and $+\pi/2$. Outward direction verified. | None | PASS |
| Interior Clearance | $z_{\text{world}} \ge D$ during swing | Proven mathematically: $\min z_{\text{world}} = D + \frac{t}{2}(1 - \cos\phi) \ge D$. | None | PASS |
| Theme Switching | Geometry & Kinematics Preservation | In-place material updates without geometry recreation or state reset. | None | PASS |

**Final Challenger Assessment**: All stepped kinematics requirements pass adversarial scrutiny with zero regressions or failure modes identified.
