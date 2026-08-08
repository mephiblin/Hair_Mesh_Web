# 개발 가이드

## 1. 구조 원칙

Hair Mesh Web은 빌드 과정 없이 ES Module을 직접 제공하는 정적 웹 앱입니다.

- `curve_mesh_hair_tool_v4.html`: UI 마크업/CSS, Three.js 객체 생명주기, 기능 조립을 소유합니다.
- `src/geometry`: DOM과 무관한 Geometry 계산을 소유합니다.
- `src/state`: 직렬화 가능한 상태와 사용자 행동 정책을 소유합니다.
- `src/viewport`: Picking/좌표 제약과 material/light/wire/reference-image display 정규화 정책을 소유합니다.
- `src/ui`: 재사용 가능한 DOM 상호작용을 소유합니다.
- `src/diagnostics`: 실제 Three.js 런타임이 필요한 빠른 진단을 소유합니다.
- `tests`: Node에서 실행 가능한 순수 정책/상태 회귀 테스트를 소유합니다.

새 로직이 DOM이나 Scene 객체를 요구하지 않는다면 HTML에 추가하지 말고 알맞은 `src/` 모듈로 분리하는 것이 기본 원칙입니다. 현재 HTML은 기능 조립부이면서 아직 분리되지 않은 레거시 구현부입니다.

## 2. 로컬 개발

```bash
python3 launch_server.py --port 8080
```

수정 후 브라우저를 새로고침합니다. CDN 모듈을 사용하므로 네트워크가 필요합니다. 정적 파일만 제공하므로 별도 번들러나 개발 서버 의존성은 없습니다.

최초 개발 검증 전에 Node 의존성과 Playwright Chromium을 준비합니다.

```bash
npm install
npx playwright install chromium
```

커밋 전 최소 검증:

```bash
npm run check
python3 launch_server.py --no-browser --port 8080
```

두 번째 터미널에서:

```bash
curl -I http://127.0.0.1:8080/curve_mesh_hair_tool_v4.html
```

그 다음 `?selftest=1` 페이지와 실제 사용자 흐름을 브라우저에서 확인합니다.

## 3. 앱 상태와 Scene 상태

이 앱에는 서로 연결된 두 종류의 상태가 있습니다.

1. **직렬화 상태**: Curve/Point/Brush, Proxy primitive parameters/transform/FFD stack, 선택, 모드, 표시 설정. `captureAppState()`가 반환하고 JSON/History/Recovery가 사용합니다.
2. **파생 Scene 상태**: Three.js Group, Control mesh, Line, BufferGeometry, TransformControls. `restoreAppState()`와 각 `rebuild*` 함수가 직렬화 상태로부터 재구성합니다.

Scene 객체를 JSON에 직접 넣지 않습니다. 새 기능을 저장하려면 최소 데이터만 직렬화 상태에 넣고 Scene 객체는 복원 시 다시 만드십시오.

Reference 파일 자체와 Mesh별 표시/재질/수동 텍스처는 Import 세션 상태이며 프로젝트에 넣지 않습니다. 전역 Reference preset과 Viewport 배경/FOV/Ortho Views/Grid/조명은 `display` snapshot으로 저장합니다. Front/Left/Back 참조 이미지도 binary/Texture/plane/outline은 세션 상태이고 `src/viewport/reference-images.js`로 정규화한 frame·3D transform·표시·Flip·Back-face Cull과 파일명 힌트만 snapshot에 저장합니다. Reference 모델 기능은 `normalizeMaterials()` → `refreshReferenceObjectUI()` → `applyModelDisplay()` 경로를, 이미지 기능은 `loadReferenceImage()` → `applyReferenceImageDisplay()` → `syncReferenceImageTransformControls()` → `disposeReferenceImage()` 경로를 함께 확인합니다.

## 4. 주요 불변 조건

