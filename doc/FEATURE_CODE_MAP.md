# 기능별 코드 지도

이 문서는 사용자 기능에서 구현 코드로 이동하기 위한 지도입니다. `curve_mesh_hair_tool_v4.html`은 계속 이동하므로 줄 번호를 계약으로 사용하지 않고 함수명이나 DOM ID를 `rg`로 검색합니다.

Codex는 먼저 [CODEX_INDEX.md](CODEX_INDEX.md)의 요청 라우터를 읽고 관련 `features/*.md`의 동작 계약을 확인합니다. 이 문서는 전체 기능 심볼을 한 화면에서 대조해야 할 때 사용합니다.

## 전체 실행 흐름

```text
launch_server.py
  → curve_mesh_hair_tool_v4.html
    → Three.js/CDN 모듈 + src/* 정책 모듈 import
      → DOM 이벤트
        → 앱 상태 변경
          → Curve/Control 또는 Proxy 시각화 및 Mesh 재생성
            → History + 자동 복구
```

## 기능 빠른 찾기

| 사용자 기능 | 주 진입점/DOM | 핵심 구현 | 보조 모듈·검증 |
| --- | --- | --- | --- |
| 앱 실행 | `launch_server.py:main()` | 로컬 서버 생성, 빈 포트 선택, 브라우저 열기 | 수동 HTTP 200 확인 |
| Three.js 초기화/렌더 | `#viewport`, `scene`, `camera`, `perspectiveCamera`, `orthographicCamera`, `renderer`, `animate()` | HTML composition root의 Scene/Camera/Renderer/Controls 조립 | 브라우저 Self-test |
| 기준 모델 Import | `#modelFile`, `loadModel()` | `normalizeMaterials()`, `fitObject()`, `applyModelDisplay()` | OBJ/FBX/GLTF Loader, 실제 브라우저 QA |
| 표면/평면 Point 배치 | `#drawTarget`, `updateDrawTargetUI()`, `pointOnSurface()`, `pointInFreePlane()` | Raycaster로 보이는 Reference/Proxy 중 최근접 표면 또는 카메라 평면 좌표 계산 | `src/state/line-creation-policy.js` |
| Line 생성/완료/취소 | `#newCurveBtn`, `beginLineCreation()`, `finishLineCreation()`, `cancelLineCreation()` | Draft curve 생성, 최소 Point 검사, 이전 선택 복원 | Node의 `line creation requires two points` |
| Curve/Point 선택 | `selectCurve()`, `toggleCurveSelection()`, `selectControl()`, `#curveList` | Ctrl/⌘ 토글, 활성 Curve/Point, UI/Gizmo 동기화 | `src/state/curve-selection.js`, `src/state/point-selection.js` |
| Curve Soft Selection | `#softSelectionEnabled`, `#softSelectionFalloff`, `softSelectionWeightsForCurve()`, `applyPointGroupTransform()` | world-space Bézier 길이 Falloff에서 파생한 weight로 Point Move/Rotate/Scale; hard selection pivot, drag 중 weight freeze | `src/geometry/soft-selection.js`, Node weight 계약 + Playwright Live Mesh/Undo/Redo |
| Curve 표시/잠금 | `setCurveVisible()`, `setCurveLocked()` | Scene row와 편집 가능 상태 동기화, 잠금 시 Viewport pick 제외 | `src/state/curve-policy.js`, `canPickViewportObject()` 및 정책 테스트 |
| Curve 복제/삭제 | `#duplicateCurveBtn`, `deleteSelectedCurve()` | Curve state 복제/폐기와 History transaction | 브라우저 QA + Undo/Redo |
| Proxy 4종 생성 | `#create*ProxyBtn`, `createProxyPrimitive()` | Orbit target에 Box/Sphere/Quad Sphere/Cylinder 생성 | `src/geometry/proxy-primitives.js`, Node topology 테스트 |
| Proxy 파라미터 | `#proxy*`, `readProxySettingsFromUI()`, `rebuildProxyMesh()` | 크기·축별 segment·Smooth·Edges를 비파괴 재생성 | `normalizeProxySettings()`, 브라우저 QA |
| Proxy FFD Stack | `#proxyModifierList`, `addFfdModifierToSelected()`, `moveActiveProxyModifier()` | FFD 2/4/8 추가, ON/OFF, 순서, Reset/Remove | `src/geometry/ffd-lattice.js`, Node stack 테스트 |
| FFD Control 편집 | `findFfdControl()`, `setFfdControlSelection()`, `rebuildProxyLatticeVisual()`, `toggleFfdControlEditing()`, `syncGizmo()` | 단일/영역 다중 선택, 선택 전체 노란 표시, Edit/Finish lattice 토글, 선택 중심 직접/기즈모 Move와 최종 Proxy 재평가 | `control-selection.js`, `region-selection.js`, FFD 좌표 함수 |
| 객체별 Modify 문맥 | `syncModifyContext()`, `#curveModifyContext`, `#proxyModifyContext` | 활성 Curve/Proxy에 해당하는 rollout만 표시 | `features/proxy-mesh.md` |
| Proxy 선택/표시/잠금 | `selectProxy()`, `refreshProxyList()`, `setProxyVisible()`, `setProxyLocked()` | Scene Explorer 선택은 유지하고 잠긴 root는 Viewport LMB/RMB/direct drag에서 제외 | `canPickViewportObject()`, 브라우저 QA + Project restore |
| Curve/Proxy 선택 해제 | `clearObjectSelection()`, `handleViewportClick()` | `orbit`/`transform` 빈 LMB와 단일 삭제 후 root/control Set, Scene 강조, gizmo, Modify 문맥을 함께 비움 | `features/viewport-ui.md`, `tests/viewport-regression.mjs` |
| Proxy 복제/삭제 | `#duplicateCurveBtn`, `deleteSelectedProxy()` | 파라미터/transform 복제와 GPU 자원 폐기 | History + 브라우저 QA |
| Bézier 곡선 평가 | `BezierChainCurve` | `getPoint()`, `getTangent()`이 Cubic Bézier 계산 | `src/geometry/bezier-handles.js` |
| Handle/Knot 편집 | `setSelectedKnotType()`, `resetSelectedTangents()` | Handle 모드 적용, 인접 Handle 재계산 | `bezier-handles.js`, Self-test |
| Point 추가/분할/삭제 | `addPoint()`, `splitCurveSegment()`, `insertRelativeToSelected()` | 곡선 형상을 유지하는 Segment split과 selection 갱신 | `line-creation-policy.js`, 브라우저 QA |
| Point 평균화 | `averageSelectedGeometry()` | 선택 Point 위치/Handle을 Amount만큼 평균화 | `#averageAmount`, 실제 브라우저 QA |
| Curve/Proxy Object Transform | `setObjectTransformMode()`, `activeSceneObject()`, `handleGizmoChange()` | 활성 `group`의 Position/Quaternion/Scale 변경 | TransformControls, History |
| Point Transform | `setPointTool()`, `applyPointUnitTransform()`, `handleGizmoChange()` | Point, Handle, 단면 Transform을 선택 문맥에 맞게 적용 | `coordinateFrameQuaternion()` |
| 축 가이드 이동 | `toggleAxisGuides()`, `startAxisGuideDrag()`, `updateAxisGuideDrag()` | 화면 Pick → 제약 평면 → 축 Scalar 적용, OFF 시 긴 guide만 숨기고 기본 Translate gizmo 유지 | `src/viewport/axis-guide-drag.js`, `interaction-policy.js`, Self-test |
| 3ds Max Viewport 입력 | `beginMaxViewportNavigation()`, `beginSelectionRegion()`, `beginDirectViewportMove()` | MMB Pan, Alt+MMB Orbit, Ctrl+Alt+MMB Zoom, Window/Crossing Control 선택, Proxy 표면 Move drag | `src/state/control-selection.js`, `src/viewport/region-selection.js` |
| 3ds Max POV 키/메뉴 | `#viewportViewMenu`, `openViewportViewMenu()`, `applyViewportView()`, `setViewportProjectionView()` | 전역 T/B/F/L/P/U, 포인터 위치 V 메뉴와 V→K Back, typing target 차단 | `src/viewport/view-shortcuts.js`, Node mapping + Browser regression |
| 대상별 RMB 메뉴 | `openViewportContextMenu()`, `renderProxyContextMenu()`, `renderCurveContextMenu()` | 포인터 아래 Proxy/Curve 선택, 기존 panel/shortcut command 재사용, 가장자리 clamp/닫힘 | `src/ui/context-menu.js`, `features/viewport-ui.md` |
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
| Hair Viewport 재질 | `#hairMaterialPreset`, `applyHairMaterialDisplay()` | Live Mesh의 MatCap / Normal / Standard 재질 교체 | `src/viewport/material-presets.js`, Node/브라우저 QA |
| Reference Viewport 재질 | `#referenceMaterialPreset`, `applyModelDisplay()` | Auto/Original/Default Lit/MatCap 전역 적용 | `src/viewport/material-presets.js`, `src/viewport/reference-object-policy.js` |
| Reference Mesh 관리 | `#referenceObjectList`, `refreshReferenceObjectUI()` | Mesh별 숨김/표시, 재질 override, 이미지 texture/UV 경고 | `src/viewport/reference-object-policy.js`, 다중 OBJ fixture |
| Viewport 환경/조명 | `#viewportBackground`, `#cameraFov`, `#gridVisible`, `#light*`, `#fillLightIntensity` | `applyViewportDisplay()`, `applyLightingDisplay()` | `src/viewport/viewport-settings.js`, `src/viewport/lighting.js` |
| 표준 뷰 투영 | `#orthographicViewsToggleBtn`, `#view*Btn`, `useViewportCamera()`, `setStandardView()` | Persp/사선/Home은 Perspective, 표준 6면은 토글에 따라 Orthographic/Perspective 전환 | `standardViewProjection()`, `matchedOrthographicHeight()`, Node/브라우저 QA |
| ViewCube 카메라 내비게이션 | `#viewCubeStage`, `#viewCubeHome`, `beginViewCubeDrag()`, `updateViewCubeDrag()`, `setViewportDirection()`, `applyViewCubeTarget()`, `syncViewCubeOrientation()` | inverse camera quaternion 표시, threshold click/drag 분리, 자유 orbit, face/edge/corner 6면·사선·Home·키보드 전환 | `src/viewport/view-cube.js`, Node classifier/drag delta + `tests/viewport-regression.mjs` |
| Reference Wireframe | `#referenceWireMode`, `#referenceWireColor` | `ensureReferenceWireObject()`, `applyReferenceWireframeDisplay()`로 독립 `LineSegments` 관리 | `src/viewport/reference-wireframe.js`, 브라우저 QA |
| Front/Left/Back 참조 Plane | `#referenceImageStrip`, `setReferenceImageTransformTool()`, `loadReferenceImage()` | Perspective 표시, 실제 Plane transform/gizmo, Back-face Cull, UV Flip, 프로젝트 파일명 대조와 자원 해제 | `src/viewport/reference-images.js`, `referenceImageTransformControls`, Node/브라우저 QA |
| 프로젝트 저장 | `#saveProjectBtn`, `saveProject()` | 앱 상태 캡처 → versioned document → JSON 다운로드 | `src/state/project-format.js`, Node round-trip 테스트 |
| 프로젝트 열기 | `#projectFileInput`, `openProjectFile()` | JSON 검증 → state restore → History 초기화 | future/unrelated document 거부 테스트 |
| 자동 복구 | `RECOVERY_KEY`, `scheduleRecovery()`, `restoreRecovery()` | localStorage에 debounce 저장하고 시작 시 복원 | 브라우저 reload QA |
| Undo/Redo | `history`, `history.begin()/commit()` | 변경 전 snapshot과 transaction label 관리 | `src/state/history.js`, Node 양방향 복원 테스트 |
| OBJ Export | `#exportQuadObjBtn`, `activeExportMeshes()`, `exportQuadOBJ()` | 표시 중인 Curve Live/Proxy의 World Transform 적용 후 논리 Quad/N-gon 직렬화 | 대상 DCC Import 확인 |
| FBX Export | `#exportFbxBtn`, `activeExportMeshes()`, `exportAsciiFBX()` | Curve/Proxy FBX 7.4 ASCII Geometry/Normal/UV 작성 | 실험 기능, 대상 DCC Import 확인 |
| 단축키 | `document.addEventListener('keydown', ...)` | 저장, History, 선택, 모드, Transform, POV dispatch | README 단축키 표·`view-shortcuts.js`와 함께 갱신 |
| Command rollout | `.rollout-header`, `setRolloutCollapsed()`, `initializeRollouts()` | Create/Modify/Display 기본 닫힘, 탭 전환 중 DOM 상태 유지, ARIA 동기화 | `features/viewport-ui.md`, 브라우저 QA |
| 내장 진단 | URL `?selftest=1`, `runCoreSelfChecks()`, `__CURVE_TOOL_RUNTIME_DIAGNOSTICS__` | 순수 Geometry/Policy smoke test와 selftest 전용 runtime 상태 노출 | `src/diagnostics/core-self-check.js` |
| Viewport 자동 회귀 | `npm run test:viewport` | 임시 서버+Chromium으로 Axis/gizmo 분리, Proxy drag/Undo, FFD 선택 표시·다중 drag·편집 토글/click-through, Proxy/Curve RMB, 잠긴 root의 LMB/RMB 제외, 1024px 검사 | `tests/viewport-regression.mjs`, GitHub Validate `viewport` job |

