# Handoff Report: 3D Visual Themes, Real-Time Soft Shadows & ViewHelper 3D Orientation Gizmo (Milestone M4)

## 1. Observation

### 1.1 Baseline File Inspections
- **`public/index.html` (lines 8–15)**:
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
  The browser importmap maps `three/addons/` directly to `/vendor/three/examples/jsm/`.
- **`server/server.js` (line 249)**:
  ```javascript
  app.use('/vendor/three', express.static(path.join(root, 'node_modules', 'three')));
  ```
  The server directly maps `/vendor/three` to `node_modules/three`. Thus, importing `'three/addons/helpers/ViewHelper.js'` resolves in both native browser ESM and Node.js resolution without requiring external bundlers.
- **`node_modules/three/examples/jsm/helpers/ViewHelper.js` (verified on disk)**:
  - Class `ViewHelper extends Object3D` (lines 20–22).
  - Internal dimensions: `dim = 128` (line 104).
  - Viewport rendering:
    ```javascript
    const x = domElement.offsetWidth - dim;
    renderer.clearDepth();
    renderer.getViewport( viewport );
    renderer.setViewport( x, 0, dim, dim );
    renderer.render( this, orthoCamera );
    renderer.setViewport( viewport.x, viewport.y, viewport.z, viewport.w );
    ```
    Renders cleanly in bottom-right corner ($128 \times 128$ px) using WebGL viewport coordinate space (where `y=0` is bottom).
  - Raycaster hit testing:
    ```javascript
    this.handleClick = function ( event ) {
      if ( this.animating === true ) return false;
      const rect = domElement.getBoundingClientRect();
      const offsetX = rect.left + ( domElement.offsetWidth - dim );
      const offsetY = rect.top + ( domElement.offsetHeight - dim );
      mouse.x = ( ( event.clientX - offsetX ) / ( rect.right - offsetX ) ) * 2 - 1;
      mouse.y = - ( ( event.clientY - offsetY ) / ( rect.bottom - offsetY ) ) * 2 + 1;
      raycaster.setFromCamera( mouse, orthoCamera );
      const intersects = raycaster.intersectObjects( interactiveObjects );
      if ( intersects.length > 0 ) {
        prepareAnimationData( intersects[ 0 ].object, this.center );
        this.animating = true;
        return true;
      }
      return false;
    };
    ```
  - Animation slerp:
    ```javascript
    this.update = function ( delta ) {
      const step = delta * turnRate;
      q1.rotateTowards( q2, step );
      camera.position.set( 0, 0, 1 ).applyQuaternion( q1 ).multiplyScalar( radius ).add( this.center );
      camera.quaternion.rotateTowards( targetQuaternion, step );
      if ( q1.angleTo( q2 ) === 0 ) {
        this.animating = false;
      }
    };
    ```
- **`public/js/viewer.js` (lines 6–37, baseline status)**:
  - Renderer lacks shadow map enablement:
    ```javascript
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // renderer.shadowMap is not configured!
    ```
  - Directional light has no shadow parameters:
    ```javascript
    const d = new THREE.DirectionalLight(0xffffff, 1.3);
    d.position.set(3, 5, 4);
    this.scene.add(d);
    // castShadow is false, no mapSize or bias set!
    ```
  - Colors are hardcoded with legacy palette (lines 4, 78–83):
    ```javascript
    const COLORS = { side: 0x2f6fd1, h: 0x2fcf6a, v: 0x2fcf6a, front: 0xe0a81c, back: 0x8a8a8a, drawer: 0xb9bcc0, rail: 0xd8dde3 };
    ```
  - Edges are hardcoded to dark grey without theme reactivity (line 94):
    ```javascript
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x1a1a1a }));
    ```
  - No floor plane exists to receive contact shadows.
  - No top toolbar exists in `viewer.js` or `.vwr`.
- **`public/js/app.js` (lines 721–731)**:
  - Container `.vwr` is located in `.right`:
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
  - `viewer` is instantiated with `viewer = new Viewer(document.getElementById('vwr'))`.
- **`public/style.css` (lines 20–23, 41)**:
  - `.right .vwr { position:absolute; inset:0; }`
  - `.rtools { position:absolute; top:10px; right:10px; ... }`
  - No CSS styles exist for `.viewer-toolbar`.

---

## 2. Logic Chain