- Line은 Point가 2개 이상일 때만 완료할 수 있습니다.
- 숨김 또는 잠긴 Curve는 편집할 수 없습니다.
- 숨김 또는 잠긴 Proxy는 파라미터·이름·Transform·복제/삭제로 편집할 수 없습니다.
- 활성 root object는 Curve 또는 Proxy 중 하나이며 `syncModifyContext()`가 해당 Modify UI만 표시합니다.
- Proxy FFD는 Base부터 Top까지 순서대로 평가하며 control offset을 원본 vertex에 bake하지 않습니다. 최종 bake는 Export 경계에서만 수행합니다.
- Viewport는 3ds Max식 `MMB Pan`, `Alt+MMB Orbit`, `Ctrl+Alt+MMB Zoom`을 유지합니다. Control 영역 선택은 좌→우 Window(완전 포함), 우→좌 Crossing(교차 포함)이며 Ctrl/⌘은 추가, Alt는 제외입니다.
- `Axis Lines`는 긴 축 제약선만 소유합니다. OFF에서도 기본 XYZ Transform gizmo는 표시·입력이 유지되어야 합니다.
- Live Mesh는 `meshEnabled`, `meshStatus === 'ready'`, 유효한 `topology`가 모두 충족되어야 Ready입니다.
- Path Segments는 2–512, Tube Sides는 3–64 범위입니다.
- Point/Brush의 Vector와 Quaternion은 배열로 변환한 뒤 저장합니다.
- Undo/Redo 복원 중에는 새 History transaction을 만들지 않습니다.
- GPU 자원을 Scene에서 제거할 때 Geometry와 Material도 dispose합니다.
- Draft Line을 취소하면 생성 전 Curve 선택을 복원합니다.
- Point `Ctrl/⌘` 토글은 활성 Curve 안에서만 동작하며 0개 선택을 허용합니다.
- Scene Curve 다중 선택은 `selectedCurveIds`와 활성 `selectedCurve`를 함께 유지하고, Modifier/Gizmo는 활성 Curve 하나만 편집합니다.
- Front/Left/Back 참조 Plane은 Perspective를 포함한 모든 View에서 보이지만 모델 surface raycast와 Mesh Export에는 참여하지 않습니다.
- `Persp`는 항상 Perspective Camera이며, Ortho Views ON의 Front/Left/Back/Top은 Orthographic Camera입니다. active camera를 바꾸면 OrbitControls, 두 TransformControls, picking/raycast, resize/frame 경로를 함께 검사하십시오.

관련 정책은 `src/state/curve-policy.js`, `curve-selection.js`, `point-selection.js`, `line-creation-policy.js`, `src/geometry/mesh-limits.js`, `proxy-primitives.js`에 있으며 Node 테스트가 계약을 고정합니다.

## 5. 기능 구현 패턴

사용자가 상태를 변경하는 기능은 다음 순서를 따릅니다.

```js
history.begin('사용자에게 보일 작업 이름');
// serializable state 변경
// 필요한 visual/live mesh/UI 동기화
history.commit();
```

연속 `input` 이벤트는 첫 입력에서 `begin()`, 최종 `change` 또는 pointer 종료에서 `commit()`하여 한 번의 Undo로 묶습니다. 변경이 없으면 History가 snapshot을 추가하지 않습니다.

History 밖에서 표시 옵션처럼 상태를 직접 바꾸는 경우 `markProjectChanged()`를 호출해 Dirty 표시와 자동 복구를 갱신합니다.

## 6. 새 Curve 또는 Point 필드 추가

필드가 누락되지 않도록 다음 체크리스트를 사용합니다.

1. `makeCurveRecord()` 또는 `makePointRecord()`에 기본값 추가
2. `clonePointRecord()` 또는 복제 경로에 복사 추가
3. `captureAppState()`/`pointState()`/`brushState()`에 JSON 표현 추가
4. `curveFromState()`/`pointFromState()`/`brushFromState()`에 복원 추가
5. 이전 파일에 필드가 없을 때의 fallback 추가
6. UI sync 함수와 변경 event 연결
7. 프로젝트 round-trip 및 Undo/Redo 테스트 추가

저장 문서의 의미나 필수 필드가 호환되지 않게 바뀐다면 `src/state/project-format.js`의 `PROJECT_VERSION`을 올리고 이전 버전 migration을 parser에 추가합니다. 버전만 올리고 기존 파일을 거부하는 방식은 피합니다.

## 7. 새 Mesh Modifier 추가

1. HTML에 입력 control과 명확한 ID를 추가합니다.
2. `defaultSettings()`에 기본값을 정의합니다.
3. `getCurrentSettings()`에서 값을 읽고 유효 범위를 정규화합니다.
4. `syncModifierUIFromCurve()`에서 선택 Curve의 값을 다시 UI에 씁니다.
5. `makeTopologyForCurve()` 또는 해당 topology 함수에서 사용합니다.
6. 변경 event에서 History, Live rebuild, stats를 갱신합니다.
7. 극단값, NaN, 빈 입력을 순수 모듈 테스트로 고정합니다.

고비용 설정에는 상한을 둡니다. 입력의 HTML `min/max`만 신뢰하지 말고 계산 직전에도 정규화하십시오.

Proxy primitive 또는 FFD를 추가/변경할 때는 [`features/proxy-mesh.md`](features/proxy-mesh.md)의 type/default/normalize/topology/stack/UI/record/project/export 전체 경로를 사용합니다. 파생 topology나 Three.js 객체를 snapshot에 넣지 않습니다.

## 8. Geometry/Three.js 규칙

- 계산 가능한 함수는 입력 객체를 불필요하게 mutate하지 않습니다.
- Curve상의 방향 프레임은 `buildSweepFrames()`를 사용해 일관된 twist 처리와 퇴화 구간 fallback을 공유합니다.
- 논리 topology는 `{ positions, faces, uvs, faceUvs }`를 유지합니다.
- 뷰포트 렌더용 삼각분할은 `topologyToGeometry()`에서 수행하되 Export용 원래 Quad/N-gon face는 보존합니다.
- World-space Export 전에 Curve/Proxy export entry의 `group.matrixWorld`를 적용합니다.
- 새 Mesh/Material을 교체할 때 이전 자원을 `disposeTree()` 계열로 해제합니다.

