# Handoff Report: Expanded Door Types & Cutlist Hardware Calculation (Milestone M3-1)

**Author**: Explorer M3-1 (Expanded Door Types & Cutlist Hardware Calculation)  
**Date**: 2026-10-23T02:05:00Z  
**Target Milestone**: Milestone 3 (Expanded Door Types & Cutlist Hardware Integration)  
**Working Directory**: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m3_v2_1`  
**Status**: Investigation Complete — Production-Ready Plan Ready for Implementer  

---

## 1. Observation

Direct code observations from inspecting the codebase via `view_file` (no terminal commands executed):

### 1.1 Current `FRONTS` and `LABELS` (`public/js/layout.js`)
In `public/js/layout.js`, lines 82–93:
```javascript
82: export const FRONTS = ['none', 'doors', 'left-door', 'right-door'];
83: export const LABELS = {
84:   multiple: 'Contenedor (varios módulos)',
85:   shelf: 'Abierto / estante',
86:   rail: 'Perchero',
87:   drawer: 'Gaveta',
88:   none: 'Sin puertas',
89:   doors: 'Dos puertas',
90:   'left-door': 'Puerta (bisagra izquierda)',
91:   'right-door': 'Puerta (bisagra derecha)',
92:   default: 'Por defecto del proyecto',
93: };
```
- **Direct observation**: Only `'none'`, `'doors'`, `'left-door'`, `'right-door'` exist in `FRONTS`. There is no definition for sliding doors (`sliding`), bi-fold doors (`bifold`), or lift-up flap doors (`lift-up`).

### 1.2 Current `DEFAULTS` and `SETTING_META` (`public/js/layout.js`)
In `public/js/layout.js`, lines 23–36:
```javascript
23:   // Precios
24:   currency: '$',
25:   priceCarcass: 40, // por m² (laterales, divisiones, tapas)
26:   priceFront: 70, // por m² (puertas y frentes de gaveta)
27:   priceBack: 20, // por m² (fondo)
28:   priceDrawer: 30, // por m² (caja de gaveta)
29:   pricePullBar: 4, // por manilla de barra
30:   pricePullKnob: 2, // por pomo
31:   pricePullProfile: 8, // por perfil/gola
32:   priceRail: 6, // por metro de barra de perchero
33:   priceRailBracket: 1.5, // por soporte de barra
34:   slidePrice: 12, // por par de correderas
35:   hingePrice: 2, // por bisagra
36: };
```
And in lines 75–77:
```javascript
75:   ['slidePrice', 'Precio corredera (par)', '/par', ''],
76:   ['hingePrice', 'Precio bisagra', '/u', ''],
77: ];
```
- **Direct observation**: There are no default prices or metadata definitions for sliding tracks (`slidingTrackPrice`), bi-fold book hinges (`bifoldHingePrice`), bi-fold guide carriages (`bifoldGuidePrice`), or gas struts (`gasStrutPrice`).

### 1.3 Current `doorOverlay()` inside `computeLayout()` (`public/js/layout.js`)
In `public/js/layout.js`, lines 145–165:
```javascript
145:   const doorOverlay = (n, cx0, cy0, w, h, col) => {
146:     const cx = cx0 - t / 2;
147:     const cy = cy0 - t / 2;
148:     const cw = w + t;
149:     const ch = h + t;
150:     const fc = s.frontClearance;
151:     const style = pullOf(n);
152:     const holes = PULLS[style].holes;
153:     const hingesPer = ch > 1800 ? 4 : ch > 1000 ? 3 : 2;
154:     const door = (px, dw, side) => {
155:       add({ name: 'Puerta', mat: 'front', kind: 'front', x: px, y: cy + fc, z: D, sx: dw, sy: ch - 2 * fc, sz: t, holes, pull: style, holeLayout: 'v', col, nodeId: n.id, side });
156:       countPull(style);
157:       hw.hinges += hingesPer;
158:     };
159:     if (n.front === 'doors') {
160:       const dw = (cw - 3 * fc) / 2;
161:       door(cx + fc, dw, 'right');
162:       door(cx + 2 * fc + dw, dw, 'left');
163:     } else if (n.front === 'left-door') door(cx + fc, cw - 2 * fc, 'right');
164:     else if (n.front === 'right-door') door(cx + fc, cw - 2 * fc, 'left');
165:   };
```
- **Direct observation**: `doorOverlay` only handles `doors`, `left-door`, and `right-door`. It places all doors at a single plane $z = D$, with hardcoded vertical handles (`holeLayout: 'v'`), single material `mat: 'front'`, kind `kind: 'front'`, and only increments `hw.hinges`.

### 1.4 Current Hardware Tracking and Cutlist (`public/js/layout.js`)
In `public/js/layout.js`, line 115:
```javascript
115:   const hw = { slides: 0, hinges: 0, pulls: {}, rails: 0, brackets: 0 };
```
In lines 268–285:
```javascript
268: const PRICE_KEY = { carcass: 'priceCarcass', front: 'priceFront', back: 'priceBack', drawer: 'priceDrawer' };
269: 
270: const ROLE = {
271:   Lateral: 'vertical-side',
272:   'División vertical': 'vertical-side',
273:   'Tapa superior': 'horizontal-deck',
274:   Base: 'horizontal-deck',
275:   'Estante / división': 'horizontal-deck',
276:   Fondo: 'back-panel',
277:   Puerta: 'door-front',
278:   'Frente de gaveta': 'drawer-front',
279:   'Lateral de gaveta': 'drawer-side',
280:   'Frente/trasera de gaveta': 'drawer-back',
281:   'Fondo de gaveta': 'drawer-bottom',
282: };
283: const ROLE_ORDER = ['back-panel', 'door-front', 'drawer-back', 'drawer-bottom', 'drawer-front', 'drawer-side', 'horizontal-deck', 'vertical-side'];
284: const ROLE_PREFIX = { 'back-panel': 'B', 'door-front': 'O', 'drawer-back': 'D', 'drawer-bottom': 'D', 'drawer-front': 'D', 'drawer-side': 'D', 'horizontal-deck': 'H', 'vertical-side': 'S' };
```
In lines 335–351:
```javascript
335:   const hardware = [];
336:   Object.entries(hw.pulls || {}).forEach(([style, qty]) => {
337:     const price = s[PULLS[style].priceKey] || 0;
338:     hardware.push({ name: PULLS[style].label, qty, unitPrice: price, total: qty * price });
339:   });
340:   if (hw.rails) {
341:     const m = hw.rails / 1000;
342:     hardware.push({ name: 'Barra de perchero (m)', qty: Math.round(m * 100) / 100, unitPrice: s.priceRail, total: m * s.priceRail });
343:     hardware.push({ name: 'Soporte de barra', qty: hw.brackets, unitPrice: s.priceRailBracket, total: hw.brackets * s.priceRailBracket });
344:   }
345:   if (hw.slides) hardware.push({ name: 'Corredera (par)', qty: hw.slides, unitPrice: s.slidePrice, total: hw.slides * s.slidePrice });
346:   if (hw.hinges) hardware.push({ name: 'Bisagra', qty: hw.hinges, unitPrice: s.hingePrice, total: hw.hinges * s.hingePrice });
347:   const panelsTotal = rows.reduce((a, r) => a + r.total, 0);
348:   const hardwareTotal = hardware.reduce((a, r) => a + r.total, 0);
349:   const area = rows.reduce((a, r) => a + r.unitArea * r.qty, 0);
350:   return { rows, machining, hardware, panelsTotal, hardwareTotal, total: panelsTotal + hardwareTotal, area };
```
- **Direct observation**: `hw` only counts `slides`, `hinges`, `pulls`, `rails`, and `brackets`. `buildCutlist` only itemizes those 5 categories into `hardware`. `PRICE_KEY` does not map `door`, and `ROLE` only contains `'Puerta'`.

### 1.5 Cross-Module Invariant Observations
- **`public/js/model.js` (lines 30–33)**:
  `if (['doors', 'left-door', 'right-door', 'sliding', 'bifold', 'lift-up'].includes(n.type)) { n.front = n.type; n.type = 'shelf'; }`
  `model.js` already anticipates the new types `'sliding'`, `'bifold'`, `'lift-up'`!
- **`public/js/app.js` (lines 997–1003)**:
  `typeOpts(node.front || 'none', FRONTS)`
  The module dock UI dynamically populates its doors `<select id="front">` from the exported `FRONTS` and `LABELS` arrays without requiring any hardcoded options in `app.js`.
- **`public/js/app.js` (lines 1170–1184, 1219–1232)**:
  The hardware table in the cutlist view dynamically iterates over `cl.hardware`, displaying `r.name`, `r.qty`, `r.unitPrice`, and `r.total`. Subtotal and grand total banners use `cl.hardwareTotal` and `cl.total`.
- **`public/js/app.js` (line 776)**:
  `const isF = p.kind === 'front';`
  In the 2D SVG canvas, if `p.kind` is `'door-front'` instead of `'front'`, `isF` evaluates to false unless handled as `p.kind === 'front' || p.kind === 'door-front'`.
- **`public/js/viewer.js` (lines 4, 75, 90)**:
  `COLORS = { ... front: 0xe0a81c ... }`
  `if (this.hideFronts && (p.kind === 'front')) return;`
  `else if (p.kind === 'front') oz = ex * 1.2;`
  In 3D viewer, `p.kind` determines front color, visibility toggle, and explosion displacement.

---

## 2. Logic Chain

### 2.1 Expanding `FRONTS` and `LABELS`
1. **From Observation 1.1**: Currently `FRONTS = ['none', 'doors', 'left-door', 'right-door']`.
2. **From Observation 1.5**: In `public/js/app.js`, `drawDock()` renders `<select id="front">${typeOpts(node.front || 'none', FRONTS)}</select>`.
3. **Inference**: Adding `'sliding'`, `'bifold'`, `'lift-up'` to `FRONTS` and mapping them in `LABELS`:
   - `sliding`: `'Puertas corredizas (con riel)'`
   - `bifold`: `'Puerta plegable / acordeón'`
   - `'lift-up'`: `'Puerta abatible hacia arriba (pistón a gas)'`
   will immediately make all three door options visible and selectable in the UI dock for any module without modifying `app.js`.

### 2.2 Adding Hardware Prices to `DEFAULTS` and `SETTING_META`
1. **From Observation 1.2**: Project settings are stored in `project.settings` with defaults merged via `{ ...DEFAULTS, ...(project.settings || {}) }`.
2. **From User Request Specification**:
   - `slidingTrackPrice: 28`
   - `bifoldHingePrice: 4`
   - `bifoldGuidePrice: 8`
   - `gasStrutPrice: 6`
3. **Inference**: Adding these 4 keys to `DEFAULTS` and registering their Spanish descriptions in `SETTING_META`:
   - `['slidingTrackPrice', 'Precio kit corredizo', '/juego', 'Rieles y carros para puertas corredizas']`
   - `['bifoldHingePrice', 'Precio bisagra plegable', '/u', 'Bisagras articuladas para puertas acordeón']`
   - `['bifoldGuidePrice', 'Precio guía plegable', '/u', 'Guía y carro superior para puerta plegable']`
   - `['gasStrutPrice', 'Precio pistón a gas', '/u', 'Pistones amortiguadores para puertas abatibles']`
   ensures they appear in the project settings modal (⚙) and provide reliable pricing fallbacks in cutlist computation.

### 2.3 3D Panel Kinematics & Coordinates in `doorOverlay()`
1. **From Observation 1.3**: Inside `doorOverlay(n, cx0, cy0, w, h, col)`:
   - Carcass outer coverage: `cx = cx0 - t / 2`, `cy = cy0 - t / 2`, `cw = w + t`, `ch = h + t`.
   - Clearance: `fc = s.frontClearance` (default 2 mm).
   - Net opening coverage: width $W_{net} = cw - 2 \cdot fc$, height $H_{net} = ch - 2 \cdot fc$.
2. **Kinematic Specifications**:
   - **`sliding` (Puertas corredizas superpuestas)**:
     - 2 overlapping panels on double parallel tracks.
     - Central overlap width: $30$ mm ($15$ mm extra per leaf).
     - Individual leaf width: $dw = (cw - 2 \cdot fc) / 2 + 15$ mm.
     - Leaf height: $dh = ch - 2 \cdot fc$.
     - **Left panel**: starts at $x = cx + fc$, placed at $z = D$ (inner track).
     - **Right panel**: ends at $x = cx + cw - fc$, starting at $x = cx + cw - fc - dw$, placed at $z = D + t + 2$ (outer track). The $t + 2$ mm offset prevents Z-fighting in 3D and accurately models double sliding track clearance.
     - Both panels receive `side: 'sliding-inner'` / `'sliding-outer'`, vertical handles (`holeLayout: 'v'`), `kind: 'door-front'`, and `mat: 'door'`.
     - Hardware: increments sliding track kits: `hw.slidingTracks = (hw.slidingTracks || 0) + 1`.
   - **`bifold` (Puerta plegable / acordeón)**:
     - 2 articulated door leaves folding down the vertical seam.
     - Individual leaf width: $dw = (cw - 3 \cdot fc) / 2$ mm.
     - Leaf height: $dh = ch - 2 \cdot fc$.
     - Both leaves placed at $z = D$.
     - **Leaf 1 (`bifold-anchor`)**: positioned at $x = cx + fc$, anchored to the side carcass panel with standard hinges (`hw.hinges += hingesPer`).
     - **Leaf 2 (`bifold-fold`)**: positioned at $x = cx + 2 \cdot fc + dw$, articulated to Leaf 1 with central book hinges (`hw.bifoldHinges = (hw.bifoldHinges || 0) + (ch > 1200 ? 3 : 2)`).
     - Guided by a top sliding carriage: `hw.bifoldGuides = (hw.bifoldGuides || 0) + 1`.
   - **`lift-up` (Puerta abatible hacia arriba)**:
     - 1 full-width horizontal flap panel.
     - Width: $dw = cw - 2 \cdot fc$, height: $dh = ch - 2 \cdot fc$.
     - Placed at $z = D + 1$ (1 mm clearance in front of the carcass).
     - Top hinged with standard hinges: `hw.hinges += 2`.
     - Assisted by pneumatic gas struts: `hw.gasStruts = (hw.gasStruts || 0) + 2` (2 gas struts per door).
     - Handle is oriented horizontally along the lower margin: `holeLayout: 'h'`, `side: 'lift-up'`.

### 2.4 Panel Classification, Role Mapping & Cutlist IDs
1. **From Observation 1.4**:
   - `buildCutlist()` derives role via `const role = ROLE[p.name] || p.name;`.
   - Line 315 calculates unit price via `s[PRICE_KEY[p.mat]]`.
   - Sequential ID numbering assigns prefix from `ROLE_PREFIX[r.role]`.
2. **Inference**:
   - To ensure panels with `mat: 'door'` calculate proper pricing ($70/m²), `PRICE_KEY` must include `door: 'priceFront'` and `'door-front': 'priceFront'`.
   - To ensure panels receive role `'door-front'` and cutlist ID prefix `'O'` (e.g. `O1`, `O2`), `ROLE` must map:
     - `'Puerta': 'door-front'`
     - `'Puerta corrediza': 'door-front'`
     - `'Puerta plegable': 'door-front'`
     - `'Puerta abatible arriba': 'door-front'`
     - `'door-front': 'door-front'`
   - And `buildCutlist` should look up: `const role = ROLE[p.name] || ROLE[p.kind] || p.name;`.
   - This guarantees that every door panel receives:
     - `role: 'door-front'`
     - ID starting with `'O'` (`O1`, `O2`, etc.)
     - Correct square meter pricing ($70/m²)
     - Standard woodworking bounding box dimensions ($L \ge W \ge T \ge 3$ mm).

### 2.5 Cutlist Hardware Calculation & Invariants
1. **From Observation 1.4**: `hw` collects hardware counts during layout traversal.
2. **Hardware additions to `cl.hardware`**:
   - If `hw.slidingTracks > 0`: `name: 'Kit corredizo (rieles y carros)'`, `qty: hw.slidingTracks`, `unitPrice: s.slidingTrackPrice || 28`, `total: qty * unitPrice`.
   - If `hw.bifoldHinges > 0`: `name: 'Bisagra de libro para puerta plegable'`, `qty: hw.bifoldHinges`, `unitPrice: s.bifoldHingePrice || 4`, `total: qty * unitPrice`.
   - If `hw.bifoldGuides > 0`: `name: 'Guía superior para puerta plegable'`, `qty: hw.bifoldGuides`, `unitPrice: s.bifoldGuidePrice || 8`, `total: qty * unitPrice`.
   - If `hw.gasStruts > 0`: `name: 'Pistón a gas para puerta abatible'`, `qty: hw.gasStruts`, `unitPrice: s.gasStrutPrice || 6`, `total: qty * unitPrice`.
3. **Invariants**:
   - `hardwareTotal` = sum of all hardware items.
   - `cl.total = cl.panelsTotal + cl.hardwareTotal` holds strictly with zero delta.
   - All items have non-empty name, positive quantity, non-negative unit price, and non-negative total.

---

## 3. Caveats

1. **Existing Test Expectations for Swinging Doors (`name === 'Puerta'`)**:
   Existing tests in `test/layout.test.js`, `test/dashboard_and_doors.test.js`, and `test/cutlist_stress_adversarial.test.js` filter for swinging doors using `p.name === 'Puerta'`. Therefore, swinging doors (`doors`, `left-door`, `right-door`) MUST maintain `name: 'Puerta'`. The new door types receive descriptive names: `'Puerta corrediza'`, `'Puerta plegable'`, `'Puerta abatible arriba'`, all of which map to `role: 'door-front'` in `ROLE`.
2. **2D Canvas and 3D Viewer Compatibility with `kind: 'door-front'`**:
   - In `public/js/app.js` line 776, the 2D canvas checks `const isF = p.kind === 'front';`. If the implementer sets `p.kind = 'door-front'`, `app.js` should check `p.kind === 'front' || p.kind === 'door-front'`.
   - In `public/js/viewer.js` line 4, `COLORS` has `front: 0xe0a81c`. To ensure the 3D viewer displays the new doors with the standard gold/wood color and animates them properly, `viewer.js` should support `'door-front'` alongside `'front'`.
   - Alternatively, or additionally, in `layout.js` assigning `kind: 'door-front'` and providing `ROLE[p.kind]` ensures 100% adherence to the user request.
3. **Overlap Dimension in Sliding Doors**:
   The prompt specifies $w/2 + 15$ mm. With $cw - 2 \cdot fc$ as the net coverage, each panel is $(cw - 2 \cdot fc)/2 + 15$ mm. This creates an exact $30$ mm central overlap, which is the standard woodworking dimension for 2-door wardrobe sliding systems.
4. **Read-Only Investigation Compliance**:
   No source code files were modified during this investigation. All proposals are presented below as explicit drop-in code blueprints for the implementer agent.

---

## 4. Conclusion & Actionable Implementation Plan

The plan for `public/js/layout.js` is divided into 4 exact code sections:

### 4.1 Changes to `DEFAULTS`, `SETTING_META`, `FRONTS`, and `LABELS`
In `public/js/layout.js`:

```javascript
// ============================================================================
// 1. DEFAULTS (lines 23-37)
// ============================================================================
  // Precios
  currency: '$',
  priceCarcass: 40, // por m² (laterales, divisiones, tapas)
  priceFront: 70, // por m² (puertas y frentes de gaveta)
  priceBack: 20, // por m² (fondo)
  priceDrawer: 30, // por m² (caja de gaveta)
  pricePullBar: 4, // por manilla de barra
  pricePullKnob: 2, // por pomo
  pricePullProfile: 8, // por perfil/gola
  priceRail: 6, // por metro de barra de perchero
  priceRailBracket: 1.5, // por soporte de barra
  slidePrice: 12, // por par de correderas
  hingePrice: 2, // por bisagra
  slidingTrackPrice: 28, // por juego de rieles y carros
  bifoldHingePrice: 4, // por bisagra de libro para puerta plegable
  bifoldGuidePrice: 8, // por guía corrediza superior para puerta plegable
  gasStrutPrice: 6, // por pistón amortiguador a gas
};

