## 2026-10-22T21:15:03Z
You are teamwork_preview_explorer_m3_3.
Your dedicated working directory is:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m3_3

MANDATORY FIRST STEP:
Read the authoritative user request and acceptance criteria in:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md
Also read the project architecture in:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\PROJECT.md
Also read Survey 3 handoff in:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_spec_miner_survey_3\handoff.md

Your Task:
Design the automated unit and DOM test suite for Milestone 3 (R3 Tabular Cutlist Print View):
1. Inspect `test/layout.test.js` and `public/js/layout.js`.
2. Design automated unit tests in `test/layout.test.js` or dedicated test file `test/cutlist_print.test.js`:
   - Verify that `buildCutlist` returns all expected panel fields: `id`, `name`, `role`, `orientation`, `length`, `width`, `thickness`, `qty`, `unitPrice`, `total`.
   - Verify that hardware table contains correct itemization: `slides`, `hinges`, `pulls`, `rails`, `brackets` with unit prices and subtotals.
   - Verify that total calculations strictly satisfy: `panelsTotal + hardwareTotal === total`.
   - Verify that all dimensions in rows are exact millimeters (integers or 1 decimal place, e.g. 18mm, not 0.018m).
   - Verify that CSS `@media print` rules in `public/style.css` hide `#canvas`, `.dock`, `.cards`, `.vwr`, `.btns`, `.topbar`, and display `#cutlist`.
3. Provide the exact test code and assertions.
4. Write your report to:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_explorer_m3_3\handoff.md
Update your progress.md before finishing, and notify me with your completion message via send_message.
