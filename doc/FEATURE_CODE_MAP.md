# 기능별 코드 지도

이 문서는 사용자 기능에서 구현 코드로 이동하기 위한 지도입니다. `curve_mesh_hair_tool_v4.html`의 줄 번호는 현재 버전 기준이며, 실제 수정 시에는 함께 적힌 함수명이나 DOM ID를 `rg`로 검색하십시오.

## 전체 실행 흐름

```text
launch_server.py
  → curve_mesh_hair_tool_v4.html
    → Three.js/CDN 모듈 + src/* 정책 모듈 import
      → DOM 이벤트
        → 앱 상태 변경
          → Curve/Control 시각화 및 Live Mesh 재생성
            → History + 자동 복구
```

## 기능 빠른 찾기

| 사용자 기능 | 주 진입점/DOM | 핵심 구현 | 보조 모듈·검증 |
| --- | --- | --- | --- |
| 앱 실행 | `launch_server.py:main()` | 로컬 서버 생성, 빈 포트 선택, 브라우저 열기 | 수동 HTTP 200 확인 |
| Three.js 초기화/렌더 | `#viewport`, `animate()` | HTML 약 304–445, 2664 이후의 Scene/Camera/Renderer/Controls | 브라우저 Self-test |
| 기준 모델 Import | `#modelFile`, `loadModel()` | `normalizeMaterials()`, `fitObject()`, `applyModelDisplay()` | OBJ/FBX/GLTF Loader, 실제 브라우저 QA |
| 표면/평면 Point 배치 | `#drawTarget`, `pointOnSurface()`, `pointInFreePlane()` | Raycaster로 모델 표면 또는 카메라 평면 좌표 계산 | `src/state/line-creation-policy.js` |
| Line 생성/완료/취소 | `#newCurveBtn`, `beginLineCreation()`, `finishLineCreation()`, `cancelLineCreation()` | Draft curve 생성, 최소 Point 검사, 이전 선택 복원 | Node의 `line creation requires two points` |
| Curve/Point 선택 | `selectCurve()`, `selectControl()`, `#curveList` | 선택 상태, Point 다중 선택, UI/Gizmo 동기화 | `src/state/point-selection.js` |
| Curve 표시/잠금 | `setCurveVisible()`, `setCurveLocked()` | Scene row와 편집 가능 상태 동기화 | `src/state/curve-policy.js` 및 정책 테스트 |
| Curve 복제/삭제 | `#duplicateCurveBtn`, `deleteSelectedCurve()` | Curve state 복제/폐기와 History transaction | 브라우저 QA + Undo/Redo |
| Bézier 곡선 평가 | `BezierChainCurve` | `getPoint()`, `getTangent()`이 Cubic Bézier 계산 | `src/geometry/bezier-handles.js` |
| Handle/Knot 편집 | `setSelectedKnotType()`, `resetSelectedTangents()` | Handle 모드 적용, 인접 Handle 재계산 | `bezier-handles.js`, Self-test |
| Point 추가/분할/삭제 | `addPoint()`, `splitCurveSegment()`, `insertRelativeToSelected()` | 곡선 형상을 유지하는 Segment split과 selection 갱신 | `line-creation-policy.js`, 브라우저 QA |
| Point 평균화 | `averageSelectedGeometry()` | 선택 Point 위치/Handle을 Amount만큼 평균화 | `#averageAmount`, 실제 브라우저 QA |
| Curve Root Transform | `setObjectTransformMode()`, `handleGizmoChange()` | `curve.group`의 Position/Quaternion/Scale 변경 | TransformControls, History |
| Point Transform | `setPointTool()`, `applyPointUnitTransform()`, `handleGizmoChange()` | Point, Handle, 단면 Transform을 선택 문맥에 맞게 적용 | `coordinateFrameQuaternion()` |
| 축 가이드 이동 | `toggleAxisGuides()`, `startAxisGuideDrag()`, `updateAxisGuideDrag()` | 화면 Pick → 제약 평면 → 축 Scalar 적용 | `src/viewport/axis-guide-drag.js`, Self-test |
| 단면 수치 편집 | `#applyPointValuesBtn`, `updatePointPanel()` | Position/Offset/Scale/Rotation 입력과 Live rebuild | `src/ui/numeric-scrubber.js` |
| Tip/단면 초기화 | `#makeTipBtn`, `#resetSectionBtn` | Point의 `scaleX/scaleZ` 또는 단면 Transform 초기화 | History + 브라우저 QA |
| Sweep 좌표계 | `buildSweepContext()`, `evaluateSweep()` | Curve상의 Point/Tangent/Normal/Binormal 생성 | `src/geometry/sweep-frames.js`, Self-test |
| Ribbon 생성 | `makeRibbonTopology()` | 경로 양쪽 Vertex, Face, UV 구성 | `makeTopologyForCurve()` |
| Tube 생성 | `makeTubeTopology()` | 타원형 Ring, Side Face, 선택적 Start/End Cap 구성 | `mesh-limits.js`, Self-test |
| Mesh Brush Import | `#brushFiles`, `loadBrushFiles()` | OBJ 또는 Object3D를 Brush topology로 변환 | `parseOBJTopology()`, `topologyFromObject3D()` |
| Mesh Brush Sweep | `makeBrushTopology()` | Imported cross-section을 Sweep frame에 배치 | Fixture `tests/fixtures/quad-brush.obj` |
| Live Mesh 생성 | `#generateBtn`, `rebuildCurveMesh()` | 설정 정규화 → topology → BufferGeometry → Scene 부착 | `curve-policy.js`, `mesh-limits.js` |
| Live 오류/해제 | `failCurveMesh()`, `removeCurveMesh()` | topology/Scene 자원 정리와 `disabled/error/ready` 상태 관리 | `hasReadyMesh()` 정책 테스트 |
| Solid/Wire 표시 | `#viewMode`, `applyViewModeToCurve()` | Solid Mesh/Wire Mesh visibility 전환 | 브라우저 QA |
| 프로젝트 저장 | `#saveProjectBtn`, `saveProject()` | 앱 상태 캡처 → versioned document → JSON 다운로드 | `src/state/project-format.js`, Node round-trip 테스트 |
| 프로젝트 열기 | `#projectFileInput`, `openProjectFile()` | JSON 검증 → state restore → History 초기화 | future/unrelated document 거부 테스트 |
| 자동 복구 | `RECOVERY_KEY`, `scheduleRecovery()`, `restoreRecovery()` | localStorage에 debounce 저장하고 시작 시 복원 | 브라우저 reload QA |
| Undo/Redo | `history`, `history.begin()/commit()` | 변경 전 snapshot과 transaction label 관리 | `src/state/history.js`, Node 양방향 복원 테스트 |
| OBJ Export | `#exportQuadObjBtn`, `exportQuadOBJ()` | World Transform/축/Scale 적용 후 논리 Quad/N-gon 직렬화 | 대상 DCC Import 확인 |
| FBX Export | `#exportFbxBtn`, `exportAsciiFBX()` | FBX 7.4 ASCII Geometry/Normal/UV 작성 | 실험 기능, 대상 DCC Import 확인 |
| 단축키 | `document.addEventListener('keydown', ...)` | 저장, History, 선택, 모드, Transform dispatch | README 단축키 표와 함께 갱신 |
| 내장 진단 | URL `?selftest=1`, `runCoreSelfChecks()` | 순수 Geometry/Policy smoke test 실행 후 전역 결과 노출 | `src/diagnostics/core-self-check.js` |

