# Blender 기반 커브·메시 기능 조사

> 조사일: 2026-08-07
> 대상: `Curve Mesh Hair Tool v4` (`curve_mesh_hair_tool_v4.html`)
> 목적: 현재 기능을 Blender의 공식 문서와 공개 소스에 대입하고, 불안정 가능성이 있는 부분과 다음 개발 우선순위를 정리한다.

## 1. 결론 요약

이 프로젝트는 Blender의 다음 세 영역이 합쳐진 도구에 가깝다.

1. **Curve Edit Mode**: Bézier 포인트, 좌우 핸들, 선택, 이동·회전·스케일, 삽입, 스무딩
2. **Curve Object / Geometry Nodes**: 오브젝트 변환, 포인트별 반경·틸트, 프로파일을 경로에 스윕하는 Curve to Mesh
3. **간이 DCC 파이프라인**: 참조 모델과 브러시 가져오기, 라이브 메시, OBJ/FBX 내보내기, Undo/Redo

현재 구현 방향은 타당하다. 특히 아래 기능은 Blender식 모델과 잘 맞는다.

- 포인트 위치와 좌우 탄젠트를 별도로 저장한다.
- 포인트를 이동하면 상대 벡터인 핸들이 함께 이동한다.
- 포인트 회전·스케일 시 포인트와 양쪽 핸들을 하나의 편집 단위로 변환한다.
- 스플라인 로컬 포인트와 스플라인 오브젝트 변환을 분리한다.
- de Casteljau 분할로 기존 Bézier 형상을 유지하며 포인트를 삽입한다.
- 경로와 단면 프로파일을 분리하고 라이브로 메시를 재평가한다.
- 한 번의 기즈모 드래그를 하나의 Undo 항목으로 묶는다.

조사 당시 Blender와 비교해 다음 네 항목을 먼저 바로잡아야 한다고 판단했다. 1·2번의 핵심 구조는 아래의 1차 안정화 작업에서 반영했으며, 나머지는 계속 진행해야 한다.

1. **핸들 타입 데이터 모델**: 현재 포인트당 한 개의 `handleMode`만 있다. Blender는 왼쪽과 오른쪽 타입을 따로 저장하며 공식 타입은 `FREE`, `VECTOR`, `ALIGNED`, `AUTO` 네 가지다.
2. **커브 프레임과 꼬임**: 현재 `computeFrenetFrames()` 중심 방식은 변곡점, 거의 직선인 구간, 중복 포인트, 급격한 3D 방향 변화에서 프레임이 뒤집히거나 붕괴할 가능성이 있다.
3. **평균화와 핸들 자동 계산의 분리**: 포인트 위치 스무딩, 핸들 재계산, 핸들 타입 변경은 서로 다른 연산이어야 한다.
4. **평가·편집·기록 계층의 분리**: UI 이벤트에서 상태 수정, 핸들 제약, 라이브 메시 재생성, Undo 기록을 한꺼번에 수행하고 있어 기능이 늘수록 회귀 위험이 커진다.

### 1차 안정화 반영 상태 · 2026-08-07

- `src/geometry/bezier-handles.js`: UI의 `Bezier / Corner / Smooth`를 유지하면서 좌우별 `Aligned / Vector / Free / Auto` 타입을 내부에 추가했다.
- Corner는 처음에 이웃을 향하는 Vector이며, 직접 움직인 쪽만 Free로 전환된다. 더 이상 0 길이 핸들로 코너를 표현하지 않는다.
- Smooth 핸들을 직접 움직이면 양쪽 Aligned인 Bezier로 전환된다.
- 포인트 전체 회전·스케일 시 Auto는 Aligned, Vector는 Free로 전환해 화면의 실제 형상과 타입 의미가 어긋나지 않게 했다.
- `src/geometry/sweep-frames.js`: Three.js 기본 호출을 직접 사용하던 코드를 회전 최소화 프레임 모듈로 분리하고, 0 접선·NaN arc mapping·180도 접선 반전에 fallback을 추가했다.
- `src/diagnostics/core-self-check.js`: `?selftest=1`에서만 핸들 상태 전이와 퇴화 프레임을 검사한다. 일반 실행에는 자가진단 비용이 없다.

## 2. 조사 자료의 우선순위

자료는 다음 순서로 신뢰한다.

1. Blender 공식 사용자 매뉴얼과 Python API: 외부에 보이는 동작과 데이터 계약
2. Blender Developer Documentation: 설계 원칙과 개발 구조
3. Blender 공식 공개 소스: 실제 계산, 상태 전이, Undo, 성능 구조
4. Blender Developer Forum과 Blender Artists: 반복적으로 발생한 사용자 문제와 회귀 테스트 후보

커뮤니티 글은 현재 Blender의 명세로 간주하지 않는다. 오래된 글도 “어떤 입력에서 사용자가 계속 문제를 경험했는가”를 찾는 회귀 테스트 자료로 사용한다.

