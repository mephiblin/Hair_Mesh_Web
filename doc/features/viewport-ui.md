# Viewport·UI 기능 계약

## 범위

Scene 초기화, picking, mode, TransformControls, axis guide, keyboard과 패널 availability를 다룬다. 재질·조명·Reference Wire·Grid는 [`viewport-display.md`](viewport-display.md)가 소유한다.

## 기능별 소유 심볼

| 기능 | 심볼/DOM | 보조 모듈 |
| --- | --- | --- |
| Scene/Camera/Renderer | `scene`, `camera`, `perspectiveCamera`, `orthographicCamera`, `renderer`, `orbit`, `animate()` | Three.js CDN imports |
| Camera projection | `#orthographicViewsToggleBtn`, `useViewportCamera()`, `setStandardView()`, `setViewportProjectionView()` | `viewport-settings.js` |
| ViewCube | `#viewCubeStage`, `#viewCubeHome`, `beginViewCubeDrag()`, `updateViewCubeDrag()`, `setViewportDirection()`, `applyViewCubeTarget()`, `syncViewCubeOrientation()` | `src/viewport/view-cube.js` |
| 3ds Max POV keys/menu | `#viewportViewMenu`, `#viewportViewGrid`, `openViewportViewMenu()`, `applyViewportView()` | `src/viewport/view-shortcuts.js` |
| Resize/frame | `resize()`, `setOrthographicFrustumHeight()`, `fitObject()`, `frameSelected()` | `matchedOrthographicHeight()` |
| Control visual | `rebuildControlVisuals()`, `updateControlVisuals()`, `applyControlAppearance()` | curve policy |
| Curve Soft Selection visual | `softSelectionColor()`, `softSelectionWeightsForCurve()`, `syncSoftSelectionUI()` | `src/geometry/soft-selection.js` |
| Visibility | `updateControlVisibility()`, `updateCurveSelectionStyles()` | viewport interaction policy |
| Picking | `findControl()`, `selectControl()`, `findFfdControl()`, `selectFfdControl()`, `findSceneObjectAtEvent()`, `handleViewportClick()` | `interaction-policy.js`의 `canPickViewportObject()`, `point-selection.js` |
| Root 선택 해제 | `clearObjectSelection()`, `handleViewportClick()` | 무선택 상태, `NONE` Modify, Scene row/강조/gizmo 동기화 |
| Region selection | `beginSelectionRegion()`, `updateSelectionMarquee()`, `finishSelectionRegion()` | `control-selection.js`, `region-selection.js` |
| Direct Viewport Move | `beginDirectViewportMove()`, `updateDirectViewportMove()`, `finishDirectViewportMove()` | Control 선택 중심 및 Proxy Object `gizmoContext` 공유 |
| 3ds Max navigation | `beginMaxViewportNavigation()`, `finishMaxViewportNavigation()` | OrbitControls mouse mapping |
| Surface/free placement | `pointOnSurface()`, `pointInFreePlane()` | raycaster |
| Mode | `setMode()`, `leaveLineCreationForMode()`, `updateHint()` | line creation policy |
| Curve/Proxy/Point/FFD Gizmo | `activeSceneObject()`, `syncGizmo()`, `beginGizmoDrag()`, `handleGizmoChange()`, `endGizmoDrag()` | `transformControls` |
| Reference Plane Gizmo | `setReferenceImageTransformTool()`, `syncReferenceImageTransformControls()`, `updateReferenceImageTransformFromPlane()` | `referenceImageTransformControls` |
| Axis guides | `syncAxisGuides()`, `startAxisGuideDrag()`, `updateAxisGuideDrag()` | `src/viewport/axis-guide-drag.js` |
| UI availability/Modify context | `updateCommandAvailability()`, `syncModifyContext()`, `updatePointToolButtons()` | Curve/Proxy editability policy |
| Rollout panel | `.rollout`, `setRolloutCollapsed()`, `initializeRollouts()` | DOM session state only |
| Curve mesh view | `applyViewModeToCurve()`, `#viewMode` | `viewport-display.md` |
| Keyboard | `isTypingTarget()`, document `keydown` listener | README shortcut table |
| Numeric scrub | `initNumericScrubbers()` | `src/ui/numeric-scrubber.js` |
| Viewport context menu | `openViewportContextMenu()`, `renderProxyContextMenu()`, `renderCurveContextMenu()`, `closeViewportContextMenu()` | `src/ui/context-menu.js` 위치 clamp |