## 핵심 상태의 코드 위치

전역 런타임 상태는 `curve_mesh_hair_tool_v4.html`의 import 직후, `BezierChainCurve` 선언 앞에 있습니다.

| 상태 | 의미 | 생성/직렬화 위치 |
| --- | --- | --- |
| `curves` | 편집 중인 Curve record 배열 | `makeCurveRecord()`, `captureAppState()` |
| `selectedCurve` | 현재 UI/Transform 대상 Curve | `selectCurve()`, `restoreAppState()` |
| `selectedControl` | Point 또는 in/out Handle 선택 | `selectControl()`, `captureAppState()` |
| `selectedPointIndices` | 다중 Point 선택 Set | `src/state/point-selection.js`로 정규화 |
| `drawingCurve` | 아직 완료하지 않은 Line draft | `beginLineCreation()`/`finishLineCreation()` |
| `brushes` | Import된 Brush topology 배열 | `brushState()`/`brushFromState()` |
| `mode` | `orbit`, `draw`, `edit`, `insert`, `transform` | `setMode()`, 키보드/Toolbar event |
| `projectDirty` | 마지막 명시 저장 이후 변경 여부 | `markProjectChanged()`, `updateProjectStatus()` |
| `history` | Undo/Redo snapshot controller | `createHistory(...)` 생성부 |

