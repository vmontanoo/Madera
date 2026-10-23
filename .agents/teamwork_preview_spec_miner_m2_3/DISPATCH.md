# Dispatch: Spec Miner M2_3 - Full R2 Acceptance Criteria & Edge Cases

## Mission
Investigate and specify full R2 Acceptance Criteria and edge cases:
- AC 1: Cursor indicators (`ns-resize` / `ew-resize`) on all dividers and column/row borders.
- AC 2: Fluid redistribution between adjacent sections preserving proportions of the rest of the design; live 3D sync.
- Edge Case Resolution: Address the Challenger 2 finding regarding drawer sub-components (`bh = inner - drawerInset`) when dragging a drawer module to minimum dimensions (50mm); ensure `bh = Math.max(10, inner - s.drawerInset)`.
- Write your report to `.agents/teamwork_preview_spec_miner_m2_3/handoff.md`.

## 2026-10-22T20:20:18Z
You are teamwork_preview_spec_miner_m2_3.
Your dedicated working directory is:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_spec_miner_m2_3

MANDATORY FIRST STEP:
Read the authoritative user request and acceptance criteria in:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md
Also read the project architecture in:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\PROJECT.md
Also read your assignment in:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_spec_miner_m2_3\DISPATCH.md

Your Task:
Investigate full R2 Acceptance Criteria and edge cases:
1. AC 1: Cursor indicators (`ns-resize` / `ew-resize`) on all dividers and column/row borders; hover styles and body cursor locking.
2. AC 2: Fluid redistribution between adjacent sections preserving proportions of the rest of the design; live 3D sync.
3. Edge cases: Address the Challenger 2 finding regarding drawer sub-components (`bh = inner - drawerInset`) when dragging a drawer module to minimum dimensions (50mm); formulate fix `bh = Math.max(10, inner - s.drawerInset)` in `layout.js:187`.
4. Provide the complete specification and verification steps in:
C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_spec_miner_m2_3\handoff.md
Notify me when done.
