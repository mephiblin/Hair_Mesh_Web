# Recursive Product Audit

Overall status: COMPLETE

## Completion contract

- Primary user: Blender나 3ds Max보다 가벼운 웹 도구에서 Hair Card를 빠르게 만드는 3D 아티스트
- Top job: 기준 모델 위에 Bézier 가이드를 만들고 편집 가능한 상태를 잃지 않으면서 리본·튜브·브러시 메시로 변환한다.
- In scope: 평가 문서, 버전형 프로젝트 저장/열기/자동복구, Brush 자산 상태, 숨김·잠금·LIVE 상태 불변 조건, 메시 입력 예산, 핵심 키보드·초기·1024px UI, 회귀 테스트와 실제 브라우저 QA
- Non-goals: Blender 전체 Hair Curves 호환, Guide 보간, Clump/Curl/Noise, 다중 사용자 편집, 자체 FBX SDK 수준의 호환성
- Constraints: 정적 웹 앱과 현재 Three.js 구조를 유지하며 원본 `master`를 변경하지 않는 별도 브랜치로 게시한다.
- Completion gates: 모든 `FIX_NOW` 항목이 자동 또는 브라우저 검증을 통과하고, 저장→새로고침 복구·실패한 Brush build·숨김/잠금·상한 입력·1024px 레이아웃이 합의한 상태를 보인다.

## Product snapshot

- Repository / surface: `mephiblin/Hair_Mesh_Web`, `curve_mesh_hair_tool_v4.html`
- Baseline revision or date: `b1b121a84e845d1afd215a63a7f03e9e6533b33a`, 2026-08-07
- Runtime / test entry points: `python3 launch_server.py`, `?selftest=1`, `npm test`
- Existing documentation: `PROJECT_AUDIT.md`, `BLENDER_FEATURE_RESEARCH.md`, `MODULARIZATION.md`

## Current conclusion

Hair Card MVP의 기본 Bézier 편집과 Curve-to-Mesh 생성에 더해 버전형 프로젝트 저장/열기, 자동복구, Brush topology 영속성, 숨김·잠금·LIVE 상태 정책과 메시 입력 예산이 검증됐다. Reference binary 재연결과 Blender식 Grooming 확장은 명시한 잔여 위험/백로그이며 현재 완료 계약을 막지 않는다.

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
| ASCII FBX round-trip이 자동 검증되지 않는다. | 일부 DCC에서 normal/UV 해석 차이 가능 | Experimental 표기 유지, OBJ 우선 사용 | Blender/3ds Max fixture 환경 확보 |

## Future capability backlog

| Priority | Capability | User value | Dependency | Revisit trigger | Current disposition |
|---|---|---|---|---|---|
| 1 | Surface root attachment와 normal 정렬 | 두피에 붙은 Hair Card 배치 | Reference asset 계약 | 안정화 Cycle 완료 | DEFER |
| 2 | 다중 Curve 변환·삭제·대칭 | 반복 Hair Card 제작 속도 향상 | 선택 명령 계약 | 단일 Curve 상태 안정화 | DEFER |
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
