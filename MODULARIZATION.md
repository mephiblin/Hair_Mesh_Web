# 모듈화 체크

현재 앱은 UI, 상태, Three.js 장면, 커브 편집, 메쉬 생성, 파일 입출력이 하나의 HTML 모듈에 함께 있습니다. 기능을 추가할 때 회귀 범위를 줄이기 위해 아래 순서로 점진적으로 분리합니다.

## 현재 적용

- `src/ui/numeric-scrubber.js`: 숫자 label 드래그 입력을 독립 UI 모듈로 분리했습니다.
- `src/ui/context-menu.js`: Viewport RMB 메뉴의 화면 가장자리 위치 clamp를 DOM 없는 순수 함수로 분리했습니다. 메뉴 항목과 명령 위임은 composition root가 소유합니다.
- 모듈은 표준 `input`/`change` 이벤트만 발생시키며 메쉬나 커브 상태를 직접 알지 않습니다.
- `src/state/history.js`: 앱 상태 캡처/복원을 주입받는 Undo/Redo 스택을 UI와 분리했습니다.
- `src/state/line-creation-policy.js`: 빈 생성 세션 취소와 Finish/Finish & Edit 분기를 순수 상태 규칙으로 분리했습니다.
- `src/state/point-selection.js`: 단일/전체/Ctrl·⌘ 토글 Point 선택의 정규화와 복원 규칙을 분리해 Ctrl+A, 캔버스 선택, Undo/Redo가 같은 선택 불변 조건을 사용합니다.
- `src/state/curve-selection.js`: Scene Explorer Curve 다중 선택의 정규화, Ctrl/⌘ 토글, 활성 Curve fallback을 분리했습니다.
- `src/state/control-selection.js`: Curve/FFD 영역 선택의 replace/add/remove 연산과 유효 index 정규화를 분리했습니다.
- `src/state/project-format.js`: `.hairmesh.json` envelope, version 검증, serialize/parse를 분리했습니다.
- `src/state/curve-policy.js`: 숨김/잠금 편집 가능성과 정직한 Live Mesh Ready 판정을 분리했습니다.
- `src/geometry/mesh-limits.js`: Path Segment와 Tube Side의 계산 경계 clamp를 분리했습니다.
- `src/geometry/proxy-primitives.js`: Box/Sphere/Quad Sphere/Cylinder 기본값, 예산 정규화와 논리 topology 생성을 분리했습니다.
- `src/geometry/ffd-lattice.js`: FFD 2/4/8 modifier 정규화·복제, Bernstein 변형과 ordered stack 평가를 분리했습니다.
- `src/geometry/bezier-handles.js`: 3ds Max식 4개 Knot Type과 좌우별 Auto/Vector/Aligned/Free 타입 전이, Reset Tangents 계산을 분리했습니다.
- `src/geometry/sweep-frames.js`: 회전 최소화 스윕 프레임과 0 접선·180도 반전 fallback을 분리했습니다.
- `src/diagnostics/core-self-check.js`: `?selftest=1`에서만 핵심 핸들·프레임 불변 조건을 검사합니다.
- `src/viewport/interaction-policy.js`: 선택/루트 변환 모드의 Control pick과 hidden/locked root의 Viewport pick 제외 규칙을 DOM 및 Three.js 이벤트에서 분리했습니다.
- `src/viewport/axis-guide-drag.js`: 긴 Move 축선의 축 벡터, 카메라 기준 드래그 평면, 축 방향 이동량 계산을 Three.js 장면 이벤트에서 분리했습니다.
- `src/viewport/material-presets.js`: Hair/Reference MatCap·Standard·Normal·Auto preset과 fallback을 분리했습니다.
- `src/viewport/lighting.js`: Directional/Environment lighting 정규화와 방향 계산을 분리했습니다.
- `src/viewport/reference-wireframe.js`: Wire Off/Only/Overlay와 독립 선 색상 정책을 분리했습니다.
- `src/viewport/reference-object-policy.js`: Reference Mesh별 material mode와 어두운 원본의 Auto fallback을 분리했습니다.
- `src/viewport/viewport-settings.js`: 배경색과 Camera FOV 정규화를 분리했습니다.
- `src/viewport/reference-images.js`: Front/Left/Back Plane 설정, 기본 layout과 임의 3D transform 정규화를 분리했습니다.
- `src/viewport/region-selection.js`: 좌→우 Window와 우→좌 Crossing control hit 판정을 분리했습니다.

## 다음 분리 경계

1. `src/state/curve-store.js` — 현재 HTML에 남은 커브 생성·복제·삭제와 활성 상태 조립. 선택 정규화는 이미 `curve-selection.js`/`point-selection.js`로 분리됨
2. `src/geometry/curve-mesh.js` — 프로파일 토폴로지 생성과 라이브 메쉬 재구성. 프레임 계산은 이미 `sweep-frames.js`로 분리됨
3. `src/viewport/scene-controller.js` — Three.js 장면, 카메라, 레이캐스트, 기즈모. 모드 판정은 이미 `interaction-policy.js`로 분리됨
4. `src/ui/panels.js` — 탭, 롤아웃, 폼 동기화, 상태 표시
5. `src/io/importers.js`와 `src/io/exporters.js` — 모델/브러시 로드 및 OBJ/FBX 출력
6. `src/main.js` — 위 모듈을 조립하는 진입점만 유지

## 안정성 규칙

- 상태 변경은 store API를 통해서만 수행합니다.
- geometry 모듈은 DOM을 직접 참조하지 않습니다.
- UI 모듈은 Three.js 객체를 직접 수정하지 않고 명령 또는 표준 이벤트를 전달합니다.
- 각 단계는 기존 동작을 브라우저에서 확인한 뒤 별도 커밋으로 진행합니다.
- Viewport pointer/gizmo/context-menu 단계는 `npm run test:viewport`로 Axis Lines/기본 XYZ helper 분리, Proxy drag/Undo, FFD 선택 표시·다중 drag·편집 토글/Scene click-through와 Proxy/Curve RMB command를 확인합니다.
- 단일 HTML의 대규모 일괄 분해 대신 기능 단위로 이동해 회귀 원인을 좁힙니다.
