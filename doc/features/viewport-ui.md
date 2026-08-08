# Viewport·UI 기능 계약

## 범위

Scene 초기화, picking, mode, TransformControls, axis guide, keyboard과 패널 availability를 다룬다. 재질·조명·Reference Wire·Grid는 [`viewport-display.md`](viewport-display.md)가 소유한다.

## 기능별 소유 심볼

| 기능 | 심볼/DOM | 보조 모듈 |
| --- | --- | --- |
| Scene/Camera/Renderer | `scene`, `camera`, `renderer`, `orbit`, `animate()` | Three.js CDN imports |
| Resize/frame | `resize()`, `fitObject()`, `frameSelected()` | — |
| Control visual | `rebuildControlVisuals()`, `updateControlVisuals()`, `applyControlAppearance()` | curve policy |
| Visibility | `updateControlVisibility()`, `updateCurveSelectionStyles()` | viewport interaction policy |
| Picking | `findControl()`, `selectControl()`, `findCurveAtEvent()`, `handleViewportClick()` | `interaction-policy.js`, `point-selection.js` |
| Surface/free placement | `pointOnSurface()`, `pointInFreePlane()` | raycaster |
| Mode | `setMode()`, `leaveLineCreationForMode()`, `updateHint()` | line creation policy |
| Curve/Point Gizmo | `syncGizmo()`, `beginGizmoDrag()`, `handleGizmoChange()`, `endGizmoDrag()` | `transformControls` |
| Reference Plane Gizmo | `setReferenceImageTransformTool()`, `syncReferenceImageTransformControls()`, `updateReferenceImageTransformFromPlane()` | `referenceImageTransformControls` |
| Axis guides | `syncAxisGuides()`, `startAxisGuideDrag()`, `updateAxisGuideDrag()` | `src/viewport/axis-guide-drag.js` |
| UI availability | `updateCommandAvailability()`, `updatePointToolButtons()` | curve editability policy |
| Curve mesh view | `applyViewModeToCurve()`, `#viewMode` | `viewport-display.md` |
| Keyboard | `isTypingTarget()`, document `keydown` listener | README shortcut table |
| Numeric scrub | `initNumericScrubbers()` | `src/ui/numeric-scrubber.js` |

## Mode 전이

```yaml
orbit: camera/object selection
draw: draft Point placement
edit: Point/Handle/section edit
insert: nearest curve segment split
transform: Curve root transform
```

모드 변경 시 함께 동기화할 것: select value, toolbar active state, status mode, hint, OrbitControls enabled, TransformControls attachment, control visibility, axis guide, command availability.

Reference Plane은 Curve mode와 별개의 `translate | rotate | scale | none` 도구 상태를 가진다. Plane gizmo를 켜면 앱 mode를 `orbit`으로 전환해 Curve/Point gizmo와 동시에 나타나지 않게 한다. 반대로 `edit`, `insert`, `transform`, `draw`로 들어가면 Plane gizmo를 숨긴다. `W/E/R`은 Plane gizmo가 활성화된 동안 Plane 도구를 바꾸며 `Q`는 gizmo를 숨긴다.

## Picking 우선순위

1. 현재 mode와 visibility가 Control pick을 허용하는지 검사한다.
2. `Ctrl/⌘ + Anchor`이면 Transform/Axis Gizmo보다 먼저 Point membership 토글을 처리한다.
3. Axis guide drag 대상이면 축 제약을 처리한다.
4. Point/Handle control hit를 검사한다.
5. Insert mode면 선택 Curve의 근접 segment를 찾는다.
6. Curve line 또는 generated mesh를 Curve selection으로 해석한다.
7. Orbit mode에서 Curve가 잡히지 않으면 보이는 Front/Left/Back Plane을 선택하고 Move gizmo를 연다.
8. 빈 공간은 mode 계약에 따라 deselect 또는 Point placement한다.

## 변경 체크리스트

- 숨김/잠금 객체가 click, gizmo, numeric, shortcut 모든 경로에서 보호되는가?
- `isTypingTarget()`이 text/number 입력 단축키 충돌을 막는가?
- Mode 전환 시 stale gizmo 또는 axis drag가 남지 않는가?
- Reference Plane과 Curve/Point TransformControls가 동시에 활성화되지 않고, 각 dragging 종료에서 OrbitControls와 Dirty 상태가 복구되는가?
- Plane을 Viewport에서 클릭해 선택할 수 있고 W/E/R/Q가 입력 필드 포커스와 충돌하지 않는가?
- Pointer cancel/up이 History transaction과 OrbitControls를 복구하는가?
- Axis Lines OFF가 parent/child guide visibility, guide raycast, Translate gizmo 표시/입력을 모두 차단하고 다른 Point 선택을 막지 않는가? Rotate/Scale gizmo는 유지되어야 한다.
- Ctrl/⌘ Anchor 토글이 Point 중앙의 Transform Gizmo에 가로막히지 않는가?
- Control x-ray/depth 설정과 visibility checkbox가 일치하는가?
- 1024px 폭에서도 topbar와 양쪽 panel의 기능에 접근 가능한가?
- 새 단축키가 README 및 도움말과 일치하는가?

## 검증

- Self-test: visible-control pick policy, axis guide enabled/visible interaction policy, axis vector/plane/scalar.
- Browser: 각 mode 전이, object/point/handle/axis/Reference Plane picking, Plane Move/Rotate/Scale drag, drag cancel, input focus shortcut, hidden/locked protection, narrow viewport layout. Display 변경은 `viewport-display.md`의 수용 시나리오를 추가한다.
