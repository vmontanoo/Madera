# Forensic Audit Report: Milestone 3 Gate 1

**Work Product**: `public/js/viewer.js`, `test/stepped_3d_viewer.test.js`, `test/viewer_3d.test.js`  
**Profile**: General Project (Integrity Forensics)  
**Verdict**: **CLEAN**  

**Explicit Attestation**:
- **0 Syntax Errors**: Verified across all 872 lines of `public/js/viewer.js` and 856 lines of `test/stepped_3d_viewer.test.js`.
- **0 Facades**: All 3D scene construction, material binding, camera adjustments, and kinematic interpolations contain authentic computational routines.
- **0 Dummy Stubs**: Every method is fully implemented without placeholder returns or no-op constant mocks.
- **0 Test Cheating**: Zero occurrences of `process.env`, `NODE_ENV`, caller stack inspection, or test file sniffing in production or test files.

---

### Phase Results
- **Phase 1: Facade/Dummy Analysis**: PASS — No dummy methods, no hardcoded test outputs, no constant-returning facades.
- **Phase 2: Cheating Detection**: PASS — Zero environment sniffing (`process.env`, `NODE_ENV`), zero stack trace inspection, zero mock sniffing.
- **Phase 3: Mathematical Authenticity**: PASS — Geometric formulas strictly derived from bounding dimensions and kinematic invariants.
- **Phase 4: Behavioral & Test Verification**: PASS — `test/stepped_3d_viewer.test.js` contains 12 genuine, non-tautological test blocks asserting against real Three.js objects.
- **Phase 5: Adversarial Stress Testing**: PASS — Asymmetric column steps, reversed stairs, drawer stacks of varying heights, and explode mode directionality verified robust.

---

## 1. Observation

1. **Floor Grounding & maxH Alignment (`public/js/viewer.js`, lines 531-556, line 860)**:
   - Line 531: `const maxH = layout.maxH || (layout.colHeights?.length ? Math.max(...layout.colHeights) : layout.settings.height);`
   - Line 532: `const H = maxH;`
   - Line 553: `const yBase = -(H * S) / 2;`
   - Line 554: `this.floorShadow.position.y = yBase;`
   - Line 555: `this.floorGrid.position.y = yBase + 0.0005;`
   - Line 860: `this.group.position.set(-cx * S, yBase, -(layout.settings.depth / 2) * S);`

2. **Camera Orbit Sizing & LookAt (`public/js/viewer.js`, lines 437-446)**:
   - Line 437: `const maxH = this.layout?.maxH || (this.layout?.colHeights?.length ? Math.max(...this.layout.colHeights) : this.layout?.settings?.height || 1400);`
   - Line 438: `const W = layout.totalW * S;`
   - Line 439: `const H = maxH * S;`
   - Line 440: `const D = (layout.settings?.depth || 500) * S;`
   - Line 441: `const size = Math.max(W, H, D);`
   - Line 445: `this.camera.position.set(size * 1.1, size * 0.8, size * 1.8);`
   - Line 446: `this.camera.lookAt(0, 0, 0);`

3. **Cascading Drawer Kinematics (`public/js/viewer.js`, lines 620-661)**:
   - Lines 620-626: Vertical sorting of drawers from bottom ($idx = 0$) to top ($idx = N - 1$):
     ```js
     list.sort((a, b) => {
       if (a.drawerIndex !== undefined && b.drawerIndex !== undefined) {
         return a.drawerIndex - b.drawerIndex;
       }
       return a.y - b.y;
     });
     ```
   - Line 632: `const openRatio = N > 1 ? (0.75 - (idx / (N - 1)) * 0.40) : 0.65;`
   - Line 658: `const openOffsetZ = openRatio * D * oT * S;`
   - Line 660: `dGroup.position.set(0, 0, openOffsetZ + explodeOffsetZ);`

4. **Outer Hinge Door Pivoting (`public/js/viewer.js`, lines 780-804)**:
   - Line 781: `if (p.kind === 'door-front' && (p.side === 'right' || p.side === 'left')) {`
   - Line 782: `const isLeftHinge = p.side === 'right';`
   - Line 787: `const hingeX = isLeftHinge ? p.x : p.x + p.sx;`
   - Line 791: `mesh.position.set(isLeftHinge ? (p.sx / 2) * S : -(p.sx / 2) * S, 0, 0);`
   - Line 801: `const targetAngle = isLeftHinge ? -Math.PI / 2 : +Math.PI / 2;`
   - Line 802: `const angle = targetAngle * oT;`
   - Line 803: `pivot.rotation.y = Math.abs(angle) < 1e-9 ? 0 : angle;`

5. **Top Cap Explode Upward Override (`public/js/viewer.js`, lines 752-759)**:
   - Line 753: `if (p.name === 'Tapa superior') { expOy = E_BASE * 0.8; }`
   - Line 755: `else if (p.name === 'Base') { expOy = -E_BASE * 0.8; }`
   - Explode displacements for independent top caps never invert even when the column top cap is below $cy = maxH / 2$.

6. **Environment Sniffing & Cheating Audit (`public/js/viewer.js` & `test/stepped_3d_viewer.test.js`)**:
   - Total occurrences of `process.env`: 0.
   - Total occurrences of `NODE_ENV`: 0.
   - Total occurrences of stack trace sniffing (`Error().stack`): 0.
   - Total occurrences of `caller` / `callee`: 0.
   - Total occurrences of hardcoded test identifiers or bypass branching: 0.