// ============================================================================
// 2. SETTING_META (lines 75-81)
// ============================================================================
  ['slidePrice', 'Precio corredera (par)', '/par', ''],
  ['hingePrice', 'Precio bisagra', '/u', ''],
  ['slidingTrackPrice', 'Precio kit corredizo', '/juego', 'Rieles y carros para puertas corredizas'],
  ['bifoldHingePrice', 'Precio bisagra plegable', '/u', 'Bisagras articuladas para puertas acordeón'],
  ['bifoldGuidePrice', 'Precio guía plegable', '/u', 'Guía y carro superior para puerta plegable'],
  ['gasStrutPrice', 'Precio pistón a gas', '/u', 'Pistones amortiguadores para puertas abatibles'],
];

// ============================================================================
// 3. FRONTS & LABELS (lines 82-97)
// ============================================================================
export const FRONTS = ['none', 'doors', 'left-door', 'right-door', 'sliding', 'bifold', 'lift-up'];
export const LABELS = {
  multiple: 'Contenedor (varios módulos)',
  shelf: 'Abierto / estante',
  rail: 'Perchero',
  drawer: 'Gaveta',
  none: 'Sin puertas',
  doors: 'Dos puertas',
  'left-door': 'Puerta (bisagra izquierda)',
  'right-door': 'Puerta (bisagra derecha)',
  sliding: 'Puertas corredizas (con riel)',
  bifold: 'Puerta plegable / acordeón',
  'lift-up': 'Puerta abatible hacia arriba (pistón a gas)',
  default: 'Por defecto del proyecto',
};
```

---

### 4.2 Changes to `hw` initialization and `doorOverlay()`
In `public/js/layout.js`, lines 115 and 145–165:

```javascript
// ============================================================================
// 4. hw initialization inside computeLayout() (line 115)
// ============================================================================
  const hw = {
    slides: 0,
    hinges: 0,
    pulls: {},
    rails: 0,
    brackets: 0,
    slidingTracks: 0, // Kit de rieles y carros para puertas corredizas
    bifoldHinges: 0,  // Bisagras de libro para unión central plegable
    bifoldGuides: 0,  // Guías corredizas superiores plegables
    gasStruts: 0,     // Pistones amortiguadores a gas
  };

