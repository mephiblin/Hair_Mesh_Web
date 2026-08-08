# Proxy Mesh · FFD Modifier Stack 기능 계약

## 목적과 사용자 모델

Proxy Mesh는 완성 모델을 대신하는 저해상도 작업용 형상이다. 주요 용도는 다음 세 가지다.

- 헤어·라인을 설계하기 전 전체 실루엣과 볼륨을 빠르게 목업한다.
- 무거운 Reference Model 대신 Proxy 표면에 헤어 가이드 Point를 배치한다.
- Reference Model에 없는 머리카락 덩어리, 장식, 돌출부 등의 임시 표면을 보충한다.

`Create`에서 primitive를 만들고 `Scene Explorer`에서 선택·표시·잠금을 관리한다. 활성 객체가 Proxy면 `Modify`가 `Primitive Parameters`와 `Modifier Stack`으로 바뀐다. Primitive 값과 FFD는 모두 원본을 파괴하지 않으며 언제든 다시 조정할 수 있다.

지원 primitive:

| UI 이름 | 내부 `type` | 논리 topology |
| --- | --- | --- |
| Box | `box` | 면별 subdivided Quad |
| Sphere · UV | `sphere` | 중간 Quad + 양 극점 Triangle |
| Quad Sphere | `quad-sphere` | subdivided cube를 구면 투영, 모든 면 Quad |
| Cylinder | `cylinder` | Quad side, cap 중심 Triangle + 방사형 Quad ring |

지원 FFD lattice는 `2×2×2`, `4×4×4`, `8×8×8`이다. UI의 짧은 이름 FFD 2/4/8은 각 축에 같은 해상도를 쓰는 cubic lattice를 뜻한다.

## 평가 흐름

```text
Primitive type + settings
  → buildProxyTopology()
  → Base topology
  → FFD Stack[0]
  → FFD Stack[1]
  → ... 위로 순서대로 평가
  → final logical topology
  ├── Viewport solid + logical edge
  ├── Reference / Proxy Surface raycast
  └── OBJ / FBX bake export
```

Primitive parameter를 바꾸면 Base topology를 다시 만들고 현재 stack을 처음부터 재평가한다. FFD를 적용해 Base vertex를 덮어쓰지 않는다. 각 FFD lattice의 입력 bounds는 바로 아래 modifier까지 평가한 topology에서 계산하므로, stack 순서 변경은 의도적으로 결과를 바꿀 수 있다.

FFD 변형은 Sederberg/Parry 방식의 tensor-product Bernstein weight를 사용한다. 각 control offset은 해당 modifier 입력 bounds에 대한 정규화 좌표로 저장한다. 따라서 프로젝트 JSON에는 무거운 변형 topology를 중복 저장하지 않고 편집 가능한 lattice 상태만 남긴다.

## 코드 소유권

| 책임 | 심볼/DOM | 파일 |
| --- | --- | --- |
| Primitive 기본값·제한 | `defaultProxySettings()`, `normalizeProxySettings()`, `PROXY_LIMITS` | `src/geometry/proxy-primitives.js` |
| Primitive topology | `buildProxyTopology()`, `proxyTopologyStats()` | `src/geometry/proxy-primitives.js` |
| FFD 순수 계산 | `createFfdModifier()`, `normalizeFfdModifier()`, `applyFfdModifier()`, `evaluateFfdStack()` | `src/geometry/ffd-lattice.js` |
| FFD control 좌표 | `ffdControlPointPositions()`, `setFfdControlPointPosition()` | `src/geometry/ffd-lattice.js` |
| Proxy record/codec | `makeProxyRecord()`, `proxyState()`, `proxyFromState()`, `disposeProxy()` | HTML composition root |
| 최종 topology/렌더 | `rebuildProxyMesh()`, `proxyTopologyToThree()` | HTML composition root |
| Lattice 표시·선택 | `rebuildProxyLatticeVisual()`, `syncFfdLatticePositions()`, `findFfdControl()`, `setFfdControlSelection()` | HTML composition root + `control-selection.js` |
| 영역 선택 | `beginSelectionRegion()`, `screenControlRecords()`, `finishSelectionRegion()` | HTML composition root + `region-selection.js` |
| Modifier UI | `#proxyModifierList`, `refreshProxyModifierUI()`, `addFfdModifierToSelected()`, `moveActiveProxyModifier()` | HTML composition root |
| FFD Move/History | `syncGizmo()`, `beginGizmoDrag()`, `handleGizmoChange()`, `endGizmoDrag()` | HTML composition root |
| 표면 배치 | `updateDrawTargetUI()`, `pointOnSurface()` | HTML composition root |
| 저장·복원 | `captureAppState()`, `restoreAppState()` | HTML composition root |
| Export | `activeExportMeshes()`, `worldTopology()` | HTML composition root |

