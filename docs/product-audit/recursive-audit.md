# Recursive Product Audit

Overall status: COMPLETE · maintenance audit synchronized on 2026-08-09

## Completion contract

- Primary user: Blender나 3ds Max보다 가벼운 웹 도구에서 Hair Card를 빠르게 만드는 3D 아티스트
- Top job: 기준 모델 위에 Bézier 가이드를 만들고 편집 가능한 상태를 잃지 않으면서 리본·튜브·브러시 메시로 변환한다.
- In scope: 평가 문서, 버전형 프로젝트 저장/열기/자동복구, Brush 자산 상태, 숨김·잠금·LIVE 상태 불변 조건, 메시 입력 예산, 핵심 키보드·초기·1024px UI, 회귀 테스트와 실제 브라우저 QA
- Non-goals: Blender 전체 Hair Curves 호환, Guide 보간, Clump/Curl/Noise, 다중 사용자 편집, 자체 FBX SDK 수준의 호환성
- Constraints: 정적 ES-module 앱과 현재 Three.js 구조를 유지한다. 완료된 안정화 작업은 기본 브랜치 `master`에 통합하고 임시 작업 브랜치는 제거한다.
- Completion gates: 모든 `FIX_NOW` 항목이 자동 또는 브라우저 검증을 통과하고, 저장→새로고침 복구·실패한 Brush build·숨김/잠금·상한 입력·1024px 레이아웃이 합의한 상태를 보인다.

## Product snapshot

- Repository / surface: `mephiblin/Hair_Mesh_Web`, `curve_mesh_hair_tool_v4.html`
- Historical baseline: `b1b121a84e845d1afd215a63a7f03e9e6533b33a`, 2026-08-07
- Current implementation basis: default branch `master`, published feature commit `969a05eb5cd714047207da19b0d3a20bca3b6e7e` plus local 2026-08-09 empty-selection/ViewCube maintenance changes. GitHub Actions Validate run `31267391750` succeeded for the published basis; current local gates are recorded below. Historical review anchor: `51508d86cb60cee5276d105a0d851680b93893de`.
- Runtime / test entry points: `python3 launch_server.py`, `?selftest=1`, `npm run check`, `npm run test:viewport`
- Existing documentation: `PROJECT_AUDIT.md`, `BLENDER_FEATURE_RESEARCH.md`, `MODULARIZATION.md`

## Current conclusion

Hair Card MVP의 Bézier 편집과 Curve-to-Mesh 생성에 더해 버전형 프로젝트 저장/열기, 자동복구, Brush topology 영속성, 숨김·잠금·LIVE 상태, 메시 입력 예산이 검증됐다. 이후 ZBrush식 MatCap, Reference 독립 Wire, Directional/Environment 조명, Viewport 배경/FOV/Grid와 정사영 표준 뷰, 다중 Reference Mesh 표시·재질·수동 텍스처, 3방향 Reference Plane, Point/Curve/FFD 다중 선택, Proxy primitive와 영구 FFD stack, 3ds Max식 Viewport 마우스와 `T/B/F/L/P/U`·`V` POV 메뉴, FFD 선택 피드백, Proxy/Curve 대상별 RMB 메뉴, 완전한 root 무선택 상태와 click snap/자유 drag 카메라 연동 ViewCube까지 통합됐다. Reference binary 재연결, Proxy Object 다중 박스 선택, 다중 Curve 일괄 변환/삭제, Blender식 Grooming 확장은 잔여 백로그이며 현재 Hair Card MVP 완료 계약을 막지 않는다.

## Current verification snapshot

| Check | Current result |
| --- | --- |
| Node policy/state regression | `npm run check` · 31/31 tests |
| Browser core self-check | 24/24 |
| Viewport regression | `npm run test:viewport` · 3ds Max `T/B/F/L/P/U`·`V→K`/typing 차단, ViewCube face/free-drag/keyboard/Home/Ortho와 선택 배지 분리, root 무선택, Axis/gizmo 분리, Proxy drag/Undo, FFD 선택 표시·다중 drag·편집 토글/click-through, Proxy/Curve RMB, locked root LMB/RMB 제외, 1024px PASS |
| Reference display acceptance | 공식 Three.js FBX Import → MatCap Silver, 다중 OBJ Mesh별 visibility/material/texture, Wire Overlay 확인 |
| Selection acceptance | Point 3→2→1→0 Ctrl/⌘ 토글, Curve 2→1→0 행 토글, 일반 클릭 복귀 확인 |
| Persistence acceptance | Viewport 환경과 다중 Curve/Point 선택을 Recovery 후 복원 |
| Layout/runtime | 1600×900 및 1024×768, 가로 overflow 없음, console/page error 0 |
| GitHub | 마지막 published `master` Validate 성공; 현재 local 변경은 publish 전 |

