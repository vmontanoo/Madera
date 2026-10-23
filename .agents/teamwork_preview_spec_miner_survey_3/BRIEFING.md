# BRIEFING — 2026-10-22T19:38:46Z

## Mission
Investigate cutlist, materials, hardware, pricing, and print export systems in madera-local for R3 compliance.

## 🔒 My Identity
- Archetype: specification_miner
- Roles: Teamwork specialist
- Working directory: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\teamwork_preview_spec_miner_survey_3
- Original parent: 6ff36568-731c-48e7-b25c-de212f052b2a
- Milestone: survey

## 🔒 Key Constraints
- Read-only on implementation code — do NOT implement anything.
- Write only to dedicated agent directory (.agents/teamwork_preview_spec_miner_survey_3/).
- Follow 5-component handoff protocol + SPECIFICATION MINER table format.
- Probe all discovered features and edge cases thoroughly.

## Current Parent
- Conversation ID: 6ff36568-731c-48e7-b25c-de212f052b2a
- Updated: not yet

## Task Summary
- **What to build**: Specification discovery and survey for Cutlist, Hardware, Pricing, and Print Export (R3).
- **Success criteria**: Exhaustive probing of piece list generation, hardware/machining rules, pricing logic, existing print styling/DOM, and tabular layout changes needed.
- **Interface contracts**: ORIGINAL_REQUEST.md, DISPATCH.md
- **Code layout**: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local

## Key Decisions Made
- Dissected piece calculation pipeline in `layout.js` (computeLayout, orientationOf, buildCutlist).
- Identified data schema: dimensions (length, width, thickness in mm), orientation (vertical-xy, horizontal-xz, vertical-yz), roles (8 roles), ID prefixes (B, O, D, H, S), quantity grouping.
- Identified hardware catalog (slides, hinges, pulls, rail, brackets) and unit price mapping in settings.
- Identified machining ops (rail-cut, through-hole) and unpriced status.
- Pinpointed print view vulnerabilities: 2D canvas leaks when printing from design tab, unrendered cutlist if not switched to tab, low contrast yellow text on white paper, fixed-height/overflow:auto page clipping, and missing R3 columns (Largo x Ancho x Espesor in mm, explicit Rol/Nombre).
- Outlined precise tabular layout and CSS/DOM architectural changes required for R3.

## Artifact Index
- DISPATCH.md — Incoming assignment and dispatch instructions
- progress.md — Liveness heartbeat and step tracking
- BRIEFING.md — Situational awareness and state
- handoff.md — Comprehensive handoff report for orchestrator and downstream builders
