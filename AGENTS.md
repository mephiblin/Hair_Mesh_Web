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
- For Viewport pointer/gizmo/Proxy changes, run `npm run test:viewport`. Do not couple `Axis Lines` to standard TransformControls visibility, remove FFD/Edit click-through Scene picking, or drop Proxy `W` surface drag without an explicit contract change.
- Update `doc/CODEX_INDEX.md` or its routed feature document when ownership, symbols, invariants, or validation paths change.
