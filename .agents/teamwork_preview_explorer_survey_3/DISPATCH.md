# Dispatch for Explorer Survey 3 (3D Viewer Pipeline, Render Modes, Visual Themes, Shadows & Gizmo)

Working directory: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_survey_3
Read ORIGINAL_REQUEST.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md
Specifically: Survey Three.js viewer architecture for R4 (Render modes: normal, open doors, explosion; Visual themes: color vs charcoal black + neon orange edges + dotted floor grid; soft shadows; interactive 3D orientation gizmo).
Write your findings to: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_survey_3\handoff.md

## 2026-10-23T00:45:12Z
You are Explorer Survey 3 (3D Viewer Pipeline, Render Modes, Visual Themes, Shadows & Gizmo).
Your working directory is:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_survey_3

CRITICAL MANDATORY INSTRUCTION:
Read the authoritative user request at:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md
Specifically section `## 2026-10-23T00:40:10Z` focusing on R4 (Advanced 3D Viewer: render modes, visual themes, soft shadows, and interactive orientation gizmo).

Investigate the current 3D viewer implementation:
- Check `public/js/viewer.js`, Three.js setup, scene graph, materials, lighting, shadow mapping, and camera controls.
- Determine what needs to be implemented for:
  1. Top toolbar inside the 3D viewer (similar to madera.app icon bar):
     - Visualization states / Render modes:
       a) Normal: closed furniture, no explosion.
       b) Puertas abiertas: animated / transformed open positions for doors and drawers.
       c) Despiece / Explosión: 3D exploded view with panels translated outward along their normal/axes.
  2. Visual Themes:
     - Theme 1: Color y textura (current realistic wood/melamine materials and lighting).
     - Theme 2: Charcoal black with neon orange edges and dotted floor grid (dark carbon background `#121214` / `#18181b`, dark panels, bright neon orange wireframe / edges `LineSegments` `#ff6600` / `#ff7700`, subtle dotted floor grid).
  3. Lighting & Soft Shadows:
     - Real-time soft shadows (`renderer.shadowMap.enabled = true`, `THREE.PCFSoftShadowMap`), directional shadow casting, shadow receiving ground plane and self-shadowing between components.
  4. Interactive 3D Orientation Gizmo:
     - 3D interactive widget in the bottom-right corner of the viewer canvas.
     - Synchronized rotation with main camera (showing X, Y, Z axes or orientation cube with clickable faces/axes for front, top, side views).
     - Smooth interaction and clean viewport integration.

Write a thorough, structured report to:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_survey_3\handoff.md
Update your progress.md and send a completion message with your findings.
DO NOT modify any source code files. You are an exploratory agent.
