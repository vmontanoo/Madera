## 2026-10-23T07:07:17Z
You are Worker M3 (Stepped 3D Viewer & Kinematics Worker).
Working Directory: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_worker_m3_stepped
Project Root: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local
Parent Conversation ID: 20a52755-88ff-4e04-950c-4b4a3c054fe0

Files Owned Exclusively:
- public/js/viewer.js
- test/stepped_3d_viewer.test.js

Read Before Starting:
1. C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md (§ 2026-10-23T05:16:05Z).
2. C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\orchestrator_4\PROJECT.md.
3. M3 Survey Blueprint: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_stepped_survey_3\handoff.md.
4. Existing 3D viewer code: public/js/viewer.js and test/viewer_3d.test.js.
5. Layout export and tags: public/js/layout.js (specifically maxH, colHeights, and drawerIndex).

Tasks:
1. In `public/js/viewer.js`:
   - In `update(layout)`:
     Resolve `maxH`:
     `const maxH = layout.maxH || (layout.colHeights?.length ? Math.max(...layout.colHeights) : layout.settings.height);`
     `const H = maxH;`
     Ensure floor shadow, floor grid, and group positions are aligned to `maxH`:
     `const yBase = -(H * S) / 2;`
     `this.floorShadow.position.y = yBase;`
     `this.floorGrid.position.y = yBase + 0.0005;`
     `this.group.position.set(-cx * S, yBase, -(layout.settings.depth / 2) * S);`
   - In `resetCamera()`:
     Ensure camera target and orbit distance scale to `maxH`:
     `const maxH = this.layout?.maxH || (this.layout?.colHeights?.length ? Math.max(...this.layout.colHeights) : this.layout?.settings?.height || 1400);`
     `const H = maxH * S;`
     `const size = Math.max(W, H, D);`
   - In drawer group keying:
     Partition drawer pieces robustly using `drawerIndex`:
     `const key = p.drawerIndex !== undefined ? `${p.nodeId}_${p.drawerIndex}` : `${p.nodeId}_${Math.round(p.y / 15) * 15}`;`
   - In cascading drawer opening:
     Verify and ensure drawers open in graduated staircase formation:
     `const openRatio = N > 1 ? (0.75 - (idx / (N - 1)) * 0.40) : 0.65;`
     (Bottom drawer idx 0 opens to 75% depth, top drawer idx N-1 opens to 35% depth).
   - In outer-hinge door pivots:
     Verify double doors and single doors pivot around outer hinges and swing outward (-90° left, +90° right).
   - In explode mode:
     Ensure independent top caps (`Tapa superior`) explode upward with `+E_BASE * 0.8`.
2. Author `test/stepped_3d_viewer.test.js`:
   Create comprehensive unit and empirical tests verifying:
   - 3D piece generation for stepped layout with independent top caps at $H_i - t$ across distinct column heights.
   - Floor shadow and grid position scaling to `maxH`.
   - Camera target bounding box centered on `maxH`.
   - Cascading drawer opening ratios (75% bottom to 35% top) using `drawerIndex`.
   - Outer hinge swing door pivot calculations (-90° left, +90° right).
   - Explode mode offsets for independent top caps.
3. Run verification commands:
   - `node --test test/stepped_3d_viewer.test.js`
   - `node --test test/viewer_3d.test.js`
   - `node --test test/stepped_layout.test.js`
   - `node --test test/stepped_2d_editor.test.js`
