# Handoff Report: Advanced 3D Viewer Pipeline, Render Modes, Visual Themes, Shadows & Orientation Gizmo (R4)

**Author**: Explorer Survey 3 (`teamwork_preview_explorer_survey_3`)  
**Date**: 2026-10-23  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_survey_3`  
**Target File**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_survey_3\handoff.md`  

---

## 1. Observation

Direct code and environment observations from inspecting the codebase:

### 1.1 Existing 3D Viewer Architecture (`public/js/viewer.js`)
- **Three.js Stack & Imports**:
  - `viewer.js` lines 1–2:
    ```javascript
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    ```
  - Import map defined in `public/index.html` lines 8–15:
    ```html
    <script type="importmap">
    {
      "imports": {
        "three": "/vendor/three/build/three.module.js",
        "three/addons/": "/vendor/three/examples/jsm/"
      }
    }
    </script>
    ```
  - Installed version in `package.json` line 14: `"three": "^0.170.0"`.
  - Available Three.js Addons confirmed present in `node_modules/three/examples/jsm/`:
    `helpers/ViewHelper.js`, `controls/OrbitControls.js`.
- **Renderer Setup**:
  - `viewer.js` lines 9–11:
    ```javascript
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(this.renderer.domElement);
    ```
  - **Shadows Missing**: `renderer.shadowMap.enabled` is currently unconfigured (evaluates to `false`). `renderer.shadowMap.type` is unset.
  - **Color Management**: `toneMapping` and `outputColorSpace` are left at Three.js defaults without ACESFilmic exposure control.
- **Lighting Setup**:
  - `viewer.js` lines 18–21:
    ```javascript
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.1));
    const d = new THREE.DirectionalLight(0xffffff, 1.3);
    d.position.set(3, 5, 4);
    this.scene.add(d);
    ```
  - Neither light casts shadows (`castShadow` is false).
  - No fill light exists from the opposite angle; shadows are not projected onto any ground plane.
- **Scene Background & Ground**:
  - `viewer.js` line 13: `this.scene.background = new THREE.Color(0x555150);`.
  - There is **no ground plane**, **no shadow receiving plane**, and **no floor grid** (dotted or line-based).
- **Meshes, Materials & Edges**:
  - `viewer.js` line 4:
    ```javascript
    const COLORS = { side: 0x2f6fd1, h: 0x2fcf6a, v: 0x2fcf6a, front: 0xe0a81c, back: 0x8a8a8a, drawer: 0xb9bcc0, rail: 0xd8dde3 };
    ```
  - Solid synthetic colors (flat blue for sides, bright green for shelves, orange for doors, grey for drawers).
  - `viewer.js` lines 78–83:
    ```javascript
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS[p.kind] || 0xcccccc,
      roughness: 0.7,
      emissive: sel ? 0xffaa00 : 0x000000,
      emissiveIntensity: sel ? 0.55 : 0,
    });
    ```
  - `viewer.js` lines 94–95:
    ```javascript
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x1a1a1a }));
    mesh.add(edges);
    ```
    - New `LineBasicMaterial` is allocated redundantly for every single mesh on every update.
    - Edges are hardcoded to dark charcoal `#1a1a1a` with line width 1.
    - No theme switching mechanism exists in `viewer.js`.
- **Explosion & Assembly Math**:
  - `viewer.js` lines 24 & 73–93:
    ```javascript
    this.explode = 0.6;
    ...
    const ex = this.explode * 180;
    layout.pieces.forEach((p) => {
      if (this.hideFronts && (p.kind === 'front')) return;
      ...
      let ox = 0, oy = 0, oz = 0;
      const pcx = p.x + p.sx / 2;
      const pcy = p.y + p.sy / 2;
      if (p.kind === 'side') ox = Math.sign(pcx - cx) * ex * 0.7;
      else if (p.kind === 'h') oy = Math.sign(pcy - H / 2) * ex * 0.5;
      else if (p.kind === 'front') oz = ex * 1.2;
      else if (p.kind === 'drawer') oz = ex * 0.8;
      else if (p.kind === 'back') oz = -ex * 0.4;
      mesh.position.set((pcx + ox) * S, (pcy + oy) * S, (p.z + p.sz / 2 + oz) * S);
    ```
    - **Deficiency 1**: The viewer defaults to `this.explode = 0.6`, so the furniture opens exploded by default instead of assembled!
    - **Deficiency 2**: Vertical internal dividers (`p.kind === 'v'`) are completely omitted from lines 88–92; their offset remains `ox = 0, oy = 0, oz = 0`, leaving internal vertical dividers frozen in place while other panels explode around them.
    - **Deficiency 3**: All piece positions are computed statically into absolute world positions in a flat `Group`; there is no support for door opening hinges, drawer slide transitions, or smooth interpolation.