아래 Cycle 1의 7/7·22/22 수치는 당시 안정화 사이클의 역사적 증거이며, 현재 총계는 위 표를 사용한다.

## Maintenance audit · 2026-08-09

| ID | Severity | Finding | Resolution | Permanent gate |
| --- | --- | --- | --- | --- |
| M-001 | P1 | `Axis Lines OFF`가 긴 guide뿐 아니라 기본 Translate XYZ helper까지 숨겼다. | `axisGuidesEnabled`를 custom `axisGuideGroup` visibility/raycast에만 사용하고 TransformControls helper를 분리했다. | Node/self-test 정책 + `npm run test:viewport` runtime helper assertion |
| M-002 | P1 | FFD/Edit의 잠정 Region handler가 click도 소비해 다른 Proxy의 Viewport 선택을 막았다. | 이동 임계값 미만은 `finishSelectionRegion()`에서 Scene picking으로 전달한다. | FFD `Sphere002 → Box001` click-through browser regression |
| M-003 | P1 | Control 직접 drag는 있었지만 Proxy Object `W` 표면 drag 경로가 없었다. | Object/Control이 `beginDirectViewportMove()` History 경계를 공유하도록 확장하고 Esc/Undo 복원을 추가했다. | Proxy position 변화 + one-step Undo browser regression |
| M-004 | P2 | 제품 감사·기준선 문서의 revision, 테스트 수, Axis 설명과 모듈 목록이 현재 코드보다 오래됐다. | 현재 master 기준/28개 Node 계약/24개 self-check/Viewport CI gate 및 신규 모듈로 문서를 동기화했다. | 문서 유지 규칙, symbol/DOM anchor 대조, 동일 커밋 문서 갱신 |
| M-005 | P2 | GitHub Actions `checkout/setup-node@v4`가 내부 Node.js 20 지원 종료 경고를 냈다. | 공식 Playwright CI 예시와 현재 Actions runtime에 맞춰 두 job을 `@v6`로 갱신했다. | push 후 Validate annotation과 Core/Viewport job 결과 확인 |
| M-006 | P1 | Ctrl/Region 다중 선택 FFD Control은 단일 선택과 다른 청록색이라 활성 집합을 즉시 식별하기 어려웠다. | `selectedFfdControlIndices` 전체를 노란색으로 표시하고 active Control만 추가 scale로 구분했다. | 실제 Ctrl-click + 다중 direct drag 전후 color/scale browser assertion |
| M-007 | P1 | `Edit Control Points`가 진입만 지원해 lattice와 FFD gizmo를 명시적으로 숨길 방법이 없었다. | 같은 명령을 `Edit Control Points ↔ Finish Editing` 토글로 바꾸고 종료 시 Object/Camera mode로 이탈한다. | mode/lattice/button 양방향 browser assertion |
| M-008 | P2 | Viewport RMB가 브라우저 메뉴만 막고 대상별 작업 메뉴를 제공하지 않았다. | Proxy FFD/Display와 Curve Average/Object/Live Mesh 메뉴를 추가하고 기존 panel command에 위임했다. | 실제 Proxy/Curve surface RMB와 mutation 결과 browser assertion |
| M-009 | P1 | 다중 FFD drag Undo는 offset/선택 Set을 복원했지만 lattice가 선택 복원 전 생성되어 노란 표시가 사라졌다. | `restoreAppState()`가 mode 복원 뒤 active lattice 위치·색·scale을 다시 동기화한다. | 다중 drag one-step Undo/Redo와 restore 후 yellow color browser assertion |
| M-010 | P1 | 편집 잠금이 mutation만 막고 root mesh는 Viewport object raycast 후보에 남아 Curve/Proxy를 다시 선택하거나 RMB 대상으로 삼을 수 있었다. | 공통 `canPickViewportObject()`로 locked root를 LMB/RMB/direct drag/Edit·FFD click-through 후보에서 제외하고 Scene Explorer 선택은 유지했다. | Curve/Proxy 각각 실제 LMB·RMB 차단 + Scene Explorer recovery browser assertion |
| M-011 | P1 | 빈 Viewport 클릭과 단일 root 삭제가 선택을 비우지 않거나 첫 Curve/Proxy로 fallback해 항상 노란 active 객체가 남았다. | `clearObjectSelection()`으로 root/control Set, Scene 강조, Modify `NONE`, lattice/gizmo를 함께 비우고 삭제·생성취소 fallback을 제거했다. | 실제 빈 canvas LMB + 단일 Proxy Delete 뒤 `No Selection` browser assertion |
| M-012 | P2 | 카메라 방향을 공간적으로 확인하거나 면/edge/corner로 즉시 전환하고 큐브에서 바로 자유 회전할 ViewCube가 없었다. | inverse camera quaternion을 쓰는 독립 overlay renderer와 순수 face/edge/corner/drag 정책, threshold click snap, 투영/target 보존 자유 drag, 6면/사선/Home·키보드 조작을 추가했다. 선택 배지는 우하단으로 분리했다. | Node direction/up-vector/drag delta + Front face/free drag/Right keyboard/Home/Ortho/selection preservation/1024px browser assertion |
| M-013 | P1 | 3ds Max식 POV 키와 `V` 메뉴가 없어 `T/F/B/L/P/U`가 시점을 바꾸지 않았고 기존 ViewCube 전용 `B=Back`은 공식 `B=Bottom`과 충돌했다. | DOM-free shortcut map과 포인터 위치 2열 Viewport Views 메뉴를 추가하고 direct `T/B/F/L/P/U`, `V→K` Back, typing 차단, `P/U` viewing-angle 보존으로 통일했다. | Node direct/menu mapping + 실제 T/B/F/L/P/U, V open/K Back, typing target browser assertions |

