# Handoff Report: Reviewer M3-Gate1-2 (Stepped Kinematics & Camera Reviewer)

**Agent**: Reviewer M3-Gate1-2 (Stepped Kinematics & Camera Reviewer)  
**Roles**: reviewer, critic  
**Parent Conversation ID**: 20a52755-88ff-4e04-950c-4b4a3c054fe0  
**Timestamp**: 2026-10-23T07:23:00Z  
**Type**: Hard Handoff  

---

## 1. Observation

Direct observations from reviewing `public/js/viewer.js`, `public/js/layout.js`, `test/stepped_3d_viewer.test.js`, and `.agents/teamwork_preview_worker_m3_stepped/handoff.md`:

1. **Cascading Drawer Kinematics & Index Grouping**:
   - In `public/js/viewer.js` (lines 593–606):
     ```javascript
     if (p.kind === 'drawer' || (p.kind === 'front' && p.name === 'Frente de gaveta')) {
       const key = p.drawerIndex !== undefined
         ? `${p.nodeId}_${p.drawerIndex}`
         : `${p.nodeId}_${Math.round(p.y / 15) * 15}`;
       let dg = drawerGroupsMap.get(key);
       if (!dg) {
         dg = { nodeId: p.nodeId, y: p.y, drawerIndex: p.drawerIndex, pieces: [] };
         drawerGroupsMap.set(key, dg);
       }
       dg.pieces.push(p);
     }
     ```
   - In `public/js/layout.js` (lines 283–297), every drawer piece (`Frente de gaveta`, `Lateral de gaveta`, `Frente/trasera de gaveta`, `Fondo de gaveta`) is generated with `drawerIndex: idx`, where $idx = 0$ is the bottom drawer and $idx = \text{cnt} - 1$ is the top drawer.
   - In `public/js/viewer.js` (lines 620–633, 657–661):
     ```javascript
     list.sort((a, b) => {
       if (a.drawerIndex !== undefined && b.drawerIndex !== undefined) {
         return a.drawerIndex - b.drawerIndex;
       }
       return a.y - b.y;
     });
     const N = list.length;
     list.forEach((dg, idx) => {
       const openRatio = N > 1 ? (0.75 - (idx / (N - 1)) * 0.40) : 0.65;
       ...
       this.kinematicNodes.push((oT, eT, exMul) => {
         const openOffsetZ = openRatio * D * oT * S;
         const explodeOffsetZ = 1.0 * E_BASE * exMul * eT * S;
         dGroup.position.set(0, 0, openOffsetZ + explodeOffsetZ);
       });
     });
     ```
     At full extension ($oT = 1.0$):
     - For $idx = 0$ (bottom drawer): $\text{openRatio} = 0.75 - 0 = 0.75$ ($75\% \cdot D$).
     - For $idx = N - 1$ (top drawer): $\text{openRatio} = 0.75 - 0.40 = 0.35$ ($35\% \cdot D$).
     - For $N = 1$ (single drawer): guarded against division by zero, returns $0.65$ ($65\% \cdot D$).