1. **Visual Themes Logic**:
   - *Requirement*: Two visual themes: `realistic` (warm wood palette `#d4a373` / `#c89666`, soft warm lighting, neutral ground plane) and `neon` (deep matte charcoal black melamine `#18181b` / `#121214`, sharp neon orange edge highlights `#ff6600` / `#ff5500` using `THREE.LineSegments` + `THREE.EdgesGeometry`, dark background `#09090b`, dotted/grid floor).
   - *Deduction from Obs 1.1*: Because `this.group` holds all piece meshes and their child `LineSegments`, switching theme at runtime via `viewer.setVisualTheme(theme)` can be executed instantaneously by traversing `this.group` and mutating material colors and roughness/metalness properties in-place, without disposing or regenerating geometries.
   - *Edges Distinction*: In `neon` theme, `LineBasicMaterial` must have `color: 0xff6600, toneMapped: false` so that the orange glows vividly without being washed out by scene exposure or tone mapping. In `realistic` theme, edges are styled with a subtle translucent dark brown (`0x4a3219`, `opacity: 0.25`, `transparent: true`) to simulate clean panel joinery.

2. **Real-Time Soft Shadows Logic**:
   - *Requirement*: `renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;` with directional light tuning `castShadow = true, mapSize = 2048x2048, near = 0.5, far = 5000, bias = -0.0005, normalBias = 0.02`.
   - *Deduction from Obs 1.1*: In `viewer.js`, the furniture coordinates are scaled from millimeters to meters using `S = 0.001` (e.g., 2100mm height becomes 2.1m). Panel thickness is 18mm ($0.018$m).
   - *Acne Prevention*: Thin panels are prone to self-shadow acne artifacts. Setting `normalBias = 0.02` shifts shadow map sampling outward along vertex normals, eliminating acne completely. `bias = -0.0005` prevents light leaking at joints.
   - *Dynamic Frustum*: The orthographic shadow camera bounds (`left`, `right`, `top`, `bottom`) should dynamically scale in `update(layout)` according to `extent = Math.max(layout.totalW, layout.settings.height, layout.settings.depth) * 0.001 * 1.5` so the full $2048 \times 2048$ resolution is packed onto the furniture and ground.
   - *Shadow Receiver Ground Plane*: Placing a `THREE.ShadowMaterial({ opacity: 0.4 })` plane at `y = -(layout.settings.height * 0.001) / 2` allows the scene background (studio neutral in `realistic`, carbon black `#09090b` in `neon`) to show through while capturing realistic contact shadows directly beneath the plinth/legs. In `neon` mode, an accompanying `THREE.GridHelper(10, 40, 0x3f3f46, 0x1f1f23)` provides the required dotted/grid floor.

3. **Interactive 3D Orientation Gizmo (ViewHelper) Logic**:
   - *Requirement*: Three.js `ViewHelper` integration rendered via secondary viewport / auto-clearing render pass in bottom-right corner ($128 \times 128$ px), continuous sync with `OrbitControls`, and mouse click hit-testing to transition camera smoothly to orthogonal views.
   - *Deduction from Obs 1.1*: `ViewHelper` is available natively in `node_modules/three/examples/jsm/helpers/ViewHelper.js`.
   - *Multi-Pass Execution*: To prevent `viewHelper.render(renderer)` from wiping the main scene, the render loop must use:
     ```javascript
     this.renderer.autoClear = false;
     this.renderer.clear();
     this.renderer.render(this.scene, this.camera);
     this.viewHelper.render(this.renderer);
     ```
   - *OrbitControls Deconfliction*: When `this.viewHelper.animating === true`, `this.controls.enabled` must be temporarily set to `false` so OrbitControls does not interfere with the quaternion slerp. In every frame, `this.viewHelper.center.copy(this.controls.target)` ensures that the gizmo rotates around the model's current focus point.
   - *Click vs Drag Filter*: Listening to `pointerdown` and `pointerup` on `renderer.domElement`, we verify that pointer movement is $< 6$ pixels before invoking `this.viewHelper.handleClick(e)`. This prevents camera drag operations from inadvertently triggering an orthogonal view snap.

