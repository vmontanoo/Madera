# Handoff Report — Challenger M3-Gate1-2 (Stepped Kinematics Adversarial Verifier)

**Verdict**: **APPROVE**  
**Role**: Empirical Challenger (critic, specialist)  
**Milestone**: M3-Gate1-2 (Renderizado 3D y Cinemática Escalonada)  
**Date**: 2026-10-23  

---

## 1. Observation

Direct observations from source code and test files:

1. **Cascading Drawers Opening Formula & Indexing**:
   - `public/js/viewer.js` (line 632):
     ```javascript
     const openRatio = N > 1 ? (0.75 - (idx / (N - 1)) * 0.40) : 0.65;
     ```
   - `public/js/layout.js` (lines 283–286):
     ```javascript
     for (let i = 0; i < cnt; i++) {
       const idx = cnt - 1 - i; // el primero queda arriba
       add({ name: 'Frente de gaveta', mat: 'front', kind: 'front', x: cx + fc, y: cy + idx * slot + fc / 2, z: D, sx: Math.max(10, cw - 2 * fc), sy: Math.max(10, slot - fc), sz: t, holes, pull: style, holeLayout: 'h', col, nodeId: n.id, drawerIndex: idx });
     ```
   - `public/js/viewer.js` (lines 620–626):
     ```javascript
     drawersByNode.forEach((list) => {
       // Sort drawers vertically from bottom (lowest y / index 0) to top (highest y / index N-1)
       list.sort((a, b) => {
         if (a.drawerIndex !== undefined && b.drawerIndex !== undefined) {
           return a.drawerIndex - b.drawerIndex;
         }
         return a.y - b.y;
       });
       const N = list.length;
     ```
   - `public/js/viewer.js` (lines 657–661):
     ```javascript
     this.kinematicNodes.push((oT, eT, exMul) => {
       const openOffsetZ = openRatio * D * oT * S;
       const explodeOffsetZ = 1.0 * E_BASE * exMul * eT * S;
       dGroup.position.set(0, 0, openOffsetZ + explodeOffsetZ);
     });
     ```

2. **Multi-Column Drawer Isolation**:
   - `public/js/viewer.js` (lines 593–606):
     Drawers are mapped by `${p.nodeId}_${p.drawerIndex}` and grouped by `dg.nodeId` into `drawersByNode`.
   - `public/js/layout.js` (lines 156–178, 278–295):
     Column $i$ interior width is $W_i$. Drawer box left edge is $bx = cx_0 + sc$, where $sc = 13\,\text{mm}$. Inter-column shared lateral has thickness $t = 18\,\text{mm}$.
     The clearance between column $i$'s drawer and column $i+1$'s drawer along $X$ is $t + 2 \cdot sc = 18 + 26 = 44\,\text{mm}$.

3. **Swing Doors Hinges and Rotations**:
   - `public/js/layout.js` (lines 222–232):
     ```javascript
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
     }
     ```
   - `public/js/viewer.js` (lines 780–804):
     ```javascript
     if (p.kind === 'door-front' && (p.side === 'right' || p.side === 'left')) {
       // In layout.js, p.side is handle position: handle on right -> hinge on left edge (x = p.x)
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
         // Left hinge swings -90°, Right hinge swings +90°
         const targetAngle = isLeftHinge ? -Math.PI / 2 : +Math.PI / 2;
         const angle = targetAngle * oT;
         pivot.rotation.y = Math.abs(angle) < 1e-9 ? 0 : angle;
       });
     }
     ```

4. **Visual Theme Switching**:
   - `public/js/viewer.js` (lines 374–420):
     `setVisualTheme(theme)` updates lighting, scene background, floor grid visibility, and calls `this.group.traverse` to update `material.color`, `roughness`, `metalness`, and `emissive` in-place on existing meshes without re-creating geometry or modifying `this.kinematicNodes`.
   - `test/stepped_3d_viewer.test.js` (lines 820–854): Test 7.3 validates that `viewer.setVisualTheme('neon')` preserves `floorShadow.position.y` at `-(1900 * 0.001) / 2` and updates materials in-place.

---

## 2. Logic Chain

