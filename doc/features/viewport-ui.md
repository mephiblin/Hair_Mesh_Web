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
| Picking | `findControl()`, `selectControl()`, `findFfdControl()`, `selectFfdControl()`, `findSceneObjectAtEvent()`, `handleViewportClick()` | `interaction-policy.js`, `point-selection.js` |
| Region selection | `beginSelectionRegion()`, `updateSelectionMarquee()`, `finishSelectionRegion()` | `control-selection.js`, `region-selection.js` |
| Direct Control Move | `beginDirectControlMove()`, `updateDirectControlMove()`, `finishDirectControlMove()` | 선택 중심 `gizmoContext` 공유 |
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

- LMB는 선택과 Control 직접 이동에만 사용하며 카메라 회전에 쓰지 않는다.
- MMB drag는 Pan, Alt+MMB drag는 Orbit, Ctrl+Alt+MMB drag는 Zoom이다. Wheel Zoom도 유지한다.
- `Q`는 Select/Object mode, `W/E/R`은 Move/Rotate/Scale, `Z`는 Frame Selected다.
- FFD와 Curve Anchor의 빈 영역 LMB drag는 Rectangle Region이다. 좌→우 Window, 우→좌 Crossing 자동 방향을 사용한다.
- Region의 Ctrl/⌘는 Add, Alt는 Remove다. Control Ctrl/⌘ 클릭은 기존 사용자 계약대로 Add/Toggle이고 Alt 클릭은 Remove다.
- Move 도구에서 선택 Control을 직접 drag하면 camera-facing plane을 따라 이동하며, 선택이 여러 개면 selection center gizmo와 같은 집합을 움직인다.
- Direct drag 도중 Esc/pointer cancel은 시작 snapshot으로 되돌리고 History entry를 취소한다.

## Camera projection 계약

- `Persp`는 토글과 무관하게 항상 `perspectiveCamera`를 사용한다.
- `Ortho Views` ON의 Front/Left/Back/Top은 `orthographicCamera`를 사용해 깊이에 따른 크기 왜곡을 없앤다. OFF에서는 표준 뷰도 `perspectiveCamera`를 사용한다.
- 카메라 전환 전후의 target·보이는 세로 높이·방향을 맞춰 화면 크기가 급변하지 않게 한다. Orthographic 줌은 FOV가 아닌 `zoom`/frustum으로 처리한다.
- active camera가 바뀐 즉시 `orbit.object`, 두 `TransformControls.camera`, picking/raycast에서 사용하는 `camera`를 같이 교체한다.
- Orthographic 상태에서 `#cameraFov`를 비활성화하고, resize는 Perspective aspect와 Orthographic frustum을 모두 갱신한다.

## Picking 우선순위

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
- Curve↔Proxy 선택 전환 시 Scene row, badge, `none|curve|proxy` Modify 문맥, gizmo가 같은 frame에 갱신되는가?
- `isTypingTarget()`이 text/number 입력 단축키 충돌을 막는가?
- Mode 전환 시 stale gizmo 또는 axis drag가 남지 않는가?
- Reference Plane과 Curve/Point TransformControls가 동시에 활성화되지 않고, 각 dragging 종료에서 OrbitControls와 Dirty 상태가 복구되는가?
- Perspective↔Orthographic 전환 후 Orbit, Curve/Point·Reference Plane picking, 두 gizmo가 active camera를 계속 사용하는가?
- Plane을 Viewport에서 클릭해 선택할 수 있고 W/E/R/Q가 입력 필드 포커스와 충돌하지 않는가?
- Pointer cancel/up이 History transaction과 OrbitControls를 복구하는가?
- Axis Lines OFF가 parent/child guide visibility, guide raycast, Translate gizmo 표시/입력을 모두 차단하고 다른 Point 선택을 막지 않는가? Rotate/Scale gizmo는 유지되어야 한다.
- Ctrl/⌘ Anchor 토글이 Point 중앙의 Transform Gizmo에 가로막히지 않는가?
- FFD Point pick이 Move gizmo와 충돌하지 않고, E/R/Delete가 Proxy root 또는 lattice 구조를 우발 변경하지 않는가?
- MMB/Alt+MMB/Ctrl+Alt+MMB가 각각 Pan/Orbit/Zoom이고 LMB 빈 drag가 카메라를 회전하지 않는가?
- Window/Crossing marquee가 방향에 맞는 실선/점선으로 보이며 release 후 사라지는가?
- FFD/Curve 다중 선택 center와 direct/gizmo Move가 같은 control 집합을 움직이고 Esc 취소·Undo가 시작 상태를 복원하는가?
- Control x-ray/depth 설정과 visibility checkbox가 일치하는가?
- 1024px 폭에서도 topbar와 양쪽 panel의 기능에 접근 가능한가?
- Create·Modify·Display가 모두 닫힌 상태로 시작하고, 항목별 열림/닫힘과 ARIA 상태가 탭 왕복 후에도 유지되는가?
- 새 단축키가 README 및 도움말과 일치하는가?

## 검증

- Self-test: visible-control pick policy, axis guide enabled/visible interaction policy, axis vector/plane/scalar.
- Browser: 각 mode 전이, Curve/Proxy object·point·handle·FFD control·axis·Reference Plane picking, Window/Crossing/Ctrl/Alt region, FFD/Curve multi direct/gizmo Move, MMB Pan·Alt+MMB Orbit·Ctrl+Alt+MMB Zoom, drag cancel, input focus shortcut, hidden/locked protection, 객체별 Modify 전환, rollout 기본 닫힘·탭 왕복·페이지 재초기화, narrow viewport layout. Display 변경은 `viewport-display.md`의 수용 시나리오를 추가한다.
