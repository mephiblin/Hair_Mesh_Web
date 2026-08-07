# Curve Mesh Hair Tool v4 구현 감사

> 감사일: 2026-08-07  
> 기준 커밋: `8078d82` (`프로토타입`)  
> 대상: `curve_mesh_hair_tool_v4.html` 및 `src/` 모듈 전체  
> 목적: 구현된 기능을 사용자 흐름과 코드 상태 양쪽에서 순찰하고, 문제·논리적 모순·실패한 UX/UI를 수정 우선순위로 문서화한다.

## 1. 결론

현재 프로젝트는 커브 생성, 3ds Max식 Knot Type, 포인트·핸들 변환, 루트 변환, Curve to Mesh, Undo/Redo, OBJ/FBX 출력까지 연결된 **기능성 프로토타입**이다. 핵심 기하 모듈의 방향은 타당하며 `?selftest=1` 진단 19개도 모두 통과했다.

그러나 지금 상태를 장시간 작업이나 실제 제작 데이터에 사용하는 것은 권장하지 않는다. 가장 큰 이유는 다음 다섯 개의 상태 모순이다.

| 화면이 말하는 상태 | 실제 상태 또는 동작 |
|---|---|
| Curve Object가 선택되어 있음 | 생성 중 목록 행을 누르면 목록에서는 삭제됐지만 폐기된 객체가 계속 선택된다. |
| Curve Object가 숨겨짐 | 루트 기즈모와 긴 축선은 남아 있고 숨은 객체를 계속 변환할 수 있다. |
| Curve Object가 잠김 | 다수의 편집 버튼이 활성 상태로 남고, 일부는 무반응이며 이름과 Live Mesh Modifier는 실제로 변경된다. |
| 모든 Point가 선택됨 | Knot Type만 전체 적용되고 Move, Rotate, Scale, Remove, Average, Numeric Values는 활성 Point 하나만 대상으로 한다. |
| Curve가 `LIVE`임 | 브러시가 없어 메쉬 생성에 실패해도 `LIVE` 표기와 활성 체크 상태가 유지된다. |

출시 차단 수준의 항목은 두 가지다.

1. 프로젝트 저장·불러오기·자동 복구가 없어 새로고침이나 창 닫기로 모든 파라메트릭 작업이 사라진다.
2. Line 생성 중 Scene Explorer의 현재 초안 행을 누르면 폐기된 Curve가 선택 상태로 남아 앱 상태 불변 조건이 깨진다.

따라서 다음 개발 순서는 새 기능 추가보다 **프로젝트 영속성 → 상태 불변 조건 → 선택/잠금/표시 정책 → Live Mesh 유효성 → 입출력 검증**이 되어야 한다.

## 2. 감사 방법과 범위

### 2.1 실행 순찰

로컬 서버에서 실제 앱을 열고 다음 흐름을 확인했다.

- 빈 장면과 초기 Modify 패널
- `+ Line`, Point 생성, Finish, Finish & Edit, Cancel
- 생성 중 Scene Explorer 선택
- Point 단일 선택과 `Ctrl+A` 전체 선택
- Knot Type 전체 적용과 Undo 선택 복원
- 전체 선택 후 Remove와 Average
- Root Move, Axis Lines 토글, Curve 숨김과 잠금
- 유효한 Ribbon과 브러시 없는 Imported Mesh Brush
- Point Cross-section 수치 입력과 Point 전환
- 새로고침 후 장면 상태

### 2.2 코드 대조

다음 경계를 함께 확인했다.

- 상태 캡처와 Undo/Redo: `src/state/history.js`, `captureAppState()`
- 생성 정책: `src/state/line-creation-policy.js`
- 다중 선택: `src/state/point-selection.js`
- Knot Type: `src/geometry/bezier-handles.js`
- Sweep Frame: `src/geometry/sweep-frames.js`
- 축선 드래그: `src/viewport/axis-guide-drag.js`
- Reference/Brush import, Live Mesh 평가, OBJ/FBX export
- 로컬 실행기와 CDN 의존성

### 2.3 판정 기준

| 우선순위 | 의미 |
|---|---|
| P0 | 데이터 유실, 상태 손상 또는 기본 작업을 출시 전에 반드시 막아야 하는 문제 |
| P1 | 주요 기능의 결과가 틀리거나 대형 작업·입출력·Undo 신뢰성을 해치는 문제 |
| P2 | 사용자가 상태나 명령 범위를 잘못 이해하게 만드는 UX/UI 문제 |
| P3 | 접근성, 명명, 반응형, 유지보수성 같은 품질 부채 |

증거 표기는 다음과 같다.

- **재현**: 브라우저에서 직접 확인
- **코드**: 구현 경로로 확정
- **설계**: 현재 정보 구조와 DCC 관례를 대조한 평가

## 3. 기능 인벤토리

