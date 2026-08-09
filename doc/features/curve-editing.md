# Curve 편집 기능 계약

## 범위

Line 생성, Curve/Point/Handle 선택, Bézier 계산, Point topology 변경, 다중 선택/평균, Curve root와 Point 단면 Transform을 다룬다.

## 기능별 소유 심볼

| 기능 | Composition root 심볼/DOM | 순수 모듈 | 연관 상태 |
| --- | --- | --- | --- |
| Curve record | `makeCurveRecord()`, `curveFromState()` | — | `curves`, `nextCurveId` |
| Point record | `makePointRecord()`, `clonePointRecord()`, `pointState()`, `pointFromState()` | `geometry/bezier-handles.js` | `curve.points[]` |
| Bézier 평가 | `BezierChainCurve.getPoint()`, `.getTangent()` | `geometry/bezier-handles.js` | Point position/tangents |
| Line 생성 | `beginLineCreation()`, `addPoint()`, `finishLineCreation()`, `cancelLineCreation()` | `state/line-creation-policy.js` | `drawingCurve`, `creationPreviousCurve`, `mode` |
| Curve 선택 | `selectCurve()`, `toggleCurveSelection()`, `refreshCurveList()` | `state/curve-selection.js` | `selectedCurve`, `selectedCurveIds`, `lastControl` |
| Control 선택 | `selectControl()`, `selectAllCurvePoints()` | `state/point-selection.js`의 `pointTransformIndices()` 포함 | `selectedControl`, `selectedPointIndices` |
| Point split/insert | `splitCurveSegment()`, `insertPointAtRawParameter()`, `insertRelativeToSelected()` | — | `curve.points[]` |
| Point 제거 | `#deletePointBtn`, `finishPointTopologyChange()` | line minimum policy | selection + points |
| Knot/Handle | `setSelectedKnotType()`, `resetSelectedTangents()` | `geometry/bezier-handles.js` | tangent/type/mode fields |
| Average | `averageSelectedGeometry()`, `#averageAmount` | Point selection module | selected point set |
| Viewport RMB | `renderCurveContextMenu()`, `openViewportContextMenu()` | `ui/context-menu.js` 위치 clamp | active Curve/Point/Live state |
| Root Transform | `setObjectTransformMode()`, `handleGizmoChange()` | — | `curve.group` transform |
| Point/단면 Transform | `setPointTool()`, `applyPointGroupTransform()`, `handleGizmoChange()` | Handle constraint module | point position/offset/rotation/scale |
| 숫자 단면 | `updatePointPanel()`, `#applyPointValuesBtn`, `#makeTipBtn`, `#resetSectionBtn` | `ui/numeric-scrubber.js` | point section fields |

## Point 직렬화 스키마

```yaml
position: Vector3
inTangent: Vector3
outTangent: Vector3
handleMode: string
inHandleType: string
outHandleType: string
offset: Vector3
rotation: Quaternion
scaleX: number >= 0
scaleZ: number >= 0
```

필드 추가 시 `makePointRecord → clonePointRecord → pointState → pointFromState` 네 경로를 모두 수정한다. 선택/복제/Undo/프로젝트 열기에서 동일한 결과여야 한다.

## 핵심 전이

```text
beginLineCreation
  → draft curve + draw mode
  → addPoint × N
  ├── N < 2: finish 금지 또는 cancel
  ├── finish: curve 유지 + object/orbit
  └── finish-edit: curve 유지 + first point edit

point/handle transform
  → canEditCurve
  → history transaction
  → point/handle mutation
  → dependent handle refresh
  → control + curve visual update
  → optional live mesh rebuild
  → UI + gizmo sync
```

## 다중 선택 계약

