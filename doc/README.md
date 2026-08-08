# 개발 문서 색인

이 폴더는 Hair Mesh Web에서 **수정할 기능의 코드 위치를 빨리 찾고, 주변 상태 흐름과 회귀 위험을 함께 확인**하기 위한 개발자 문서입니다. 사용자 작업 기준으로 찾는 task-first 구조를 사용합니다.

## 문서 안내

| 문서 | 먼저 읽을 때 | 내용 |
| --- | --- | --- |
| [CODEX_INDEX.md](CODEX_INDEX.md) | Codex가 어떤 작업이든 시작할 때 | 요청 라우터, 레이어 소유권, 공통 불변조건, 검증 게이트 |
| [FEATURE_CODE_MAP.md](FEATURE_CODE_MAP.md) | 특정 기능을 수정할 때 | 기능별 진입 함수, 보조 모듈, DOM ID, 검증 위치 |
| [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) | 구조 변경·새 기능 추가 전 | 런타임 구조, 상태 모델, 데이터 흐름, 구현 규칙, 검증 절차 |
| [제품 감사 보고서](../docs/product-audit/recursive-audit.md) | 우선순위와 한계를 판단할 때 | 구현 평가, 완료된 안정화, 향후 로드맵 |

기능별 동작 계약은 `features/`에 나눠 두었습니다. Codex는 `CODEX_INDEX.md`의 요청 라우터를 사용해 관련 문서만 읽습니다.

- [Curve 편집](features/curve-editing.md)
- [Mesh 생성](features/mesh-generation.md)
- [프로젝트·History](features/project-state.md)
- [Viewport·UI](features/viewport-ui.md)
- [Import·Export](features/io-export.md)

루트의 기존 분석 자료도 보조 자료로 유지합니다.

- [`PROJECT_AUDIT.md`](../PROJECT_AUDIT.md): 초기 프로젝트 감사
- [`MODULARIZATION.md`](../MODULARIZATION.md): 모듈 분리 방향
- [`BLENDER_FEATURE_RESEARCH.md`](../BLENDER_FEATURE_RESEARCH.md): Blender 기능 조사

## 가장 빠른 코드 탐색법

기능 이름보다 아래의 **함수명 또는 DOM ID**를 검색하는 편이 정확합니다.

```bash
rg -n "function rebuildCurveMesh|generateBtn" curve_mesh_hair_tool_v4.html
rg -n "export function" src
rg -n "project document|history" tests src
```

`CODEX_INDEX.md`와 `FEATURE_CODE_MAP.md`에 표기된 `함수명()`은 안정적인 탐색 기준입니다. 줄 번호는 코드 추가로 바뀔 수 있으므로 보조 정보로만 사용합니다.

## 문서 유지 규칙

다음 변경은 같은 커밋에서 관련 문서를 갱신합니다.

- 사용자 기능 추가/삭제: 루트 `README.md`의 기능 목록과 `FEATURE_CODE_MAP.md`
- 상태 구조 또는 저장 형식 변경: `DEVELOPMENT_GUIDE.md`와 프로젝트 버전/테스트
- 새 모듈 추가 또는 책임 이동: 두 개발 문서의 구조·소유권 표
- 기능 계약/검증 변경: 해당 `features/*.md`와 `CODEX_INDEX.md` 라우터
- 실행 조건/명령 변경: 루트 `README.md`
- 제품 범위/로드맵 변경: `docs/product-audit/recursive-audit.md`