## Curve record 구조

`makeCurveRecord()`와 `curveFromState()`가 같은 계약을 유지해야 합니다.

```text
curve
├── id, name
├── visible, locked
├── group                       # Curve root Object3D/transform
├── points[]                    # position, tangents, section transform
├── lastControl                 # Curve별 마지막 편집 위치
├── visualGroup/controlObjects  # Curve/Point/Handle 표시 객체
├── meshGroup/solidMesh/wireMesh
├── topology                    # logical positions/faces/uvs/faceUvs
├── meshEnabled/status/error
└── settings                    # type, dimensions, segments, brush, UV 등
```

Point record의 스키마는 `makePointRecord()`, `pointState()`, `pointFromState()`를 함께 확인합니다. 필드를 추가할 때 세 함수와 `clonePointRecord()`를 동시에 바꾸지 않으면 저장/복제/Undo에서 데이터가 사라질 수 있습니다.

## Live Mesh 호출 경로

```text
UI 설정 변경 또는 Point/Handle Transform
  → getCurrentSettings()
  → rebuildCurveMesh(curve)
    → makeTopologyForCurve(curve)
      ├── makeRibbonTopology()
      ├── makeTubeTopology()
      └── makeBrushTopology()
    → topologyToGeometry()
    → solidMesh + wireMesh 생성
    → applyViewModeToCurve()
    → updateMeshStats()
```

메시 관련 변경에서는 `normalizeMeshBudget()` 제한과 `meshStatus`의 `disabled | ready | error` 의미를 유지해야 합니다. 단순히 `meshEnabled === true`인 것만으로 성공 상태로 표시하면 안 됩니다.

## 저장과 History 호출 경로

```text
사용자 변경
  → history.begin(label)
  → 상태/Scene 변경
  → history.commit()
    → captureAppState()
    → markProjectChanged()
      → scheduleRecovery()

Save Project
  → captureAppState()
  → createProjectDocument()
  → serializeProjectDocument()
  → .hairmesh.json 다운로드

Open/Undo/Redo/Recovery
  → parse 또는 snapshot 선택
  → restoreAppState()
  → 모든 시각화/메시/UI 재구성
```

Reference model은 `modelRoot`에만 존재하고 `captureAppState()`에 포함되지 않습니다. 이를 저장 대상으로 바꾸려면 파일 포맷 버전, 용량 정책, Object URL/원본 binary 처리까지 먼저 설계해야 합니다.

## 변경할 때 함께 확인할 파일

| 변경 대상 | 반드시 함께 확인 |
| --- | --- |
| Point/Curve 필드 | `make*Record`, `clone*`, `*State`, `*FromState`, `restoreAppState`, 프로젝트 테스트 |
| Mesh 설정 필드 | `defaultSettings`, `getCurrentSettings`, `syncModifierUIFromCurve`, `makeTopologyForCurve`, HTML input |
| 선택/모드 규칙 | `updateCommandAvailability`, `updateHint`, `syncGizmo`, `updateControlVisibility`, 단축키 |
| Brush topology | `brushState`, `brushFromState`, 두 Import parser, `makeBrushTopology`, 프로젝트 round-trip |
| 저장 형식 | `PROJECT_VERSION`, parser migration, README, `DEVELOPMENT_GUIDE.md`, fixture 기반 테스트 |
| 새 사용자 기능 | HTML control, event handler, History transaction, dirty/recovery, 회귀 테스트, 이 문서 |