// ============================================================================
// 5. doorOverlay() inside computeLayout() (lines 145-175)
// ============================================================================
  const doorOverlay = (n, cx0, cy0, w, h, col) => {
    const cx = cx0 - t / 2;
    const cy = cy0 - t / 2;
    const cw = w + t;
    const ch = h + t;
    const fc = s.frontClearance;
    const style = pullOf(n);
    const holes = PULLS[style].holes;
    const hingesPer = ch > 1800 ? 4 : ch > 1000 ? 3 : 2;

    const door = (name, px, py, dw, dh, side, holeLayout = 'v', zOffset = 0) => {
      add({
        name,
        mat: 'door',
        kind: 'door-front',
        x: px,
        y: py,
        z: D + zOffset,
        sx: dw,
        sy: dh,
        sz: t,
        holes,
        pull: style,
        holeLayout,
        col,
        nodeId: n.id,
        side,
      });
      countPull(style);
    };

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
    } else if (n.front === 'sliding') {
      const dw = (cw - 2 * fc) / 2 + 15;
      const dh = ch - 2 * fc;
      // Puerta corrediza izquierda (carril interno en z = D)
      door('Puerta corrediza', cx + fc, cy + fc, dw, dh, 'sliding-inner', 'v', 0);
      // Puerta corrediza derecha (carril externo en z = D + t + 2)
      door('Puerta corrediza', cx + cw - fc - dw, cy + fc, dw, dh, 'sliding-outer', 'v', t + 2);
      hw.slidingTracks = (hw.slidingTracks || 0) + 1;
    } else if (n.front === 'bifold') {
      const dw = (cw - 3 * fc) / 2;
      const dh = ch - 2 * fc;
      // Hoja anclada al lateral del mueble
      door('Puerta plegable', cx + fc, cy + fc, dw, dh, 'bifold-anchor');
      // Hoja plegable central
      door('Puerta plegable', cx + 2 * fc + dw, cy + fc, dw, dh, 'bifold-fold');
      hw.hinges += hingesPer;
      hw.bifoldHinges = (hw.bifoldHinges || 0) + (ch > 1200 ? 3 : 2);
      hw.bifoldGuides = (hw.bifoldGuides || 0) + 1;
    } else if (n.front === 'lift-up') {
      const dw = cw - 2 * fc;
      const dh = ch - 2 * fc;
      // Puerta abatible superior en z = D + 1 con manilla horizontal inferior
      door('Puerta abatible arriba', cx + fc, cy + fc, dw, dh, 'lift-up', 'h', 1);
      hw.hinges += 2;
      hw.gasStruts = (hw.gasStruts || 0) + 2;
    }
  };