- 일반 Point 클릭은 기존 Point 선택을 지우고 해당 Point 하나를 활성화한다.
- 활성 Curve의 Anchor를 `Ctrl/⌘` 클릭하면 `selectedPointIndices` membership을 토글한다. Handle 클릭은 단일 활성 Handle 선택을 유지한다.
- 마지막 Point도 해제할 수 있으며 이때 `selectedControl = null`, Gizmo detach, Point 편집 command disabled 상태가 된다. 일반 Anchor 클릭으로 다시 단일 선택한다.
- 일반 Scene Explorer Curve 행 클릭은 해당 Curve 하나만 선택한다.
- Curve 행 `Ctrl/⌘` 클릭은 `selectedCurveIds` membership을 토글한다. 새로 추가한 Curve가 `selectedCurve` 활성 대상이며, 활성 Curve를 해제하면 남은 선택 중 마지막 Curve가 활성화된다.
- 여러 Curve가 선택되어도 Modifier/Gizmo 명령은 활성 `selectedCurve` 하나만 대상으로 한다. 다중 Curve 삭제/변환은 이 계약의 범위가 아니다.
- Curve root 선택은 0개도 유효하다. Select/Object 모드의 빈 Viewport 클릭 또는 단일 Curve 삭제는 남은 첫 Curve를 강제 선택하지 않고 `selectedCurve = null`, 빈 `selectedCurveIds`를 유지한다. 다중 Curve 중 active 하나만 삭제한 경우에는 남아 있던 선택의 마지막 Curve가 active가 된다.
- Curve line/Live Mesh RMB는 포인터 아래 Curve를 활성화하고 Average, Curve Object, Live Mesh 명령을 제공한다. 각 메뉴 항목은 기존 panel/shortcut command를 호출하며 별도 편집 구현을 갖지 않는다.
- 잠긴 Curve는 Viewport의 line/Live Mesh/control pick과 RMB 대상에서 제외한다. Scene Explorer 행은 계속 선택할 수 있어 잠금 상태를 확인하고 해제할 수 있다.
- Point Move·Rotate·Scale은 선택된 Anchor 전체를 대상으로 하며 gizmo는 선택 위치의 평균 중심에 놓인다. Rotate/Scale은 그 공통 중심을 기준으로 모든 선택 Anchor, Tangent, 단면 변환을 함께 갱신한다. Section Move·Rotate·Scale과 개별 Bézier Handle 이동은 활성 Point 하나만 대상으로 한다.

## 변경 체크리스트

- 숨김/잠금 Curve에서 모든 진입 경로가 차단되는가?
- Point index 변경 후 `selectedControl`, `selectedPointIndices`, `lastControl`이 유효한가?
- Point 선택 0개와 Curve 선택 0개 상태에서 stale Gizmo/command가 남지 않는가?
- Scene 다중 선택에서 `selectedCurve`가 항상 `selectedCurveIds` 안의 활성 Curve인가?
- Point topology 변경 후 Control object와 curve line이 재구성되는가?
- Handle 이동 후 aligned/automatic 의존 Handle이 갱신되는가?
- Live Mesh가 켜져 있으면 단 한 번의 의미 있는 rebuild가 일어나는가?
- Drag 또는 연속 input이 한 번의 Undo로 복원되는가?
- 다중 Anchor 선택 후 Point Move·Rotate·Scale의 gizmo가 공통 중심에 있고 선택 전체가 한 번의 Undo로 함께 복원되는가?
- RMB Average/Object/Live Mesh 명령이 panel과 동일한 editability, History, Live 상태 전이를 사용하는가?

## 검증

- Node: line minimum, Point/Curve selection normalize/toggle/active fallback, Point group transform 대상 집합.
- Self-test: Bézier handle finite/constraint 관련 검사.
- Browser: create/cancel/finish, Ctrl/⌘ Point 토글과 0개 해제/재선택, Scene Curve 행 다중 선택/활성 전환, split/delete, multi-select average, handle mode, 다중 Point 공통 중심 Move/Rotate/Scale, 단일 Point section transform, Curve RMB Average/Object/Live toggle, Undo/Redo.
