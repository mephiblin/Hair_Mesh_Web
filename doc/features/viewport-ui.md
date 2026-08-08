# Viewport·UI 기능 계약

## 범위

Scene 초기화, picking, mode, TransformControls, axis guide, keyboard과 패널 availability를 다룬다. 재질·조명·Reference Wire·Grid는 [`viewport-display.md`](viewport-display.md)가 소유한다.

## 기능별 소유 심볼

| 기능 | 심볼/DOM | 보조 모듈 |
| --- | --- | --- |
| Scene/Camera/Renderer | `scene`, `camera`, `perspectiveCamera`, `orthographicCamera`, `renderer`, `orbit`, `animate()` | Three.js CDN imports |
| Camera projection | `#orthographicViewsToggleBtn`, `useViewportCamera()`, `setStandardView()` | `viewport-settings.js` |
| Resize/frame | `resize()`, `setOrthographicFrustumHeight()`, `fitObject()`, `frameSelected()` | `matchedOrthographicHeight()` |
| Control visual | `rebuildControlVisuals()`, `updateControlVisuals()`, `applyControlAppearance()` | curve policy |
| Visibility | `updateControlVisibility()`, `updateCurveSelectionStyles()` | viewport interaction policy |
| Picking | `findControl()`, `selectControl()`, `findFfdControl()`, `selectFfdControl()`, `findSceneObjectAtEvent()`, `handleViewportClick()` | `interaction-policy.js`의 `canPickViewportObject()`, `point-selection.js` |
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
- FFD와 Curve Anchor의 빈 영역 LMB drag는 Rectangle Region이다. 좌→우 Window, 우→좌 Crossing 자동 방향을 사용한다.
- Region의 Ctrl/⌘는 Add, Alt는 Remove다. Control Ctrl/⌘ 클릭은 기존 사용자 계약대로 Add/Toggle이고 Alt 클릭은 Remove다.
- Move 도구에서 선택 Control을 직접 drag하면 camera-facing plane을 따라 이동하며, 선택이 여러 개면 selection center gizmo와 같은 집합을 움직인다.
- Proxy Object Move 모드에서 Proxy 표면을 직접 drag하면 camera-facing plane을 따라 root object가 이동한다. FFD/Edit에서 drag되지 않은 click은 Scene object 선택으로 전달해 다른 Proxy 선택을 막지 않는다.
- Direct drag 도중 Esc/pointer cancel은 시작 snapshot으로 되돌리고 History entry를 취소한다.
- RMB는 카메라를 조작하지 않고 포인터 아래 Curve/Proxy를 대상으로 context menu를 연다. Line 생성 중 RMB는 draft를 취소하거나 선택을 바꾸지 않는다.

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

Region은 pointerdown에서 잠정 시작하므로 click/drag 분기는 반드시 release 시 이동 임계값으로 결정합니다. `finishSelectionRegion()`에서 click fallback을 제거하면 FFD/Edit mode가 Scene object selection을 삼키며, Proxy 표면 직접 Move 경로를 Control 전용으로 제한하면 `W`에서 Proxy drag가 다시 사라집니다.

## Context menu 계약

- `contextmenu`에서 `findSceneObjectAtEvent()`로 포인터 아래 실제 Curve/Proxy를 먼저 해석한다. 다른 root를 RMB로 고르면 sub-object mode를 안전하게 종료한다.
- Proxy 메뉴는 FFD 2/4/8, Edit/Finish Control Points, Reset/Remove, Smooth Shading, Show Edges를 제공한다.
- Curve 메뉴는 Average 세 명령, Point/Object 편집, Frame/Reset/Clone/Delete, Live Mesh `Enable in Viewport`를 제공한다.
- 항목은 panel/shortcut이 사용하는 owning function 또는 DOM command로 위임한다. 메뉴 전용 state mutation은 History, dirty/recovery, rebuild, UI sync가 갈라지므로 금지한다.
- 메뉴는 viewport 가장자리에서 `contextMenuPosition()`으로 화면 안에 clamp하며 바깥 pointerdown, Esc, blur, resize에서 닫힌다. hidden/locked root는 context target 자체가 아니므로 메뉴가 열리지 않는다.

## Camera projection 계약

