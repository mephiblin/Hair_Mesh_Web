---
name: hair-mesh-web-development
description: Inspect, implement, debug, review, test, or document Hair Mesh Web features in this repository. Use for work involving curve creation/editing, Bézier handles, Proxy primitives and persistent FFD stacks, Three.js viewport interaction, MatCap/material/light/wireframe display, Ribbon/Tube/Brush mesh generation, project save/recovery/history, model import, OBJ/FBX export, UI controls, or modularization of curve_mesh_hair_tool_v4.html.
---

# Hair Mesh Web Development

Follow this workflow for repository changes. Keep discovery selective so unrelated feature documentation does not consume context.

## 1. Establish scope

1. Resolve the repository root with `git rev-parse --show-toplevel`.
2. Inspect `git status -sb`; preserve unrelated user changes.
3. Read `doc/CODEX_INDEX.md` completely.
4. Classify the request using its task router and read only the routed `doc/features/*.md` files.
5. For product priority or known limitations, additionally read `docs/product-audit/recursive-audit.md` only when needed.

## 2. Locate source truth

- Search documented symbols with `rg -n`; do not navigate by stored line number.
- Read the complete owning function plus its callers, state capture/restore paths, UI sync path, and tests before editing.
- Treat `curve_mesh_hair_tool_v4.html` as the current composition root, not as the desired home for DOM-free logic.
- Put reusable calculations or policies under the matching `src/` domain and export them for tests.

## 3. Preserve cross-cutting contracts

Before editing, identify which contracts the change touches:

- create/clone/capture/restore symmetry
- History `begin`/`commit` transaction boundary
- dirty state and local recovery scheduling
- hidden/locked editability policy
- Live Mesh `disabled | ready | error` honesty
- mesh-budget normalization
- Proxy Base → ordered FFD stack evaluation and Surface raycast inclusion
- Three.js Geometry/Material disposal
- project schema compatibility

Use the routed feature document for the exact symbols and verification matrix.

## 4. Implement narrowly

1. Modify the smallest owning layer.
2. Update every paired state/UI/scene path named in the feature document.
3. Add or update a Node regression test for DOM-free behavior.
4. Add a browser self-check only when real Three.js types or runtime wiring are required.
5. Update the routed feature document when symbols, ownership, data shape, or invariants change.

Do not add dependencies, alter project schema versions, or broaden export guarantees without explicit need and validation.

## 5. Verify by risk

Always run:

```bash
git diff --check
npm run check
```

For runtime/UI changes, also:

1. Start `python3 launch_server.py --no-browser --port 0`.
2. Confirm the printed app URL returns HTTP 200.
3. Open the URL with `?selftest=1` and inspect `globalThis.__CURVE_TOOL_SELF_TEST__` when relevant.
4. Exercise the routed manual acceptance scenarios in `doc/CODEX_INDEX.md` and the feature document.

For viewport pointer, gizmo, mode, context-menu, or Proxy interaction changes, run `npm run test:viewport`. Preserve these independent contracts: `Axis Lines` controls only the long custom guide/raycast layer while the standard XYZ TransformControls helper stays visible and interactive; Proxy `W` surface drag remains available; click-only Region input in FFD/Edit falls through to Scene object picking; all selected FFD controls stay yellow through Ctrl/Alt/Region and drag; and `Edit Control Points` toggles both mode and lattice visibility in both directions.

Viewport RMB commands must resolve the object under the pointer, respect hidden/locked editability, and delegate to the same owning function or DOM command as the panel. Never create a context-menu-only mutation path; this prevents mismatched History, dirty/recovery, geometry rebuild, and UI synchronization.

Edit-locked Curve and Proxy roots must be filtered by `canPickViewportObject()` before every Viewport raycast list is built. This applies to LMB selection, RMB menus, Proxy direct drag, and Edit/FFD click-through. Do not disable Scene Explorer selection because it is the recovery path for inspecting and unlocking the object.

Treat no active Curve or Proxy as a valid root-selection state. Empty LMB in Select/Object or root Transform mode and deletion of a singly selected root must clear both roots, sub-control selections, Scene highlight, Modify context, lattice, and gizmo through `clearObjectSelection()`; never fall back to `curves[0]` or `proxies[0]`. In `edit`/`ffd`, an empty click clears only the sub-control selection so the user can continue editing the active root.

For Curve sub-object transforms, Point Move, Rotate, and Scale must resolve the same complete selected Anchor set and place the gizmo at its shared average position. Apply Rotate/Scale to every selected Anchor, its Tangents, and its section transform in one History transaction. Section tools and individual Bézier Handle edits remain active-point-only.

Treat Curve Soft Selection as a derived Along-Curve influence computed from world-space Bézier path distance. Do not merge soft weights into `selectedPointIndices`: hard Anchors stay weight 1, yellow, and own the shared pivot. Freeze the affected indices and weights at the start of each Point Move/Rotate/Scale drag, transform anchors/tangents/section state in one History transaction, rebuild Live Mesh when enabled, and keep Section tools and individual handles hard-selection-only. Persist only normalized enabled/falloff settings; recompute weights after restore.

Keep the ViewCube in an independent overlay renderer so its pointer and keyboard input cannot enter the main canvas selection routes. Its root orientation is the inverse active-camera quaternion. A short LMB click snaps; an LMB drag past the threshold orbits freely around the existing target and preserves the active Perspective/Orthographic projection. Six face snaps honor Ortho Views, edge/corner snaps and Home use Perspective, and no ViewCube action may mutate object selection or History. Preserve keyboard focus through the visible direction label without drawing a border around the canvas, compact-viewport bounds, and a visibly separate bottom-right root-selection badge.

Preserve the 3ds Max point-of-view shortcut map outside typing fields: direct `T` Top, `B` Bottom, `F` Front, `L` Left, `P` Perspective, `U` User Orthographic; `V` opens the Viewport Views menu and `V` then `K` selects Back. `P`/`U` preserve the current viewing angle, while ViewCube Home resets the direction. Keep `src/viewport/view-shortcuts.js`, the visible menu keycaps, README, feature docs, and browser regression synchronized whenever this routing changes.

For Proxy/FFD changes, acceptance must include Window/Crossing plus Ctrl/Alt control selection, a real multi-control direct or gizmo drag, one-step Undo/Redo, stack ON/OFF or reorder, project round-trip, Proxy-only Surface Line placement, and final baked Export topology. For viewport-input changes, also verify MMB Pan, Alt+MMB Orbit, Ctrl+Alt+MMB Zoom, wheel zoom, and that object/control picking still works.

For Curve Soft Selection changes, acceptance must include UI ON/OFF and Falloff, hard-yellow plus visible soft-weight colors, weighted Point Move/Rotate/Scale through real viewport input, stable hard-selection pivot, frozen influence during each drag, one-step Undo/Redo, Live Mesh enabled, project settings round-trip, runtime-error capture, and compact 1024px panel bounds.

Report checks actually run. Keep commit and push actions conditional on explicit user authorization.