### 1.2 Existing DOM & UI Controls (`public/js/app.js` and `public/style.css`)
- In `public/js/app.js` lines 140–147:
  ```html
  <div class="right">
    <div class="rtools">
      <label class="muted">Explosión</label><input type="range" id="explode" min="0" max="1" step="0.05" value="0.6">
      <label><input type="checkbox" id="hideF"> Ocultar frentes</label>
    </div>
    <div class="vwr" id="vwr"></div>
    <div class="cards" id="cards" style="display:none"></div>
  </div>
  ```
- In `public/style.css` line 41:
  ```css
  .rtools { position:absolute; top:10px; right:10px; display:flex; gap:8px; z-index:2; align-items:center; background:rgba(0,0,0,.35); padding:6px 10px; border-radius:999px; }
  ```
- **Observations on Current Controls**:
  - The UI only provides a floating slider "Explosión" and a checkbox "Ocultar frentes".
  - There is NO top toolbar for Render Modes (Normal, Puertas abiertas, Despiece/Explosión).
  - There is NO Theme switch (Color y textura vs Contorno Naranja sobre Negro).
  - There is NO 3D interactive orientation widget / gizmo.

### 1.3 Door & Drawer Data Model (`public/js/layout.js`)
- **Doors** (lines 145–165):
  ```javascript
  const door = (px, dw, side) => {
    add({ name: 'Puerta', mat: 'front', kind: 'front', x: px, y: cy + fc, z: D, sx: dw, sy: ch - 2 * fc, sz: t, holes, pull: style, holeLayout: 'v', col, nodeId: n.id, side });
  ```
  - In `layout.js` line 161–162:
    - Double doors: Left door leaf receives `side = 'right'`; right door leaf receives `side = 'left'`.
    - Single door `left-door` (bisagra izquierda) receives `side = 'right'`.
    - Single door `right-door` (bisagra derecha) receives `side = 'left'`.
  - **Crucial Kinematic Insight**: In `app.js` line 213 (`const edgeX = p.side === 'right' ? p.x + p.sx - s.pullInset : p.x + s.pullInset;`), `p.side` designates the **pull handle side**, which means the **hinge is on the opposite side**!
    - `side === 'right'`: Pull is on the right, therefore the **hinge axis is at `x = p.x`** (left edge).
    - `side === 'left'`: Pull is on the left, therefore the **hinge axis is at `x = p.x + p.sx`** (right edge).
- **Drawers** (lines 188–202):
  - Front piece: `{ name: 'Frente de gaveta', mat: 'front', kind: 'front', x: cx + fc, y: cy + idx * slot + fc / 2, z: D, sx: cw - 2 * fc, sy: slot - fc, sz: t, nodeId: n.id }`.
  - Box pieces: 2 × `Lateral de gaveta`, 2 × `Frente/trasera de gaveta`, 1 × `Fondo de gaveta` (all with `kind: 'drawer'`, `nodeId: n.id`).
  - All 6 components of each drawer share the same `nodeId` and can be identified by vertical position `by = cy0 + idx * inner + (inner - bh) / 2`.

---

## 2. Logic Chain

1. **R4 Mandate Decomposition**:
   R4 requires four cohesive features in the 3D viewer:
   - **Requirement 1 (Top Toolbar & Render Modes)**:
     - Top toolbar inside viewer canvas (similar to madera.app icon bar).
     - Render Mode 1 (`Normal`): Closed furniture, assemble state (`explode = 0`, all doors/drawers closed).
     - Render Mode 2 (`Puertas abiertas`): Animated/transformed open positions for doors and drawers.
     - Render Mode 3 (`Despiece / Explosión`): 3D exploded view with panels translated outward along their principal axes/normals.
   - **Requirement 2 (Visual Themes)**:
     - Theme 1 (`Color y textura`): High quality realistic wood/melamine materials, realistic lighting.
     - Theme 2 (`Contorno Naranja sobre Negro`): Dark carbon background (`#121214` / `#18181b`), dark panels, bright neon orange wireframe edges (`#ff6600` / `#ff7700`), subtle dotted floor grid.
   - **Requirement 3 (Lighting & Soft Shadows)**:
     - Real-time soft shadows (`renderer.shadowMap.enabled = true`, `THREE.PCFSoftShadowMap`).
     - Directional shadow casting with shadow camera bounding box fitted to furniture.
     - Shadow receiving ground plane and self-shadowing between components.
   - **Requirement 4 (Interactive 3D Orientation Gizmo)**:
     - 3D interactive widget in the bottom-right corner of the viewer canvas.
     - Synchronized rotation with main camera (showing X, Y, Z axes or orientation cube with clickable faces/axes for front, top, side views).
     - Smooth interaction and clean viewport integration.