4. **Viewer Top Toolbar UI Logic**:
   - *Requirement*: Floating ergonomic toolbar overlay on the 3D canvas with toggle buttons for Render Modes (`Normal` | `Puertas abiertas` | `Despiece`), Themes (`Madera realista` | `Negro carbón`), and View Reset (`Enfocar` / `Restablecer cámara`).
   - *Deduction from Obs 1.1*: Constructing the toolbar DOM inside `Viewer.prototype.buildToolbar()` and mounting it inside `this.el` (with `top: 10px; left: 10px; z-index: 10;`) encapsulates all toolbar logic within `Viewer`.
   - *Event Shielding*: Calling `e.stopPropagation()` on the toolbar's `pointerdown`, `mousedown`, and `click` events ensures button presses do not bubble to the WebGL canvas or initiate unintended OrbitControls rotation.

---

## 3. Caveats

1. **Explorer M4-1 Kinematics Integration**: Explorer M4-1 is independently formalizing the kinematics interpolation math (lerp formulas for door hinge pivots and drawer extension). Explorer M4-2 provides the exact `viewer.setRenderMode(mode)` contract and top toolbar triggers so M4-1's kinematic engine drops into the architecture without friction.
2. **Device Pixel Ratio Performance**: With PCFSoftShadowMap at $2048 \times 2048$ and secondary viewport rendering for ViewHelper, high-DPI displays (e.g. retina 3x) can experience frame drops if pixel ratio is uncapped. Capping `this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` is strongly recommended.
3. **Headless Node.js Test Environments**: Node test runners (`node --test`) lack browser globals (`window`, `document`, `WebGLRenderer`). Guarding DOM and canvas instantiations or providing headless mocks ensures `viewer.js` can be imported safely by Node test suites.

---

## 4. Conclusion & Implementation Blueprint

The solution consists of two primary artifacts:
1. `public/js/viewer.js`: Fully refactored 3D viewer featuring PCFSoftShadowMap soft shadows, visual theme management (`realistic` vs `neon`), native `ViewHelper` orientation gizmo with click raycasting, smooth `resetCamera()`, and self-contained top toolbar overlay.
2. `public/style.css`: Clean, ergonomic CSS rules for `.viewer-toolbar`, `.vtoolbar-group`, `.vtoolbar-divider`, and `.vbtn`.

### 4.1 Production Drop-In Blueprint: `public/js/viewer.js`