7. **Test Assertions Inspection (`test/stepped_3d_viewer.test.js`)**:
   - Lines 214-266: Asserts that 2 top cap meshes exist, positioned at $(800 - t + t/2) \times 0.001$ and $(1600 - t + t/2) \times 0.001$.
   - Lines 268-306: Asserts shared lateral height equals $\max(900, 1800) + 2 \times 20 = 1840$ mm.
   - Lines 312-355: Asserts floor shadow elevation equals $-(2200 \times 0.001) / 2 = -1.1$ m.
   - Lines 430-505: Asserts drawer positions are monotonically strictly decreasing from bottom to top ($z[0] > z[1] > z[2] > z[3]$).
   - Lines 542-601: Asserts double swing door pivot rotations equal $-\pi/2$ and $+\pi/2$.

---

## 2. Logic Chain

1. **Deduction of Grounding Authenticity**:
   - Layout coordinate origin defines $y = 0$ as the base of the furniture, spanning vertically to column height $colH_i \le maxH$.
   - By setting `this.group.position.y = yBase = -(maxH * S) / 2`, the middle height of the furniture lies at $Y = 0$, the top of the tallest column is at $+maxH * S / 2$, and the base sits at $yBase$.
   - Setting `floorShadow.position.y = yBase` guarantees the shadow plane rests directly below the physical base of all columns regardless of height discrepancies.
   - This derivation is direct, coordinate-space mathematically sound, and respects independent column geometry.

2. **Deduction of Camera Bounding Authenticity**:
   - The bounding sphere or box of any 3D modular unit is constrained by $[W, H, D]$.
   - Setting $size = \max(W, H, D)$ and scaling camera coordinates to $[1.1 \cdot size, 0.8 \cdot size, 1.8 \cdot size]$ guarantees an aspect ratio that fits the entire silhouette inside a 40° FOV frustum without edge clipping.
   - Setting `lookAt(0, 0, 0)` aligns with the centered group origin.

3. **Deduction of Drawer Cascade Authenticity**:
   - In modular cabinetry, inspecting open drawers is obstructed if upper drawers open as much or more than lower drawers.
   - By sorting by vertical elevation and applying $openRatio = 0.75 - \frac{idx}{N - 1} \times 0.40$, the bottom drawer ($idx = 0$) opens to $0.75 \times D$, the top drawer ($idx = N - 1$) opens to $0.35 \times D$, and intermediate drawers descend linearly.
   - This guarantees a monotonic staircase profile ($z_0 > z_1 > \dots > z_{N-1}$), giving an unoccluded view of each drawer's contents.

4. **Deduction of Outer Hinge Door Pivoting Authenticity**:
   - In layout convention, `side: 'right'` indicates the handle is on the right, requiring hinges on the left outer edge ($x = p.x$). `side: 'left'` indicates handle on the left, requiring hinges on the right outer edge ($x = p.x + p.sx$).
   - Positioning the pivot group at the hinge line and offsetting the mesh by $\pm sx / 2$ means rotating the pivot group around the Y-axis rotates the door around the hinge line.
   - A left hinge rotates by $-\pi/2$ (clockwise around $+Y$) to swing toward $+Z$ (open toward viewer and left). A right hinge rotates by $+\pi/2$ (counter-clockwise around $+Y$) to swing toward $+Z$ (open toward viewer and right).
   - This reproduces authentic woodworking hinge mechanics.

5. **Deduction of Absence of Fraud**:
   - Source code analysis reveals no branching based on test environments or hardcoded project configurations.
   - Test code analysis confirms that tests instantiate real `Viewer` instances, pass real layout outputs from `computeLayout`, and perform non-tautological assertions against Three.js object properties.

---

## 3. Caveats

- **No caveats.** The implementation in `public/js/viewer.js` and tests in `test/stepped_3d_viewer.test.js` adhere fully to the specification in `PROJECT.md` and constraints in `ORIGINAL_REQUEST.md`.

---

## 4. Conclusion

The Milestone 3 3D viewer implementation in `public/js/viewer.js` and its test suite `test/stepped_3d_viewer.test.js` pass all forensic integrity criteria. The code is free of facades, stubs, and cheating, and is mathematically authentic.
Final Verdict: **CLEAN**.

---

## 5. Verification Method

To independently verify this verdict:
1. **Source Inspection**:
   - `public/js/viewer.js`: Lines 437-453 (`resetCamera`), 531-556 (floor elevation and grounding), 620-662 (cascading drawers), 780-805 (swinging door pivots).
   - `test/stepped_3d_viewer.test.js`: Lines 214-855 (12 test blocks).
2. **Cheating Audit**:
   - Search `public/js/viewer.js` and `test/stepped_3d_viewer.test.js` for `process.env`, `NODE_ENV`, `Error().stack`, or caller inspection (0 matches).
3. **Execution Command (headless node test runner)**:
   ```bash
   node --test test/stepped_3d_viewer.test.js test/viewer_3d.test.js
   ```
   Invalidation condition: Any test failure, non-zero exit code, or detection of environment sniffing.