2. **Step-by-Step Architectural Derivation**:

   - **Derivation 1: Kinematics of Puertas Abiertas (Open Doors & Drawers)**:
     - To open a door around its hinge without clipping:
       - For a left-hinged door (`p.side === 'right'`): Hinge axis is vertical line at `(x = p.x, z = p.z + p.sz)`. When opening outwards, the leaf rotates around this line by $-\theta$ (e.g. $-85^\circ \approx -1.48$ rad).
       - For a right-hinged door (`p.side === 'left'`): Hinge axis is at `(x = p.x + p.sx, z = p.z + p.sz)`. It rotates by $+\theta$ ($+85^\circ \approx +1.48$ rad).
       - In Three.js, this is achieved by placing each door inside a `THREE.Group` (pivot) positioned at the hinge axis, placing the door mesh with local offset relative to the hinge, and animating `pivot.rotation.y`.
       - For drawers: Each drawer front and its corresponding 5 box pieces (`kind === 'drawer'`) belong to a drawer unit. When opening, the entire drawer unit translates forward along $+Z$ by $220\text{mm} \times S = 0.22\text{m}$.
       - Multi-drawer cascading: When a column has $N$ drawers, each drawer can open with a slight stagger ($0.25\text{m}, 0.21\text{m}, 0.17\text{m}$) so all compartments are visible simultaneously.
       - A smooth interpolation parameter `openRatio` ($0 \to 1$) animated via `requestAnimationFrame` creates a 60fps opening animation.

   - **Derivation 2: Kinematics of Despiece / Explosión**:
     - Correcting the vertical divider bug: internal vertical partitions (`p.kind === 'v'`) must translate along $X$ relative to the furniture center:
       $ox = \frac{pcx - cx}{\max(cx, 1)} \times ex \times 0.5$.
     - Internal shelves (`p.kind === 'h'` where not top or base) translate along $Y$ relative to cabinet mid-height:
       $oy = \frac{pcy - H/2}{H/2} \times ex \times 0.5$.
     - Outer laterals (`p.kind === 'side'`): $ox = \operatorname{sgn}(pcx - cx) \times ex \times 0.75$.
     - Top / base decks: $oy = \operatorname{sgn}(pcy - H/2) \times ex \times 0.65$.
     - Fronts (doors & drawer fronts): $oz = ex \times 1.25$.
     - Drawers: $oz = ex \times 0.85$.
     - Back panels: $oz = -ex \times 0.5$.
     - Rails: $oy = \frac{pcy - H/2}{H/2} \times ex \times 0.5$.
     - Default state: When entering the viewer or in "Normal" mode, `explode = 0.0`. When clicking "Despiece", `explode` transitions to $0.6$, with a slider allowing customization from $0.1$ to $1.5$.

   - **Derivation 3: Visual Themes & Shaders**:
     - **Theme 1 (`Color y textura`)**:
       - Background: Soft neutral warm studio background (`0x282624` or `#2b2927`).
       - Materials:
         - Panels/Carcass: Warm natural oak melamine (`color: 0xc49b6d, roughness: 0.55, metalness: 0.05`).
         - Fronts: Satin honey wood (`color: 0xd6a87c, roughness: 0.48, metalness: 0.05`).
         - Drawer interior: Birch plywood (`color: 0xeedcbd, roughness: 0.70`).
         - Back panel: Compressed fiberboard (`color: 0x9a8b79, roughness: 0.85`).
         - Rails/Pulls: Brushed aluminum (`color: 0xe0e0e0, metalness: 0.85, roughness: 0.25`).
         - Edges: Soft semi-transparent graphite (`color: 0x333333, transparent: true, opacity: 0.25`) or disabled.
       - Lighting: Key directional light `0xfff8ee` ($1.4$), fill directional light `0xddeeff` ($0.5$), hemisphere light `0xffffff, 0x3a3530` ($0.8$).
       - Floor: `THREE.ShadowMaterial({ opacity: 0.35 })` placed at `y = floorY`, providing soft natural contact shadows without background clipping.
     - **Theme 2 (`Contorno Naranja sobre Negro`)**:
       - Background: Deep carbon black `0x121214`.
       - Panels: Dark carbon/graphite `0x18181b` (`roughness: 0.85, metalness: 0.10`). Selected modules highlighted with glowing neon orange emissive (`emissive: 0xff6600, emissiveIntensity: 0.55`).
       - Edges: Bright neon orange `LineSegments` (`LineBasicMaterial({ color: 0xff6600, linewidth: 1.5, transparent: true, opacity: 0.95 })`).
       - Dotted Floor Grid:
         - Generated using an off-screen `CanvasTexture` of repeating circular dots:
           Grid size $64 \times 64$px, circle at $(32, 32)$ with radius $2.5$px, fill `rgba(255, 255, 255, 0.16)`.
           `texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(40, 40);`
           Applied to a `PlaneGeometry(12, 12)` rotated $-90^\circ$ at floor level.
         - Contact shadows cast softly onto this dotted plane.

   - **Derivation 4: Real-time Soft Shadow Pipeline**:
     - `renderer.shadowMap.enabled = true;`
     - `renderer.shadowMap.type = THREE.PCFSoftShadowMap;`
     - Directional light configured with:
       - `castShadow = true;`
       - `shadow.mapSize.width = 2048; shadow.mapSize.height = 2048;`
       - Shadow frustum bounds: left: $-3.5$, right: $3.5$, top: $3.5$, bottom: $-3.5$, near: $0.5$, far: $20$.
       - Biases to eliminate shadow acne: `shadow.bias = -0.0005`, `shadow.normalBias = 0.02`.
       - Soft filtering radius: `shadow.radius = 2.5`.
     - Furniture components: all panel meshes set `mesh.castShadow = true; mesh.receiveShadow = true;`.
     - Floor plane positioned at:
       $floorY = -(H / 2 + s.overhang) \times S - 0.001$.
       Set `groundMesh.receiveShadow = true;`.

   - **Derivation 5: Interactive 3D Orientation Gizmo**:
     - Three.js 0.170.0 includes `three/addons/helpers/ViewHelper.js`.
     - Architecture:
       - `this.viewHelper = new ViewHelper(this.camera, this.renderer.domElement);`
       - In the render loop:
         `renderer.autoClear = false;`
         `renderer.clear();`
         `renderer.render(scene, camera);`
         `this.viewHelper.render(renderer);`
       - Canvas event handling:
         On `pointerup` / `click`, call `this.viewHelper.handleClick(event)`. If it returns `true`, the gizmo initiates smooth camera animation to the clicked axis (+X Right, +Y Top, +Z Front, -X Left, -Y Bottom, -Z Back).
       - In the loop: `if (this.viewHelper.animating) { this.viewHelper.update(delta); this.controls.update(); }`.
       - Preventing OrbitControls conflict: When pointer is pressed inside the bottom-right $128 \times 128$px corner, temporarily disable `controls.enabled` so orbiting does not compete with axis clicking.

   - **Derivation 6: Top Toolbar UI Integration**:
     - Replace the floating `.rtools` with a modern floating pill bar `.vwr-toolbar` centered or aligned at the top of `#vwr`:
       - Button group for Modes: `Cerrado` (Normal), `Abiertas` (Puertas abiertas), `Despiece` (Explosión).
       - Sliding drawer / popup for Explosion distance slider when in Despiece mode.
       - Button group for Themes: `Color` (Color y textura), `Contorno` (Naranja sobre negro).
       - Center camera button: restores camera to default framing.