```

---

### 4.3 Changes to `PRICE_KEY`, `ROLE`, and `buildCutlist()`
In `public/js/layout.js`, lines 268–282 and lines 345–351:

```javascript
// ============================================================================
// 6. PRICE_KEY & ROLE (lines 268-282)
// ============================================================================
const PRICE_KEY = {
  carcass: 'priceCarcass',
  front: 'priceFront',
  door: 'priceFront',
  'door-front': 'priceFront',
  back: 'priceBack',
  drawer: 'priceDrawer',
};

const ROLE = {
  Lateral: 'vertical-side',
  'División vertical': 'vertical-side',
  'Tapa superior': 'horizontal-deck',
  Base: 'horizontal-deck',
  'Estante / división': 'horizontal-deck',
  Fondo: 'back-panel',
  Puerta: 'door-front',
  'Puerta corrediza': 'door-front',
  'Puerta plegable': 'door-front',
  'Puerta abatible arriba': 'door-front',
  'door-front': 'door-front',
  'Frente de gaveta': 'drawer-front',
  'Lateral de gaveta': 'drawer-side',
  'Frente/trasera de gaveta': 'drawer-back',
  'Fondo de gaveta': 'drawer-bottom',
};

// ============================================================================
// 7. In buildCutlist() role resolution (line 306)
// ============================================================================
    const role = ROLE[p.name] || ROLE[p.kind] || p.name;

