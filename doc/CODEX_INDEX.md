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
project_format: .hairmesh.json, version 1
external_runtime: three@0.180.0 via jsDelivr
default_branch: master
current_node_contracts: 18
current_browser_self_checks: 24
```

## 2. 요청 라우터

| 요청 신호 | 추가로 읽을 문서 | 첫 검색 앵커 |
| --- | --- | --- |
| Line, Curve, Point, Handle, Knot, Average, Insert, Delete | [`features/curve-editing.md`](features/curve-editing.md) | `makeCurveRecord`, `selectControl`, `BezierChainCurve` |
| Ribbon, Tube, Brush, Sweep, topology, UV, cap, twist | [`features/mesh-generation.md`](features/mesh-generation.md) | `makeTopologyForCurve`, `rebuildCurveMesh` |
| Save, Open, JSON, Recovery, Dirty, Undo, Redo, schema | [`features/project-state.md`](features/project-state.md) | `captureAppState`, `restoreAppState`, `createHistory` |
| Viewport, Perspective/Orthographic camera, standard view, picking, gizmo, mode, axis, keyboard | [`features/viewport-ui.md`](features/viewport-ui.md) | `useViewportCamera`, `setStandardView`, `setMode`, `syncGizmo`, `handleViewportClick` |
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
point_multi_selection: Ctrl/Cmd + active-curve anchor toggles membership, empty selection allowed
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
standard_view_projection: Persp always perspective; Ortho Views defaults ON for Front/Left/Back/Top and is persisted
export_topology: preserve logical quad/ngon faces
resource_cleanup: dispose removed geometry and material
```

## 6. 기본 검증 게이트

| 변경 종류 | 필수 게이트 |
| --- | --- |
| 문서만 | `git diff --check`, 링크/심볼 존재 확인 |
| `src/` 순수 로직 | `npm run check`, 관련 Node 회귀 테스트 |
| HTML runtime/UI | 위 검사 + HTTP 200 + 관련 브라우저 흐름 |
| Geometry/Three.js 수학 | 위 검사 + `?selftest=1` |
| 저장 스키마 | round-trip, 이전 버전/미래 버전, Undo/Redo, Recovery |
| Export | 생성 성공만으로 완료하지 말고 대상 DCC Import 확인 |

## 7. 최소 수용 시나리오

1. 빈 장면에서 Line을 시작하고, 1 Point 상태의 완료 방지와 취소를 확인한다.
2. 2개 이상 Point Line을 완료하고 Point/Handle 편집을 Undo/Redo한다.
   - 같은 Curve의 Anchor를 Ctrl/⌘ 클릭해 추가/해제하고, Curve 행도 2개 이상 다중 선택 후 활성 행 전환과 전체 해제를 확인한다.
3. Ribbon과 Tube를 생성하고 제한 경계에서 Live 상태와 topology를 확인한다.
4. Brush fixture를 Import하여 Sweep하고 저장 후 다시 연다.
5. 숨김/잠금 Curve가 포인터, 숫자 입력, 단축키로 수정되지 않는지 확인한다.
6. 프로젝트 저장/열기와 새로고침 자동 복구를 확인한다.
7. 관련 변경이면 OBJ/FBX를 대상 DCC에 Import한다.
8. Display 변경이면 Hair/Reference preset, 다중 Reference Mesh 숨김/재질/텍스처, 조명 reset, Wire Only/Surface + Wire, Wire color, Front/Left/Back Plane의 Perspective 표시·Move/Rotate/Scale·Back-face Cull·Flip·파일 재선택, Ortho Views ON/OFF와 표준 뷰·FOV disabled·picking, Background/FOV/Grid와 Recovery를 확인한다.

## 8. 탐색 명령

```bash
rg -n "function <symbol>|class <symbol>|const <symbol>" curve_mesh_hair_tool_v4.html src
rg -n "<dom-id>|addEventListener" curve_mesh_hair_tool_v4.html
rg -n "<state-field>" curve_mesh_hair_tool_v4.html src tests doc/features
rg -n "export function|export const" src
```

기능 전체 심볼의 빠른 표는 [`FEATURE_CODE_MAP.md`](FEATURE_CODE_MAP.md)에 있다. 동작 계약과 변경 체크리스트는 라우팅된 `features/*.md`를 우선한다.
