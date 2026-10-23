## 2026-10-23T02:33:25Z

<USER_REQUEST>
You are Explorer M4-2 (3D Visual Themes, Soft Shadows & ViewHelper 3D Orientation Gizmo).
Your working directory is:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m4_v2_2

CRITICAL MANDATORY INSTRUCTIONS:
- Read ORIGINAL_REQUEST.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md (§ 2026-10-23T00:40:10Z, R4)
- Read master PROJECT.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\orchestrator_2\PROJECT.md
- Inspect code using `view_file`. DO NOT run interactive commands.

TASK:
Examine `public/js/viewer.js`, `public/index.html`, and `public/style.css`:
1. Visual Themes:
   - Realistic Wood (`realistic`): Warm wood palette (`#d4a373` / `#c89666` or canvas-generated grain texture), soft warm lighting, neutral ground plane.
   - Negro Carbón / Cyberpunk (`neon`): Deep matte charcoal black melamine (`#18181b` / `#121214`), sharp neon orange edge highlights (`#ff6600` / `#ff5500` using `THREE.LineSegments` + `THREE.EdgesGeometry` on piece meshes), dark background (`#09090b`), and dotted/grid floor.
   - Seamless runtime theme toggle function: `viewer.setVisualTheme(theme)`.
2. Real-Time Soft Shadows (PCFSoftShadowMap):
   - Renderer configuration: `renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;`.
   - Directional light tuning: `castShadow = true`, `shadow.mapSize.width = 2048`, `shadow.mapSize.height = 2048`, `shadow.camera.near = 0.5`, `shadow.camera.far = 5000`, `shadow.bias = -0.0005`, `shadow.normalBias = 0.02`.
   - Piece meshes: `castShadow = true; receiveShadow = true;`.
   - Floor plane: shadow receiver with clean soft falloff.
3. Interactive 3D Orientation Gizmo (`ViewHelper`):
   - Three.js `ViewHelper` integration rendered via secondary viewport / auto-clearing render pass in bottom-right corner ($128 \times 128$ px).
   - Interactive mouse/pointer hit-testing on orientation axes: clicking X, Y, Z or Top, Front, Side, Iso transitions camera smoothly to orthogonal view.
   - Continuous synchronization with main camera `OrbitControls`.
4. Viewer Top Toolbar UI:
   - Floating ergonomic toolbar overlay on the 3D canvas with toggle buttons for:
     - Render Modes: `Normal` | `Puertas abiertas` | `Despiece`
     - Themes: `Madera realista` | `Negro carbón`
     - View Reset: `Enfocar` / `Restablecer cámara`
   - Clean CSS styles in `public/style.css`.

Write your report to:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m4_v2_2\handoff.md
Communicate results via send_message to parent with summary and key findings.
</USER_REQUEST>