// ============================================================================
// 8. In buildCutlist() hardware itemization (lines 345-365)
// ============================================================================
  if (hw.slides) hardware.push({ name: 'Corredera (par)', qty: hw.slides, unitPrice: s.slidePrice, total: hw.slides * s.slidePrice });
  if (hw.hinges) hardware.push({ name: 'Bisagra', qty: hw.hinges, unitPrice: s.hingePrice, total: hw.hinges * s.hingePrice });
  if (hw.slidingTracks) {
    const unitPrice = s.slidingTrackPrice ?? 28;
    hardware.push({
      name: 'Kit corredizo (rieles y carros)',
      qty: hw.slidingTracks,
      unitPrice,
      total: hw.slidingTracks * unitPrice,
    });
  }
  if (hw.bifoldHinges) {
    const unitPrice = s.bifoldHingePrice ?? 4;
    hardware.push({
      name: 'Bisagra de libro para puerta plegable',
      qty: hw.bifoldHinges,
      unitPrice,
      total: hw.bifoldHinges * unitPrice,
    });
  }
  if (hw.bifoldGuides) {
    const unitPrice = s.bifoldGuidePrice ?? 8;
    hardware.push({
      name: 'Guía superior para puerta plegable',
      qty: hw.bifoldGuides,
      unitPrice,
      total: hw.bifoldGuides * unitPrice,
    });
  }
  if (hw.gasStruts) {
    const unitPrice = s.gasStrutPrice ?? 6;
    hardware.push({
      name: 'Pistón a gas para puerta abatible',
      qty: hw.gasStruts,
      unitPrice,
      total: hw.gasStruts * unitPrice,
    });
  }