## 9. UI/모드 규칙

현재 핵심 모드는 `orbit`, `draw`, `edit`, `insert`, `transform`입니다. 모드를 추가하거나 전환 조건을 바꿀 때 다음을 함께 확인합니다.

- `setMode()`
- `updateCommandAvailability()`
- `updateHint()`와 Status mode
- `syncGizmo()`와 `updateControlVisibility()`
- Viewport pointer handler
- 전역 keydown handler
- 숨김/잠금 Curve/Proxy 정책과 객체별 Modify 문맥

입력 필드에 포커스가 있을 때 단축키가 값을 가로채지 않도록 `isTypingTarget()`을 거쳐야 합니다. Checkbox 같은 비문자 입력은 기존 전역 선택 단축키 계약을 따릅니다.

## 10. 테스트 전략

### Node 핵심 테스트

`tests/core-tests.mjs`는 DOM 없이 검증 가능한 계약을 다룹니다.

- Line 완료 조건
- Point 선택 정규화
- Point/Curve Ctrl/⌘ 토글과 활성 Curve fallback
- Mesh 예산 제한
- 숨김/잠금/Live 상태 정책
- History transaction과 양방향 복원
- 프로젝트 문서 round-trip/버전 거부
- Viewport material/light/wire/object/환경, 표준 뷰 projection/matched height, Front/Left/Back 참조 Plane 설정·초기 배치·custom 3D transform 정규화

새 순수 모듈은 이 테스트에 직접 import하여 회귀를 추가합니다.

### 브라우저 Self-test

`src/diagnostics/core-self-check.js`는 Three.js Vector/Quaternion/Curve가 필요한 수학과 Viewport 정책을 빠르게 검사합니다. URL에 `?selftest=1`을 붙인 뒤 다음을 확인합니다.

```js
globalThis.__CURVE_TOOL_SELF_TEST__
```

### 수동 수용 테스트

최소 사용자 흐름:

1. 빈 장면에서 Line 생성/취소/완료
2. Point/Handle 이동 후 Undo/Redo
   - 같은 Curve의 Anchor를 Ctrl/⌘ 클릭해 0개까지 토글하고 일반 클릭으로 복귀
   - Scene Explorer Curve 행을 Ctrl/⌘ 클릭해 다중 선택/활성 전환/전체 해제
3. Ribbon과 Tube 생성, Segment/Sides 경계값 확인
4. Brush fixture Import 후 Brush Mesh 생성
5. Proxy 4종 생성, 크기/Segments/Sides/Rings 변경, Curve↔Proxy Modify 전환과 W/E/R/Frame/Clone/Delete 확인. FFD 관련 변경이면 2/4/8 추가, Window/Crossing·Ctrl/Alt 다중 선택, 직접/기즈모 다중 Move, 한 단계 Undo/Redo, stack reorder/ON/OFF/reset/remove, Proxy Surface Line도 확인
6. 숨김/잠금 Curve/Proxy가 수정되지 않는지 확인
7. `.hairmesh.json` 저장 후 다시 열어 Curve/Brush/Proxy/활성 Modify 문맥/Live Mesh 확인
   - 참조 이미지 정렬값과 파일명 힌트는 복원되고 JSON에 image payload가 없는지 확인
8. 변경 후 새로고침하여 복구 확인
9. Curve+Proxy OBJ/FBX Export 후 대상 DCC Import 확인
10. Front/Left/Back Plane이 Perspective에서도 보이고 Move/Rotate/Scale, Back-face Cull, Flip Horizontal이 동작하는지 확인
11. Ortho Views ON의 Front/Left/Back/Top에서 FOV 왜곡이 없고 FOV 입력이 비활성화되는지, OFF/Persp에서 원근 카메라가 복원되는지 확인
12. 카메라 전환 후 MMB Pan, Alt+MMB Orbit, Ctrl+Alt+MMB Zoom, Wheel Zoom, Plane/Curve/Proxy picking, gizmo drag, 프로젝트 설정 왕복 확인
13. 선택 Control Set이 프로젝트 저장/열기와 자동 복구에서 복원되는지 확인
14. 좁은 뷰포트에서 Toolbar와 패널 접근 확인

## 11. 알려진 기술 부채와 확장 방향

- 단일 HTML에 남은 기능을 `app`, `scene`, `curve`, `mesh`, `project`, `export` controller로 점진 분리
- npm/vendor 기반의 고정된 Three.js 의존성으로 오프라인 실행 지원
- 실제 브라우저 자동화 테스트 추가
- Project schema migration fixture와 손상 파일 복구 정책 강화
- FBX exporter를 검증된 라이브러리 또는 Blender 호환 파이프라인으로 교체
- 대량 Curve 성능 측정과 메시 생성 worker 분리

새 구조로 한 번에 재작성하기보다, 기능 수정 시 순수 계산/정책부터 `src/`로 이동하고 기존 브라우저 동작을 테스트로 고정하는 방식이 안전합니다.