## 데이터 구조

```text
proxy
├── id, name, type
├── visible, locked
├── group                       # 저장되는 Object transform
├── settings                    # 저장되는 primitive parameters
├── modifiers[]                 # Base부터 Top까지 영구 stack
│   └── FFD
│       ├── id, type='ffd', name
│       ├── resolution          # 2 | 4 | 8
│       ├── enabled
│       └── offsets[]           # resolution³개의 normalized [x,y,z]
├── activeModifierId
├── lastFfdControlIndex         # active control, legacy 호환
├── lastFfdControlIndices       # 저장되는 다중 선택
├── baseTopology                # 파생 데이터
├── topology                    # stack 평가가 끝난 파생 데이터
├── meshGroup/solidMesh/wireMesh
└── latticeGroup/latticeControlObjects/latticeLine
```

프로젝트와 History snapshot에는 primitive settings, modifier stack, 활성 modifier/control, object transform, visible/locked를 저장한다. `baseTopology`, 최종 `topology`, BufferGeometry, Material, lattice Object3D는 파생 데이터이므로 restore에서 재생성한다. 이전 version 1 프로젝트에 `modifiers`가 없으면 빈 stack으로 정상 복원한다.

## UI와 편집 불변조건

- 활성 root object는 Curve 또는 Proxy 중 하나다. `selectCurve()`와 `selectProxy()`는 반대 종류의 선택을 해제한다.
- FFD row의 순서는 Base에 가까운 항목부터 Top 방향이다. `Move Up`은 나중에, `Move Down`은 먼저 평가되도록 이동한다.
- row checkbox를 끄면 데이터는 보존하고 평가만 건너뛴다. 편집 중인 FFD를 끄면 안전하게 Object/Camera 모드로 나온다.
- `Edit Control Points`는 선택 modifier의 lattice만 표시한다. LMB 클릭은 단일 선택, Ctrl/⌘ 클릭은 추가/해제 토글, Alt 클릭은 제외다.
- 빈 곳에서 LMB를 드래그하면 사각 영역을 만든다. 좌→우는 완전히 포함된 control만 고르는 Window, 우→좌는 닿는 control도 고르는 Crossing이다. Ctrl은 기존 선택에 추가하고 Alt는 제외한다.
- 선택된 Control 하나를 직접 LMB 드래그하면 View Plane에서 전체 선택을 함께 이동한다. Move gizmo와 긴 Axis Line은 좌표계 축 제약 이동을 담당한다.
- Proxy Object `W` mode에서는 solid/edge 표면 drag가 root transform을 View Plane에서 이동한다. `Axis Lines` OFF는 긴 제약선만 숨기며 기본 XYZ gizmo와 Proxy 표면 drag는 유지한다.
- FFD mode에서 Control이 아닌 Proxy/Curve 표면을 click하면 Scene object 선택으로 전달한다. Region의 click/drag 분기를 합치면 다른 Proxy 선택이 막히므로 `finishSelectionRegion()`의 click fallback을 유지한다.
- 다중 선택 기즈모는 control 평균 위치에 나타나며 모든 선택 offset에 같은 local delta를 적용한다. E/R은 Proxy root를 회전/스케일하지 않는다.
- FFD 모드의 `Delete`는 Proxy나 control을 지우지 않는다. Control 수는 resolution 계약이므로 `Reset FFD` 또는 `Remove Modifier`를 사용한다.
- `Reset FFD`는 선택 modifier의 모든 offset만 0으로 만들고 다른 stack 항목은 유지한다.
- Clone은 stack 값은 복제하지만 modifier ID는 새로 할당해 원본과 독립 편집한다.
- hidden/locked Proxy는 primitive, modifier, name, transform, clone/delete 변경을 막는다.
- `Show Edges`와 FFD lattice line은 Hair/Reference wire 설정과 독립된 자체 line layer다.
- 보이는 Proxy solid는 `Reference / Proxy Surface`의 raycast 후보이며 Reference와 겹치면 카메라에서 가장 가까운 hit를 사용한다.

