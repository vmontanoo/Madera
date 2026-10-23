# Orchestrator Execution Plan

## 1. Survey Phase
- Dispatch Survey Explorers to explore the existing `madera-local` codebase:
  - Project structure, build system, technologies (HTML, CSS, JS/TS, React/Vue/vanilla, 3D libraries like Three.js, etc.).
  - Existing state management, grid/module model, undo/redo system.
  - 2D canvas interaction mechanisms (drag, resize, events).
  - Cutlist / materials calculation and print/export mechanisms.
- Aggregate survey findings into `PROJECT.md`.

## 2. Milestone Decomposition
- **Milestone 1: Exterior Modules (R1)**
  - Implement top/side `+` buttons to add exterior modules.
  - Expand furniture dimensions without shrinking existing modules.
  - Enable instant drag calibration on newly added modules.
- **Milestone 2: Visual 2D Drag Resizing & Undo/Redo (R2)**
  - Reactive cursor styles (`ns-resize`, `ew-resize`) on dividers and cell borders.
  - Smooth drag redistribution between adjacent rows/cols/dividers preserving global scale.
  - Live 3D/2D sync and dimensions update.
  - Full Undo/Redo (`Ctrl+Z`, `Ctrl+Y`) capture after drag finish.
- **Milestone 3: Cutlist Tabular Print Optimization (R3)**
  - Clean tabular print layout (`window.print()` / PDF) with NO thumbnails or UI chrome.
  - Granular table breakdown: ID, role/name, orientation, dimensions (L x W x T), quantity, unit price, total price.
  - Complete hardware and machining breakdown.
  - Prominent project total price in header/footer.
- **Milestone 4: Testing & Verification**
  - E2E acceptance criteria verification.
  - Challenger adversarial testing.
  - Forensic Auditor integrity review.

## 3. Completion & Handover
- Verify all acceptance criteria checkboxes pass.
- Package handoff report.
- Issue victory claim to Sentinel.
