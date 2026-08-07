# 모듈화 체크

현재 앱은 UI, 상태, Three.js 장면, 커브 편집, 메쉬 생성, 파일 입출력이 하나의 HTML 모듈에 함께 있습니다. 기능을 추가할 때 회귀 범위를 줄이기 위해 아래 순서로 점진적으로 분리합니다.

## 현재 적용

- `src/ui/numeric-scrubber.js`: 숫자 label 드래그 입력을 독립 UI 모듈로 분리했습니다.
- 모듈은 표준 `input`/`change` 이벤트만 발생시키며 메쉬나 커브 상태를 직접 알지 않습니다.

## 다음 분리 경계

1. `src/state/curve-store.js` — 커브/선택 상태와 생성·복제·삭제
2. `src/geometry/curve-mesh.js` — 프레임 계산, 토폴로지 생성, 라이브 메쉬 재구성
3. `src/viewport/scene-controller.js` — Three.js 장면, 카메라, 레이캐스트, 기즈모
4. `src/ui/panels.js` — 탭, 롤아웃, 폼 동기화, 상태 표시
5. `src/io/importers.js`와 `src/io/exporters.js` — 모델/브러시 로드 및 OBJ/FBX 출력
6. `src/main.js` — 위 모듈을 조립하는 진입점만 유지

## 안정성 규칙

- 상태 변경은 store API를 통해서만 수행합니다.
- geometry 모듈은 DOM을 직접 참조하지 않습니다.
- UI 모듈은 Three.js 객체를 직접 수정하지 않고 명령 또는 표준 이벤트를 전달합니다.
- 각 단계는 기존 동작을 브라우저에서 확인한 뒤 별도 커밋으로 진행합니다.
- 단일 HTML의 대규모 일괄 분해 대신 기능 단위로 이동해 회귀 원인을 좁힙니다.