공식 Developer Documentation의 출발점은 [Curve Feature](https://developer.blender.org/docs/features/objects/curve/)와 [Curves Feature](https://developer.blender.org/docs/features/objects/curves/)다. 전자는 기존 Curve object 편집·평가 계열, 후자는 hair/새 Curves 데이터 계열을 추적할 때 사용하고, 실제 동작 확인은 아래의 현재 매뉴얼·API·소스 링크로 교차 검증한다.

## 3. 현재 프로젝트와 Blender 기능 대응표

| 현재 프로젝트 기능 | Blender의 대응 개념 | 일치 정도 | 권장 조치 |
|---|---|---:|---|
| `+ Line`, 포인트 생성 | Curve primitive, Bézier spline | 높음 | `Create` 탭 배치는 적절하다. 스플라인 타입과 생성 도구를 구분한다. |
| 포인트 + `inTangent` + `outTangent` | `BezierSplinePoint.co`, `handle_left`, `handle_right` | 높음 | 내부 명칭을 `handleLeft/Right` 또는 명확한 입·출력 규칙으로 통일한다. |
| 포인트 선택 후 포인트·핸들 일체 이동/회전/스케일 | 중앙 제어점 선택 시 제어점과 핸들을 한 단위로 취급 | 높음 | 개별 핸들 선택과 전체 포인트 선택을 선택 상태에서 분명히 구분한다. |
| `Bezier`, `Corner`, `Smooth` | `ALIGNED`, `VECTOR`/`FREE`, `AUTO` | 높음 | 3개 UI 프리셋과 좌우별 4타입 내부 모델을 분리했다. 고급 좌우 타입 UI는 후속 항목이다. |
| `Auto Tangents` | Automatic handles, Recalculate Handles | 중간 | 타입 전환과 일회성 재계산을 별도 명령으로 만든다. |
| Point 평균화 | Smooth control points | 중간 | 현재 0~1 계수는 유용한 확장이다. 끝점·순환 곡선·다중 선택 규칙을 명시한다. |
| Handle 평균화 | Recalculate Handles | 중간 | 현재처럼 자동으로 `Smooth` 타입으로 바꾸지 않도록 옵션을 분리한다. |
| de Casteljau 포인트 삽입 | Subdivide Curve | 높음 | 형상 불변 오차 테스트와 속성 보간 테스트를 추가한다. |
| 스플라인 Root 이동·회전·스케일 | Object transform | 높음 | Point 1 고정 피벗 외에 Origin, Median, Active Point를 추가한다. |
| 포인트별 단면 X/Z 스케일 | Curve point radius + Curve to Mesh scale field | 중간~높음 | 등방 `radius`와 비등방 `scaleX/scaleZ`를 구분해 저장한다. |
| 포인트별 단면 회전 | Curve point tilt / curve normal | 높음 | 일반 3D quaternion과 경로 축 기준 `tilt`를 분리한다. |
| Ribbon / Tube / Imported Brush | Curve to Mesh + Profile Curve | 높음 | 브러시는 재사용 가능한 프로파일 자산으로 독립시킨다. |
| Caps | Curve to Mesh `Fill Caps` | 높음 | 열린/닫힌 프로파일과 경로의 cyclic 여부에 따라 활성 조건을 검증한다. |
| Generate Mapping Coordinates | 메시 face-corner UV 속성 | 중간 | 길이 기반 V, 단면 기반 U, seam, cap UV를 각각 테스트한다. |
| Smooth Shading | `shade_smooth` 속성 전달 | 중간 | 법선 생성과 스무스 플래그를 분리하고 sharp edge 정책을 둔다. |
| Twist Correction | Curve normal + Twist Method + point tilt | 낮음~중간 | 최소 회전 프레임, 명시적 tilt, 순환 곡선 보정을 도입한다. |
| Undo/Redo | Blender Undo System + operator grouping | 중간 | 전체 앱 스냅샷에서 명령 단위 또는 구조 공유 스냅샷으로 발전시킨다. |
| OBJ / FBX / GLB / GLTF 참조 로드 | Blender I/O | 보조 기능 | 로드 실패·좌표축·단위·대형 파일을 격리한다. |
| OBJ/ASCII FBX 내보내기 | Blender I/O export | 중간 | Blender 재가져오기 기반 golden test를 만든다. FBX는 계속 Experimental로 둔다. |

Blender 공식 API의 Bézier 포인트는 좌우 핸들 위치와 좌우 핸들 타입, `radius`, `tilt`, 그리고 제어점·좌우 핸들의 선택 상태를 각각 가진다. 이 구조가 프로젝트의 장기 데이터 모델에 가장 직접적인 기준이다. [BezierSplinePoint API](https://docs.blender.org/api/current/bpy.types.BezierSplinePoint.html)

## 4. Bézier 포인트와 핸들

### 4.1 Blender의 공식 타입은 네 가지다

Blender Curve의 Bézier 핸들 타입은 다음과 같다.

- **Automatic**: 이웃 포인트를 바탕으로 부드러운 방향과 길이를 자동 계산한다. 직접 움직이면 Aligned로 전환된다.
- **Vector**: 인접 제어점을 향한다. 직선 구간과 날카로운 코너에 사용한다. 직접 움직이면 Free로 전환된다.
- **Aligned**: 두 핸들이 한 직선 위의 반대 방향을 유지하지만 길이는 서로 다를 수 있다.
- **Free**: 좌우 핸들이 완전히 독립적이다.

이 동작은 [Blender 5.0 Curve Structure](https://docs.blender.org/manual/en/5.0/modeling/curves/structure.html)에 설명되어 있고, 실제 핸들 계산은 공식 소스의 [`curve_bezier.cc`](https://github.com/blender/blender/blob/main/source/blender/blenkernel/intern/curve_bezier.cc)에 분리되어 있다.

1차 안정화 이후 프로젝트의 동작은 다음과 같다.

| 프로젝트 표시명 | 현재 실제 동작 | 가장 가까운 Blender 개념 | 문제점 |
|---|---|---|---|
| Bezier | 양쪽 Aligned. 이동한 핸들의 반대편을 반대 방향에 정렬하고 반대편 길이는 유지 | Aligned | 표시명은 3ds Max식 프리셋명으로 유지한다. |
| Corner | 처음에는 좌우 Vector. 직접 움직인 쪽은 Free가 되어 반대편과 독립 | Vector / Free | 혼합 좌우 타입을 UI에서 세부 표시하는 고급 모드가 아직 없다. |
| Smooth | 이웃 위치와 인접 거리를 이용한 좌우 Auto. 직접 핸들 편집 시 Bezier로 전환 | Automatic | Blender와 같은 핵심 상태 전이를 적용했다. |

### 4.2 권장 데이터 모델

UI가 3ds Max식 `Bezier / Corner / Smooth` 세 항목을 유지하더라도 내부 데이터는 다음처럼 더 정확해야 한다.

```text
BezierPoint
  position
  handleLeftPosition
  handleRightPosition
  handleLeftType: FREE | VECTOR | ALIGNED | AUTO
  handleRightType: FREE | VECTOR | ALIGNED | AUTO
  radius
  tilt
  selection: CONTROL | LEFT_HANDLE | RIGHT_HANDLE | NONE
  sectionScaleX
  sectionScaleZ
  sectionOffset
  sectionRotation
```

UI 프리셋은 내부 타입의 조합으로 번역한다.

- `Bezier` 프리셋 → 양쪽 `ALIGNED`
- `Corner` 프리셋 → 기본은 양쪽 `VECTOR`, 사용자가 한쪽을 꺾으면 그쪽 `FREE`
- `Smooth` 프리셋 → 양쪽 `AUTO`
- 고급 패널 → 좌우 타입을 따로 편집

이렇게 하면 사용자에게 익숙한 세 분류를 유지하면서 Blender식 세밀한 상태 전이와 향후 파일 호환성을 확보할 수 있다.

### 4.3 포인트와 핸들의 “일심동체” 조작

Blender의 Bézier 선택 모델에서도 중앙 제어점을 선택하면 포인트와 핸들이 함께 움직이고, 핸들만 선택하면 해당 제어 벡터만 수정한다. 프로젝트가 구현한 포인트 단위 회전·스케일은 이 원칙과 잘 맞는다. 참고: [Blender Curve Selecting](https://docs.blender.org/manual/en/latest/modeling/curves/selecting.html).

선택 상태는 불리언 하나보다 다음 세 가지를 구분하는 편이 안전하다.

- 제어점 전체 선택
- 왼쪽 핸들만 선택
- 오른쪽 핸들만 선택

다중 선택을 추가할 때 중앙 제어점 전체 선택은 양쪽 핸들을 변환 대상에 포함하고, 개별 핸들 선택은 앵커를 고정해야 한다.

## 5. 평균화, 스무딩, 자동 핸들

Blender는 **Smooth**와 **Recalculate Handles**를 별도 연산으로 제공한다. Smooth는 이웃 포인트를 고정한 채 선택 포인트의 거리를 줄이며 탄젠트에는 영향을 주지 않는다. Recalculate Handles는 선택 포인트의 핸들을 곡선의 접선 방향으로 다시 계산하며 길이를 같게 하는 옵션이 있다. [Control Points 문서](https://docs.blender.org/manual/en/latest/modeling/curves/editing/control_points.html)

프로젝트의 0~1 `Average Amount`는 Blender 기본 UI보다 직접적이고 유용한 확장이다. 다만 연산을 다음처럼 정의해야 예측 가능하다.

```text
result = lerp(current, calculatedTarget, factor)
factor = 0: 변화 없음
factor = 1: 목표값 완전 적용
```

권장 명령은 다음과 같다.

- **Smooth Position**: 위치만 이웃 평균 쪽으로 이동, 핸들 벡터와 타입은 유지
- **Recalculate Handles**: 앵커 위치는 유지, 핸들 방향·길이만 재계산
- **Smooth Position & Handles**: 위 두 연산을 명시된 순서로 실행
- **Change Handle Type**: 데이터 타입만 전환하며 필요한 핸들 계산을 한 번 수행

현재 구현은 Handle 평균화 후 `handleMode = 'smooth'`로 강제한다. 이는 계산 명령과 타입 변경이 결합된 상태이므로 Undo 결과와 후속 핸들 드래그가 예상과 달라질 수 있다.

Blender의 새 Curves 스무딩 구현은 반복적인 이웃 평균을 Gaussian과 유사한 가중치로 계산하며, 순환 여부, 끝점 처리, 형상 유지, 포인트별 영향도를 별도 입력으로 취급한다. 구현 참고 영역은 [`smooth_curves.cc`](https://github.com/blender/blender/blob/main/source/blender/geometry/intern/smooth_curves.cc)다. 프로젝트가 다중 포인트 평균화로 확장될 때 같은 매개변수 분리가 유용하다.

## 6. 포인트 삽입과 토폴로지 변경

현재 프로젝트는 cubic Bézier를 de Casteljau 방식으로 분할해 삽입 전후 곡선 모양을 보존한다. 이는 좋은 구현이다. Blender도 Subdivide를 단순한 점 추가가 아니라 커브 타입별 속성 보간과 새 핸들 타입 결정이 포함된 토폴로지 연산으로 다룬다. 공식 구현 영역은 [`subdivide_curves.cc`](https://github.com/blender/blender/blob/main/source/blender/geometry/intern/subdivide_curves.cc)다.

삽입 시 위치와 탄젠트 외에도 다음 속성을 같은 매개변수 `t`에서 보간해야 한다.

- radius 또는 section scale
- tilt 또는 section rotation
- section offset
- 선택 상태의 초기값
- 재질/프로파일 관련 포인트 속성
- cyclic spline의 마지막→첫 번째 구간

필수 테스트:

1. 삽입 전후 1,001개 매개변수 샘플의 최대 위치 오차가 허용치 이하인지 확인
2. `t = 0.5`뿐 아니라 0.01, 0.25, 0.75, 0.99에서 확인
3. 0 길이 핸들, 중복 포인트, 아주 짧은 세그먼트에서 NaN이 없는지 확인
4. 삽입 후 Undo/Redo가 포인트 속성과 선택 상태를 정확히 복원하는지 확인

## 7. Curve to Mesh와 프로파일

Blender의 Curve to Mesh는 경로 Curve와 선택적인 Profile Curve를 받아 프로파일을 각 스플라인을 따라 스윕한다. 닫힌 프로파일에는 Fill Caps로 끝 N-gon을 만들 수 있고, 속성도 결과 메시로 전달한다. [Curve to Mesh 매뉴얼](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/curve/operations/curve_to_mesh.html)

공식 노드 구현은 입력을 해석하는 [`node_geo_curve_to_mesh.cc`](https://github.com/blender/blender/blob/main/source/blender/nodes/geometry/nodes/node_geo_curve_to_mesh.cc)와 실제 변환을 담당하는 [`curve_to_mesh_convert.cc`](https://github.com/blender/blender/blob/main/source/blender/blenkernel/intern/curve_to_mesh_convert.cc)로 나뉜다. 현재 소스에서도 위치·접선·법선으로 포인트 변환 행렬을 만들고 프로파일 스케일과 cap 옵션을 변환 계층에 전달한다.

프로젝트의 대응은 다음과 같다.

- Ribbon → 열린 직사각형/선형 profile
- Tube → 닫힌 원/타원 profile
- Imported Mesh Brush → 사용자 정의 profile 또는 반복되는 brush geometry
- Width/Radius X, Depth/Radius Z → profile 기본 크기
- 포인트 Scale X/Z → point-domain profile scale
- 포인트 Rotation → tilt 또는 추가 section rotation
- Cap Start/End → Fill Caps의 세분화된 프로젝트 확장

장기적으로는 `meshType`별로 별도 생성기를 늘리기보다 공통 Sweep Evaluator에 프로파일 공급자만 교체하는 구조가 안정적이다.

```text
CurveEvaluator + ProfileSampler + SweepFrameProvider
                       ↓
                 MeshTopologyBuilder
                       ↓
          UV / Normals / Caps / Export adapters
```

## 8. 가장 위험한 영역: 3D 커브의 프레임과 꼬임

1차 안정화 이전에는 Twist Correction이 켜졌을 때 Three.js의 `computeFrenetFrames()`를 직접 사용했다. 현재는 동일한 초기 단면 방향을 최대한 유지하면서 parallel transport 기반 회전 최소화 프레임을 별도 모듈에서 계산한다. Twist Correction을 끄면 각 샘플의 고정 기준 프레임을 사용한다. 방어 코드를 추가했더라도 다음 입력은 계속 회귀 테스트해야 한다.

- 연속된 포인트가 같은 위치인 경우
- 접선 길이가 0 또는 매우 작은 경우
- 곡률이 0에 가까워 normal 방향이 정해지기 어려운 경우
- 변곡점을 통과하는 경우
- 접선이 기준축과 거의 평행한 경우
- 닫힌 커브에서 시작과 끝 프레임의 roll이 맞지 않는 경우
- 큰 비균일 오브젝트 스케일이 적용된 경우

Blender는 Curve Shape에 `Minimum`, `Tangent`, `Z-Up` Twist Method와 별도의 twist smoothing을 노출한다. [Curve Shape 문서](https://docs.blender.org/manual/en/latest/modeling/curves/properties/shape.html)

오래된 Blender 변경 이력에서도 minimum-twist의 순환 커브 보정, tangent 방식, twist smoothing, quaternion 기반 프레임을 별도 문제로 다뤘다. 특히 smoothing 반복 수가 커질 때 flip 가능성이 있다는 기록도 있다. 이 기록은 현재 Blender의 결함 주장이라기보다, 프레임 계산이 오랫동안 별도 알고리즘과 회귀 테스트를 필요로 했다는 근거다. [Blender curve twist 변경 이력](https://projects.blender.org/archive/blender-archive/commits/commit/1de250014de04fb3312725f1fecc6327fa86666d/source/blender/blenkernel)

Blender Artists에도 3D Bézier bevel의 국소 twist, tilt로 문제가 다른 위치로 이동하는 현상, UV 간격 불일치가 반복적으로 보고되었다. 오래된 사례이지만 프로젝트 테스트 장면으로 재현할 가치가 있다.

- [How to prevent twisting in a 3D bezier curve](https://blenderartists.org/t/how-to-prevent-twisting-in-a-3d-bezier-curve/433530)
- [The geometry created from the curve is twisted](https://blenderartists.org/t/the-geometry-created-from-the-curve-is-twisted/1369455)
- [Correcting UVs of a mesh generated from a curve](https://blenderartists.org/t/correcting-uvs-of-a-mesh-generated-from-a-curve/632191)

### 8.1 권장 해결 방향

1. 기본 프레임을 Frenet 단독이 아닌 **rotation-minimizing frame / parallel transport frame**으로 교체한다.
2. 첫 유효 접선에서 안정적인 초기 normal을 선택하고 이전 프레임을 다음 샘플로 운반한다.
3. 포인트별 `tilt`를 운반된 프레임의 접선 축 회전으로 마지막에 적용한다.
4. cyclic spline은 마지막 프레임과 첫 프레임의 roll 오차를 전체 길이에 걸쳐 분산한다.
5. 0 길이 세그먼트는 평가에서 건너뛰거나 이전 유효 프레임을 유지한다.
6. 모든 정규화·행렬·quaternion 결과에 `Number.isFinite` 검사를 둔다.
7. 비균일 root scale은 평가 전에 명시적으로 bake하거나 normal matrix로 처리한다.

## 9. UV, 법선, cap 안정성

### 9.1 UV

현재 Tube UV는 U를 단면 둘레, V를 경로 샘플 진행률로 둔다. `getPointAt()` 기반 샘플이므로 V가 길이 방향에 가까운 점은 좋다. 그러나 다음을 명시해야 한다.

- Tube의 U seam은 face-corner UV에서 첫 열과 마지막 열을 분리한다.
- Cap UV는 side UV와 별도 island로 유지한다.
- Ribbon의 앞·뒤 면이 생기면 winding과 UV 방향을 정한다.
- Imported Brush는 원본 UV를 유지할지, 경로 좌표로 다시 생성할지 선택한다.
- 비균일 포인트 간격과 급한 굴곡에서 텍셀 밀도 오차를 측정한다.

커뮤니티의 과거 사례는 커브에서 생성된 균일 UV row가 실제 3D edge-loop 간격과 다를 수 있음을 보여준다. 이는 “Generate Mapping Coordinates”가 체크되는지만 볼 것이 아니라 길이 기반 텍셀 밀도를 검사해야 한다는 테스트 근거다. [Blender Artists UV 사례](https://blenderartists.org/t/correcting-uvs-of-a-mesh-generated-from-a-curve/632191)

### 9.2 법선

현재 내보내기 법선은 각 face normal을 정규화한 뒤 공유 vertex에 합산한다. 이 방식은 면적이 크게 다른 face에서도 같은 가중치를 주며, sharp edge와 UV seam을 구분하지 않는다.

권장 순서:

1. 토폴로지 생성 시 face winding 검증
2. 면적 또는 각도 가중 vertex normal
3. profile의 sharp corner에서 vertex/normal split
4. cap과 side 경계의 hard/smooth 정책
5. 뷰포트와 OBJ/FBX의 동일한 normal 결과 확인

### 9.3 cap

N-gon cap은 편리하지만 다음을 테스트해야 한다.

- profile이 단순 폐곡선인지
- self-intersection이 없는지
- winding이 start/end에서 반대인지
- 3개 미만의 유효 단면 vertex가 들어오지 않는지
- radius 0 tip과 cap이 겹쳐 중복·퇴화 face가 생기지 않는지

## 10. Undo/Redo와 명령 경계

현재 `src/state/history.js`는 `begin → commit` 트랜잭션과 최대 100개의 전체 상태 스냅샷을 사용한다. 한 번의 기즈모 드래그와 한 번의 숫자 label 드래그가 각각 한 단계가 되는 것은 올바른 방향이다.

Blender 공식 소스도 편집 모드 전용 encode/decode 계층과 전역 Undo stack·group push를 분리한다.

- Curve edit-mode 상태 직렬화·복원: [`editcurve_undo.cc`](https://github.com/blender/blender/blob/main/source/blender/editors/curve/editcurve_undo.cc)
- 전역 push, grouped push, undo/redo step: [`ed_undo.cc`](https://github.com/blender/blender/blob/main/source/blender/editors/undo/ed_undo.cc)

Blender UI 지침은 선택과 드래그가 겹치는 경우를 별도로 다룬다. 이미 선택된 항목을 눌렀지만 선택 상태가 바뀌지 않았다면 Undo push를 만들지 않고, 실제 drag가 검출되면 선택 항목들을 이동하도록 권고한다. [Selection HIG](https://developer.blender.org/docs/features/interface/human_interface_guidelines/selection/)

### 10.1 현재 방식의 확장 위험

- 매 단계에서 모든 커브 상태를 JSON 문자열로 비교한다.
- Undo 복원 시 모든 Curve control과 활성 Live Mesh를 폐기하고 다시 만든다.
- 커브·포인트·세그먼트가 많아지면 메모리와 복원 시간이 선형 이상으로 커질 수 있다.
- 브러시 자산이나 향후 재질·텍스처가 상태에 포함되면 스냅샷 비용이 급격히 증가한다.

### 10.2 권장 발전 단계

1. 지금의 전체 스냅샷 방식을 유지하되 성능 계측을 추가한다.
2. 상태를 immutable한 순수 데이터와 Three.js runtime 객체로 분리한다.
3. topology change는 구조 공유 스냅샷, transform은 작은 command/delta로 기록한다.
4. 한 pointer gesture에서 최초 변경 시에만 트랜잭션을 시작한다.
5. 취소(Escape, pointercancel) 시 원본 상태 복원과 `cancel()`을 함께 수행한다.
6. Undo 복원 후 전체 rebuild 대신 dirty curve만 재평가한다.

## 11. 편집 명령과 원시 데이터 쓰기를 분리해야 하는 이유

Blender 3.2 Geometry Nodes 변경 기록은 `position`, `handle_left`, `handle_right` 속성에 직접 쓰는 단순 동작과, Edit Mode 같은 핸들 연동 규칙이 있는 Set Position / Set Handle Position 노드를 구분했다. 이 분리는 프로젝트에도 매우 중요하다. [Blender 3.2 Nodes release notes](https://developer.blender.org/docs/release_notes/3.2/nodes_physics/)

권장 API:

```text
Raw data API
  setPointPositionRaw(id, value)
  setHandlePositionRaw(id, side, value)
  setHandleTypeRaw(id, side, type)

Semantic operator API
  moveControlPoint(selection, delta, options)
  moveHandle(pointId, side, value, constraintMode)
  setHandlePreset(pointIds, preset)
  smoothPoints(pointIds, factor)
  recalculateHandles(pointIds, factor)
  subdivideSegment(splineId, segmentId, t)
```

Undo, 상태 전이, 반대 핸들 제약, live mesh dirty 표시는 Semantic operator에서만 수행한다. Import와 state restore는 Raw API를 사용해 편집 규칙이 중복 적용되지 않게 한다.

## 12. 성능과 라이브 평가

Blender는 Curves 데이터 블록으로의 이전, 속성 기반 필드 평가, 병렬 처리로 다수 커브 작업의 성능을 크게 개선했다. 공식 릴리스 노트에는 Curve to Mesh가 수백만 커브 입력에서 4~5배, Resample이 많은 작은 poly curve에서 약 6배 개선된 사례가 기록되어 있다. 수치는 특정 Blender 버전과 장면의 결과이므로 프로젝트 성능을 보장하지는 않지만, 데이터와 평가 계층을 분리해야 하는 근거는 분명하다. [Blender 3.2 performance notes](https://developer.blender.org/docs/release_notes/3.2/nodes_physics/)

현재 프로젝트는 기즈모 `objectChange`마다 Curve line과 Live Mesh를 즉시 재생성한다. 다음 최적화가 필요하다.

- pointer event마다 즉시 계산하지 않고 `requestAnimationFrame`당 최대 한 번으로 합친다.
- `curveDirty`, `frameDirty`, `topologyDirty`, `materialDirty`를 구분한다.
- position만 변하면 BufferAttribute를 갱신하고, segments/radial/profile이 바뀔 때만 토폴로지를 다시 만든다.
- 보이지 않는 curve와 잠긴 curve는 평가 우선순위를 낮춘다.
- 대형 brush sweep은 Web Worker 또는 WASM 후보로 분리한다.
- 성능 테스트는 “커브 수 × 포인트 수 × 경로 세그먼트 × 단면 vertex 수” 조합으로 측정한다.

## 13. 현재 구현에서 바로 확인할 불안정 후보

아래는 Blender 자료와 현재 코드를 대조해 도출한 프로젝트 측 점검 항목이다. Blender에 동일한 버그가 현재 존재한다는 뜻은 아니다.

### P0 — 데이터 손상 또는 눈에 띄는 형상 오류

1. **Corner의 0 길이 핸들 — 반영 완료**
   Vector/Free 내부 타입과 0 길이 tangent 평가 fallback을 추가했다.
2. **중복 포인트와 0 길이 세그먼트**
   tangent/normal/cross product를 정규화하기 전에 길이를 검사한다.
3. **변곡점 프레임 flip**
   회전 최소화 프레임과 S자 self-check는 반영했다. 수직 루프, 나선, 거의 직선→급회전 장면 테스트는 추가해야 한다.
4. **비균일 root scale 후 section 회전**
   object matrix의 shear 가능성과 quaternion decomposition 결과를 검증한다.
5. **Undo 중 전체 live mesh 복원**
   대형 장면에서 멈춤, 선택 소실, brush 참조 누락 여부를 확인한다.

### P1 — 편집 결과의 일관성

1. `Smooth` 핸들을 직접 움직이면 `Bezier/Aligned`로 전환되도록 반영했다.
2. Handle 평균화는 factor 1에서 `Smooth/Auto`, 부분 적용에서 수동 `Bezier/Aligned` 결과로 정의했다.
3. Point 평균화 시 핸들이 상대 벡터로 유지되는 것이 의도인지 옵션화한다.
4. root transform과 point local transform 사이의 좌표계 변환을 테스트한다.
5. point section rotation과 경로 tilt가 동일 개념인지 UI에 설명한다.
6. lock/visibility/selection 변경의 Undo 정책을 일관되게 만든다.

### P2 — 출력 호환성

1. FBX 7.4 ASCII를 Blender, 3ds Max에서 재가져와 vertex/face/UV/normal/축/scale을 비교한다.
2. OBJ N-gon과 UV seam index가 일치하는지 확인한다.
3. negative scale과 mirrored transform에서 winding과 normal을 확인한다.
4. radius 0 tip, cap, smooth shading 조합의 퇴화 face를 제거한다.

## 14. 권장 모듈 구조

현재 단일 HTML에 UI, 데이터, Three.js 객체, 편집 명령, mesh evaluation, I/O가 결합되어 있다. Blender 소스처럼 “데이터 → 연산자 → 평가 → 편집기”를 분리하는 것이 안정성에 가장 큰 도움이 된다.

현재 분리된 첫 모듈은 `src/geometry/bezier-handles.js`, `src/geometry/sweep-frames.js`, `src/diagnostics/core-self-check.js`, `src/state/history.js`, `src/ui/numeric-scrubber.js`다. 아래 구조는 그 다음 목표다.

```text
src/
  core/
    curve-data.js           # CurveObject, Spline, BezierPoint 순수 데이터
    selection-state.js      # active/selected point/handle 집합
    validation.js           # finite, zero-length, topology invariants
  operators/
    point-operators.js      # move/rotate/scale/smooth
    handle-operators.js     # type transition, constrain, recalculate
    spline-operators.js     # add/delete/subdivide/reverse/cyclic
    object-operators.js     # root transform, origin/pivot
  history/
    history.js              # transaction, undo/redo
    commands.js             # 작은 delta 또는 구조 공유 snapshot
  geometry/
    bezier-evaluator.js     # 위치/접선/길이 LUT
    sweep-frames.js         # parallel transport, tilt, cyclic correction
    profiles.js             # ribbon/tube/imported profile
    curve-to-mesh.js        # topology generation
    normals.js
    uv.js
  viewport/
    scene-controller.js
    selection-controller.js
    transform-controller.js
    overlays.js
  ui/
    panels.js
    numeric-scrubber.js
    shortcuts.js
  io/
    importers.js
    obj-exporter.js
    fbx-exporter.js
    project-file.js
  tests/
    bezier.test.js
    handles.test.js
    frames.test.js
    curve-to-mesh.test.js
    history.test.js
    export-roundtrip.test.js
```

Blender 공개 소스에서 기능별로 참고할 위치:

| 관심사 | Blender 소스 영역 |
|---|---|
| 기존 Curve 편집 operator와 핸들 연동 | [`source/blender/editors/curve/editcurve.cc`](https://github.com/blender/blender/blob/main/source/blender/editors/curve/editcurve.cc) |
| Bézier 평가와 자동·정렬 핸들 계산 | [`source/blender/blenkernel/intern/curve_bezier.cc`](https://github.com/blender/blender/blob/main/source/blender/blenkernel/intern/curve_bezier.cc) |
| 새 Curves 데이터 구조와 평가 | [`source/blender/blenkernel/intern/curves_geometry.cc`](https://github.com/blender/blender/blob/main/source/blender/blenkernel/intern/curves_geometry.cc) |
| Curve 스무딩 | [`source/blender/geometry/intern/smooth_curves.cc`](https://github.com/blender/blender/blob/main/source/blender/geometry/intern/smooth_curves.cc) |
| Curve subdivision | [`source/blender/geometry/intern/subdivide_curves.cc`](https://github.com/blender/blender/blob/main/source/blender/geometry/intern/subdivide_curves.cc) |
| Curve to Mesh 핵심 변환 | [`source/blender/blenkernel/intern/curve_to_mesh_convert.cc`](https://github.com/blender/blender/blob/main/source/blender/blenkernel/intern/curve_to_mesh_convert.cc) |
| Geometry Nodes의 Curve to Mesh 공개 연산 | [`source/blender/nodes/geometry/nodes/node_geo_curve_to_mesh.cc`](https://github.com/blender/blender/blob/main/source/blender/nodes/geometry/nodes/node_geo_curve_to_mesh.cc) |
| Curve Edit Mode Undo | [`source/blender/editors/curve/editcurve_undo.cc`](https://github.com/blender/blender/blob/main/source/blender/editors/curve/editcurve_undo.cc) |
| 전역 Undo stack과 grouping | [`source/blender/editors/undo/ed_undo.cc`](https://github.com/blender/blender/blob/main/source/blender/editors/undo/ed_undo.cc) |
| Curves 단위 테스트 | [`source/blender/blenkernel/intern/curves_geometry_test.cc`](https://github.com/blender/blender/blob/main/source/blender/blenkernel/intern/curves_geometry_test.cc) |

## 15. 기능 로드맵

### 1단계 — 안정화 기반

- 내부 핸들 타입을 좌/우 `FREE | VECTOR | ALIGNED | AUTO`로 전환
- 3ds Max식 UI 프리셋을 내부 타입으로 매핑
- 중복 포인트·0 tangent·non-finite validation
- rotation-minimizing sweep frame 도입
- 현재 기능의 단위 테스트 기반 마련
- JSON 프로젝트 Save/Load 추가

### 2단계 — Blender 수준의 기본 Curve 편집

- 다중 포인트/핸들 선택
- cyclic spline
- radius와 tilt를 정식 point attribute로 추가
- subdivide, resample, reverse, trim
- origin/pivot: Point 1, Active, Median, Object Origin
- snapping: vertex, surface, grid

Blender Geometry Nodes의 Curve 기능 목록은 향후 연산 범위를 정하는 좋은 체크리스트다. 현재 문서에는 Handle Positions/Type, Tangent, Tilt, Radius, Cyclic, Resolution 읽기·쓰기와 Resample, Reverse, Subdivide, Trim, Curve to Mesh 등이 정리되어 있다. [Geometry Nodes Curve 목록](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/index.html)

### 3단계 — 비파괴 프로시저럴 구조

- Curve data와 Curve to Mesh modifier를 완전히 분리
- modifier stack과 dirty dependency 평가
- 여러 profile과 point-domain profile scale field
- surface attachment와 Deform Curves on Surface 계열 기능
- 대형 hair/strand용 instancing과 batch evaluation

### 4단계 — 파이프라인 호환성

- Blender/3ds Max round-trip 자동 검증
- glTF/OBJ를 우선 안정 포맷으로 두고 FBX는 검증된 exporter로 교체 검토
- 단위, up axis, handedness, negative scale 정책 문서화
- 프로젝트 파일 버전과 migration 추가

## 16. 최소 회귀 테스트 장면

| 장면 | 검증 목적 |
|---|---|
| 2점 직선, Vector/Corner | 직선 유지, 0 tangent 금지 |
| 3점 S자 곡선 | 변곡점 frame flip |
| 수직 루프 | 기준축 평행과 twist continuity |
| 3D 나선 4회전 | 누적 roll과 tilt |
| 같은 위치의 연속 포인트 | finite 검증과 안전한 fallback |
| 한 구간 길이가 `1e-8`인 곡선 | 정규화 안정성 |
| cyclic 원형 curve | 시작/끝 프레임과 UV seam |
| 비등방 X/Z profile + point rotation | section orientation |
| radius 0 tip + cap | 퇴화 face와 normal |
| 100 curves × 100 points | 선택, Undo, live rebuild 성능 |
| 10회 연속 drag 후 Undo/Redo | 한 gesture 한 step, 상태 완전 복원 |
| OBJ/FBX 재가져오기 | topology, UV, normals, axis, scale |

정량 기준 예시:

- 모든 위치·법선·quaternion 값이 finite
- 단위 법선 길이 오차 `< 1e-5`
- Bézier 분할 전후 최대 위치 오차 `< 1e-6 × scene scale`
- cyclic 첫/끝 frame의 roll 오차 `< 0.1°`
- 한 번의 pointer drag = Undo 한 단계
- factor 0은 완전 무변화, factor 1은 계산 목표와 일치

## 17. UI와 단축키에 대한 적용 범위

프로젝트의 `Q/W/E/R = Select/Move/Rotate/Scale`은 3ds Max 사용자 경험을 위한 선택이다. Blender의 기본 `G/R/S`를 그대로 복제할 필요는 없다. 데이터와 편집 의미는 Blender를 참고하고, 키맵은 프로젝트 사용자층에 맞게 유지하는 편이 낫다.

Blender Human Interface Guidelines에서 가져올 부분은 키 자체보다 다음 원칙이다.

- 선택과 드래그의 충돌을 명확히 처리한다.
- 실제 상태 변화가 없는 클릭은 Undo 항목을 만들지 않는다.
- label은 짧고 기능 중심으로 쓴다.
- `Enable`, `Use` 같은 불필요한 boolean 접두어를 피한다.
- X/Y/Z 같은 채널 이름은 일관되게 표시한다.

참고: [Selection HIG](https://developer.blender.org/docs/features/interface/human_interface_guidelines/selection/), [Writing Style HIG](https://developer.blender.org/docs/features/interface/human_interface_guidelines/writing_style/).

## 18. 라이선스와 참고 방식

Blender 공식 GitHub 저장소는 개발 저장소의 미러이며 Blender 전체는 GPL-3.0으로 배포된다. [Blender official GitHub mirror](https://github.com/blender/blender)

이 프로젝트에서 안전한 참고 방식:

- 데이터 구조, 수학적 개념, 테스트 케이스, UI 동작을 연구해 독자적으로 구현한다.
- Blender 소스 코드를 직접 복사하거나 번역해 포함하려면 프로젝트 전체 라이선스와 배포 조건을 먼저 검토한다.
- 공식 문서의 그림과 문장을 그대로 복제하지 않고 링크와 요약을 사용한다.
- 소스의 특정 알고리즘을 강하게 따랐다면 파일과 버전 또는 commit을 개발 문서에 기록한다.

## 19. 최종 권고

다음 구현 순서는 기능 추가보다 안정성을 빠르게 높인다.

1. **1차 완료** — 좌우 핸들 타입을 추가하고 기존 세 모드를 preset으로 유지한다.
2. **완료** — `Corner = tangent 0`을 제거하고 Vector→Free 전이를 적용한다.
3. **부분 완료** — sweep frame과 minimum-rotation을 분리했다. 명시적 tilt와 cyclic correction의 실제 spline 통합은 남아 있다.
4. **부분 완료** — 평균화와 타입 전이 의미를 분리했다. 독립 operator 파일로의 물리적 분리는 남아 있다.
5. geometry를 UI/Three.js에서 분리하고 pure function 단위 테스트를 먼저 만든다.
6. Undo는 한 gesture 한 step을 유지하면서 dirty curve만 복원·재평가하도록 개선한다.
7. Blender/3ds Max round-trip 장면으로 OBJ와 Experimental FBX를 자동 검증한다.

이 순서를 따르면 이후 cyclic spline, 다중 선택, radius/tilt, resample, surface attachment를 추가해도 핵심 데이터 모델을 다시 뒤엎을 가능성이 작아진다.