## Mode 전이

```yaml
orbit: camera/object selection
draw: draft Point placement
edit: Point/Handle/section edit
insert: nearest curve segment split
transform: active Curve root 또는 Proxy object transform
ffd: active Proxy modifier의 단일/다중 lattice control Move
```

모드 변경 시 함께 동기화할 것: select value, toolbar active state, status mode, hint, OrbitControls enabled, TransformControls attachment, control visibility, axis guide, command availability.

Reference Plane은 Curve mode와 별개의 `translate | rotate | scale | none` 도구 상태를 가진다. Plane gizmo를 켜면 앱 mode를 `orbit`으로 전환해 Curve/Point gizmo와 동시에 나타나지 않게 한다. 반대로 `edit`, `insert`, `transform`, `draw`로 들어가면 Plane gizmo를 숨긴다. `W/E/R`은 Plane gizmo가 활성화된 동안 Plane 도구를 바꾸며 `Q`는 gizmo를 숨긴다.

## 3ds Max 입력 계약

- LMB는 Object/Control 선택, Region, Control·Proxy 직접 이동에 사용하며 카메라 회전에 쓰지 않는다.
- MMB drag는 Pan, Alt+MMB drag는 Orbit, Ctrl+Alt+MMB drag는 Zoom이다. Wheel Zoom도 유지한다.
- `Q`는 Select/Object mode, `W/E/R`은 Move/Rotate/Scale, `Z`는 Frame Selected다.
- 입력 필드 밖에서 `T/B/F/L`은 Top/Bottom/Front/Left, `P`는 viewing angle 유지 Perspective, `U`는 viewing angle 유지 User Orthographic이다. `V`는 포인터 위치에 Viewport Views 메뉴를 열고 메뉴가 열린 동안 `P/U/F/K/T/B/L`로 고른다. `K`는 Back이며 Right는 메뉴 클릭으로 선택한다.
- POV 키 기준은 Autodesk의 [Navigating in Perspective and Orthographic Viewports](https://help.autodesk.com/cloudhelp/2021/ENU/3DSMax-Basics/files/GUID-B4CAECB4-37EC-40B1-B671-BDCD0EBE1C82.htm)와 [Point-Of-View Viewport Label Menu](https://help.autodesk.com/cloudhelp/2024/ENU/3DSMax-Basics/files/GUID-F86CB637-685E-4874-82C5-CFACB8486D35.htm)를 따른다.
- FFD와 Curve Anchor의 빈 영역 LMB drag는 Rectangle Region이다. 좌→우 Window, 우→좌 Crossing 자동 방향을 사용한다.
- Region의 Ctrl/⌘는 Add, Alt는 Remove다. Control Ctrl/⌘ 클릭은 기존 사용자 계약대로 Add/Toggle이고 Alt 클릭은 Remove다.
- Move 도구에서 선택 Control을 직접 drag하면 camera-facing plane을 따라 이동하며, 선택이 여러 개면 selection center gizmo와 같은 집합을 움직인다.
- Curve Point Move·Rotate·Scale gizmo는 선택된 Anchor 전체의 평균 위치를 공통 pivot으로 사용한다. Rotate/Scale도 활성 Anchor 하나로 축소하지 않고 같은 선택 집합을 변환한다.
- Soft Selection ON에서도 gizmo pivot과 노란 표시는 직접 선택 Anchor 집합이 소유한다. Curve 길이 기반 간접 영향 Point는 가중치 색을 따로 보이고 Move/Rotate/Scale에만 포함되며, drag 시작에 대상과 weight를 freeze한다.
- Proxy Object Move 모드에서 Proxy 표면을 직접 drag하면 camera-facing plane을 따라 root object가 이동한다. FFD/Edit에서 drag되지 않은 click은 Scene object 선택으로 전달해 다른 Proxy 선택을 막지 않는다.
- Direct drag 도중 Esc/pointer cancel은 시작 snapshot으로 되돌리고 History entry를 취소한다.
- RMB는 카메라를 조작하지 않고 포인터 아래 Curve/Proxy를 대상으로 context menu를 연다. Line 생성 중 RMB는 draft를 취소하거나 선택을 바꾸지 않는다.
- Select/Object(`orbit`) 또는 root Transform 모드에서 빈 Viewport를 LMB 클릭하면 Curve/Proxy root 선택과 하위 Control, 노란 강조, gizmo를 모두 해제하고 `orbit`/`NONE` 문맥으로 돌아간다. Point/FFD 편집 모드의 빈 클릭은 root를 유지하고 하위 Control 선택만 해제한다.
- ViewCube는 3px 이하 이동을 click으로 유지한다. 그 이상 좌클릭 drag는 기존 orbit target과 현재 Perspective/Orthographic 투영을 유지한 `custom` 자유 뷰이며 object selection이나 History를 바꾸지 않는다. 면/모서리/꼭짓점 click은 기존 방향 snap, Home은 `Persp`와 같은 방향이고 ViewCube 초점에서 방향키·Enter를 지원한다. `F/B`를 ViewCube 전용으로 재정의하지 않고 전역 3ds Max 계약(`F` Front, `B` Bottom)을 따른다. 포커스는 canvas 테두리가 아닌 방향 label 노출로 표시한다.
- `#viewportBadge`는 ViewCube label이 아니라 root/sub-control 선택 상태다. `No Selection`은 유효한 무선택 상태이며 ViewCube와 떨어진 Viewport 우하단에 둔다.

## 표시 계층 소유권

| 표시/입력 | 소유 상태 | OFF 또는 숨김 의미 |
| --- | --- | --- |
| 기본 XYZ 화살표·평면·회전 링 | Three.js `TransformControls` helper | 선택/모드/편집 가능 여부가 없을 때만 숨김 |
| 긴 XYZ 제약선 | `axisGuideGroup`, `axisGuideLines`, `axisGuidesEnabled` | `Axis Lines` OFF에서 선과 raycast만 비활성화 |
| FFD lattice | 선택 Proxy의 active modifier | FFD mode·modifier ON·Proxy editable 조건이 없으면 숨김 |
| Reference Plane gizmo | `referenceImageTransformControls` | Plane tool `none` 또는 다른 편집 mode에서 숨김 |

`Axis Lines`는 기본 TransformControls의 master switch가 아니다. `shouldShowTransformHelper()`는 translate/rotate/scale operation만 판단하고, `axisGuidesEnabled`는 `syncAxisGuides()`와 `canInteractWithAxisGuides()`에만 전달한다. 이 경계를 합치면 Axis OFF에서 기본 XYZ 화살표까지 사라지는 회귀가 생긴다.

## Pointer routing 회귀 계약

| 현재 mode/시작 대상 | click | drag |
| --- | --- | --- |
| `orbit`의 Curve/Proxy | root object 선택 | 카메라가 LMB를 소비하지 않으며 object drag 없음 |
| `transform` + `W`의 Proxy 표면 | Proxy 선택 유지/전환 | View Plane root Move, 한 History 단계 |
| `ffd`의 lattice Control | 단일 또는 Ctrl/Alt membership | 선택 Control 집합 직접 Move |
| `ffd`의 Proxy/Curve 표면 | `finishSelectionRegion()`이 Scene picking으로 전달 | 빈 영역이면 FFD Window/Crossing Region |
| `edit`의 Anchor | 단일 또는 Ctrl/Alt membership | 선택 Point 집합 직접 Move |
| `edit`의 Scene object 표면 | click-only 입력을 Scene picking으로 전달 | 빈 영역이면 Curve Point Window/Crossing Region |
| `orbit`/`transform`의 빈 공간 | Curve/Proxy root 선택 해제, `NONE` Modify | 카메라 LMB 조작 없음 |

Region은 pointerdown에서 잠정 시작하므로 click/drag 분기는 반드시 release 시 이동 임계값으로 결정합니다. `finishSelectionRegion()`에서 click fallback을 제거하면 FFD/Edit mode가 Scene object selection을 삼키며, Proxy 표면 직접 Move 경로를 Control 전용으로 제한하면 `W`에서 Proxy drag가 다시 사라집니다.

## Context menu 계약

- `contextmenu`에서 `findSceneObjectAtEvent()`로 포인터 아래 실제 Curve/Proxy를 먼저 해석한다. 다른 root를 RMB로 고르면 sub-object mode를 안전하게 종료한다.
- Proxy 메뉴는 FFD 2/4/8, Edit/Finish Control Points, Reset/Remove, Smooth Shading, Show Edges를 제공한다.
- Curve 메뉴는 Average 세 명령, Point/Object 편집, Frame/Reset/Clone/Delete, Live Mesh `Enable in Viewport`를 제공한다.
- 항목은 panel/shortcut이 사용하는 owning function 또는 DOM command로 위임한다. 메뉴 전용 state mutation은 History, dirty/recovery, rebuild, UI sync가 갈라지므로 금지한다.
- 메뉴는 viewport 가장자리에서 `contextMenuPosition()`으로 화면 안에 clamp하며 바깥 pointerdown, Esc, blur, resize에서 닫힌다. hidden/locked root는 context target 자체가 아니므로 메뉴가 열리지 않는다.

## Camera projection 계약

- `Persp`는 토글과 무관하게 항상 `perspectiveCamera`를 사용한다.
- 전역 `P`는 현재 방향/target/화면 높이를 유지하며 Perspective로 투영만 바꾼다. ViewCube `⌂`와 상단 `Persp`는 기존 Home 방향으로 이동한다. 전역 `U`는 같은 viewing angle의 Orthographic User 뷰다.
- `Ortho Views` ON의 Front/Left/Back/Top 버튼과 ViewCube 표준 6면은 `orthographicCamera`를 사용해 깊이에 따른 크기 왜곡을 없앤다. OFF에서는 표준 6면도 `perspectiveCamera`를 사용한다.
- 카메라 전환 전후의 target·보이는 세로 높이·방향을 맞춰 화면 크기가 급변하지 않게 한다. Orthographic 줌은 FOV가 아닌 `zoom`/frustum으로 처리한다.
- active camera가 바뀐 즉시 `orbit.object`, 두 `TransformControls.camera`, picking/raycast에서 사용하는 `camera`를 같이 교체한다.
- Orthographic 상태에서 `#cameraFov`를 비활성화하고, resize는 Perspective aspect와 Orthographic frustum을 모두 갱신한다.
- ViewCube root는 매 frame active camera quaternion의 inverse를 사용해 월드 축이 카메라에서 보이는 방향을 표시한다. Front/Back/Left/Right/Top/Bottom 면은 `Ortho Views`를 따르고 edge/corner는 Perspective 사용자 뷰, `⌂` Home은 Perspective다.
- ViewCube 자유 drag는 카메라-대상 거리와 orbit target을 유지한 spherical 회전이며, 직교 면에서 시작하면 직교 자유 뷰를, 원근 뷰에서 시작하면 원근 자유 뷰를 유지한다. drag 뒤 표준 뷰 active button은 해제되고 `activeStandardView`는 `custom`이다.
- `viewCubeTargetFromPoint()`는 local hit에서 가장 큰 축 대비 threshold로 face/edge/corner를 구분한다. 클릭 영역 판정과 방향/up-vector는 DOM 없는 모듈이 소유하고 소형 Three.js renderer는 표시와 raycast만 담당한다.

## Picking 우선순위

`findSceneObjectAtEvent()`와 Curve 전용 picker는 raycast 후보를 만들기 전에 `canPickViewportObject()`로 hidden/locked root를 제외한다. 따라서 잠긴 객체는 LMB, RMB, Proxy 직접 drag, Edit/FFD click-through 어느 경로로도 Viewport에서 선택되지 않으며 그 뒤의 편집 가능한 객체는 계속 hit될 수 있다. Scene Explorer 행 선택은 이 필터를 사용하지 않아 상태 확인과 잠금 해제가 가능하다.

1. 현재 mode와 visibility가 Control pick을 허용하는지 검사한다.
2. `Ctrl/⌘ 또는 Alt + Control`이면 Transform/Axis Gizmo보다 먼저 membership 추가/토글/제외를 처리한다.
3. Axis guide drag 대상이면 축 제약을 처리한다.
4. FFD mode면 active lattice control hit를 검사한다.
5. Point/Handle control hit를 검사한다.
6. Insert mode면 선택 Curve의 근접 segment를 찾는다.
7. Curve line/generated mesh 또는 Proxy solid/edge를 `findSceneObjectAtEvent()`에서 가장 가까운 root selection으로 해석한다.
8. Orbit mode에서 Curve/Proxy가 잡히지 않으면 보이는 Front/Left/Back Plane을 선택하고 Move gizmo를 연다.
9. 빈 공간은 mode 계약에 따라 root deselect, sub-control deselect 또는 Point placement한다. `orbit`/`transform`은 `clearObjectSelection()`으로 완전한 무선택 상태가 되고, `edit`/`ffd`는 root를 유지한다.

## Rollout 패널 계약

- Create·Display와 활성 Modify 문맥의 `.rollout`은 새 페이지 로드에서 모두 `collapsed`로 시작한다. Export rollout은 기존처럼 열린 상태다.
- 헤더를 클릭하면 해당 DOM의 `collapsed`, `aria-expanded`, `aria-hidden`만 동기화한다. 탭 전환·mode 전환·프로젝트 복원은 rollout을 재초기화하지 않는다.
- rollout 열림 상태는 편집 데이터가 아니므로 History, `.hairmesh.json`, Recovery, local/session storage에 저장하지 않는다. 페이지를 새로 초기화하면 마크업 기본값으로 복귀한다.

## 변경 체크리스트

- 숨김/잠금 객체가 click, gizmo, numeric, shortcut 모든 경로에서 보호되는가?
- 잠긴 Curve/Proxy가 LMB·RMB·direct drag·Edit/FFD click-through 후보에서 빠지고, Scene Explorer에서는 여전히 선택·잠금 해제가 가능한가?
- Curve↔Proxy 선택 전환 시 Scene row, badge, `none|curve|proxy` Modify 문맥, gizmo가 같은 frame에 갱신되는가?
- 빈 Viewport 클릭 또는 단일 root 삭제 뒤 `selectedCurve`, `selectedProxy`, Curve/Control/FFD 선택 Set이 비고 Scene row·노란 선·lattice·gizmo가 사라지며 Modify가 `NONE`인가?
- `isTypingTarget()`이 text/number 입력 단축키 충돌을 막는가?
- Mode 전환 시 stale gizmo 또는 axis drag가 남지 않는가?
- Reference Plane과 Curve/Point TransformControls가 동시에 활성화되지 않고, 각 dragging 종료에서 OrbitControls와 Dirty 상태가 복구되는가?
- Perspective↔Orthographic 전환 후 Orbit, Curve/Point·Reference Plane picking, 두 gizmo가 active camera를 계속 사용하는가?
- `T/B/F/L/P/U`가 입력 필드 밖에서만 공식 3ds Max 방향/투영으로 전환되는가? `P/U`는 viewing angle을 유지하고 `V` 메뉴가 포인터 위치에서 열려 `V→K` Back과 클릭 Right를 제공하는가?
- ViewCube가 camera orbit을 실시간 반영하고 면 6개, edge/corner, Home, 방향키·Enter가 올바른 방향/up/projection으로 전환되는가? 좌클릭 drag는 자유 회전하며 click snap으로 오인되지 않는가?
- ViewCube가 메인 renderer canvas와 독립되어 drag 중에도 root selection과 History를 바꾸지 않고, 빈 공간 deselect, object/control picking, RMB, MMB navigation을 소비하지 않는가? 1024px에서 Hint/패널과 겹치지 않고 선택 배지는 우하단에 분리되는가?
- Plane을 Viewport에서 클릭해 선택할 수 있고 W/E/R/Q가 입력 필드 포커스와 충돌하지 않는가?
- Pointer cancel/up이 History transaction과 OrbitControls를 복구하는가?
- Axis Lines OFF가 긴 parent/child guide visibility와 guide raycast만 차단하고 기본 Translate XYZ gizmo 표시/입력과 다른 Point 선택은 유지하는가? Rotate/Scale gizmo도 유지되어야 한다.
- Ctrl/⌘ Anchor 토글이 Point 중앙의 Transform Gizmo에 가로막히지 않는가?
- FFD Point pick이 Move gizmo와 충돌하지 않고, E/R/Delete가 Proxy root 또는 lattice 구조를 우발 변경하지 않는가?
- 모든 선택 FFD Point가 click/Ctrl/Alt/Region/direct drag/restore 뒤 노란색 선택 표시를 공유하고 active Point만 더 큰가?
- `Edit Control Points` 재클릭이 mode, lattice, TransformControls를 함께 끄고 재진입이 선택을 복원하는가?
- MMB/Alt+MMB/Ctrl+Alt+MMB가 각각 Pan/Orbit/Zoom이고 LMB 빈 drag가 카메라를 회전하지 않는가?
- Window/Crossing marquee가 방향에 맞는 실선/점선으로 보이며 release 후 사라지는가?
- FFD/Curve 다중 선택 center와 direct/gizmo Move가 같은 control 집합을 움직이고 Esc 취소·Undo가 시작 상태를 복원하는가?
- Curve 다중 Point Rotate/Scale이 공통 중심에서 선택 Anchor·Tangent·단면을 함께 바꾸고 한 번의 Undo/Redo로 왕복하는가?
- Control x-ray/depth 설정과 visibility checkbox가 일치하는가?
- 1024px 폭에서도 topbar와 양쪽 panel의 기능에 접근 가능한가?
- Create·Modify·Display가 모두 닫힌 상태로 시작하고, 항목별 열림/닫힘과 ARIA 상태가 탭 왕복 후에도 유지되는가?
- 새 단축키가 README 및 도움말과 일치하는가?
- RMB 메뉴가 포인터 대상과 일치하고 Line draft를 취소하지 않으며 panel과 동일한 Undo/dirty/rebuild 결과를 만드는가?

## 검증

- Self-test: visible-control pick policy, axis guide enabled/visible interaction policy, axis vector/plane/scalar.
- 자동 Browser regression: `npm run test:viewport`가 `?selftest=1` 진단, 전역 `T/B/F/L/P/U`, `P` viewing-angle 보존, `V→K`, typing target 차단, ViewCube Front face/자유 drag/Right keyboard/Home·Ortho 연동·1024px bounds와 선택 보존, 우하단 선택 배지 분리, 빈 공간/단일 삭제 후 무선택, Axis Lines OFF/기본 XYZ helper 분리, Proxy 표면 drag와 한 단계 Undo, FFD Ctrl 다중 선택·노란 표시·동시 drag·편집 토글, FFD→다른 Proxy click-through, Proxy/Curve RMB 명령, 잠긴 Curve/Proxy의 LMB·RMB 선택 차단과 Scene Explorer recovery, 1024×768 overflow와 runtime error를 검사한다.
- Browser: 각 mode 전이, Curve/Proxy object·point·handle·FFD control·axis·Reference Plane picking, Window/Crossing/Ctrl/Alt region, FFD/Curve multi direct/gizmo Move, MMB Pan·Alt+MMB Orbit·Ctrl+Alt+MMB Zoom, drag cancel, input focus shortcut, hidden/locked protection, 객체별 Modify 전환, rollout 기본 닫힘·탭 왕복·페이지 재초기화, narrow viewport layout. Display 변경은 `viewport-display.md`의 수용 시나리오를 추가한다.