## 핵심 상태의 코드 위치

전역 런타임 상태는 `curve_mesh_hair_tool_v4.html`의 import 직후, `BezierChainCurve` 선언 앞에 있습니다.

| 상태 | 의미 | 생성/직렬화 위치 |
| --- | --- | --- |
| `curves` | 편집 중인 Curve record 배열 | `makeCurveRecord()`, `captureAppState()` |
| `selectedCurve` | 현재 UI/Transform 대상 Curve | `selectCurve()`, `restoreAppState()` |
| `proxies` | 파라미터 기반 Proxy record 배열 | `makeProxyRecord()`, `captureAppState()` |
| `selectedProxy` | 현재 UI/Transform 대상 Proxy, `selectedCurve`와 상호 배타 | `selectProxy()`, `restoreAppState()` |
| `nextProxyId` | 저장·복원되는 Proxy ID counter | `makeProxyRecord()`, `captureAppState()` |
| `nextProxyModifierId` | Proxy 사이에서도 고유한 FFD ID counter | `createFfdModifier()`, clone, `captureAppState()` |
| `selectedFfdControlIndex` / `selectedFfdControlIndices` | 선택 Proxy의 active FFD Point / 다중 선택 Set | `setFfdControlSelection()`, `syncGizmo()`, `restoreAppState()` |
| `selectedCurveIds` | Scene Explorer 다중 선택 Curve ID Set | `toggleCurveSelection()`, `captureAppState()` |
| `selectedControl` | Point 또는 in/out Handle 선택 | `selectControl()`, `captureAppState()` |
| `selectedPointIndices` | 다중 Point 선택 Set | `src/state/point-selection.js`로 정규화 |
| `softSelectionSettings` | Curve 간접 영향 ON/OFF와 world-unit Falloff. Point weight는 매번 파생 | `normalizeSoftSelectionSettings()`, `captureAppState()`, `restoreAppState()` |
| `drawingCurve` | 아직 완료하지 않은 Line draft | `beginLineCreation()`/`finishLineCreation()` |
| `brushes` | Import된 Brush topology 배열 | `brushState()`/`brushFromState()` |
| `mode` | `orbit`, `draw`, `edit`, `insert`, `transform`, `ffd` | `setMode()`, 키보드/Toolbar event |
| `projectDirty` | 마지막 명시 저장 이후 변경 여부 | `markProjectChanged()`, `updateProjectStatus()` |
| `history` | Undo/Redo snapshot controller | `createHistory(...)` 생성부 |
| `referenceImageSettings` / `referenceImageRuntime` | 저장 가능한 3방향 Plane transform/표시값 / 세션 전용 texture·plane·outline·Object URL | `currentReferenceImageSettings()`, `loadReferenceImage()`, `disposeReferenceImage()` |
| `camera` / `perspectiveCamera` / `orthographicCamera` | active camera / FOV 원근 카메라 / 표준 뷰 정사영 카메라 | `useViewportCamera()`, `setStandardView()`, `resize()` |

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

