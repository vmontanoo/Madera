## 2026-10-23T06:16:13Z
You are Worker M2 (Stepped 2D Editor & Top Border Dragging Implementation).
Working Directory: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_worker_m2_stepped
Project Root: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local
Parent Conversation ID: 20a52755-88ff-4e04-950c-4b4a3c054fe0

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Files Owned Exclusively:
- public/js/app.js
- public/style.css
- test/stepped_2d_editor.test.js

Read Before Starting:
1. C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md (§ 2026-10-23T05:16:05Z).
2. C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\orchestrator_4\PROJECT.md.
3. C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_stepped_survey_2\handoff.md (detailed blueprint for app.js and drawCanvas).

Tasks:
1. In public/js/app.js:
   - In `drawCanvas()`:
     - Anchor coordinates to `maxH = layout.maxH || Math.max(...project.columns.map(c => c.height || s.height), s.height)` and `top = maxH + ov`.
     - Update SVG viewBox: `${-120} ${-110} ${layout.totalW + 240} ${maxH + 2 * ov + 200}`.
     - Ensure stepped silhouette rendering: each column's top cap line is rendered at its respective height $y = H_i - t$ (SVG $Y = \text{top} - H_i$).
     - Position top `(+)` buttons per column: for column i at cx = `colX + c.width / 2` and cy = `top - colHeights[i] - 50`, so the button floats 50mm directly above each column's top cap line.
     - Lateral `(+)` buttons: left at `cx = -70, cy = top - colHeights[0] / 2`; right at `cx = layout.totalW + 70, cy = top - colHeights[N-1] / 2`.
     - In plus click handler, clicking top (+) calls `M.addOnTop(state.project, g.dataset.col, state.newType, 350, false)` adding module only to that column.
   - In drag-handle event listener (`el.querySelectorAll('.drag-handle')`):
     - Add handler for `d.type === 'col-top'`:
       - Cursor set to `'ns-resize'`.
       - On mousemove: `curPt = getSvgCoords(moveEvt)`. Calculate delta: `deltaH = startPt.y - curPt.y` (mouse moving up increases height).
       - Target column: `col = state.project.columns[d.colIdx]`.
       - Safety clamp: `minH = Math.max(200, 2 * t + 50)`. `maxH = 4000`. `newH = Math.round(Math.min(maxH, Math.max(minH, startH + deltaH)))`.
       - Update: `col.height = newH`. Call `refresh()`.
       - On mouseup: if `hasMoved === true`, push `initialSnapshot` onto undo stack (`pushUndo(initialSnapshot)`) and save.
     - Ensure internal horizontal divider drag maintains $\ge 50$mm safety clearance and updates history cleanly.
2. In public/style.css:
   - Ensure `.drag-handle` hover/active styling supports `ns-resize` cursor.
3. Author test/stepped_2d_editor.test.js:
   - Test SVG generation with stepped columns (assert distinct `cy` for (+) buttons matching each column's height).
   - Test `col-top` divider handle generation and coordinates.
   - Test height delta calculation and bounds clamping ($H_{\min} \ge 200$, $H_{\max} \le 4000$).
   - Test undo stack capture on drag completion.
4. Run tests:
   - `node --test test/stepped_2d_editor.test.js`
   - `node --test test/stepped_layout.test.js`
   - `node --test test/m1_challenger_stepped_layout.test.js`
   - `node --test test/m1_challenger_add_on_top.test.js`
   Verify 100% pass rate.
5. Write handoff.md in your working directory and notify me via send_message.