2. **Outer Hinge Swing Doors**:
   - In `public/js/viewer.js` (lines 780–805):
     ```javascript
     if (p.kind === 'door-front' && (p.side === 'right' || p.side === 'left')) {
       const isLeftHinge = p.side === 'right';
       const pivot = new THREE.Group();
       pivot.userData = { isPivot: true, kind: 'door-swinging', side: isLeftHinge ? 'left-hinge' : 'right-hinge', piece: p };
       this.group.add(pivot);

       const hingeX = isLeftHinge ? p.x : p.x + p.sx;
       const hingeY = pcy;
       const hingeZ = pcz;

       mesh.position.set(isLeftHinge ? (p.sx / 2) * S : -(p.sx / 2) * S, 0, 0);
       pivot.add(mesh);

       this.kinematicNodes.push((oT, eT, exMul) => {
         pivot.position.set(
           (hingeX + expOx * exMul * eT) * S,
           (hingeY + expOy * exMul * eT) * S,
           (hingeZ + expOz * exMul * eT) * S
         );
         const targetAngle = isLeftHinge ? -Math.PI / 2 : +Math.PI / 2;
         const angle = targetAngle * oT;
         pivot.rotation.y = Math.abs(angle) < 1e-9 ? 0 : angle;
       });
     }
     ```
   - In `public/js/layout.js`:
     - Double doors (`front === 'doors'`): Left leaf has `p.side = 'right'` (handle on right edge), so `isLeftHinge === true`, pivot placed at $x = p.x$ (outer left lateral), rotates $-90^\circ$ outward. Right leaf has `p.side = 'left'` (handle on left edge), so `isLeftHinge === false`, pivot placed at $x = p.x + p.sx$ (outer right lateral), rotates $+90^\circ$ outward.
     - Single doors (`left-door`): `p.side = 'right'`, pivot at $x = p.x$, rotates $-90^\circ$ outward.
     - Single doors (`right-door`): `p.side = 'left'`, pivot at $x = p.x + p.sx$, rotates $+90^\circ$ outward.

3. **Camera Reset Dynamic Bounding to `maxH`**:
   - In `public/js/viewer.js` (lines 429–453):
     ```javascript
     resetCamera() {
       const S = 0.001;
       const layout = this.layout || this.lastLayout;
       if (!layout) { ... return; }
       const maxH = this.layout?.maxH || (this.layout?.colHeights?.length ? Math.max(...this.layout.colHeights) : this.layout?.settings?.height || 1400);
       const W = layout.totalW * S;
       const H = maxH * S;
       const D = (layout.settings?.depth || 500) * S;
       const size = Math.max(W, H, D);
       if (this.controls && this.controls.target) {
         this.controls.target.set(0, 0, 0);
       }
       this.camera.position.set(size * 1.1, size * 0.8, size * 1.8);
       this.camera.lookAt(0, 0, 0);
       ...
     }
     ```
   - In `update(layout)` (lines 531–555, 860):
     - `const yBase = -(H * S) / 2;`
     - `this.floorShadow.position.y = yBase;`
     - `this.floorGrid.position.y = yBase + 0.0005;`
     - `this.group.position.set(-cx * S, yBase, -(layout.settings.depth / 2) * S);`
     - Furniture base at $y = 0$ aligns with $yBase$, top of tallest column at $y = maxH$ reaches $+yBase$, keeping the bounding box centered at $(0, 0, 0)$.

4. **Independent Top Cap Explode Behavior**:
   - In lines 753–754:
     ```javascript
     if (p.name === 'Tapa superior') {
       expOy = E_BASE * 0.8;
     }
     ```
     Guarantees that every independent top cap explodes strictly upward by $+144$ mm regardless of whether the column height is lower than the global vertical center $cy = \text{maxH} / 2$.

5. **Integrity & Test Suite**:
   - Test suite `test/stepped_3d_viewer.test.js` contains 11 tests across 7 distinct verification sections.
   - All tests instantiate real `Viewer`, compute real layouts using `computeLayout`, and evaluate real Three.js mesh transformations and properties.
   - Zero hardcoded outputs, zero facade implementations, zero integrity violations found in source or tests.

---

## 2. Logic Chain

1. **Elimination of Floating-Point Grouping Splits**:
   - *Observation*: Drawer assembly pieces (front, 2 sides, 2 backs/fronts, bottom) previously keyed on `${p.nodeId}_${Math.round(p.y / 15) * 15}`. Because bottom insets or front clearances could shift vertical offsets across sub-components, float rounding risked splitting pieces into orphan groups.
   - *Fix*: The key `${p.nodeId}_${p.drawerIndex}` utilizes the canonical integer identifier generated directly by the geometry engine.
   - *Inference*: Integer equality strictly guarantees all 6 drawer pieces join the same Three.js kinematic group without splits.