---

## 3. Caveats

1. **Browser WebGL Requirement**:
   - `Viewer` runs exclusively in the browser context via WebGL. Node.js unit test runners (`node --test`) do not run WebGL rendering contexts; verification of rendering visuals, shadows, and gizmo clicks must be verified through browser/E2E testing or mock DOM integration.
2. **Mobile / Touch Events**:
   - On touch devices, `pointerup` and `pointerdown` are unified in modern browsers, but touch pinch-to-zoom on the gizmo corner should be excluded from `OrbitControls` touch handling.
3. **GPU Shadow Map Performance**:
   - 2048x2048 PCF shadow maps perform with high frame rates (>60fps) on modern GPUs for 50–100 meshes, but on very low-end mobile hardware, 1024x1024 is a potential fallback if frame drops occur.
4. **Coordination with R3 Door Types**:
   - R3 introduces new door types (`sliding`, `accordion`, `lift-up`). The door pivot logic designed here supports standard swing doors (`left-door`, `right-door`, `doors`) out-of-the-box and provides explicit hooks for `lift-up` (rotation around top X axis) and `sliding` (translation along X axis).

---

## 4. Conclusion

The current 3D viewer implementation is a basic prototype: it lacks soft shadows, lacks ground planes, starts exploded by default (`explode = 0.6`), ignores vertical dividers in explosion, uses flat synthetic colors without themes, and has no orientation gizmo.

To fulfill R4 completely and robustly, the implementation requires:
1. **A Modular State & Animation Engine in `Viewer`**:
   - Add `renderMode` (`'normal' | 'open' | 'explode'`) and `visualTheme` (`'realistic' | 'neon'`).
   - Group door panels inside hinge pivot groups (`pivot.rotation.y = ±85°`), and drawer panels inside slide groups (`group.position.z = +220mm`).
   - Fix vertical divider explosion translation ($X$ axis offset).
   - Animate mode changes smoothly with requestAnimationFrame lerping.
