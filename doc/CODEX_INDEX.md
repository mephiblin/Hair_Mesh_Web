# Codex 작업 색인

이 파일은 Hair Mesh Web 작업의 첫 번째 탐색 지점이다. 전체 코드를 먼저 읽지 말고, 아래 라우터에서 요청과 맞는 기능 문서만 추가로 읽는다. 문서의 함수명·상수·DOM ID는 `rg -n` 검색 앵커이며 줄 번호보다 우선한다.

## 1. 저장소 사실

```yaml
runtime: static ES-module web app
composition_root: curve_mesh_hair_tool_v4.html
launcher: launch_server.py
pure_modules: src/
node_tests: tests/core-tests.mjs
browser_checks: src/diagnostics/core-self-check.js
browser_regression: tests/viewport-regression.mjs
project_format: .hairmesh.json, version 1
external_runtime: three@0.180.0 via jsDelivr
default_branch: master
current_node_contracts: 31
current_browser_self_checks: 24
```

## 2. 요청 라우터

| 요청 신호 | 추가로 읽을 문서 | 첫 검색 앵커 |
| --- | --- | --- |
| Line, Curve, Point, Handle, Knot, Average, Insert, Delete | [`features/curve-editing.md`](features/curve-editing.md) | `makeCurveRecord`, `selectControl`, `BezierChainCurve` |
| Ribbon, Tube, Brush, Sweep, topology, UV, cap, twist | [`features/mesh-generation.md`](features/mesh-generation.md) | `makeTopologyForCurve`, `rebuildCurveMesh` |
| Proxy Mesh, Box, Sphere, Quad Sphere, Cylinder, FFD 2/4/8, Modifier Stack, Proxy Surface | [`features/proxy-mesh.md`](features/proxy-mesh.md) | `buildProxyTopology`, `evaluateFfdStack`, `rebuildProxyMesh`, `syncModifyContext` |
| Save, Open, JSON, Recovery, Dirty, Undo, Redo, schema | [`features/project-state.md`](features/project-state.md) | `captureAppState`, `restoreAppState`, `createHistory` |
| Viewport, Perspective/Orthographic camera, standard view, picking, gizmo, mode, axis, keyboard | [`features/viewport-ui.md`](features/viewport-ui.md) | `useViewportCamera`, `setStandardView`, `setMode`, `syncGizmo`, `handleViewportClick` |
| RMB, context menu, Proxy/Curve quick command | [`features/viewport-ui.md`](features/viewport-ui.md) + 대상 기능 문서 | `openViewportContextMenu`, `renderProxyContextMenu`, `renderCurveContextMenu` |
| Display, MatCap, texture, object visibility, light, wireframe, Front/Left/Back Plane, background, FOV, Ortho Views, grid | [`features/viewport-display.md`](features/viewport-display.md) | `applyModelDisplay`, `applyReferenceImageDisplay`, `applyViewportDisplay` |
| Reference model/material, OBJ/FBX/GLTF Import, Project/OBJ/FBX Export | [`features/io-export.md`](features/io-export.md) + material 변경이면 [`features/viewport-display.md`](features/viewport-display.md) | `loadModel`, `applyModelDisplay`, `exportQuadOBJ` |
| 구조 분리, 새 모듈, 전반 개발 절차 | [`DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md)와 관련 기능 문서 | HTML import block, `src/` exports |
| 제품 평가, 우선순위, Blender 대비 범위 | [`../docs/product-audit/recursive-audit.md`](../docs/product-audit/recursive-audit.md) | 문서 목차 |

복합 기능은 관련 문서를 모두 읽는다. 예: “Point 단면을 프로젝트에 저장”은 `curve-editing.md`와 `project-state.md`, “Brush 메시 Export 오류”는 `mesh-generation.md`와 `io-export.md`가 필요하다.

## 3. 레이어 소유권

| 레이어 | 소유하는 것 | 소유하지 않는 것 |
| --- | --- | --- |
| `curve_mesh_hair_tool_v4.html` | DOM, event wiring, Three.js Scene 객체, controller 조립 | 재사용 가능한 순수 정책의 장기 소유 |
| `src/geometry/` | Bézier/Sweep/메시 제한 수학 | DOM, localStorage, 다운로드 |
| `src/state/` | 직렬화, History, 선택·편집 정책 | Three.js Scene 생명주기 |
| `src/viewport/` | Picking/axis constraint, material/light/wire 정규화 정책 | 패널 UI와 Three.js Scene 객체 생명주기 |
| `src/ui/` | 재사용 DOM interaction | 앱 전역 상태 |
| `src/diagnostics/` | 브라우저 런타임 self-check | Node-only 회귀 테스트 |
| `tests/` | DOM 없는 계약과 fixture | 시각적/포인터 수용 테스트 |

## 4. 공통 상태 변경 프로토콜

사용자 편집 기능은 원칙적으로 다음 경로를 가진다.

```text
DOM/pointer/keyboard event
  → precondition: selection + canEditCurve
  → history.begin(label)
  → serializable state mutation
  → visual/control/live-mesh/UI synchronization
  → history.commit()
  → onChange → dirty status + recovery schedule
```

연속 입력은 pointer/input 시작부터 종료/change까지 하나의 transaction으로 묶는다. 표시 설정처럼 History 밖에서 바꾸는 값은 `markProjectChanged()`를 직접 호출한다.

## 5. 전역 불변조건

```yaml
line_min_points: 2
editable_curve: visible == true && locked == false
editable_proxy: visible == true && locked == false
viewport_pickable_root: visible == true && locked == false; Scene Explorer remains selectable for unlock
active_root_object: selectedCurve와 selectedProxy는 상호 배타적이며 둘 다 null인 무선택 상태가 유효
empty_root_selection: orbit/transform 빈 LMB는 root/control 선택과 gizmo를 해제; edit/ffd 빈 LMB는 root를 유지하고 sub-control만 해제
modify_context: none XOR curve XOR proxy
point_multi_selection: Ctrl/Cmd + active-curve anchor toggles membership, empty selection allowed
control_region_selection: left-to-right Window, right-to-left Crossing; Ctrl add, Alt remove
max_viewport_navigation: MMB pan, Alt+MMB orbit, Ctrl+Alt+MMB zoom, wheel zoom
max_viewport_views: direct T/B/F/L/P/U; V opens POV menu; V then K selects Back; disabled for typing targets
axis_lines_scope: toggle long constraint lines only; keep the standard XYZ transform gizmo visible and interactive
curve_multi_selection: Ctrl/Cmd + Scene Explorer row toggles membership, latest added is active
ready_live_mesh: meshEnabled && meshStatus == "ready" && topology exists
path_segments: 2..512
tube_sides: 3..64
history_limit: 100
project_reference_model_embedded: false
project_reference_material_embedded: false
viewport_material: display-only, preserve imported original
reference_object_overrides: session-only visibility/material/texture per imported Mesh
reference_auto_material: preserve textured/visible original, fallback dark untextured original to default-lit
reference_wireframe: independent LineSegments, never mutate imported material wireframe
viewport_reference_images: session-only texture planes; persist alignment and filename hints, never image payload
viewport_reference_image_visibility: visible in perspective and standard views; optional per-plane back-face culling
viewport_reference_image_transform: independent position/rotation/scale, direct TransformControls, UV horizontal flip
viewport_environment: background/FOV/grid/directional/fill persisted, MatCap unaffected by lights
standard_view_projection: Persp and ViewCube edge/corner/Home are perspective; Ortho Views defaults ON for six face views and is persisted; ViewCube LMB drag preserves the current projection/target as a custom free view
view_cube: camera inverse-quaternion display; 6 face snaps honor Ortho Views, edge/corner snaps use perspective, Home restores perspective; global POV keys route through applyViewportView
export_topology: preserve logical quad/ngon faces
proxy_export: include visible proxy topology beside visible ready curve meshes
proxy_surface_placement: visible Reference/Proxy nearest raycast hit
proxy_ffd_stack: ordered persistent 2x2x2 | 4x4x4 | 8x8x8 modifiers, export final evaluated topology
proxy_ffd_selection_visual: every selected control is yellow; active control is additionally enlarged
proxy_ffd_edit_toggle: Edit Control Points enters; Finish Editing exits and hides lattice without deleting state
viewport_context_menu: RMB resolves pointer target and delegates to owning panel/shortcut commands
resource_cleanup: dispose removed geometry and material
```

## 6. 기본 검증 게이트

| 변경 종류 | 필수 게이트 |
| --- | --- |
| 문서만 | `git diff --check`, 링크/심볼 존재 확인 |
| `src/` 순수 로직 | `npm run check`, 관련 Node 회귀 테스트 |
| HTML runtime/UI | 위 검사 + HTTP 200 + 관련 브라우저 흐름 |
| Viewport pointer/gizmo | 위 검사 + `npm run test:viewport` + 실제 캔버스 시각 확인 |
| Geometry/Three.js 수학 | 위 검사 + `?selftest=1` |
| 저장 스키마 | round-trip, 이전 버전/미래 버전, Undo/Redo, Recovery |
| Export | 생성 성공만으로 완료하지 말고 대상 DCC Import 확인 |

## 7. 최소 수용 시나리오

1. 빈 장면에서 Line을 시작하고, 1 Point 상태의 완료 방지와 취소를 확인한다.
2. 2개 이상 Point Line을 완료하고 Point/Handle 편집을 Undo/Redo한다.
   - 같은 Curve의 Anchor를 Ctrl/⌘ 클릭해 추가/해제하고, Curve 행도 2개 이상 다중 선택 후 활성 행 전환과 전체 해제를 확인한다.
3. Ribbon과 Tube를 생성하고 제한 경계에서 Live 상태와 topology를 확인한다.
4. Box/Sphere/Quad Sphere/Cylinder를 생성하고 Modify 문맥, 세그먼트 변경, transform, Proxy 표면 직접 Move drag, visibility/lock, clone/delete를 확인한다. Select/Object 모드의 빈 Viewport 클릭과 단일 삭제 뒤에는 무선택·`NONE` Modify·gizmo 해제가 유지되어야 한다. Axis Lines OFF에서도 기본 XYZ gizmo가 남아 있는지 확인하고, FFD 2/4/8 추가, Window/Crossing·Ctrl/Alt 선택, 선택 전체의 노란 표시, 다중 Point 직접/기즈모 Move, Edit/Finish 편집 토글, FFD 상태에서 다른 Proxy viewport 선택, stack reorder/ON/OFF/reset/remove·Undo/Redo와 Proxy Surface Line 생성을 함께 확인한다. Proxy/Curve RMB 메뉴도 실제 포인터 대상과 동일한 panel command 결과를 내야 한다.
5. Brush fixture를 Import하여 Sweep하고 저장 후 다시 연다.
6. 숨김/잠금 Curve와 Proxy가 포인터, 숫자 입력, 단축키로 수정되지 않는지 확인한다. 잠긴 객체는 Viewport LMB·RMB·직접 drag·Edit/FFD click-through로 선택되지 않아야 하며 Scene Explorer에서는 선택·잠금 해제가 가능해야 한다.
7. 프로젝트 저장/열기와 새로고침 자동 복구를 확인한다.
8. 관련 변경이면 Curve/Proxy OBJ·FBX를 대상 DCC에 Import한다.
9. Display 변경이면 Hair/Reference preset, 다중 Reference Mesh 숨김/재질/텍스처, 조명 reset, Wire Only/Surface + Wire, Wire color, Front/Left/Back Plane의 Perspective 표시·Move/Rotate/Scale·Back-face Cull·Flip·파일 재선택, Ortho Views ON/OFF와 표준 뷰·FOV disabled·picking, `T/B/F/L/P/U`와 `V→K`, ViewCube 현재 방향/6면/edge/corner/좌클릭 drag/Home/방향키/1024px 배치와 우하단 선택 배지 분리, Background/FOV/Grid와 Recovery를 확인한다.

## 8. 탐색 명령

```bash
rg -n "function <symbol>|class <symbol>|const <symbol>" curve_mesh_hair_tool_v4.html src
rg -n "<dom-id>|addEventListener" curve_mesh_hair_tool_v4.html
rg -n "<state-field>" curve_mesh_hair_tool_v4.html src tests doc/features
rg -n "export function|export const" src
```

기능 전체 심볼의 빠른 표는 [`FEATURE_CODE_MAP.md`](FEATURE_CODE_MAP.md)에 있다. 동작 계약과 변경 체크리스트는 라우팅된 `features/*.md`를 우선한다.
