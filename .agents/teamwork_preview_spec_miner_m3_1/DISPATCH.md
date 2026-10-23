## 2026-10-22T21:15:03Z

<USER_REQUEST>
You are teamwork_preview_spec_miner_m3_1.
Your dedicated working directory is:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_spec_miner_m3_1

MANDATORY FIRST STEP:
Read the authoritative user request and acceptance criteria in:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md
Also read the project architecture in:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\PROJECT.md
Also read Survey 3 handoff in:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_spec_miner_survey_3\handoff.md

Your Task:
Formulate the exact specification and CSS rules for Milestone 3 (R3 Tabular-Only Print View) in `public/style.css`:
1. Inspect `public/style.css` (current `@media print` rules).
2. Detail the exact `@media print` rules needed:
   - `@page { margin: 12mm 15mm; size: auto; }`
   - Complete hiding of UI chrome: `#canvas`, `#designPane`, `.topbar`, `.dock`, `.btns`, `.rtools`, `.cards`, `.vwr`, `.tabs`, `.btn`, `button`, `.muted` styling adjustments.
   - Force `#cutlist` to `display: block !important; overflow: visible !important; height: auto !important; position: static !important; width: 100% !important;`.
   - Force high-contrast print typography: white background (`#ffffff !important`), pure black text (`#000000 !important`), clean border lines (`#cccccc !important` or `#000000`), no dark mode leaks.
   - Page-break controls: `tr { page-break-inside: avoid; }`, `thead { display: table-header-group; }`.
3. Provide the exact CSS code block to be inserted.
4. Write your comprehensive report to:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_spec_miner_m3_1\handoff.md
Update your progress.md before finishing, and notify me with your completion message via send_message.
</USER_REQUEST>