이번 감사에서 새 P0 또는 미해결 P1은 발견되지 않았다. 다만 Viewport 포인터 동작은 DOM 없는 Node 테스트만으로 충분히 보호할 수 없으므로 Chromium 회귀 job을 필수 게이트로 유지한다.

## Cycle 1

### Audit findings

| ID | Severity | Domain | Finding | Evidence | Disposition | Acceptance criterion | Status |
|---|---|---|---|---|---|---|---|
| F-001 | P0 | Persistence | 새로고침 시 Curve, Handle, Section, Modifier 작업이 모두 사라진다. | 실제 브라우저 재현; 프로젝트 저장 API 부재 | FIX_NOW | Save/Open round-trip과 새로고침 자동복구가 같은 편집 상태를 복원한다. | VERIFIED |
| F-002 | P1 | State | 숨긴 Curve가 선택·Root Transform 상태를 유지한다. | 실제 브라우저에서 hidden 중 mode=`transform`; `setCurveVisible()`이 gizmo를 동기화하지 않음 | FIX_NOW | 숨김 즉시 Orbit으로 이탈하고 gizmo/axis guide가 사라진다. | VERIFIED |
| F-003 | P1 | State | 잠긴 Curve에서 이름, Live Mesh, Point 명령이 활성 상태다. | 실제 브라우저 disabled 상태와 handler 대조 | FIX_NOW | 잠금 상태의 모든 편집 명령이 같은 정책으로 비활성화된다. | VERIFIED |
| F-004 | P1 | Mesh | Brush가 없는데 Build하면 `LIVE BRUSH`로 표시된다. | 실제 브라우저: checked=true, badge=`LIVE BRUSH`, topology 없음 | FIX_NOW | topology 생성 실패 시 LIVE가 아니며 지속적인 ERROR 이유를 표시한다. | VERIFIED |
| F-005 | P1 | Performance | Segment/Side의 HTML max가 코드 경계에서 강제되지 않는다. | `getCurrentSettings()`가 하한만 적용 | FIX_NOW | 직접 입력도 Segment 512, Side 64로 clamp된다. | VERIFIED |
| F-006 | P2 | Keyboard | 체크박스 포커스에서 Ctrl+A가 페이지 텍스트를 선택한다. | 실제 브라우저 재현; 모든 INPUT을 typing target으로 처리 | FIX_NOW | 텍스트 필드가 아닌 컨트롤 포커스에서도 Curve Point 전체 선택이 동작한다. | VERIFIED |
| F-007 | P2 | Onboarding | 빈 장면이 Modify 탭과 활성 Modifier 명령을 보여준다. | 초기 화면 재현 | FIX_NOW | 복구 데이터가 없는 시작 화면은 Create 탭이며 대상 없는 편집 명령은 비활성화된다. | VERIFIED |
| F-008 | P2 | Responsive UI | 1024px에서 topbar 스크롤바와 viewport 안내 겹침이 발생한다. | 1024×768 화면 캡처와 bounds 검사 | FIX_NOW | 1024×768에서 툴바가 의도적으로 2줄 배치되고 hint/badge가 겹치지 않는다. | VERIFIED |
| F-009 | P1 | Assets | Brush 추가/삭제/할당이 History와 저장 상태 밖에 있다. | `captureAppState()`와 Brush handlers 코드 대조 | FIX_NOW | Brush topology와 참조가 Undo/Redo 및 프로젝트 round-trip에 포함된다. | VERIFIED |
| F-010 | P2 | Hair workflow | Surface attachment, guide interpolation, clump/curl/noise가 없다. | Blender 공식 Hair Nodes 기능 대조 | DEFER | Hair Card MVP 안정화 후 별도 기능 계약과 성능 예산을 정의한다. | OPEN |
| F-011 | P0 | Draft state | 생성 중인 현재 Draft 행을 누르면 취소된 객체 참조가 다시 선택될 수 있다. | 기준선 감사 `AUD-002`와 실제 Draft row 경로 재검토 | FIX_NOW | Draft의 row/eye/lock은 Finish 또는 Cancel 전 상태를 바꾸지 않고, Cancel은 기존 Curve 선택을 안전하게 복원한다. | VERIFIED |

