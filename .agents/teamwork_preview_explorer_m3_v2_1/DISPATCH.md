## 2026-10-23T01:58:33Z

<USER_REQUEST>
You are Explorer M3-1 (Expanded Door Types & Cutlist Hardware Calculation).
Your working directory is:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m3_v2_1

CRITICAL MANDATORY INSTRUCTIONS:
- Read ORIGINAL_REQUEST.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md (§ 2026-10-23T00:40:10Z, R3)
- Read master PROJECT.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\orchestrator_2\PROJECT.md
- Read Survey 2 handoff at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_survey_2\handoff.md (§ 4.4)

CRITICAL INSTRUCTION:
DO NOT RUN ANY TERMINAL COMMANDS (do not call run_command). Inspect files exclusively using view_file.

TASK:
Examine `public/js/layout.js` and determine the exact, production-ready implementation plan for:
1. `FRONTS` and `LABELS` expansion:
   - Add `'sliding'`, `'bifold'`, `'lift-up'` to `FRONTS`.
   - Update `LABELS` with human-readable descriptions in Spanish:
     - `sliding`: 'Puertas corredizas (con riel)'
     - `bifold`: 'Puerta plegable / acordeón'
     - `lift-up`: 'Puerta abatible hacia arriba (pistón a gas)'
2. Hardware settings in `DEFAULTS` and `SETTING_META`:
   - `slidingTrackPrice: 28`
   - `bifoldHingePrice: 4`
   - `bifoldGuidePrice: 8`
   - `gasStrutPrice: 6`
3. 3D panel generation in `doorOverlay()` inside `computeLayout()`:
   - `sliding`: 2 overlapping door panels. Left panel at $z = D$, width $w/2 + 15$ mm. Right panel at $z = D + t + 2$, width $w/2 + 15$ mm.
   - `bifold`: 2 articulated door leaves ($w/2$ each). Leaf 1 (`bifold-anchor`) and Leaf 2 (`bifold-fold`).
   - `lift-up`: 1 horizontal flap door leaf ($w$ wide, $h$ high) at $z = D + 1$.
   - Ensure all panels receive `kind: 'door-front'`, `mat: 'door'`, and proper IDs for cutlist.
4. Cutlist hardware computation in `buildCutlist()`:
   - Count sliding tracks, bi-fold hinges (book hinges), bi-fold guides, and gas struts (2 per lift-up door).
   - Itemize each new hardware line item in `cl.hardware` with name, qty, unitPrice, total.
   - Update `cl.hardwareTotal` and overall `cl.total`.

Write a complete, structured 5-component report to:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m3_v2_1\handoff.md
DO NOT modify any source code files. You are an exploratory agent.
</USER_REQUEST>