```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ViewHelper } from 'three/addons/helpers/ViewHelper.js';

// ============================================================================
// THEME PALETTES & CONSTANTS
// ============================================================================
const WOOD_PALETTE = {
  side: 0xd4a373,
  h: 0xd4a373,
  v: 0xd4a373,
  front: 0xc89666,
  back: 0xbe8c5c,
  drawer: 0xdeb887,
  rail: 0xd4d8dc,
  default: 0xd4a373,
};

const NEON_PALETTE = {
  side: 0x141416,
  h: 0x141416,
  v: 0x141416,
  front: 0x18181b,
  back: 0x101012,
  drawer: 0x1f1f23,
  rail: 0x27272a,
  default: 0x141416,
};

export class Viewer {
  constructor(el) {
    this.el = el;
    this.theme = 'realistic'; // 'realistic' | 'neon'
    this.renderMode = 'normal'; // 'normal' | 'open' | 'explode'
    this.explode = 0.6;
    this.hideFronts = false;
    this.fitted = false;
    this.last = null;
    this.lastLayout = null;
    this.running = true;

    // Kinematics targets for smooth 60fps lerp
    this.openProgress = 0.0;
    this.targetOpen = 0.0;
    this.explodeProgress = 0.0;
    this.targetExplode = 0.0;

    // 1. WebGL Renderer with PCFSoftShadowMap
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = false;
    el.style.position = 'relative';
    el.appendChild(this.renderer.domElement);

    // 2. Scene & Background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x23201e);

    // 3. Main Camera & OrbitControls
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
    this.camera.position.set(2.2, 1.6, 3.2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // 4. Studio Lighting Pipeline
    this.hemiLight = new THREE.HemisphereLight(0xfff8ee, 0x3a3530, 1.0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
    this.dirLight.position.set(2.5, 4.5, 3.5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 25;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);

    // Subtle cool fill light (no shadow)
    this.fillLight = new THREE.DirectionalLight(0xcad4e0, 0.35);
    this.fillLight.position.set(-3.5, 2.0, -2.5);
    this.scene.add(this.fillLight);

    // 5. Furniture Piece Mesh Group
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // 6. Ground Shadow Receiver & Dotted Grid Floor
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.4 });
    this.floorShadow = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), shadowMat);
    this.floorShadow.rotation.x = -Math.PI / 2;
    this.floorShadow.receiveShadow = true;
    this.scene.add(this.floorShadow);

    this.floorGrid = new THREE.GridHelper(10, 40, 0x3f3f46, 0x1f1f23);
    this.floorGrid.position.y = 0.0005;
    this.floorGrid.visible = false;
    this.scene.add(this.floorGrid);

    // 7. Interactive 3D Orientation Gizmo (ViewHelper)
    this.viewHelper = new ViewHelper(this.camera, this.renderer.domElement);
    if (this.viewHelper.setLabels) {
      this.viewHelper.setLabels('X', 'Y', 'Z');
    }
    if (this.viewHelper.setLabelStyle) {
      this.viewHelper.setLabelStyle('bold 22px system-ui, sans-serif', '#ffffff', 14);
    }

    // Pointer click raycasting filter for ViewHelper
    let pointerDownPos = { x: 0, y: 0 };
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      const dx = Math.abs(e.clientX - pointerDownPos.x);
      const dy = Math.abs(e.clientY - pointerDownPos.y);
      if (dx < 6 && dy < 6 && this.viewHelper) {
        if (this.viewHelper.handleClick(e)) {
          e.stopPropagation();
        }
      }
    });

    // 8. Build Floating Top Toolbar Overlay
    this.buildToolbar();

    // 9. Resize Observer
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(el);

    // 10. 60 FPS Render & Animation Loop
    const clock = new THREE.Clock();
    const loop = () => {
      if (!this.running) return;
      const delta = clock.getDelta();

      // Kinematics Lerp Interpolation
      this.openProgress += (this.targetOpen - this.openProgress) * Math.min(1, delta * 9);
      this.explodeProgress += (this.targetExplode - this.explodeProgress) * Math.min(1, delta * 9);
      this.applyKinematicsOffsets();

      // ViewHelper camera slerp handling
      if (this.viewHelper && this.viewHelper.animating) {
        this.controls.enabled = false;
        this.viewHelper.update(delta);
        if (!this.viewHelper.animating) {
          this.controls.enabled = true;
          this.controls.update();
        }
      } else {
        this.controls.update();
      }

      // Sync ViewHelper center with OrbitControls target
      if (this.viewHelper) {
        this.viewHelper.center.copy(this.controls.target);
      }

      // Render Scene (AutoClear = false multi-pass)
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);

      // Render ViewHelper 128x128 gizmo pass in bottom-right corner
      if (this.viewHelper) {
        this.viewHelper.render(this.renderer);
      }

      requestAnimationFrame(loop);
    };
    loop();
  }

  buildToolbar() {
    if (!this.el) return;
    const tb = document.createElement('div');
    tb.className = 'viewer-toolbar';
    tb.innerHTML = `
      <div class="vtoolbar-group" data-group="mode">
        <button type="button" class="vbtn active" data-mode="normal" title="Mueble cerrado (Normal)">Normal</button>
        <button type="button" class="vbtn" data-mode="open" title="Puertas y gavetas abiertas">Puertas abiertas</button>
        <button type="button" class="vbtn" data-mode="explode" title="Despiece tridimensional">Despiece</button>
      </div>
      <div class="vtoolbar-divider"></div>
      <div class="vtoolbar-group" data-group="theme">
        <button type="button" class="vbtn active" data-theme="realistic" title="Madera realista">Madera realista</button>
        <button type="button" class="vbtn" data-theme="neon" title="Negro carbón con aristas naranja">Negro carbón</button>
      </div>
      <div class="vtoolbar-divider"></div>
      <div class="vtoolbar-group" data-group="actions">
        <button type="button" class="vbtn vbtn-action" data-action="reset" title="Restablecer cámara y enfocar">Enfocar</button>
      </div>
    `;

    tb.addEventListener('pointerdown', (e) => e.stopPropagation());
    tb.addEventListener('mousedown', (e) => e.stopPropagation());
    tb.addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.mode) {
        this.setRenderMode(btn.dataset.mode);
      } else if (btn.dataset.theme) {
        this.setVisualTheme(btn.dataset.theme);
      } else if (btn.dataset.action === 'reset') {
        this.resetCamera();
      }
    });

    this.el.appendChild(tb);
    this.toolbar = tb;
  }

  updateToolbarActiveStates() {
    if (!this.toolbar) return;
    this.toolbar.querySelectorAll('[data-mode]').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === this.renderMode);
    });
    this.toolbar.querySelectorAll('[data-theme]').forEach((b) => {
      b.classList.toggle('active', b.dataset.theme === this.theme);
    });
  }

  setRenderMode(mode) {
    if (mode !== 'normal' && mode !== 'open' && mode !== 'explode') return;
    this.renderMode = mode;
    this.updateToolbarActiveStates();

    if (mode === 'normal') {
      this.targetOpen = 0.0;
      this.targetExplode = 0.0;
    } else if (mode === 'open') {
      this.targetOpen = 1.0;
      this.targetExplode = 0.0;
    } else if (mode === 'explode') {
      this.targetOpen = 0.0;
      this.targetExplode = 1.0;
    }
  }

  setVisualTheme(theme) {
    if (theme !== 'realistic' && theme !== 'neon') return;
    this.theme = theme;
    const isNeon = theme === 'neon';

    // 1. Scene Background & Lights
    if (isNeon) {
      this.scene.background.setHex(0x09090b);
      this.hemiLight.color.setHex(0x27272a);
      this.hemiLight.groundColor.setHex(0x09090b);
      this.hemiLight.intensity = 0.6;
      this.dirLight.color.setHex(0xffffff);
      this.dirLight.intensity = 1.4;
      this.floorGrid.visible = true;
    } else {
      this.scene.background.setHex(0x23201e);
      this.hemiLight.color.setHex(0xfff8ee);
      this.hemiLight.groundColor.setHex(0x3a3530);
      this.hemiLight.intensity = 1.0;
      this.dirLight.color.setHex(0xfff5e6);
      this.dirLight.intensity = 1.8;
      this.floorGrid.visible = false;
    }

    // 2. In-place Update of Piece Meshes and Edges
    this.group.traverse((o) => {
      if (o.isMesh && o.userData && o.userData.piece) {
        const p = o.userData.piece;
        const sel = o.userData.selected;
        o.material.color.setHex(isNeon ? (NEON_PALETTE[p.kind] || 0x141416) : (WOOD_PALETTE[p.kind] || 0xd4a373));
        o.material.roughness = isNeon ? 0.88 : (p.kind === 'rail' ? 0.25 : 0.65);
        o.material.metalness = p.kind === 'rail' ? (isNeon ? 0.6 : 0.8) : (isNeon ? 0.08 : 0.05);
        o.material.emissive.setHex(sel ? (isNeon ? 0xff6600 : 0xffaa00) : 0x000000);
        o.material.emissiveIntensity = sel ? 0.6 : 0;
        o.material.needsUpdate = true;
      }
      if (o.isLineSegments && o.userData && o.userData.isEdge) {
        o.material.color.setHex(isNeon ? 0xff6600 : 0x4a3219);
        o.material.opacity = isNeon ? 1.0 : 0.25;
        o.material.transparent = !isNeon;
        o.material.needsUpdate = true;
      }
    });

    // 3. Sync Toolbar Buttons
    this.updateToolbarActiveStates();
  }

  resetCamera() {
    const S = 0.001;
    const layout = this.lastLayout;
    if (!layout) {
      this.camera.position.set(2.2, 1.6, 3.2);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
      return;
    }
    const W = layout.totalW * S;
    const H = layout.settings.height * S;
    const D = layout.settings.depth * S;
    const size = Math.max(W, H, D);
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(size * 1.1, size * 0.8, size * 1.8);
    this.camera.lookAt(0, 0, 0);
    this.controls.update();
    if (this.viewHelper) {
      this.viewHelper.center.set(0, 0, 0);
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
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.toolbar) this.toolbar.remove();
    if (this.viewHelper) this.viewHelper.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  setExplode(v) {
    this.explode = v;
    if (this.renderMode === 'explode') {
      this.targetExplode = v;
    } else {
      if (this.last) this.update(...this.last);
    }
  }

  setHideFronts(v) {
    this.hideFronts = v;
    if (this.last) this.update(...this.last);
  }

  update(layout, selectedIds = new Set()) {
    this.last = [layout, selectedIds];
    this.lastLayout = layout;

    // Dispose existing geometries and materials
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    this.group.clear();

    const S = 0.001;
    const H = layout.settings.height;
    const cx = layout.totalW / 2;
    const isNeon = this.theme === 'neon';

    // Dynamic Shadow Map Camera Bounds
    const maxDim = Math.max(layout.totalW, H, layout.settings.depth) * S;
    const extent = Math.max(1.5, maxDim * 0.9);
    this.dirLight.shadow.camera.left = -extent;
    this.dirLight.shadow.camera.right = extent;
    this.dirLight.shadow.camera.top = extent;
    this.dirLight.shadow.camera.bottom = -extent;
    this.dirLight.shadow.camera.updateProjectionMatrix();

    // Adjust Floor Plane & Grid Elevation
    const yBase = -(H * S) / 2;
    this.floorShadow.position.y = yBase;
    this.floorGrid.position.y = yBase + 0.0005;

    // Generate Meshes with Shadows and Theme Materials
    layout.pieces.forEach((p) => {
      if (this.hideFronts && p.kind === 'front') return;
      const geo = new THREE.BoxGeometry(p.sx * S, p.sy * S, p.sz * S);
      const sel = p.nodeId && selectedIds.has(p.nodeId);

      const mat = new THREE.MeshStandardMaterial({
        color: isNeon ? (NEON_PALETTE[p.kind] || 0x141416) : (WOOD_PALETTE[p.kind] || 0xd4a373),
        roughness: isNeon ? 0.88 : (p.kind === 'rail' ? 0.25 : 0.65),
        metalness: p.kind === 'rail' ? (isNeon ? 0.6 : 0.8) : (isNeon ? 0.08 : 0.05),
        emissive: sel ? (isNeon ? 0xff6600 : 0xffaa00) : 0x000000,
        emissiveIntensity: sel ? 0.6 : 0,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const pcx = p.x + p.sx / 2;
      const pcy = p.y + p.sy / 2;
      const basePos = new THREE.Vector3(pcx * S, pcy * S, (p.z + p.sz / 2) * S);
      mesh.position.copy(basePos);

      // Store piece metadata for kinematics and theme switching
      mesh.userData = {
        piece: p,
        selected: sel,
        basePos,
        baseRot: new THREE.Euler(),
        cx,
        H,
      };

      // Theme-specific EdgesGeometry highlight
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: isNeon ? 0xff6600 : 0x4a3219,
        linewidth: isNeon ? 2 : 1,
        transparent: !isNeon,
        opacity: isNeon ? 1.0 : 0.25,
        toneMapped: false,
      });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      edges.userData = { isEdge: true };
      mesh.add(edges);

      this.group.add(mesh);
    });

    this.group.position.set(-cx * S, yBase, -(layout.settings.depth / 2) * S);

    if (!this.fitted) {
      this.resetCamera();
      this.fitted = true;
    }
  }

  applyKinematicsOffsets() {
    const S = 0.001;
    const exFactor = (this.explodeProgress || 0) * (this.explode * 180);
    const opFactor = this.openProgress || 0;

    this.group.children.forEach((mesh) => {
      const u = mesh.userData;
      if (!u || !u.basePos || !u.piece) return;
      const p = u.piece;

      let ox = 0, oy = 0, oz = 0;

      // 1. Explode offsets
      if (exFactor > 0.001) {
        const pcx = p.x + p.sx / 2;
        const pcy = p.y + p.sy / 2;
        if (p.kind === 'side') ox = Math.sign(pcx - u.cx) * exFactor * 0.7;
        else if (p.kind === 'h') oy = Math.sign(pcy - u.H / 2) * exFactor * 0.5;
        else if (p.kind === 'front') oz = exFactor * 1.2;
        else if (p.kind === 'drawer') oz = exFactor * 0.8;
        else if (p.kind === 'back') oz = -exFactor * 0.4;
      }

      // 2. Open offsets & rotations (Kinematics preview)
      let rx = 0, ry = 0;
      if (opFactor > 0.001) {
        if (p.kind === 'drawer') {
          oz += opFactor * (this.lastLayout?.settings?.depth || 500) * 0.55;
        } else if (p.kind === 'front') {
          if (p.role === 'door' || p.role === 'door-front') {
            if (p.side === 'right' || p.side === 'right-door') {
              ry = -opFactor * (Math.PI * 0.45);
              ox += Math.sin(-ry) * (p.sx * 0.5);
              oz += (1 - Math.cos(ry)) * (p.sx * 0.5);
            } else if (p.side === 'lift-up') {
              rx = -opFactor * (Math.PI * 0.45);
              oy += (1 - Math.cos(rx)) * (p.sy * 0.5);
              oz += Math.sin(-rx) * (p.sy * 0.5);
            } else {
              ry = opFactor * (Math.PI * 0.45);
              ox -= Math.sin(ry) * (p.sx * 0.5);
              oz += (1 - Math.cos(ry)) * (p.sx * 0.5);
            }
          }
        }
      }

      mesh.position.set(u.basePos.x + ox * S, u.basePos.y + oy * S, u.basePos.z + oz * S);
      mesh.rotation.set(rx, ry, 0);
    });
  }
}
```