2. **Theme System**:
   - Realistic Wood/Melamine materials with natural tones and soft shadows.
   - High-tech Charcoal Black (`#121214`) with glowing neon orange wireframe edges (`#ff6600`) and a procedural dotted floor grid.
3. **Lighting & PCF Soft Shadows**:
   - Enable `THREE.PCFSoftShadowMap` on the WebGLRenderer.
   - Configure directional shadow casting with `normalBias = 0.02` to prevent panel acne.
   - Add shadow-receiving ground plane at cabinet base level.
4. **Interactive 3D Orientation Gizmo**:
   - Integrate `ViewHelper` from `three/addons/helpers/ViewHelper.js` in the bottom-right corner.
   - Synchronize with camera and OrbitControls with smooth slerp transitions when clicking axes/views.
5. **Top Toolbar in `#vwr`**:
   - Implement floating toolbar with segmented mode buttons, theme toggle, explosion slider, and reset camera button.

---

## 5. Implementation Blueprints & Concrete Code Proposals

Below are concrete, drop-in replacement designs and code architectures for the implementer:

### 5.1 Proposed Architecture for `public/js/viewer.js`

```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';

// Materials Palette: Realistic Wood Theme
const PALETTE_REALISTIC = {
  carcass: { color: 0xc49b6d, roughness: 0.55, metalness: 0.04 }, // Warm oak
  front:   { color: 0xd6a87c, roughness: 0.48, metalness: 0.04 }, // Honey oak front
  drawer:  { color: 0xeedcbd, roughness: 0.70, metalness: 0.02 }, // Birch plywood
  back:    { color: 0x9a8b79, roughness: 0.85, metalness: 0.01 }, // Fiberboard
  rail:    { color: 0xe0e0e0, roughness: 0.25, metalness: 0.85 }, // Brushed chrome
  edges:   { color: 0x2a2a2a, opacity: 0.22, transparent: true },
  bg:      0x282624,
};

// Materials Palette: Charcoal + Neon Orange Theme
const PALETTE_NEON = {
  carcass: { color: 0x18181b, roughness: 0.85, metalness: 0.08 },
  front:   { color: 0x1c1c20, roughness: 0.85, metalness: 0.08 },
  drawer:  { color: 0x151517, roughness: 0.90, metalness: 0.05 },
  back:    { color: 0x121214, roughness: 0.95, metalness: 0.02 },
  rail:    { color: 0x333338, roughness: 0.35, metalness: 0.80 },
  edges:   { color: 0xff6600, opacity: 0.95, transparent: true },
  bg:      0x121214,
};

export class Viewer {
  constructor(el) {
    this.el = el;
    this.renderMode = 'normal';   // 'normal' | 'open' | 'explode'
    this.visualTheme = 'realistic'; // 'realistic' | 'neon'
    this.explodeDist = 0.6;
    this.hideFronts = false;
    this.fitted = false;
    this.last = null;
    this.running = true;

    // Animation progress states (0 to 1)
    this.currentOpen = 0;
    this.targetOpen = 0;
    this.currentExplode = 0;
    this.targetExplode = 0;

    // 1. Renderer Setup with PCFSoftShadowMap
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;
    el.appendChild(this.renderer.domElement);

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE_REALISTIC.bg);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 50);
    this.camera.position.set(2.2, 1.6, 3.2);

    // 3. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    // 4. Lighting Rig with Directional Shadows
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x3a3530, 0.8);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff8ee, 1.4);
    this.dirLight.position.set(3.5, 5.5, 4.0);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 20;
    const d = 3.5;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.dirLight.shadow.radius = 2.5;
    this.scene.add(this.dirLight);

    this.fillLight = new THREE.DirectionalLight(0xddeeff, 0.45);
    this.fillLight.position.set(-3.5, 2.5, -2.5);
    this.scene.add(this.fillLight);

    // 5. Ground Planes (Shadow Receiver & Dotted Floor Grid)
    this.groundGroup = new THREE.Group();
    this.scene.add(this.groundGroup);

    // Shadow receiver plane
    this.shadowGround = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.ShadowMaterial({ opacity: 0.35 })
    );
    this.shadowGround.rotation.x = -Math.PI / 2;
    this.shadowGround.receiveShadow = true;
    this.groundGroup.add(this.shadowGround);

    // Dotted floor grid plane
    this.dottedTexture = this.createDottedTexture();
    this.dottedGround = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshBasicMaterial({
        map: this.dottedTexture,
        transparent: true,
        opacity: 0.0, // enabled in neon theme
        depthWrite: false,
      })
    );
    this.dottedGround.rotation.x = -Math.PI / 2;
    this.groundGroup.add(this.dottedGround);

    // 6. Interactive 3D Orientation Gizmo
    this.viewHelper = new ViewHelper(this.camera, this.renderer.domElement);
    this.clock = new THREE.Clock();

    // Prevent controls conflict on gizmo click
    this.setupGizmoEvents();

    // 7. Model Assembly Root Group
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Dynamic animation nodes registry
    this.animNodes = [];

    new ResizeObserver(() => this.resize()).observe(el);

    // 8. Render & Animation Loop
    const loop = () => {
      if (!this.running) return;
      const delta = this.clock.getDelta();

      // Smooth interpolation of mode transitions
      this.updateAnimations(delta);

      if (this.viewHelper.animating) {
        this.viewHelper.update(delta);
        this.controls.update();
      } else {
        this.controls.update();
      }

      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
      this.viewHelper.render(this.renderer);

      requestAnimationFrame(loop);
    };
    loop();
  }

  createDottedTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.arc(32, 32, 2.5, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(36, 36);
    return tex;
  }

  setupGizmoEvents() {
    const dom = this.renderer.domElement;
    const dim = 128;
    const isGizmoArea = (e) => {
      const rect = dom.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return x >= dom.offsetWidth - dim && y >= dom.offsetHeight - dim;
    };

    dom.addEventListener('pointerdown', (e) => {
      if (isGizmoArea(e)) {
        this.controls.enabled = false;
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.controls.enabled) {
        this.controls.enabled = true;
        this.viewHelper.handleClick(e);
      }
    });
  }

  setRenderMode(mode) {
    this.renderMode = mode;
    if (mode === 'normal') {
      this.targetOpen = 0;
      this.targetExplode = 0;
    } else if (mode === 'open') {
      this.targetOpen = 1;
      this.targetExplode = 0;
    } else if (mode === 'explode') {
      this.targetOpen = 0;
      this.targetExplode = 1;
    }
  }

  setVisualTheme(theme) {
    this.visualTheme = theme;
    const isNeon = theme === 'neon';
    const pal = isNeon ? PALETTE_NEON : PALETTE_REALISTIC;

    this.scene.background.setHex(pal.bg);
    this.dottedGround.material.opacity = isNeon ? 0.75 : 0.0;
    this.shadowGround.material.opacity = isNeon ? 0.65 : 0.35;
    this.hemiLight.color.setHex(isNeon ? 0xffffff : 0xffffff);
    this.hemiLight.groundColor.setHex(isNeon ? 0x111116 : 0x3a3530);

    if (this.last) this.update(...this.last);
  }

  setExplodeDist(val) {
    this.explodeDist = val;
    if (this.last) this.update(...this.last);
  }

  setHideFronts(val) {
    this.hideFronts = val;
    if (this.last) this.update(...this.last);
  }

  resetCamera() {
    if (!this.lastLayout) return;
    const S = 0.001;
    const size = Math.max(this.lastLayout.totalW, this.lastLayout.settings.height) * S;
    this.camera.position.set(size * 0.95, size * 0.75, size * 1.65);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  updateAnimations(delta) {
    const k = Math.min(delta * 9, 1);
    this.currentOpen += (this.targetOpen - this.currentOpen) * k;
    this.currentExplode += (this.targetExplode - this.currentExplode) * k;

    // Apply transformation to animated nodes
    for (const node of this.animNodes) {
      // 1. Explode displacement
      const ex = this.currentExplode * this.explodeDist * 180 * 0.001;
      node.obj.position.x = node.baseX + node.ox * ex;
      node.obj.position.y = node.baseY + node.oy * ex;
      node.obj.position.z = node.baseZ + node.oz * ex;

      // 2. Door swing / Drawer slide opening
      if (node.type === 'door-pivot') {
        node.obj.rotation.y = node.baseRotY + node.targetAngle * this.currentOpen;
      } else if (node.type === 'drawer-slide') {
        node.obj.position.z += node.slideZ * this.currentOpen * 0.001;
      }
    }
  }

  update(layout, selectedIds = new Set()) {
    this.last = [layout, selectedIds];
    this.lastLayout = layout;

    // Dispose old meshes and materials
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material.dispose();
      }
    });
    this.group.clear();
    this.animNodes = [];

    const S = 0.001;
    const H = layout.settings.height;
    const D = layout.settings.depth;
    const cx = layout.totalW / 2;
    const overhang = layout.settings.overhang || 0;

    // Update ground level
    const floorY = -(H / 2 + overhang) * S;
    this.groundGroup.position.set(0, floorY, 0);

    const isNeon = this.visualTheme === 'neon';
    const pal = isNeon ? PALETTE_NEON : PALETTE_REALISTIC;

    // Shared edge material
    const edgeMat = new THREE.LineBasicMaterial({
      color: pal.edges.color,
      transparent: pal.edges.transparent,
      opacity: pal.edges.opacity,
    });

    layout.pieces.forEach((p) => {
      if (this.hideFronts && p.kind === 'front') return;

      const geo = new THREE.BoxGeometry(p.sx * S, p.sy * S, p.sz * S);
      const sel = p.nodeId && selectedIds.has(p.nodeId);
      const cfg = pal[p.mat] || pal[p.kind] || pal.carcass;

      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: cfg.roughness,
        metalness: cfg.metalness,
        emissive: sel ? (isNeon ? 0xff6600 : 0xffaa00) : 0x000000,
        emissiveIntensity: sel ? 0.6 : 0,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 15), edgeMat);
      mesh.add(edges);

      // Calculate explosion vector (ox, oy, oz)
      let ox = 0, oy = 0, oz = 0;
      const pcx = p.x + p.sx / 2;
      const pcy = p.y + p.sy / 2;

      if (p.kind === 'side') {
        ox = Math.sign(pcx - cx) * 0.75;
      } else if (p.kind === 'h') {
        oy = p.name.includes('Estante')
          ? ((pcy - H / 2) / (H / 2 || 1)) * 0.5
          : Math.sign(pcy - H / 2) * 0.65;
      } else if (p.kind === 'v') {
        ox = ((pcx - cx) / (cx || 1)) * 0.5; // Fix: internal vertical dividers now separate!
      } else if (p.kind === 'front') {
        oz = 1.25;
      } else if (p.kind === 'drawer') {
        oz = 0.85;
      } else if (p.kind === 'back') {
        oz = -0.5;
      } else if (p.kind === 'rail') {
        oy = ((pcy - H / 2) / (H / 2 || 1)) * 0.5;
      }

      // Check if piece is a swing door -> wrap in Hinge Pivot
      if (p.name === 'Puerta' && p.kind === 'front') {
        const pivot = new THREE.Group();
        // Hinge location:
        // If p.side === 'right' -> handle is right -> hinge is LEFT (x = p.x)
        // If p.side === 'left'  -> handle is left  -> hinge is RIGHT (x = p.x + p.sx)
        const hingeX = (p.side === 'right' ? p.x : p.x + p.sx) * S;
        const hingeY = pcy * S;
        const hingeZ = (p.z + p.sz) * S; // front edge pivot

        pivot.position.set(hingeX, hingeY, hingeZ);

        // Position mesh relative to hinge
        const localX = (p.side === 'right' ? p.sx / 2 : -p.sx / 2) * S;
        mesh.position.set(localX, 0, (-p.sz / 2) * S);
        pivot.add(mesh);
        this.group.add(pivot);

        const openAngle = p.side === 'right' ? -1.48 : 1.48; // -85 deg vs +85 deg
        this.animNodes.push({
          type: 'door-pivot',
          obj: pivot,
          baseX: hingeX,
          baseY: hingeY,
          baseZ: hingeZ,
          baseRotY: 0,
          targetAngle: openAngle,
          ox, oy, oz,
        });
      } else if (p.kind === 'drawer' || p.name === 'Frente de gaveta') {
        // Drawer front or drawer box piece -> translates forward in open mode
        const posX = pcx * S;
        const posY = pcy * S;
        const posZ = (p.z + p.sz / 2) * S;
        mesh.position.set(posX, posY, posZ);
        this.group.add(mesh);

        this.animNodes.push({
          type: 'drawer-slide',
          obj: mesh,
          baseX: posX,
          baseY: posY,
          baseZ: posZ,
          slideZ: 220, // slides 220mm forward
          ox, oy, oz,
        });
      } else {
        // Standard static assembled piece
        const posX = pcx * S;
        const posY = pcy * S;
        const posZ = (p.z + p.sz / 2) * S;
        mesh.position.set(posX, posY, posZ);
        this.group.add(mesh);

        this.animNodes.push({
          type: 'static',
          obj: mesh,
          baseX: posX,
          baseY: posY,
          baseZ: posZ,
          ox, oy, oz,
        });
      }
    });

    // Center entire furniture model at (0, 0, 0)
    this.group.position.set(-cx * S, -(H / 2) * S, -(D / 2) * S);

    if (!this.fitted) {
      this.resetCamera();
      this.fitted = true;
    }
  }

  resize() {
    const w = this.el.clientWidth || 1;
    const h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  destroy() {
    this.running = false;
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
```