| 영역 | 현재 구현 | 판정 | 핵심 비고 |
|---|---|---|---|
| 로컬 실행 | Python HTTP 서버와 Windows 실행기 | 부분 완료 | Three.js와 Loader가 CDN에 있어 오프라인 실행은 불가능하다. |
| 프로젝트 저장 | 없음 | 차단 | OBJ/FBX는 완성 메쉬만 저장하며 Curve, Point, Handle, Modifier를 복원할 수 없다. |
| Reference Model | OBJ, FBX, GLB, glTF | 부분 완료 | 교체 Undo가 없고, 외부 리소스형 glTF/텍스처 계약이 맞지 않는다. |
| Surface / Free 생성 | Reference raycast와 View Plane | 부분 완료 | 생성 UI는 개선됐지만 초안 목록 선택이 상태를 손상한다. |
| Curve Object 목록 | 선택, 표시, 잠금 | 부분 완료 | 표시·잠금의 실제 편집 정책이 UI와 일치하지 않는다. |
| Point 선택 | 단일 선택, 이전/다음, `Ctrl+A` | 부분 완료 | 전체 선택을 존중하는 명령이 Knot Type뿐이다. |
| Bézier 핸들 | 좌우 Handle, 선택 Point만 표시 | 양호 | Free/Aligned/Vector/Auto 내부 타입과 4개 Knot UI가 연결된다. |
| Knot Type | Bezier Corner, Bezier, Corner, Smooth, Reset | 양호 | 단일/전체 적용과 Undo 복원이 동작한다. |
| Point 삽입 | 뷰포트 삽입, 이전/다음 구간 분할 | 양호 | de Casteljau 분할로 기존 Bézier 형상을 유지한다. |
| Average | Point, Handles, Both, 0–1 Amount | 부분 완료 | 전체 선택을 무시하고 끝점 Amount 1은 Segment를 붕괴시킨다. |
| Point 변환 | Move, Rotate, Scale | 부분 완료 | Point와 핸들의 결합 변환은 구현됐지만 다중 선택은 활성 Point만 변환한다. |
| Root 변환 | Move, Rotate, Scale, Reset | 부분 완료 | Point 1 Pivot과 좌표계는 동작하지만 숨김 상태에서도 기즈모가 남는다. |
| Axis Lines | X/Y/Z 긴 선 드래그, 버튼, `Shift+G` | 부분 완료 | Move 문맥에서는 동작하지만 숨김 객체와 함께 남는 문제가 있다. |
| Live Ribbon | 폭, Segment, UV, Shading, Twist | 기본 완료 | `Rectangular / Ribbon`이라는 이름과 Depth 비활성 상태가 모호하다. |
| Live Tube | X/Z Radius, Sides, Cap, UV | 기본 완료 | 상한 검증이 코드에 없어 수동 입력으로 브라우저를 멈출 수 있다. |
| Mesh Brush | OBJ topology 보존, FBX/GLB/glTF 삼각화 | 부분 완료 | Asset 상태가 History 밖에 있고 제거·교체가 비가역적이다. |
| Point Cross-section | Offset, Rotate, Scale/Taper, Tip | 부분 완료 | 개념은 타당하지만 Point Position과 수치 Apply UX가 섞여 있다. |
| Display | Solid/Wire, Curve, X-Ray, Reference, Grid | 기본 완료 | 전역 표시 설정은 저장되지 않고 Frame 명령이 Grid 규모까지 바꾼다. |
| Undo/Redo | 최대 100개 전체 상태 snapshot | 부분 완료 | Curve 상태는 복원하지만 Reference와 Brush Asset은 포함하지 않는다. |
| OBJ export | Quad/N-gon, UV, Y/Z-Up, Scale | 부분 완료 | 이름과 Normal/Smoothing 계약을 보존하지 않는다. |
| FBX export | ASCII 7.4 Experimental | 검증 필요 | Smooth 설정을 무시하고 항상 평균 Normal을 쓰며 round-trip fixture가 없다. |
| 자동 진단 | 19개 core self-check | 기반 완료 | DOM, Asset, Live Mesh, Export, 대형 성능 경로는 검사하지 않는다. |

## 4. 잘 구현된 기반

문제 목록과 별도로 다음 기반은 유지할 가치가 있다.

1. 빈 `+ Line` 세션은 Curve Object를 만들지 않고 첫 Point에서 생성된다.
2. Finish Line, Finish & Edit, Cancel이 같은 Line Creation 영역에 모여 있다.
3. Point 위치와 좌우 Tangent가 분리되어 있고 Point Rotate/Scale 시 함께 변환된다.
4. 좌우 Handle Type을 별도로 보존하면서 3ds Max식 네 Knot Type으로 노출한다.
5. 자동/Vector 핸들을 수동 편집했을 때 실제 형상에 맞는 수동 타입으로 전환한다.
6. Insert가 Bézier 형상을 유지하도록 de Casteljau 분할을 사용한다.
7. Sweep Frame이 퇴화 접선, 180도 반전, S자 변곡점을 위한 fallback을 갖는다.
8. 한 번의 TransformControls 드래그를 하나의 Undo 항목으로 묶는다.
9. Live Mesh topology와 화면 렌더용 삼각형을 분리해 Quad/N-gon 경계를 보존한다.
10. `Ctrl+A → Knot Type → Undo`에서 전체 Point 선택까지 복원된다.