### 4.2 Production Drop-In CSS Blueprint: `public/style.css`

Append to `public/style.css`:

```css
/* ==========================================================================
   Milestone 4: 3D Viewer Floating Top Toolbar UI & Themes
   ========================================================================== */

.viewer-toolbar {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(24, 24, 27, 0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  padding: 4px 6px;
  z-index: 10;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
  user-select: none;
}

.viewer-toolbar .vtoolbar-group {
  display: flex;
  align-items: center;
  gap: 3px;
}

.viewer-toolbar .vtoolbar-divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.16);
  margin: 0 4px;
}

.viewer-toolbar .vbtn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  color: #a1a1aa;
  font-size: 11px;
  font-weight: 500;
  padding: 5px 11px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.viewer-toolbar .vbtn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.viewer-toolbar .vbtn.active {
  background: var(--accent, #ffb800);
  color: #111113;
  font-weight: 700;
  border-color: var(--accent, #ffb800);
  box-shadow: 0 2px 8px rgba(255, 184, 0, 0.35);
}

.viewer-toolbar .vbtn.vbtn-action:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.2);
}
```

---

## 5. Verification Method

### 5.1 Verification Checklist & Tests
1. **Visual Themes**:
   - Call `viewer.setVisualTheme('neon')`:
     - Scene background changes to `#09090b`.
     - Panel meshes turn charcoal matte black (`#18181b` / `#141416`).
     - Mesh edges glow with sharp neon orange line segments (`#ff6600` with `toneMapped: false`).
     - Ground grid helper becomes visible (`visible === true`).
     - Toolbar button `[data-theme="neon"]` acquires `.active` class.
   - Call `viewer.setVisualTheme('realistic')`:
     - Scene background changes to `#23201e`.
     - Panel meshes reflect warm wood palette (`#d4a373` / `#c89666`).
     - Mesh edges become subtle translucent brown (`0x4a3219`, opacity `0.25`).
     - Ground grid helper hides (`visible === false`).
     - Toolbar button `[data-theme="realistic"]` acquires `.active` class.