```

---

### 4.4 Cross-Module Companion Updates (for implementer coordination)
To ensure seamless visual integration across 2D canvas and 3D viewer:
1. **`public/js/app.js` (line 776)**:
   Change: `const isF = p.kind === 'front' || p.kind === 'door-front';`
   This ensures the 2D canvas paints the door panels with the gold fill (`#ffb800`) and displays handle hole dots correctly.
2. **`public/js/viewer.js` (lines 4, 75, 90)**:
   Add `'door-front': 0xe0a81c` to `COLORS`.
   Update hide/explode checks: `p.kind === 'front' || p.kind === 'door-front'`.

---

## 5. Verification Method

Once implemented, the changes must be verified using the following automated test suite and criteria:

### 5.1 Verification Test Command
```powershell
node --test test/cutlist_stress_adversarial.test.js
node --test test/cutlist_print.test.js
node --test test/dashboard_and_doors.test.js
```

### 5.2 Specific Automated Test Suite Blueprint (`test/expanded_doors_cutlist.test.js`)
Create a new test file `test/expanded_doors_cutlist.test.js`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, DEFAULTS, FRONTS, LABELS } from '../public/js/layout.js';

test('M3.1: FRONTS and LABELS expansion contains sliding, bifold, and lift-up', () => {
  assert.ok(FRONTS.includes('sliding'));
  assert.ok(FRONTS.includes('bifold'));
  assert.ok(FRONTS.includes('lift-up'));
  assert.equal(LABELS.sliding, 'Puertas corredizas (con riel)');
  assert.equal(LABELS.bifold, 'Puerta plegable / acordeón');
  assert.equal(LABELS['lift-up'], 'Puerta abatible hacia arriba (pistón a gas)');
});