1. **Cascading Drawers**:
   - Step 1: In `layout.js`, bottom drawer is assigned `drawerIndex = 0` and top drawer is assigned `drawerIndex = cnt - 1`.
   - Step 2: In `viewer.js`, sorting by `drawerIndex` places the bottom drawer at `idx = 0` and top drawer at `idx = N - 1`.
   - Step 3: Evaluating the formula $openRatio(idx, N) = 0.75 - \frac{idx}{N - 1} \times 0.40$ yields:
     - At $idx = 0$: $0.75 - 0 = 0.75$ (75%)
     - At $idx = N - 1$: $0.75 - 0.40 = 0.35$ (35%)
     - For all $N \in [2, 6]$, the progression is strictly monotonic and linear (step sizes: $N=2 \to 0.40$; $N=3 \to 0.20$; $N=4 \to 0.1333$; $N=5 \to 0.10$; $N=6 \to 0.08$).
   - Step 4: Drawers across different columns have distinct `nodeId`s and are strictly isolated into separate groups. Their $X$-intervals are disjoint by $\ge 44\,\text{mm}$. Kinematic displacement is purely along $Z$. Therefore, drawer columns across stepped heights never collide or intermingle.

2. **Swing Doors Kinematics and Interior Collision**:
   - Step 1: For double doors, the left leaf has handle on right (`p.side = 'right'`), placing the hinge at $p.x$ (outer left edge) and rotating $-90^\circ$ outward. The right leaf has handle on left (`p.side = 'left'`), placing the hinge at $p.x + p.sx$ (outer right edge) and rotating $+90^\circ$ outward.
   - Step 2: The hinge axis is at $z_{\text{hinge}} = D + \frac{t}{2}$. Under rotation by $\phi = -\theta \in [0, \pi/2]$, the minimum world Z position across the entire door volume is:
     $$\min z_{\text{world}} = D + \frac{t}{2}(1 - \cos\phi) \ge D$$
   - Step 3: Since the cabinet interior is bounded by $z < D$ and $\min z_{\text{world}} \ge D$ for all $\phi \in [0, \pi/2]$, the door leaves never penetrate or collide with the cabinet interior.
   - Step 4: Single doors (`left-door`, `right-door`) pivot around their outer edges and rotate $-90^\circ$ and $+90^\circ$ respectively, following the same non-colliding trajectory.

3. **Theme Switching**:
   - Step 1: `setVisualTheme(theme)` alters material properties in-place.
   - Step 2: Geometries, mesh coordinates, `this.kinematicNodes`, and kinematic targets (`openT`, `explodeT`) are untouched.
   - Step 3: Theme switching strictly preserves stepped 3D geometry and kinematic state.

---

## 3. Caveats

- Verification was performed statically via complete AST code analysis, mathematical derivation, and test suite inspection as instructed, avoiding interactive CLI prompts.
- WebGL rendering in automated environments relies on Three.js headless/mock rendering wrappers. Real GPU driver antialiasing and shadow filtering are client-side graphics pipeline concerns and do not affect kinematic coordinates or geometric transformations.

---

## 4. Conclusion

**Verdict: APPROVE**

All three verification criteria are fully satisfied without defects:
1. Multi-drawer opening progression strictly follows $0.75 - \frac{idx}{N - 1} \times 0.40$ for all $N \in [2, 6]$ (bottom at 75%, top at 35%). Drawers across stepped heights are completely isolated with zero collision risk.
2. Double doors and single doors pivot strictly on outer edges and rotate outwards (-90° left, +90° right) with zero penetration into the cabinet interior.
3. Theme switching preserves stepped 3D geometry and kinematics seamlessly.

Milestone M3-Gate1-2 is ready to proceed.

---

## 5. Verification Method

To independently reproduce the verification:
1. Inspect code:
   - `public/js/viewer.js` lines 588–663 (cascading drawers) and lines 780–805 (swing doors)
   - `public/js/layout.js` lines 222–232 and lines 270–298
2. Inspect test suite:
   - `test/stepped_3d_viewer.test.js` (Sections 4, 5, 7)
3. Review mathematical proof:
   - Refer to `.agents/teamwork_preview_challenger_m3_gate1_2/analysis.md` for full step-by-step mathematical proofs.
