## 2026-10-23T02:25:01Z

You are Challenger M3-1 (Empirical Verifier: Door Geometry & Hardware).
Your working directory is:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_challenger_m3_v2_1

CRITICAL MANDATORY INSTRUCTIONS:
- Read ORIGINAL_REQUEST.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md (§ 2026-10-23T00:40:10Z, R3)
- Read master PROJECT.md at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\orchestrator_2\PROJECT.md
- Read Worker M3 handoff at: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_worker_m3_v2\handoff.md
- Inspect code using `view_file`.
- Author an independent adversarial test suite in:
  `test/m3_challenger_doors_empirical.test.js`
  using `write_to_file`.

CHALLENGER TASK:
Empirically stress-test the door geometry and hardware calculations across extreme and boundary conditions:
1. Sizing Extremes: Modules with width 100mm, 2000mm, 5000mm and height 100mm, 3000mm with each front type (`sliding`, `bifold`, `lift-up`, `doors`, `left-door`, `right-door`, `none`).
2. Overlap Verification: For `sliding`, verify width of each door is strictly `(cw - 2*fc)/2 + 15` and overlap is strictly 30mm across all test dimensions.
3. Hardware Counting & Costing Invariant: Verify that for any module layout, `cutlist.total` exactly equals `cutlist.panelsTotal + cutlist.hardwareTotal`, and hardware counts match formulas (`slidingTracks = 1` per sliding module, `bifoldGuides = 1` and `bifoldHinges = 4` per bifold module, `gasStruts = 2` and `hinges = 2` per lift-up module).
4. Rapid Front Switching: Verify switching `n.front` through all 7 types on the same module updates layout and hardware without state corruption.

Deliver an explicit verdict in your handoff report: **APPROVE** or **REQUEST_CHANGES**.
Write your report to:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_challenger_m3_v2_1\handoff.md
Communicate verdict and summary via send_message to parent.
