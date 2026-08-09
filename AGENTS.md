# Hair Mesh Web repository instructions

## Start here

- For feature work, debugging, review, or architecture changes, use the repository skill `$hair-mesh-web-development` from `.agents/skills/hair-mesh-web-development/SKILL.md`.
- Read `doc/CODEX_INDEX.md`, then load only the feature document routed by that index.
- Treat source code as truth. Use documented symbols as search anchors; do not rely on line numbers.

## Repository contracts

- Run the app through `python3 launch_server.py`; do not assume direct `file://` loading works.
- Keep DOM-free calculations and policies in `src/`; keep Three.js scene wiring and DOM event composition in `curve_mesh_hair_tool_v4.html` until deliberately modularized.
- Preserve project-file compatibility, Undo/Redo transactions, local recovery, hidden/locked edit protection, mesh-budget clamps, and GPU disposal.
- When a serialized field changes, update every create/clone/capture/restore path and add a round-trip test.
- Do not claim FBX compatibility without importing the result in the target DCC; the exporter is experimental.

## Required verification

- Run `npm run check` for every JavaScript or state-contract change.
- Run `git diff --check` for all changes.
- For runtime/UI changes, start the server and test the affected browser flow; use `?selftest=1` when relevant.
- For Viewport pointer/gizmo/Proxy changes, run `npm run test:viewport`. Do not couple `Axis Lines` to standard TransformControls visibility, remove FFD/Edit click-through Scene picking, or drop Proxy `W` surface drag without an explicit contract change. Every selected FFD control must receive the yellow selected appearance after click, Ctrl/Alt, Region, direct drag, and restore; `Edit Control Points` must remain a true enter/exit toggle that hides the lattice on exit.
- Viewport context-menu items must call the same owning command used by the panel/shortcut. Do not mutate Proxy/Curve data in a menu-only path or allow RMB to cancel a Line draft.
- Edit-locked Curve/Proxy roots must stay out of every Viewport object-picking list, including LMB, RMB, direct drag, and Edit/FFD click-through. Keep Scene Explorer selection available so users can inspect and unlock them.
- No active Curve or Proxy is a valid state. Empty LMB in Select/Object or root Transform mode and deletion of a singly selected root must clear Scene highlighting, sub-control sets, Modify context, lattice, and gizmo without selecting the first remaining object. Keep edit/FFD empty clicks scoped to sub-control deselection.
- Curve Point Move, Rotate, and Scale must all use the complete selected Anchor set and its shared center. Keep Section transforms and individual Bézier Handle edits scoped to the active Point.
- Curve Soft Selection is a derived Along-Curve influence, not membership in `selectedPointIndices`. Keep hard-selected Anchors at weight 1 and as the shared pivot, freeze affected indices/weights for each Move/Rotate/Scale drag, preserve yellow for hard selection, and keep Section/Handle tools hard-selection-only.
- ViewCube rendering must remain independent from the main renderer's pointer routes. Keep inverse-camera orientation live; a short click snaps, while LMB drag enters a free view without changing the current projection, orbit target, object selection, or History. Six face snaps honor Ortho Views; edge/corner snaps and Home use Perspective. Keep the root selection badge visually separate at the viewport bottom-right, and convey keyboard focus with the direction label instead of a canvas border.
- Preserve the 3ds Max POV keyboard contract outside typing fields: direct `T/B/F/L/P/U`, plus `V` opening the Viewport Views menu where `K` selects Back. `P` and `U` change projection without resetting the viewing angle; ViewCube Home is the explicit home-direction reset. Route all menu clicks and keys through `applyViewportView()` and test them in `tests/viewport-regression.mjs`.
- Update `doc/CODEX_INDEX.md` or its routed feature document when ownership, symbols, invariants, or validation paths change.