## 5. P0 — 출시 차단

### AUD-001 · 프로젝트 영속성과 미저장 보호가 없다

- **증거:** 재현 + 코드
- **재현:** Curve를 만든 뒤 페이지를 새로고침하면 Curve Objects가 즉시 빈 상태가 된다.
- **원인:** 프로젝트 Save/Load, local recovery, `beforeunload` 경고가 없다. Export는 Live Mesh의 OBJ/FBX bake만 제공한다.
- **영향:** Curve, Point, Handle Type, Section, Root Transform, Live Modifier, Reference/Brush 관계를 모두 잃으며 exported mesh로는 편집 상태를 복원할 수 없다.
- **권장:** 버전이 있는 JSON project schema를 먼저 만들고 `Save Project`, `Open Project`, 자동 복구 snapshot, 미저장 표시와 종료 경고를 추가한다. Reference/Brush는 파일 재연결 정보와 누락 상태를 명시해야 한다.

### AUD-002 · 생성 중 초안 행을 누르면 폐기된 Curve가 선택된다

- **증거:** 재현 + 코드
- **재현:** `+ Line → Point 1개 → 왼쪽 Line001 행 클릭`.
- **관찰:** 목록은 `아직 커브가 없습니다`가 되지만 Badge와 Modify 패널은 `Line001 · 1 Points`를 선택 상태로 표시한다.
- **원인:** Scene row handler가 생성 중이면 `cancelLineCreation()`으로 해당 Curve를 삭제한 직후 같은 closure의 `curve`를 다시 `selectCurve()`한다. [행 선택 코드](./curve_mesh_hair_tool_v4.html#L1073)
- **영향:** `selectedCurve`가 `curves` 배열에 없고 Three.js group과 geometry는 이미 dispose된 고아 상태가 된다. 이후 History capture는 존재하지 않는 selected id를 기록하고 편집 명령은 폐기된 visual을 갱신하려 한다.
- **권장:** 생성 초안은 완료 전 Scene Explorer에 노출하지 않거나 Draft 전용 비선택 행으로 표시한다. 최소 불변 조건 `selectedCurve === null || curves.includes(selectedCurve)`를 store와 self-check에 추가한다.

## 6. P1 — 주요 기능과 데이터 신뢰성

### AUD-003 · 숨김 Curve의 기즈모와 축선이 남아 편집 가능하다

- **증거:** 재현 + 코드
- **재현:** Curve 선택 → Root Move → Scene Explorer의 눈 아이콘 OFF.
- **관찰:** Curve는 사라지지만 XYZ 기즈모와 긴 Axis Lines가 남는다.
- **원인:** `setCurveVisible()`은 control visibility만 갱신하고 `syncGizmo()`를 호출하지 않는다. [표시 변경](./curve_mesh_hair_tool_v4.html#L1033)
- **영향:** 보이지 않는 객체를 실수로 변환할 수 있고 화면상 선택 대상과 기즈모가 분리된다.
- **권장:** `visible=false`이면 선택 유지 여부를 정책으로 정하고, 최소한 TransformControls와 Axis Guides를 detach/hide한다.

### AUD-004 · `Ctrl+A`의 선택 의미가 명령마다 다르다

- **증거:** 재현 + 코드
- **재현:** 3 Point Curve에서 `Ctrl+A`. 모든 anchor가 선택색으로 표시된 상태에서 Remove를 누르면 활성 Point 1개만 삭제된다. Average도 활성 Point 하나만 처리한다.
- **관찰:** Move, Rotate, Scale, Remove, Average, Numeric Values가 모두 활성화되어 있어 전체 적용처럼 보인다.
- **원인:** Knot Type은 `selectedPointTargetIndices()`를 사용하지만 다른 명령은 `selectedPoint()`와 `selectedControl.pointIndex`만 사용한다. [다중 대상](./curve_mesh_hair_tool_v4.html#L1528), [Average](./curve_mesh_hair_tool_v4.html#L836), [Remove](./curve_mesh_hair_tool_v4.html#L2152)
- **영향:** 선택 강조와 명령 범위가 달라 DCC 편집의 기본 기대를 위반한다.
- **권장:** 명령별 `supportsMultiSelection` 계약을 둔다. 전체 지원 전에는 활성 Point 전용 버튼을 비활성화하거나 `Active Point Only`로 명시하고, 최종적으로 transform/delete/average/numeric의 다중 선택 정책을 통일한다.

### AUD-005 · 잠금의 의미와 패널 상태가 일치하지 않는다

- **증거:** 재현 + 코드
- **관찰:** 잠금 후 Move, Rotate, Scale, Average, Reset Transform, Knot Type 등이 활성 상태로 남는다. 일부는 클릭해도 아무 메시지 없이 무반응이고, 이름과 Live Mesh Modifier는 실제로 변경된다.
- **원인:** `setCurveLocked()`가 Point Panel의 disabled 상태를 다시 계산하지 않는다. 각 handler의 lock 검사도 서로 다르다. [잠금 변경](./curve_mesh_hair_tool_v4.html#L1044), [Knot disabled 계산](./curve_mesh_hair_tool_v4.html#L1555)
- **영향:** 사용자는 잠금이 geometry만 잠그는지, object 전체를 잠그는지 알 수 없다.
- **권장:** `LOCK_TRANSFORM`, `LOCK_GEOMETRY`, `LOCK_ALL` 중 제품 계약을 정하거나 단일 `LOCK_ALL`부터 시작한다. 중앙 `canExecute(command, state)` 정책으로 버튼 상태와 handler를 같은 규칙에 연결한다.

### AUD-006 · 메쉬 생성 실패 후에도 `LIVE` 상태가 유지된다

- **증거:** 재현 + 코드
- **재현:** 브러시가 없는 Curve에서 Type을 Imported Mesh Brush로 선택하고 Build.
- **관찰:** Status는 브러시가 필요하다고 말하지만 Scene Explorer에는 `LIVE`, 체크박스는 ON, 버튼은 `Apply / Rebuild`, Stats는 `메쉬를 생성할 수 없는 상태`가 된다.
- **원인:** Build handler가 `meshEnabled=true`를 먼저 기록하고 `rebuildCurveMesh()` 실패 시 rollback하지 않는다. [Build handler](./curve_mesh_hair_tool_v4.html#L2244)
- **영향:** UI가 성공 상태와 실패 상태를 동시에 표현하며 Export 대상 여부도 직관과 달라진다.
- **권장:** `disabled | evaluating | ready | error` 상태를 분리한다. topology 생성 성공 후에만 `ready/LIVE`로 commit하고 실패 원인을 패널에 지속 표시한다.

### AUD-007 · Segment와 Side 상한이 코드에서 강제되지 않는다

- **증거:** 코드
- **원인:** HTML에는 `max=512`, `max=64`가 있지만 `getCurrentSettings()`는 최소값만 적용한다. [Modifier 파싱](./curve_mesh_hair_tool_v4.html#L1334)
- **영향:** 사용자가 숫자를 직접 입력하면 수만~수십만 Segment/Side를 허용해 synchronous topology 생성, geometry 복제, normal 계산으로 탭이 멈추거나 메모리가 고갈될 수 있다.
- **권장:** 데이터 계층에서 상한을 강제하고 예상 vertex/face budget을 사전 계산한다. 초과 시 build를 거부하며 live input은 debounce 또는 frame 단위 throttle을 사용한다.

### AUD-008 · Reference와 Brush Asset이 History와 Project State 밖에 있다

- **증거:** 코드
- **원인:** `captureAppState()`는 Curve 배열만 저장하고 Reference, `brushes`, `nextBrushId`를 저장하지 않는다. [상태 캡처](./curve_mesh_hair_tool_v4.html#L619)
- **추가:** Brush 선택 변경과 제거도 history transaction을 만들지 않는다. [브러시 변경/제거](./curve_mesh_hair_tool_v4.html#L2266)
- **영향:** Brush 제거 후 이전 Undo 항목을 복원하면 Curve는 존재하지 않는 brush id를 참조할 수 있다. Reference 교체와 Brush 재할당은 되돌릴 수 없다.
- **권장:** Asset registry를 별도 store로 만들고 Curve는 안정적인 asset UUID를 참조한다. 제거는 사용 중 여부를 검사하고 Undo 가능한 command로 수행한다.

### AUD-009 · Reference 교체와 glTF 지원 계약이 안전하지 않다

- **증거:** 코드
- **원인 1:** 새 파일을 검증하기 전에 기존 modelRoot를 지우므로 새 파일 로드 실패 시 이전 Reference도 사라진다. [Reference 로드 시작](./curve_mesh_hair_tool_v4.html#L495)
- **원인 2:** `.gltf`를 단일 blob URL로 여는데 외부 `.bin`·이미지 파일을 함께 선택하거나 해석할 경로가 없다. OBJ의 MTL과 외부 텍스처도 같은 제한이 있다.
- **원인 3:** 빠르게 파일을 연속 선택하면 비동기 load 결과가 공유 `surfaceMeshes`와 `modelRoot`에 순서 밖으로 합쳐질 수 있다.
- **권장:** 새 Asset을 임시 root에서 완전히 로드·검증한 뒤 원자적으로 교체한다. 우선 GLB를 안정 포맷으로 명시하고, glTF는 multi-file resolver 또는 zip bundle을 지원할 때만 노출한다. load request token으로 이전 요청 결과를 폐기한다.

### AUD-010 · Frame 명령이 카메라뿐 아니라 전역 편집 스케일까지 바꾼다

- **증거:** 코드
- **원인:** `fitObject()`가 camera framing과 함께 `modelDiagonal`, `handleRadius`, Grid 크기·위치까지 변경하고 모든 Curve control을 재생성한다. [Frame 구현](./curve_mesh_hair_tool_v4.html#L453)
- **영향:** 큰 Reference를 본 뒤 작은 Curve에 Frame을 누르면 Grid와 모든 Point/Handle 크기가 작은 Curve 기준으로 바뀐다. 이후 pick threshold와 Axis Guide 길이도 달라진다.
- **권장:** `frameCamera(bounds)`와 `calibrateSceneScale(referenceBounds)`를 분리한다. Frame Selected는 camera/orbit target만 바꿔야 한다.

### AUD-011 · Export가 이름과 Shading 계약을 보존하지 않는다

- **증거:** 코드
- **문제:** OBJ/FBX object 이름이 사용자 Curve 이름이 아니라 `CurveMesh_<id>`로 고정된다. [OBJ 이름](./curve_mesh_hair_tool_v4.html#L2307), [FBX 이름](./curve_mesh_hair_tool_v4.html#L2335)
- **문제:** OBJ는 `vn` 또는 smoothing group을 쓰지 않는다. FBX는 `Smooth Shading` 설정과 관계없이 항상 평균 vertex normal을 생성한다.
- **영향:** Rename과 Smooth Shading UI가 downstream 결과에 반영되지 않으며 cap과 side를 공유하는 vertex는 의도치 않게 부드럽게 보일 수 있다.
- **권장:** export contract test를 만들고 Curve 이름을 안전하게 sanitize해 사용한다. OBJ에는 normal/smoothing 정책을, FBX에는 flat/smooth 분기를 구현한다.

### AUD-012 · Experimental FBX에 round-trip 검증이 없다

- **증거:** 코드 + 기존 조사 문서
- **현황:** ASCII 7.4 writer를 문자열로 직접 생성하지만 Blender/3ds Max 재가져오기 fixture와 자동 비교가 없다.
- **위험:** polygon index, UV seam, normal mapping, Z-Up, negative scale, N-gon, tip/cap 조합의 실제 호환성을 보장할 수 없다.
- **권장:** 최소 회귀 장면을 OBJ/FBX로 내보내고 Blender/3ds Max에서 다시 읽은 결과를 vertex/face/UV/normal/axis 기준으로 비교한다. 검증 전 UI의 `Experimental` 표시는 유지한다.

### AUD-013 · “로컬 실행기”가 온라인 CDN 없이는 시작되지 않는다

- **증거:** 코드
- **원인:** Three.js, OrbitControls, TransformControls, OBJ/FBX/GLTF Loader를 jsDelivr에서 import한다. [CDN import](./curve_mesh_hair_tool_v4.html#L295)
- **영향:** 인터넷 차단, CDN 장애, 버전 제거, 보안 정책 환경에서는 로컬 서버가 정상이어도 앱이 빈 화면 또는 module load 실패 상태가 된다.
- **권장:** 정확한 버전을 로컬 vendor 또는 build bundle에 포함하고 lockfile과 license notice를 둔다. 시작 시 module load 실패를 사용자 화면에 표시한다.

### AUD-014 · Live 평가가 synchronous이며 입력마다 전체 재생성된다

- **증거:** 코드
- **현황:** Modifier `input`, Point/Handle drag, Section drag마다 topology, render triangle geometry, wire edge map, normal을 즉시 다시 만든다.
- **영향:** 고해상도 Tube, 다수 Curve, 대형 Brush에서 pointer 응답과 Undo가 끊길 수 있다. 임의 크기 Brush에도 budget이 없다.
- **권장:** dirty flag와 requestAnimationFrame coalescing을 넣고, interactive preview 해상도와 commit 해상도를 분리한다. 대형 평가와 export는 Worker 이전을 검토한다.

### AUD-015 · 현재 self-check가 UI·Asset·Mesh·Export 회귀를 막지 못한다

- **증거:** 코드
- **현황:** 19개 진단은 Handle 전이, 선택 정규화, Line 정책, Sweep fallback 같은 순수 로직을 잘 검사한다.
- **누락:** draft row, hide/lock, Ctrl+A 후 각 명령, invalid LIVE, project reload, asset remove/undo, import 실패, export round-trip, 대형 성능.
- **권장:** 브라우저 integration test와 topology/export fixture test를 분리한다. P0 불변 조건은 매 commit에서 실행한다.

## 7. P2 — 실패하거나 혼란스러운 UX/UI

### AUD-016 · 빈 장면의 첫 화면이 Modify 탭이다

- **증거:** 재현 + 설계
- **관찰:** 새 사용자가 처음 보는 화면은 비활성 Point 편집 패널이며 `+ Line`은 `＋` 아이콘 탭 뒤에 숨겨져 있다.
- **권장:** Curve가 없으면 Create 탭을 기본으로 열고 뷰포트 또는 Scene Explorer empty state에 `Create Line` 주 행동을 제공한다.

### AUD-017 · 대상이 없는데 편집 컨트롤이 활성화되어 있다

- **증거:** 재현
- **예:** Clone, Root Move/Rotate/Scale, Insert, Reset Transform, Live Mesh 값과 Build, Apply Numeric Values, Set Tip, Reset Section, Frame Model.
- **결과:** 어떤 버튼은 status 오류를 내고, 어떤 버튼은 아무 반응 없이 이전 status를 남긴다. 사용자는 클릭이 실패한 이유와 실제 실행 여부를 구별하기 어렵다.
- **권장:** 선택/Point/Reference/Brush 조건을 중앙 정책으로 계산해 disabled와 tooltip에 같은 이유를 표시한다.

### AUD-018 · `Caps` 버튼이 빈 장면에서 Line 생성을 시작한다

- **증거:** 재현 + 코드
- **관찰:** “커브 생성 중 카메라 토글” 버튼을 일반 모드에서 누르면 Line 생성 상태가 시작되고 status는 `카메라 조작 OFF · Point 생성 재개`로 덮인다.
- **원인:** `toggleDrawCameraOverride()`가 draw mode가 아니면 `beginLineCreation()`을 호출한다. [Caps 동작](./curve_mesh_hair_tool_v4.html#L2072)
- **권장:** draw mode 밖에서는 버튼을 disabled로 두거나 명시적인 `Start Line` 행동으로 이름을 바꾼다.

### AUD-019 · Point 수치 입력은 Enter와 label drag가 적용처럼 보이지만 적용되지 않는다

- **증거:** 재현 + 코드
- **재현:** Point Position X를 `5`로 입력하고 Enter → 다른 Point로 이동했다 돌아오면 원래 값으로 복원된다.
- **원인:** Point/Section number input에는 geometry를 갱신하는 input/change/Enter handler가 없고 `Apply Numeric Values` 버튼만 실제 상태를 쓴다. 전역 numeric scrubber는 input의 글자만 바꾸고 성공 status를 표시한다.
- **영향:** 사용자는 적용됐다고 생각한 값을 Point 전환으로 조용히 잃는다.
- **권장:** DCC 관례에 맞게 Enter/blur/label drag를 즉시 적용하고 한 gesture를 한 Undo로 묶는다. Apply 방식 유지 시 dirty 표시, Apply/Cancel, Point 전환 경고가 필요하다.

### AUD-020 · 선택 해제 경로가 없다

- **증거:** 코드 + 설계
- **현황:** 빈 뷰포트를 클릭해도 `selectedCurve`를 clear하지 않으며 Escape는 Line 생성 취소에만 사용한다.
- **영향:** 사용자는 패널과 기즈모를 명시적으로 닫을 수 없고 숨김/잠금 모순도 더 크게 느낀다.
- **권장:** Select mode의 빈 클릭 또는 `Alt+A`/명시적 Deselect 명령을 제공한다.

### AUD-021 · Curve color chip이 동작하지 않는 affordance다

- **증거:** 코드
- **현황:** 이름 옆 색상 사각형은 `title="Curve color"`를 가진 `div`지만 click, input, 상태 필드가 없다. [색상 chip](./curve_mesh_hair_tool_v4.html#L148)
- **영향:** 색상 변경 버튼처럼 보이지만 아무 동작도 하지 않는다.
- **권장:** 실제 per-curve color 기능을 구현하거나 chip을 제거한다.

### AUD-022 · 패널의 개념 경계가 섞여 있다

- **증거:** 설계
- **예:** `Curve Object` 안에 Point Knot Type이 있고, `Point Cross-section` 안에 Curve anchor Position이 있으며, `Export` 탭에 `Disable All Live Mesh`가 있다.
- **영향:** Object-level, Point-level, Mesh-level 명령의 범위를 제목만으로 예측하기 어렵다.
- **권장:** `Spline / Point Type`, `Point Transform`, `Mesh Cross-section`, `Mesh Output`으로 재분류한다. 실제 데이터 owner와 UI 그룹을 맞춘다.

### AUD-023 · Command tab과 Scene row의 접근 가능한 이름이 의미를 전달하지 않는다

- **증거:** 브라우저 접근성 snapshot
- **현황:** 탭의 접근 가능한 이름이 `＋`, `⌁`, `◐`, `⇩`이고 표시/잠금 버튼은 `●`, `U`, `L`이다. Point Position과 Offset의 여러 필드가 모두 단순히 `X`, `Y`, `Z`로 읽힌다.
- **권장:** `aria-label`, `fieldset/legend`, 상태형 `aria-pressed`를 추가하고 아이콘 옆 짧은 텍스트를 선택적으로 표시한다.

### AUD-024 · 실패 피드백이 status 한 줄에만 있고 쉽게 덮인다

- **증거:** 재현
- **예:** 선택 없는 Reset Transform은 무반응이라 직전 Build 오류가 그대로 남는다. Invalid Brush는 LIVE 표시와 오류 status가 동시에 존재한다.
- **권장:** field-level validation, rollout 내부 persistent error, toast/history log를 역할별로 구분한다. 무반응 handler를 없앤다.

### AUD-025 · 숨긴 Reference가 Surface 배치 대상으로 계속 사용될 수 있다

- **증거:** 코드
- **원인:** `modelVisible`은 `modelRoot.visible`만 바꾸지만 Surface raycast는 `surfaceMeshes`를 직접 검사한다.
- **영향:** 보이지 않는 표면에 Point가 붙어 Free placement가 고장 난 것처럼 보일 수 있다.
- **권장:** Visible=false이면 surface snap을 끄거나 `Visible`과 별도의 `Snappable` 옵션을 둔다.

### AUD-026 · 끝점 Point Average Amount 1이 Segment를 붕괴시킨다

- **증거:** 코드
- **원인:** 이웃이 하나뿐인 끝점도 해당 이웃 위치로 완전히 lerp한다. [Average 구현](./curve_mesh_hair_tool_v4.html#L836)
- **영향:** “평균화”를 기대하고 Amount 1을 적용하면 첫/마지막 Segment 길이가 0이 된다.
- **권장:** endpoint Point average를 비활성화하거나 endpoint 전용 규칙을 정의하고 collapse 경고를 제공한다.

### AUD-027 · Export 범위가 “활성 Live Mesh 전체”로 고정되어 있다

- **증거:** 코드
- **현황:** hidden, locked, unselected 여부와 관계없이 `meshEnabled && topology`인 모든 Curve를 내보낸다. [Export 대상](./curve_mesh_hair_tool_v4.html#L2296)
- **영향:** 사용자가 선택 객체만 export한다고 오해하거나 숨긴 작업용 mesh를 포함할 수 있다.
- **권장:** `Selected / Visible / All Live` 범위 선택과 export 대상 요약을 제공한다.

### AUD-028 · 표시·좌표계·패널 상태가 세션마다 초기화된다

- **증거:** 코드
- **예:** Transform Space, Axis Lines, View Mode, Grid, Reference opacity, rollout collapse, Average Amount.
- **권장:** 프로젝트 데이터와 사용자 preference를 분리해 local settings에 저장한다.

## 8. P3 — 품질과 유지보수 부채

### AUD-029 · 한국어와 영어, 용어 표기가 혼합된다

- `Point`, `Curve`, `Live Mesh`, `Apply`, `Reset`, `Finish`가 한국어 문장 사이에 혼용된다.
- `Bezier Conner` 같은 과거 표기 혼란을 막기 위해 glossary와 UI string table이 필요하다.

### AUD-030 · 이름 중복을 허용하면서 Export에는 이름을 쓰지 않는다

- Curve rename의 실제 pipeline 효용이 낮고 Scene Explorer에서 같은 이름이 여러 개 생길 수 있다.
- 이름 uniqueness 강제 여부를 정하고 Export 및 오류 메시지에 일관되게 사용한다.

### AUD-031 · 반응형 CSS는 존재하지만 작업 모델은 데스크톱 마우스 중심이다

- 820px 이하에서 패널을 세로로 쌓지만 TransformControls, label scrub, 정밀 Point 선택에 대한 touch UX와 테스트가 없다.
- 지원 플랫폼을 Desktop으로 명시하거나 touch gesture와 hit target을 별도로 설계한다.

### AUD-032 · 핵심 조립 파일이 아직 2,400줄 이상이다

- `curve_mesh_hair_tool_v4.html`에 DOM, store mutation, Three.js scene, evaluator, importer, exporter가 결합되어 있다.
- 현재 분리된 geometry/state 모듈은 좋은 시작이지만 `MODULARIZATION.md`의 store, scene-controller, mesh evaluator, I/O 경계를 계속 진행해야 한다.

### AUD-033 · 진단이 query parameter에만 있고 일반 실행에서는 상태를 알 수 없다

- `?selftest=1`은 개발자에게 유용하지만 launcher와 CI가 자동 실행하지 않는다.
- 별도 test page 또는 CLI/browser test runner로 승격하고 실패 시 commit/push를 차단해야 한다.

## 9. 상태 불변 조건 제안

다음 조건을 store와 자동 테스트에서 항상 검사해야 한다.

```text
selectedCurve == null OR curves.includes(selectedCurve)
drawingCurve == null OR curves.includes(drawingCurve)
selectedControl == null OR selectedControl.curve == selectedCurve
selectedPointIndices ⊆ valid indices of selectedCurve
visible == false  => no visible gizmo and no viewport picking
locked == true   => every prohibited command is disabled and rejected consistently
meshState == ready => topology != null and render objects exist
meshState != ready => Scene Explorer must not show LIVE
brushId != null => asset registry contains brushId OR state is explicit missing-asset
history restore => all referenced assets resolve or surface as missing without mutation
```

## 10. 권장 수정 순서

### 1단계 · 작업 데이터 보호

1. Project JSON schema, Save/Open, local recovery, unsaved indicator.
2. AUD-002 초안 고아 선택 수정.
3. 위 상태 불변 조건을 self-check에 추가.

완료 기준:

- 새로고침 후 복구 선택지가 있다.
- Scene Explorer의 모든 선택 id가 실제 store에 존재한다.
- Draft 취소와 Undo/Redo 20회 후에도 orphan Three.js object가 없다.

### 2단계 · 선택·표시·잠금 정책 통일

1. 중앙 command availability policy.
2. hidden/locked/deselected 상태에서 control과 gizmo 동기화.
3. 다중 선택 transform/delete/average/numeric 계약 확정.
4. 선택 없는 패널 disabled 및 이유 tooltip.

완료 기준:

- 화면의 선택 강조와 모든 명령의 대상 집합이 같다.
- 숨긴 Curve는 보이지도, pick되지도, transform되지도 않는다.
- 잠긴 Curve에서 허용/금지된 동작이 버튼 상태와 handler에서 동일하다.

### 3단계 · Live Mesh와 Asset의 유효 상태

1. Live state를 disabled/evaluating/ready/error로 분리.
2. Segment/Side/Brush size budget과 live rebuild throttle.
3. Asset registry, undo 가능한 add/remove/reassign.
4. Reference staged loading과 glTF 지원 범위 정리.

완료 기준:

- topology가 없으면 LIVE라고 표시하지 않는다.
- 최대 허용 입력에서도 pointer와 UI가 응답한다.
- Brush 제거와 Undo 후 모든 Curve 참조가 복원된다.

### 4단계 · 출력 계약과 round-trip

1. Curve 이름, flat/smooth normal, UV, axis, scale 명세.
2. OBJ/FBX fixture export.
3. Blender/3ds Max 재가져오기 비교.
4. Selected/Visible/All export 범위.

완료 기준:

- UI 설정과 exported file의 이름·normal·UV·축이 일치한다.
- 최소 회귀 장면이 수치 기준을 통과한다.

### 5단계 · 정보 구조와 접근성

1. 빈 장면 Create 우선 흐름.
2. Object/Point/Mesh 명령 재분류.
3. Point 수치 입력의 live/commit 정책 통일.
4. aria-label, fieldset, keyboard focus, Desktop 지원 범위 명시.

## 11. 필수 회귀 시나리오

| ID | 시나리오 | 통과 조건 |
|---|---|---|
| T01 | `+ Line`만 누르고 Cancel | Curve Object 0개, History/selection 일관성 유지 |
| T02 | Point 1개 생성 중 현재 초안 행 클릭 | 행 선택 금지 또는 안전한 draft 동작, orphan 없음 |
| T03 | Point 3개 Finish/Edit 후 Ctrl+A | 선택 집합과 command 대상이 문서 계약과 일치 |
| T04 | 전체 선택 후 Move/Rotate/Scale/Remove/Average | 전체 적용 또는 명시적 Active-only 처리 |
| T05 | Root Move 중 Curve 숨김 | Curve와 모든 gizmo/axis guide가 함께 사라짐 |
| T06 | Curve 잠금 후 모든 패널 명령 클릭 | 허용 명령만 활성화되고 금지 명령은 동일 이유 표시 |
| T07 | Brush 없이 Brush Mesh Build | LIVE 진입 실패, 기존 valid mesh 보존, persistent error 표시 |
| T08 | Segment 512, Side 64 | 예산 내 완료, UI 응답 유지, finite topology |
| T09 | Segment/Side 상한 초과 직접 입력 | 값 clamp 또는 build 거부 |
| T10 | Reference A 로드 후 손상된 B 로드 | A 유지, B 오류 표시 |
| T11 | Brush 사용 Curve → Brush 제거 → Undo | Brush와 Curve 참조 및 mesh 완전 복원 |
| T12 | Point numeric 입력 후 Enter/Point 전환 | 적용 또는 명시적 미적용 경고, 조용한 유실 없음 |
| T13 | Save → 새로고침 → Open/Recovery | Curve/Handle/Section/Root/Modifier/Asset 참조 동일 |
| T14 | Smooth OFF OBJ/FBX round-trip | downstream에서도 flat shading 계약 유지 |
| T15 | Curve rename 후 export | exported object 이름이 규칙에 맞게 보존 |
| T16 | Hidden/Selected/All export 범위 | UI 요약과 파일 포함 대상 일치 |
| T17 | 100 Curve × 100 Point | 선택, Undo, live preview가 목표 응답 시간 내 동작 |
| T18 | 2점 직선, S자, 수직 루프, 나선, 중복점 | 위치·normal·quaternion이 모두 finite, frame flip 기준 통과 |

## 12. 이번 감사의 비범위

이번 작업은 문제를 문서화한 것이며 기능 코드를 수정하지 않는다. 또한 다음은 별도 검증 환경이 필요하다.

- 실제 3ds Max FBX Import 결과
- 다양한 GPU/브라우저의 WebGL 성능
- 외부 텍스처와 복합 glTF/FBX Asset
- 대형 제작 파일의 장시간 메모리 사용량
- 모바일/touch 정밀 편집

Blender 개념과의 상세 대응, 프레임 수학, Handle Type 근거는 [BLENDER_FEATURE_RESEARCH.md](./BLENDER_FEATURE_RESEARCH.md)를 기준 문서로 유지한다. 본 문서는 그 설계를 현재 구현과 실제 UI에 대입한 **구현 감사 결과**다.