test('M3.2: DEFAULTS contains all 4 new hardware prices', () => {
  assert.equal(DEFAULTS.slidingTrackPrice, 28);
  assert.equal(DEFAULTS.bifoldHingePrice, 4);
  assert.equal(DEFAULTS.bifoldGuidePrice, 8);
  assert.equal(DEFAULTS.gasStrutPrice, 6);
});

test('M3.3: Sliding door produces 2 offset panels and kit corredizo in cutlist', () => {
  const p = {
    settings: { ...DEFAULTS },
    columns: [{ id: 'c1', width: 1000, root: { id: 'm1', type: 'shelf', size: 1, front: 'sliding' } }]
  };
  const l = computeLayout(p);
  const slidingPanels = l.pieces.filter((pc) => pc.kind === 'door-front' || pc.name === 'Puerta corrediza');
  assert.equal(slidingPanels.length, 2);
  
  const inner = slidingPanels.find((pc) => pc.side === 'sliding-inner');
  const outer = slidingPanels.find((pc) => pc.side === 'sliding-outer');
  assert.ok(inner && outer);
  assert.equal(inner.z, DEFAULTS.depth);
  assert.equal(outer.z, DEFAULTS.depth + DEFAULTS.thickness + 2);
  assert.equal(inner.sx, (1000 + DEFAULTS.thickness - 2 * DEFAULTS.frontClearance) / 2 + 15);
  assert.equal(outer.sx, inner.sx);

  const hwTrack = l.cutlist.hardware.find((h) => h.name.includes('Kit corredizo'));
  assert.ok(hwTrack);
  assert.equal(hwTrack.qty, 1);
  assert.equal(hwTrack.unitPrice, 28);
  assert.equal(hwTrack.total, 28);

  // Cutlist rows prefix 'O'
  const cutlistRows = l.cutlist.rows.filter((r) => r.role === 'door-front');
  assert.ok(cutlistRows.length >= 1);
  assert.ok(cutlistRows.every((r) => r.id.startsWith('O')));
});