Proxy record와 topology 흐름은 [Proxy Mesh 기능 계약](features/proxy-mesh.md)에 별도로 정리되어 있습니다. Proxy 필드를 추가할 때는 default/normalize, UI read/write, `proxyState()`/`proxyFromState()`, clone과 rebuild 경로를 함께 바꿉니다.

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

Reference model은 `modelRoot`에만 존재하고 `captureAppState()`에 포함되지 않습니다. Front/Left/Back Plane은 `referenceImageRoot`에만 존재하며 `captureAppState()`에는 `referenceImageSettings`의 3D transform·표시·Flip·Back-face Cull과 파일명 힌트만 포함됩니다. 어느 binary든 저장 대상으로 바꾸려면 파일 포맷 버전, 용량 정책, Object URL/원본 binary 처리까지 먼저 설계해야 합니다.

## 변경할 때 함께 확인할 파일

| 변경 대상 | 반드시 함께 확인 |
| --- | --- |
| Point/Curve 필드 | `make*Record`, `clone*`, `*State`, `*FromState`, `restoreAppState`, 프로젝트 테스트 |
| Mesh 설정 필드 | `defaultSettings`, `getCurrentSettings`, `syncModifierUIFromCurve`, `makeTopologyForCurve`, HTML input |
| 선택/모드 규칙 | `updateCommandAvailability`, `updateHint`, `syncGizmo`, `updateControlVisibility`, 단축키 |
| Brush topology | `brushState`, `brushFromState`, 두 Import parser, `makeBrushTopology`, 프로젝트 round-trip |
| 저장 형식 | `PROJECT_VERSION`, parser migration, README, `DEVELOPMENT_GUIDE.md`, fixture 기반 테스트 |
| Viewport 참조 Plane | `reference-images.js`, 전용 TransformControls/Viewport picking, HTML plane 생명주기, `captureAppState`/`restoreAppState`, Perspective 표시, Back-face/UV Flip, Object URL dispose, 프로젝트 payload 검사 |
| 새 사용자 기능 | HTML control, event handler, History transaction, dirty/recovery, 회귀 테스트, 이 문서 |
