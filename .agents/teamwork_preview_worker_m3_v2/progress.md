# Progress Log

Last visited: 2026-10-23T02:20:45Z

## Status
Completed:
1. `public/js/layout.js`: Expanded FRONTS (7 options), LABELS, DEFAULTS (slidingTrackPrice, bifoldHingePrice, bifoldGuidePrice, gasStrutPrice), SETTING_META, doorOverlay geometry/kinematics for sliding, bifold, lift-up, and buildCutlist hardware itemization.
2. `public/js/model.js`: Added duplicateModule helper, verified normalizeProject compatibility.
3. `public/js/app.js`: Exported VALID_NEW_TYPES, FRONT_OPTIONS, updated 2D SVG canvas check, replaced drawDock() with 2-Tier Control Architecture with frontSelect, dupMod, clearSel bindings.
4. `public/style.css`: Appended 2-Tier dock layout classes (.dock-tier-primary, .dock-tier-actions, .dock-grid-2, .input-with-unit, .dock-subdiv-group, .btn-subdiv, .tier-2-actions, .btn-tier2).

In Progress:
5. `test/dashboard_and_doors.test.js`: Writing extensive automated test suite covering all door geometry, kinematics, cutlist hardware, duplication, and dock types.