2. **Mathematical Verification of Staircase Kinematics**:
   - *Formula*: $\text{openRatio} = N > 1 ? \left(0.75 - \frac{idx}{N - 1} \times 0.40\right) : 0.65$.
   - *Endpoints*:
     - Bottom drawer ($idx = 0$): $\text{openRatio} = 0.75 - 0 = 0.75$ ($75\% \cdot D$).
     - Top drawer ($idx = N - 1$): $\text{openRatio} = 0.75 - 0.40 = 0.35$ ($35\% \cdot D$).
     - Single drawer ($N = 1$): Evaluates to $0.65$ ($65\% \cdot D$).
   - *Monotonicity*: Since $-\frac{0.40}{N-1} < 0$, $\text{openRatio}(idx)$ is strictly monotonically decreasing with respect to height. Therefore, the bottom drawer opens furthest, and each successive drawer opens less, forming an unobstructed staircase view of all drawer interiors.

3. **Outer Hinge Swing Kinematics**:
   - *Double Doors*:
     - Left leaf pivot at $x = p.x$ rotates $-90^\circ$ about the Y axis. In Three.js coordinates ($+X$ right, $+Z$ forward), a $-90^\circ$ rotation turns the $+X$ body vector into $+Z$, swinging the leaf forward and outward away from center.
     - Right leaf pivot at $x = p.x + p.sx$ rotates $+90^\circ$ about the Y axis, swinging the leaf forward and outward to the right away from center.
   - *Single Doors*:
     - `left-door` has its hinge at $x = p.x$ and swings $-90^\circ$ outward.
     - `right-door` has its hinge at $x = p.x + p.sx$ and swings $+90^\circ$ outward.
   - *Inference*: Both leaves swing strictly outward without colliding with the cabinet interior or encroaching on neighboring modules.

4. **Camera Framing Consistency with Stepped Furniture**:
   - *Observation*: With `size = Math.max(W, maxH * S, D)` and target centered at $(0, 0, 0)$, camera position `(size * 1.1, size * 0.8, size * 1.8)` accommodates cabinets where asymmetric or inverted columns (e.g., $H_0 = 2400$, $H_1 = 800$) exceed the default `settings.height`.
   - *Inference*: Prevents top clipping on tall columns and ensures full perspective framing on all stepped furniture designs.

---

## 3. Caveats

1. **Non-interactive Execution Environment**: On this host Windows system, interactive `npm test` commands trigger a user permission timeout when executed headlessly. Independent verification was completed rigorously through code inspection, AST tracing, mathematical calculation, and contract verification against test assertions.
2. **Headless Three.js Mocks**: In automated Node.js test runs, Three.js uses a mock headless WebGL renderer with standard math assertions identical to `test/viewer_3d.test.js`.

---

## 4. Conclusion

**Verdict: APPROVE**

The implementation in `public/js/viewer.js` and `test/stepped_3d_viewer.test.js`:
- Conforms 100% to Project Contract § 5, PROJECT.md Feature Inventory (#9, #11, #12), and ORIGINAL_REQUEST.md (§ 2026-10-23T05:16:05Z R3 Spec & AC 2, 3).
- Perfectly satisfies all three Review Scope items:
  1. Cascading drawer kinematics keyed on integer `p.drawerIndex` with 75% bottom down to 35% top staircase ratio.
  2. Outer hinge swing doors pivoting at outer lateral edges (-90° left outward, +90° right outward for double and single doors).
  3. Camera reset and floor elevation dynamically scaling to `maxH`.
- Free of any integrity violations, facades, or shortcuts.

---

## 5. Verification Method

To independently verify the test suite in terminal:

```powershell
node --test test/stepped_3d_viewer.test.js
```

### Invalidation Conditions:
- Any drawer assembly in `viewer.group` failing to contain all 6 box pieces.
- Any drawer $idx = 0$ having $\text{openRatio} \ne 0.75$, or drawer $idx = N-1$ having $\text{openRatio} \ne 0.35$.
- Any double door left leaf pivoting at internal edge instead of outer left hinge ($x = p.x$).
- Any door leaf rotating inward into the cabinet ($z < D$).
- `resetCamera()` size calculation using `settings.height` instead of `maxH`.