## History·Project·Export

- FFD 추가, 직접/기즈모 control drag, ON/OFF, 순서 변경, Reset, Remove는 각각 한 번의 History transaction이다. 선택 변경만으로는 geometry History를 만들지 않는다.
- drag 중에는 geometry를 실시간 재평가하지만 pointer up에서 한 개 Undo step으로 확정한다.
- `nextProxyModifierId`, `activeModifierId`, `lastFfdControlIndex`, `lastFfdControlIndices`를 저장·복원한다. 단일 index만 있는 이전 프로젝트는 1개 선택 Set으로 승격한다.
- OBJ/FBX는 표시 중인 Proxy의 최종 FFD 결과와 Object transform을 bake한다. modifier stack 자체는 교환 포맷에 포함하지 않는다.
- hidden Proxy는 Surface raycast와 Export에서 제외한다.

## 파라미터 제한

- 크기/반지름/높이: `0.001..10000`
- Box 각 축 Segments: `1..128`
- Sphere Segments: `3..256`, Rings: `2..128`
- Quad Sphere Face Segments: `1..64`
- Cylinder Sides: `3..256`, Height/Cap Segments: `1..128`
- FFD resolution: `2 | 4 | 8`, control 수는 `8 | 64 | 512`

UI의 `min/max`는 안내이며 실제 안전 경계는 순수 normalize 함수가 소유한다.

## 변경 체크리스트

- 새 primitive field가 default → normalize → UI → record/clone/project → topology 전 경로에 있는가?
- 새 modifier field가 create → normalize/clone → stack evaluate → UI → project/History 전 경로에 있는가?
- 현재 modifier 입력은 Base가 아니라 `stopBeforeId`까지 평가한 topology인가?
- identity FFD가 vertex/face/UV를 바꾸지 않고, disabled modifier가 평가를 건너뛰는가?
- 반복 rebuild, stack reorder/remove, Undo restore에서 이전 Geometry/Material/lattice가 dispose되는가?
- 8×8×8의 512 control과 lattice line이 선택 가능하고 viewport를 멈추게 하지 않는가?
- Proxy가 숨겨지거나 삭제되면 Surface option/raycast 후보가 즉시 갱신되는가?
- Curve↔Proxy↔FFD 모드 전환 시 Modify, row, badge, gizmo, keyboard target이 같은 frame에 바뀌는가?
- Window/Crossing 방향, Ctrl 추가/클릭 토글, Alt 제외, Ctrl+A 전체 선택이 2/4/8 lattice 모두에서 유효한가?
- 다중 선택을 직접/기즈모로 이동할 때 모든 선택 offset만 같은 delta를 받고 한 Undo로 원복되는가?
- Export가 Base가 아닌 최종 stack topology를 bake하는가?
- `Axis Lines` OFF에서 기본 XYZ gizmo가 보이고 입력 가능하며, Proxy 표면 drag와 FFD 상태의 다른 Proxy click 선택이 함께 유지되는가?

## 검증 기준

- Node: 4종 primitive clamp/topology/winding, FFD resolution/identity/Bernstein 변형/stack order/disabled, project modifier round-trip.
- Browser: Proxy Object 표면 직접 Move drag와 한 단계 Undo, Axis Lines OFF의 기본 XYZ gizmo 유지, FFD 상태에서 다른 Proxy viewport 선택, FFD 2/4/8 추가, Window/Crossing과 Ctrl/Alt 선택, 다중 직접/gizmo drag, 한 단계 Undo/Redo, ON/OFF 모드 이탈, reorder/reset/remove, Delete 안전장치, Clone 독립 ID, Save/Open/Recovery.
- Automated browser gate: `tests/viewport-regression.mjs` / `npm run test:viewport`를 pointer·gizmo 변경마다 실행한다.
- Surface: Reference 없이 Proxy만 있는 장면에서 Surface option 활성화, 2 Point Line 생성 완료.
- Export: FFD로 이동한 vertex가 OBJ/FBX 최종 geometry에 포함되고 여러 Proxy object가 분리되는지 확인.
- Visual: 1600×900과 1024×768에서 Primitive/Modifier rollout, 2×2×2와 8×8×8 lattice, Scene Explorer와 viewport clipping 확인.