- `Persp`는 토글과 무관하게 항상 `perspectiveCamera`를 사용한다.
- `Ortho Views` ON의 Front/Left/Back/Top은 `orthographicCamera`를 사용해 깊이에 따른 크기 왜곡을 없앤다. OFF에서는 표준 뷰도 `perspectiveCamera`를 사용한다.
- 카메라 전환 전후의 target·보이는 세로 높이·방향을 맞춰 화면 크기가 급변하지 않게 한다. Orthographic 줌은 FOV가 아닌 `zoom`/frustum으로 처리한다.
- active camera가 바뀐 즉시 `orbit.object`, 두 `TransformControls.camera`, picking/raycast에서 사용하는 `camera`를 같이 교체한다.
- Orthographic 상태에서 `#cameraFov`를 비활성화하고, resize는 Perspective aspect와 Orthographic frustum을 모두 갱신한다.

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
9. 빈 공간은 mode 계약에 따라 deselect 또는 Point placement한다.

## Rollout 패널 계약

- Create·Display와 활성 Modify 문맥의 `.rollout`은 새 페이지 로드에서 모두 `collapsed`로 시작한다. Export rollout은 기존처럼 열린 상태다.
- 헤더를 클릭하면 해당 DOM의 `collapsed`, `aria-expanded`, `aria-hidden`만 동기화한다. 탭 전환·mode 전환·프로젝트 복원은 rollout을 재초기화하지 않는다.
- rollout 열림 상태는 편집 데이터가 아니므로 History, `.hairmesh.json`, Recovery, local/session storage에 저장하지 않는다. 페이지를 새로 초기화하면 마크업 기본값으로 복귀한다.

## 변경 체크리스트

- 숨김/잠금 객체가 click, gizmo, numeric, shortcut 모든 경로에서 보호되는가?
- 잠긴 Curve/Proxy가 LMB·RMB·direct drag·Edit/FFD click-through 후보에서 빠지고, Scene Explorer에서는 여전히 선택·잠금 해제가 가능한가?
- Curve↔Proxy 선택 전환 시 Scene row, badge, `none|curve|proxy` Modify 문맥, gizmo가 같은 frame에 갱신되는가?
- `isTypingTarget()`이 text/number 입력 단축키 충돌을 막는가?
- Mode 전환 시 stale gizmo 또는 axis drag가 남지 않는가?
- Reference Plane과 Curve/Point TransformControls가 동시에 활성화되지 않고, 각 dragging 종료에서 OrbitControls와 Dirty 상태가 복구되는가?
- Perspective↔Orthographic 전환 후 Orbit, Curve/Point·Reference Plane picking, 두 gizmo가 active camera를 계속 사용하는가?
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
- Control x-ray/depth 설정과 visibility checkbox가 일치하는가?
- 1024px 폭에서도 topbar와 양쪽 panel의 기능에 접근 가능한가?
- Create·Modify·Display가 모두 닫힌 상태로 시작하고, 항목별 열림/닫힘과 ARIA 상태가 탭 왕복 후에도 유지되는가?
- 새 단축키가 README 및 도움말과 일치하는가?
- RMB 메뉴가 포인터 대상과 일치하고 Line draft를 취소하지 않으며 panel과 동일한 Undo/dirty/rebuild 결과를 만드는가?

## 검증

- Self-test: visible-control pick policy, axis guide enabled/visible interaction policy, axis vector/plane/scalar.
- 자동 Browser regression: `npm run test:viewport`가 `?selftest=1` 진단, Axis Lines OFF/기본 XYZ helper 분리, Proxy 표면 drag와 한 단계 Undo, FFD Ctrl 다중 선택·노란 표시·동시 drag·편집 토글, FFD→다른 Proxy click-through, Proxy/Curve RMB 명령, 잠긴 Curve/Proxy의 LMB·RMB 선택 차단과 Scene Explorer recovery, 1024×768 overflow와 runtime error를 검사한다.
- Browser: 각 mode 전이, Curve/Proxy object·point·handle·FFD control·axis·Reference Plane picking, Window/Crossing/Ctrl/Alt region, FFD/Curve multi direct/gizmo Move, MMB Pan·Alt+MMB Orbit·Ctrl+Alt+MMB Zoom, drag cancel, input focus shortcut, hidden/locked protection, 객체별 Modify 전환, rollout 기본 닫힘·탭 왕복·페이지 재초기화, narrow viewport layout. Display 변경은 `viewport-display.md`의 수용 시나리오를 추가한다.
