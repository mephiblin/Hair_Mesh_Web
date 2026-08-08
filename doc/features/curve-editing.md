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
| Curve 선택 | `selectCurve()`, `refreshCurveList()` | `state/curve-policy.js` | `selectedCurve`, `lastControl` |
| Control 선택 | `selectControl()`, `selectAllCurvePoints()` | `state/point-selection.js` | `selectedControl`, `selectedPointIndices` |
| Point split/insert | `splitCurveSegment()`, `insertPointAtRawParameter()`, `insertRelativeToSelected()` | — | `curve.points[]` |
| Point 제거 | `#deletePointBtn`, `finishPointTopologyChange()` | line minimum policy | selection + points |
| Knot/Handle | `setSelectedKnotType()`, `resetSelectedTangents()` | `geometry/bezier-handles.js` | tangent/type/mode fields |
| Average | `averageSelectedGeometry()`, `#averageAmount` | Point selection module | selected point set |
| Root Transform | `setObjectTransformMode()`, `handleGizmoChange()` | — | `curve.group` transform |
| Point/단면 Transform | `setPointTool()`, `applyPointUnitTransform()`, `handleGizmoChange()` | Handle constraint module | point position/offset/rotation/scale |
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

## 변경 체크리스트

- 숨김/잠금 Curve에서 모든 진입 경로가 차단되는가?
- Point index 변경 후 `selectedControl`, `selectedPointIndices`, `lastControl`이 유효한가?
- Point topology 변경 후 Control object와 curve line이 재구성되는가?
- Handle 이동 후 aligned/automatic 의존 Handle이 갱신되는가?
- Live Mesh가 켜져 있으면 단 한 번의 의미 있는 rebuild가 일어나는가?
- Drag 또는 연속 input이 한 번의 Undo로 복원되는가?

## 검증

- Node: line minimum, point selection normalization.
- Self-test: Bézier handle finite/constraint 관련 검사.
- Browser: create/cancel/finish, split/delete, multi-select average, handle mode, root/point/section transform, Undo/Redo.