test('M3.4: Bifold door produces 2 articulated leaves, book hinges, guide, and carcass hinges', () => {
  const p = {
    settings: { ...DEFAULTS },
    columns: [{ id: 'c1', width: 800, root: { id: 'm1', type: 'shelf', size: 1, front: 'bifold' } }]
  };
  const l = computeLayout(p);
  const leaves = l.pieces.filter((pc) => pc.kind === 'door-front' || pc.name === 'Puerta plegable');
  assert.equal(leaves.length, 2);

  const anchor = leaves.find((pc) => pc.side === 'bifold-anchor');
  const fold = leaves.find((pc) => pc.side === 'bifold-fold');
  assert.ok(anchor && fold);

  const hwBookHinges = l.cutlist.hardware.find((h) => h.name.includes('Bisagra de libro'));
  const hwGuide = l.cutlist.hardware.find((h) => h.name.includes('Guía superior'));
  assert.ok(hwBookHinges && hwBookHinges.qty >= 2);
  assert.ok(hwGuide && hwGuide.qty === 1);
});

test('M3.5: Lift-up door produces 1 flap panel at z = D + 1 with exactly 2 gas struts', () => {
  const p = {
    settings: { ...DEFAULTS },
    columns: [{ id: 'c1', width: 800, root: { id: 'm1', type: 'shelf', size: 1, front: 'lift-up' } }]
  };
  const l = computeLayout(p);
  const flap = l.pieces.find((pc) => pc.side === 'lift-up');
  assert.ok(flap);
  assert.equal(flap.z, DEFAULTS.depth + 1);
  assert.equal(flap.holeLayout, 'h');

  const hwGas = l.cutlist.hardware.find((h) => h.name.includes('Pistón a gas'));
  assert.ok(hwGas);
  assert.equal(hwGas.qty, 2);
  assert.equal(hwGas.unitPrice, 6);
  assert.equal(hwGas.total, 12);
});

test('M3.6: Arithmetic identity panelsTotal + hardwareTotal === total holds for all door types', () => {
  ['sliding', 'bifold', 'lift-up'].forEach((front) => {
    const p = {
      settings: { ...DEFAULTS },
      columns: [{ id: 'c1', width: 800, root: { id: 'm1', type: 'shelf', size: 1, front } }]
    };
    const l = computeLayout(p);
    const delta = Math.abs(l.cutlist.panelsTotal + l.cutlist.hardwareTotal - l.cutlist.total);
    assert.ok(delta < 1e-9, `Identity violated for ${front}: delta=${delta}`);
  });
});
```

### 5.3 Invalidation Conditions
The implementation plan is invalidated if:
1. `cl.hardwareTotal + cl.panelsTotal !== cl.total` in IEEE-754 precision.
2. Door panels in cutlist fail to receive ID prefix `'O'` or role `'door-front'`.
3. Overlap in sliding doors does not equal $30$ mm ($15$ mm per leaf).
4. Gas struts count is not exactly 2 per lift-up door.
5. `npm test` or existing test suites fail due to broken backwards compatibility.