### 5.2 Proposed HTML & CSS for the Top 3D Viewer Toolbar

In `public/js/app.js`:
```html
<div class="right">
  <div class="vwr-toolbar">
    <!-- Render Modes Segmented Control -->
    <div class="vwr-pill">
      <button class="vwr-btn active" data-vmode="normal" title="Mueble cerrado (Normal)">
        <svg viewBox="0 0 24 24" class="vwr-icon"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        <span>Cerrado</span>
      </button>
      <button class="vwr-btn" data-vmode="open" title="Puertas y gavetas abiertas">
        <svg viewBox="0 0 24 24" class="vwr-icon"><path d="M3 3h18v18H3V3zm3 3v12l10-2V8L6 6z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        <span>Abiertas</span>
      </button>
      <button class="vwr-btn" data-vmode="explode" title="Despiece tridimensional">
        <svg viewBox="0 0 24 24" class="vwr-icon"><path d="M4 4l4 4m8-4l-4 4m-8 8l4-4m8 4l-4-4M9 9h6v6H9z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        <span>Despiece</span>
      </button>
    </div>

    <!-- Explosion Distance Slider (active in Despiece mode) -->
    <div class="vwr-pill vwr-slider-wrap" id="vwrExplodeWrap" style="display:none">
      <label class="muted" style="font-size:11px">Distancia</label>
      <input type="range" id="vwrExplodeDist" min="0.1" max="1.5" step="0.05" value="0.6">
    </div>

    <!-- Themes Toggle -->
    <div class="vwr-pill">
      <button class="vwr-btn active" data-vtheme="realistic" title="Color y textura de madera">
        <span class="vwr-dot dot-wood"></span>
        <span>Color</span>
      </button>
      <button class="vwr-btn" data-vtheme="neon" title="Contorno naranja sobre negro carbón">
        <span class="vwr-dot dot-neon"></span>
        <span>Contorno</span>
      </button>
    </div>

    <!-- Camera Reset Button -->
    <button class="vwr-btn vwr-icon-only" id="vwrResetCam" title="Centrar cámara">
      <svg viewBox="0 0 24 24" class="vwr-icon"><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4" stroke="currentColor" stroke-width="2"/></svg>
    </button>
  </div>

  <div class="vwr" id="vwr"></div>
  <div class="cards" id="cards" style="display:none"></div>
</div>
```