### Research log

| Question | Conclusion | Sources | Inference / limits |
|---|---|---|---|
| 현재 제품을 Blender Hair 대체재로 볼 수 있는가? | 현재 구현은 Hair Grooming보다 Curve-to-Mesh Hair Card Builder에 가깝다. | [Blender Hair Nodes](https://docs.blender.org/manual/en/dev/modeling/geometry_nodes/hair/index.html), [Interpolate Hair Curves](https://docs.blender.org/manual/en/dev/modeling/geometry_nodes/hair/generation/interpolate_hair_curves.html) | 전체 Blender 기능 동등성은 이번 범위가 아니다. |
| 브라우저 프로젝트 저장은 어떤 경계를 가져야 하는가? | 버전이 있는 JSON을 명시 저장하고, 동일 app state를 localStorage 복구에 재사용한다. Brush topology는 포함하고 Reference 원본 binary embedding은 연기한다. | 현재 `captureAppState()`, File API와 localStorage 동작 | 대형 Reference를 localStorage에 넣으면 quota 위험이 있어 이름/재연결 안내만 유지한다. |
| 실패한 Live Build를 어떻게 표현해야 하는가? | 사용 요청과 성공 상태를 분리하고 topology가 있을 때만 LIVE로 표시한다. | 현재 `rebuildCurveMesh()`와 `updateSelectionBadge()` | 비동기 Worker 전환은 성능 측정 후 후속 작업이다. |

### Decision and implementation

- Selected approach: 기존 snapshot 경계를 버전형 프로젝트 문서와 자동복구에 재사용하고, 편집 가능성과 mesh ready 조건을 중앙 정책으로 둔다.
- Alternatives considered: 브라우저 파일 시스템 핸들 직접 저장은 지원·권한 복잡성 때문에 제외; Reference binary 전체 embedding은 localStorage 용량 위험 때문에 연기; 전체 프레임워크 이전은 회귀 범위가 커서 제외한다.
- Changes made: `.hairmesh.json` Save/Open, localStorage 자동복구와 미저장 경고, Brush snapshot/복원, 중앙 Curve 편집·LIVE 정책, Segment/Side clamp, 초기 Create 흐름, 상태 chip/error, Ctrl+A focus 수정, 1024px 2줄 toolbar를 구현했다.
- Files / migrations / documentation: `README.md`, `src/state/project-format.js`, `src/state/curve-policy.js`, `src/geometry/mesh-limits.js`, `curve_mesh_hair_tool_v4.html`, `tests/`, `.github/workflows/validate.yml`, 본 보고서.

### Verification

| Check | Command or method | Result | Artifact / evidence |
|---|---|---|---|
| 순수 상태 테스트 | `npm test` | PASS | 7/7: project format, history, selection, mesh budget, curve/LIVE policy |
| 정적 검사 | `node --check` 및 HTML module script 검사 | PASS | 모든 `src/**/*.js`, tests, inline module syntax 통과 |
| 브라우저 self-test | `?selftest=1` | PASS | 22/22, 기존 19개 + policy/budget 3개 |
| 핵심 제작 경로 | Chromium 실제 mouse/keyboard 입력 | PASS | 3 Point → Ribbon: 1,026 vertices / 512 quads; Ctrl+A와 Undo/Redo 정상 |
| 실패·상태 경로 | 숨김/잠금/Brush 없음/초과 입력 | PASS | 숨김 시 Orbit+disabled, 잠금 disabled, Brush 실패 `MESH ERROR`+LIVE false, 999999→512 clamp |
| Save/Open/Recovery | download + file input + 동일 profile relaunch | PASS | `SavedCard` 명시 저장/열기, `RecoveredCard` 자동복구, version 1 JSON 확인 |
| Brush History/Project | `tests/fixtures/quad-brush.obj` UI acceptance | PASS | add/build/remove/undo 및 save/remove/open에서 1-face Brush와 LIVE BRUSH 복원 |
| Draft 불변 조건 | 1 Point Draft에서 row/eye/lock/Cancel 실제 입력 | PASS | row/eye/lock 차단, Draft 유지, Cancel 후 기존 `SavedCard` 선택과 Curve 1개 복원 |
| 1600/1024/800 시각 QA | viewport screenshot + bounds | PASS | 1600 고정 shell, 1024 2줄 toolbar, 모든 크기에서 hint/badge overlap=false |
| 런타임 오류 | DevTools Runtime/Network 관찰 | PASS | 앱 JavaScript exception과 모듈 load failure 없음 |

### Re-audit

- Regressions checked: 빈/1 Point 생성 취소와 Draft row/eye/lock, 3 Point 생성, Ribbon/Brush topology, 다중 Point 선택, Knot Undo/Redo, hidden/locked 전환, 프로젝트 복원 후 선택과 modifier 재평가, desktop/compact/narrow viewport.
- New or changed findings: 새 `beforeunload` 경고가 자동 QA의 programmatic reload도 막는 것을 확인했다. 이는 미저장 보호의 의도된 동작이며 동일 Chromium profile 재실행으로 recovery acceptance를 검증했다.
- Remaining `FIX_NOW` items: 없음
- Recursion decision: STOP_COMPLETE

## Residual risks

| Risk | Impact | Mitigation / owner | Revisit trigger |
|---|---|---|---|
| Reference 모델 binary는 프로젝트 JSON에 포함되지 않는다. | 프로젝트 재개 시 표면 배치 기준을 다시 선택해야 한다. | 파일명과 재연결 안내를 보존하고 향후 asset package 설계 | Reference가 필수 제작 입력이 되는 시점 |
| Reference Mesh별 visibility/material/수동 texture는 세션 전용이다. | 프로젝트를 다시 열면 Reference를 재Import하고 외부 texture를 다시 지정해야 한다. | 전역 display만 저장하고 UI에 session 경계를 명시 | Reference asset package 설계 시점 |
| ASCII FBX round-trip이 자동 검증되지 않는다. | 일부 DCC에서 normal/UV 해석 차이 가능 | Experimental 표기 유지, OBJ 우선 사용 | Blender/3ds Max fixture 환경 확보 |
| Viewport 자동 검사는 Three.js CDN과 Chromium 설치에 의존한다. | 네트워크/브라우저 설치 장애가 기능 회귀와 무관하게 CI를 실패시킬 수 있다. | Core job과 Viewport job을 분리하고 로컬 `npm run test:viewport` 결과를 함께 확인 | 오프라인 Three.js 번들 도입 시 |
| Proxy Object는 단일 active 선택만 지원한다. | Object 수준 Window/Crossing 다중 선택·일괄 변환은 불가 | 현재 Region 범위를 Curve Point/FFD Control로 명시 | Proxy 반복 배치 작업에서 다중 편집 요구가 확인될 때 |

## Future capability backlog

| Priority | Capability | User value | Dependency | Revisit trigger | Current disposition |
|---|---|---|---|---|---|
| 1 | Surface root attachment와 normal 정렬 | 두피에 붙은 Hair Card 배치 | Reference asset 계약 | 안정화 Cycle 완료 | DEFER |
| 2 | 다중 Curve 변환·삭제·대칭 | 반복 Hair Card 제작 속도 향상 | Curve 다중 선택 계약은 완료, group transaction/pivot 정책 필요 | 반복 배치 작업 검증 시 | DEFER |
| 3 | Guide 보간과 density/clump/curl/noise | Blender식 Grooming 범위 확장 | 성능 Worker, surface attachment | Hair Card MVP 사용성 검증 | DEFER |
| 4 | OBJ/glTF/FBX round-trip fixture | 출력 신뢰성 향상 | 테스트 자산과 DCC 환경 | 외부 배포 전 | DEFER |
| 5 | Three.js 오프라인 번들 | 완전한 로컬 실행 | 빌드 파이프라인 | 배포 패키징 시작 | DEFER |

## Final completion checklist

- [x] Completion contract passes.
- [x] All `FIX_NOW` findings are `VERIFIED`.
- [x] Required tests, builds, and critical journeys pass.
- [x] Current conclusion and residual risks match the product.
- [x] Future backlog is prioritized without expanding current scope.
- [x] Final report validation passes.
