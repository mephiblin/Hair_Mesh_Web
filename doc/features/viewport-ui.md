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
| Picking | `findControl()`, `findCurveAtEvent()`, `handleViewportClick()` | `src/viewport/interaction-policy.js` |
| Surface/free placement | `pointOnSurface()`, `pointInFreePlane()` | raycaster |
| Mode | `setMode()`, `leaveLineCreationForMode()`, `updateHint()` | line creation policy |
| Gizmo | `syncGizmo()`, `beginGizmoDrag()`, `handleGizmoChange()`, `endGizmoDrag()` | TransformControls |
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

## Picking 우선순위

1. 현재 mode와 visibility가 Control pick을 허용하는지 검사한다.
2. Axis guide drag 대상이면 축 제약을 우선 처리한다.
3. Point/Handle control hit를 검사한다.
4. Insert mode면 선택 Curve의 근접 segment를 찾는다.
5. Curve line 또는 generated mesh를 Curve selection으로 해석한다.
6. 빈 공간은 mode 계약에 따라 deselect 또는 Point placement한다.

## 변경 체크리스트

- 숨김/잠금 객체가 click, gizmo, numeric, shortcut 모든 경로에서 보호되는가?
- `isTypingTarget()`이 text/number 입력 단축키 충돌을 막는가?
- Mode 전환 시 stale gizmo 또는 axis drag가 남지 않는가?
- Pointer cancel/up이 History transaction과 OrbitControls를 복구하는가?
- Control x-ray/depth 설정과 visibility checkbox가 일치하는가?
- 1024px 폭에서도 topbar와 양쪽 panel의 기능에 접근 가능한가?
- 새 단축키가 README 및 도움말과 일치하는가?

## 검증

- Self-test: visible-control pick policy, axis vector/plane/scalar.
- Browser: 각 mode 전이, object/point/handle/axis picking, drag cancel, input focus shortcut, hidden/locked protection, narrow viewport layout. Display 변경은 `viewport-display.md`의 수용 시나리오를 추가한다.
