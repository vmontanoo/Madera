# Execution Plan — Madera Local Professional Evolution

## Context & Objectives
Evolve the local Madera replica from its current modular core to a comprehensive professional-grade application fulfilling requirements R1 through R4 from `ORIGINAL_REQUEST.md § 2026-10-23T00:40:10Z`:
1. **R1**: Modern Authentication & SQLite Session Persistence (Registration, Login, Google Sign-In / OAuth simulated, sessions, SQLite storage).
2. **R2**: Main Dashboard (Pre-designed Demos: closet, nightstand, TV entertainment center, base kitchen module; Projects tab with create/duplicate/rename/delete; JSON import/new).
3. **R3**: UI Control Cleanup & Expanded Door Catalog (sliding doors, bi-fold doors, lift-up flap doors with gas springs; hardware calculation & cutlist breakdown).
4. **R4**: Advanced 3D Viewer (States: normal, open doors, explosion; Themes: color realistic vs charcoal black with neon orange edges and dotted floor grid; soft shadows; interactive 3D orientation gizmo).
5. **R5 / E2E**: Multi-tier E2E testing, adversarial verification, and forensic audit.

## Orchestration Strategy
- **Phase 0 (Survey)**: Dispatch 3 parallel Explorers to investigate current backend/server/db setup, current UI/state/model/cutlist mechanics, and current Three.js viewer implementation.
- **Phase 1 (Decomposition & Synthesis)**: Synthesize findings into updated `PROJECT.md` at project root with full architecture, feature inventory, milestones, and interface contracts.
- **Milestones Execution (Direct Iteration Loop)**:
  - For each milestone:
    1. Explorer(s) analyze gap and formulate exact patch strategy.
    2. Worker implements changes and executes verification tests.
    3. Reviewers (2) independently inspect code, UI, and test suites.
    4. Challengers (2) empirically verify corner cases, invariants, and stress behaviors.
    5. Forensic Auditor (1) runs integrity forensics (CLEAN vs VIOLATION).
    6. Gate check: All criteria must pass before advancing milestone.
- **Final Acceptance & Victory Report**: Full suite pass, parent notification.
