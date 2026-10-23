## 2026-10-23T01:58:33Z

<USER_REQUEST>
You are Explorer M3-2 (Dock UI Control Cleanup & Door Selector).
Your working directory is:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m3_v2_2

CRITICAL MANDATORY INSTRUCTIONS:
- Read ORIGINAL_REQUEST.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md (§ 2026-10-23T00:40:10Z, R3)
- Read master PROJECT.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\orchestrator_2\PROJECT.md
- Read Survey 2 handoff at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_survey_2\handoff.md (§ 4.3)

CRITICAL INSTRUCTION:
DO NOT RUN ANY TERMINAL COMMANDS (do not call run_command). Inspect files exclusively using view_file.

TASK:
Examine `public/js/app.js` (specifically `drawDock()` and event listeners) and `public/style.css`:
1. UI Control Cleanup:
   - Inspect the current dock panel rendered when a module/column is selected.
   - Identify redundant, duplicated, or obsolete buttons accumulated in prior iterations (e.g. redundant split/convert actions, duplicate door buttons).
   - Remove door entries from the `newType` dropdown (doors are not module classes like shelf/drawer/rail, they are fronts!).
   - Streamline controls into a clean, 2-tier layout:
     - Tier 1 (Primary / Geometry): Dimensions, module type, subdivision, front selector.
     - Tier 2 (Actions / Deletion): Duplicate, delete, clear.
2. Front Selector:
   - Dedicated front selector dropdown (`<select id="frontSelect">` or button group):
     - `none` ("Sin puertas / Abierto")
     - `doors` ("Dos puertas batientes")
     - `left-door` ("Puerta batiente izquierda")
     - `right-door` ("Puerta batiente derecha")
     - `sliding` ("Puertas corredizas con riel")
     - `bifold` ("Puerta plegable / acordeón")
     - `lift-up` ("Puerta abatible hacia arriba")
   - Synchronize with `n.front` in `state.project`, trigger `commit()`, and live `refresh()`.

Write a complete, structured 5-component report to:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m3_v2_2\handoff.md
DO NOT modify any source code files. You are an exploratory agent.
</USER_REQUEST>
