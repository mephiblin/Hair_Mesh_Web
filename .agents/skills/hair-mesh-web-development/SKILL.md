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

For Proxy/FFD changes, acceptance must include a real lattice control drag, one-step Undo/Redo, stack ON/OFF or reorder, project round-trip, Proxy-only Surface Line placement, and final baked Export topology.

Report checks actually run. Keep commit and push actions conditional on explicit user authorization.