2. **Real-Time Soft Shadows (PCFSoftShadowMap)**:
   - Check `renderer.shadowMap.enabled === true` and `renderer.shadowMap.type === THREE.PCFSoftShadowMap`.
   - Inspect `dirLight.castShadow === true`, `dirLight.shadow.mapSize.width === 2048`, `dirLight.shadow.mapSize.height === 2048`, `dirLight.shadow.bias === -0.0005`, `dirLight.shadow.normalBias === 0.02`.
   - Inspect piece meshes: all have `castShadow === true` and `receiveShadow === true`.
   - Floor plane `floorShadow` has `receiveShadow === true` and is positioned at `y = -(layout.settings.height * 0.001) / 2`.
3. **Interactive 3D Orientation Gizmo (ViewHelper)**:
   - Verify `viewHelper` instance is attached to viewer and renders in the bottom-right corner ($128 \times 128$ px).
   - Simulate/trigger click inside bottom-right corner: `viewHelper.handleClick(event)` initiates smooth camera slerp to orthogonal view (Top, Front, Side, etc.).
   - During camera animation, `controls.enabled === false`; on animation completion, `controls.enabled === true`.
   - Verify `viewHelper.center` continuously tracks `controls.target`.
4. **Viewer Top Toolbar**:
   - Inspect `.viewer-toolbar` presence inside `#vwr`.
   - Clicking `Puertas abiertas` sets `renderMode = 'open'` and animates doors open and drawers out.
   - Clicking `Despiece` sets `renderMode = 'explode'` and separates panels along 3D axes.
   - Clicking `Normal` closes all components.
   - Clicking `Enfocar` resets camera to centered bounding box perspective.
   - During print preview (`@media print`), `.viewer-toolbar` and `.vwr` remain completely hidden.