In `public/style.css`:
```css
/* 3D Viewer Toolbar */
.vwr-toolbar {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 95%;
  flex-wrap: wrap;
  justify-content: center;
  pointer-events: none;
}
.vwr-toolbar > * {
  pointer-events: all;
}
.vwr-pill {
  display: flex;
  align-items: center;
  background: rgba(22, 22, 26, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.vwr-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #c4c4c8;
  cursor: pointer;
  transition: all 0.18s ease;
}
.vwr-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}
.vwr-btn.active {
  background: #ffffff;
  color: #121214;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
.vwr-btn.vwr-icon-only {
  padding: 6px;
  border-radius: 50%;
  background: rgba(22, 22, 26, 0.82);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #c4c4c8;
}
.vwr-btn.vwr-icon-only:hover {
  color: #fff;
  border-color: var(--accent);
}
.vwr-icon {
  width: 14px;
  height: 14px;
}
.vwr-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.dot-wood { background: #c59b6d; border: 1px solid #7c5c36; }
.dot-neon { background: #ff6600; box-shadow: 0 0 6px #ff6600; }
.vwr-slider-wrap {
  padding: 4px 12px;
  gap: 8px;
}
.vwr-slider-wrap input[type=range] {
  width: 80px;
  height: 4px;
}
```

---

## 6. Verification Method

To verify these findings and implementations:

1. **Addons Presence**:
   Verify that `ViewHelper` and `OrbitControls` exist in Three.js addons:
   ```bash
   node -e "import('three/addons/helpers/ViewHelper.js').then(() => console.log('ViewHelper OK')).catch(console.error)"
   ```
2. **Kinematic Hinge & Drawer Coordinate Verification**:
   Inspect `public/js/layout.js` line 155 (`add({ name: 'Puerta', ... side })`) and `app.js` line 213:
   - Verify `p.side === 'right'` corresponds to handle on right, meaning hinge must pivot at $x = p.x$ with negative $\theta$.
   - Verify `p.side === 'left'` corresponds to handle on left, meaning hinge must pivot at $x = p.x + p.sx$ with positive $\theta$.
3. **Shadow Map Frustum & Bias Verification**:
   - Check that `renderer.shadowMap.enabled === true` and `renderer.shadowMap.type === THREE.PCFSoftShadowMap`.
   - Verify directional shadow biases (`bias = -0.0005`, `normalBias = 0.02`) produce clean shadows without moiré/acne artifacts on thin 18mm vertical panels.
4. **Theme Toggling**:
   - Switching to "Contorno Naranja" should switch background to `#121214`, panels to `#18181b`, edges to `#ff6600`, and display the dotted floor grid.
5. **Interactive Gizmo**:
   - Bottom-right corner renders the XYZ axes widget.
   - Clicking on the $+Z$ axis sphere rotates camera smoothly to front view; clicking $+Y$ rotates to top view; clicking $+X$ rotates to right side view.
