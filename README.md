# Hair Mesh Web

Hair Mesh Web은 브라우저에서 Bézier 가이드를 그리고, 가이드를 따라 Hair Card 또는 Tube 메시를 만드는 Three.js 기반 편집 도구입니다. Blender 전체 Groom 시스템을 복제하기보다 **커브 생성 → 단면 조정 → 메시 생성 → OBJ/FBX 출력** 작업을 가볍게 수행하는 데 초점을 둡니다.

## 현재 가능한 작업

- 모델 없이 카메라 평면에 커브 생성
- OBJ, FBX, GLB/GLTF 기준 모델 표면에 커브 생성
- Bézier Point/Handle 편집과 Point 추가·삭제·분할·평균화
- `Ctrl/⌘` 클릭으로 같은 Curve의 Point와 Scene Explorer의 Curve 행 다중 선택/해제
- 커브 전체 Transform과 Point별 단면 Offset/Rotate/Scale/Taper
- Ribbon, Tube, Imported Mesh Brush 방식의 Live Mesh 생성
- ZBrush 스타일 MatCap 재질로 Hair Mesh와 Import 모델 표시
- 하나의 Reference 파일 안의 여러 Mesh를 개별 표시/숨김하고 재질·이미지 텍스처 지정
- 원본 텍스처를 유지하면서 텍스처 없는 검은 재질만 밝히는 Reference `Auto` 표시
- Viewport 배경색, Camera FOV, Ground Grid, 환경광과 방향광 조정
- AI 처리 없이 Front / Left / Back 이미지를 실제 3D Plane Mesh로 배치하고 Move/Rotate/Scale
- Reference 전용 Wire Only / Surface + Wire와 독립 선 색상
- Quad/N-gon OBJ 및 실험적 FBX 7.4 ASCII 출력
- 편집 가능한 `.hairmesh.json` 저장·열기
- 브라우저 자동 복구와 최대 100단계 Undo/Redo
- 커브 표시/숨김, 잠금, 복제, 삭제

## 요구 환경

- Python 3.9 이상 권장
- WebGL을 지원하는 최신 Chrome, Edge 또는 Firefox
- 인터넷 연결

Three.js와 Loader를 jsDelivr CDN에서 불러오므로 현재 버전은 최초 화면 로드와 모델 Import에 인터넷 연결이 필요합니다. 앱 실행에는 `npm install`이 필요 없지만, 개발 검증과 Playwright 브라우저 QA를 실행하려면 먼저 `npm install`을 실행하십시오.

## 실행

Linux/macOS:

```bash
cd Hair_Mesh_Web
python3 launch_server.py
```

Windows에서는 `3D_Web_Paint_실행.cmd`를 더블클릭할 수 있습니다. `.cmd`가 메모장으로 열리면 명령 프롬프트에서 해당 파일을 직접 실행하십시오. 자세한 내용은 [`사용자 실행용 참고.md`](사용자%20실행용%20참고.md)를 확인합니다. 브라우저가 자동으로 열리지 않으면 터미널에 출력된 `http://127.0.0.1:<port>/curve_mesh_hair_tool_v4.html` 주소를 여십시오.

고정 포트를 사용하거나 브라우저 자동 실행을 끌 수도 있습니다.

```bash
python3 launch_server.py --port 8080
python3 launch_server.py --no-browser
```

HTML 파일을 직접 더블클릭하는 방식은 ES Module/CORS 제한 때문에 지원하지 않습니다. 반드시 로컬 서버로 실행하십시오.

## 5분 작업 흐름

1. `Create` 탭에서 `+ Line`을 누릅니다.
2. 모델 표면 또는 빈 뷰포트에 Point를 두 개 이상 배치합니다.
3. `Finish & Edit`으로 생성 모드를 끝냅니다.
4. Point, Bézier Handle 또는 `Point Cross-section` 값을 조정합니다.
5. `Live Curve → Mesh`에서 Ribbon, Tube 또는 Imported Mesh Brush를 선택합니다.
6. `Apply / Rebuild Live Mesh`를 누릅니다.
7. `Display → Viewport Material`에서 전체 Reference 재질을 고르고, `Reference Objects`에서 Mesh별 표시·재질·텍스처를 조정합니다.
8. `Display → Viewport Reference Images`에서 Front / Left / Back 이미지를 각각 불러옵니다. 카드를 누르면 해당 Plane과 기준 뷰를 선택하며 Move/Rotate/Scale gizmo, Position/Rotation/Size 수치, Flip Horizontal, Back-face Cull, Opacity와 앞/뒤 레이어를 조정할 수 있습니다. Plane은 Perspective에서도 그대로 보입니다.
9. `Display → Viewport`에서 배경색, Camera FOV, Grid와 조명을 조정합니다.
10. `Save Project`로 편집본을 보존하거나 `Export` 탭에서 OBJ/FBX를 출력합니다.

프로젝트 자동 복구는 새로고침이나 비정상 종료에 대비한 보조 장치입니다. 중요한 작업은 `.hairmesh.json`으로 직접 저장하십시오. 기준 모델과 참조 이미지 픽셀은 프로젝트 파일에 포함되지 않습니다. 참조 이미지의 파일명 힌트와 정렬값은 저장되므로 프로젝트를 다시 연 뒤 같은 이미지 파일만 재선택하면 됩니다.

## 주요 단축키

| 단축키 | 동작 |
| --- | --- |
| `Ctrl/⌘ + S` | 프로젝트 저장 |
| `Ctrl/⌘ + O` | 프로젝트 열기 |
| `Ctrl/⌘ + Z` | Undo |
| `Ctrl/⌘ + Shift + Z`, `Ctrl/⌘ + Y` | Redo |
| `Ctrl/⌘ + A` | 선택 커브의 모든 Point 선택 |
| `Ctrl/⌘ + Point 클릭` | 활성 Curve 안의 Point를 다중 선택/해제 |
| `Ctrl/⌘ + Curve 행 클릭` | Scene Explorer Curve를 다중 선택/해제 |
| `W / E / R` | Curve/Point 또는 활성 Reference Plane의 Move / Rotate / Scale |
| `Q` | Object/Camera 모드 또는 Reference Plane gizmo 숨김 |
| `I` | Point Insert 모드 |
| `Shift + G` | 축 가이드 표시 전환 |
| `Esc` | 진행 중인 Line 생성 취소 |
| `Delete` | 선택 Point 또는 커브 삭제 |

## 검증

Node.js 20 이상에서 핵심 상태·정책 테스트와 모듈 문법 검사를 실행합니다.

```bash
npm test
npm run check
```

브라우저 핵심 진단은 실행 주소 뒤에 `?selftest=1`을 붙여 확인할 수 있습니다. 결과는 개발자 도구에서 `globalThis.__CURVE_TOOL_SELF_TEST__`로 조회할 수 있습니다.

## 저장소 구조

```text
Hair_Mesh_Web/
├── curve_mesh_hair_tool_v4.html   # 화면, Three.js 런타임, 기능 조립부
├── launch_server.py               # 로컬 HTTP 서버/브라우저 실행기
├── 3D_Web_Paint_실행.cmd          # Windows 실행 진입점
├── src/
│   ├── geometry/                  # Bézier·Sweep·메시 제한 계산
│   ├── state/                     # History·프로젝트·선택·편집 정책
│   ├── viewport/                  # Picking/축 드래그 + 재질/조명/Wire 표시 정책
│   ├── ui/                        # 숫자 입력 Scrubber
│   └── diagnostics/               # 브라우저 Self-test
├── tests/                         # Node 핵심 회귀 테스트와 Fixture
├── doc/                           # 개발자용 코드 지도와 작업 지침
└── docs/product-audit/             # 제품 평가 및 장기 개선 기록
```

개발을 시작할 때 사람은 [개발 문서 색인](doc/README.md)을, Codex는 [Codex 작업 색인](doc/CODEX_INDEX.md)을 먼저 읽습니다. 기능 전체 위치는 [기능별 코드 지도](doc/FEATURE_CODE_MAP.md), 구조 변경 절차는 [개발 가이드](doc/DEVELOPMENT_GUIDE.md)에 있습니다. 저장소 전용 Codex Skill은 `.agents/skills/hair-mesh-web-development`에 포함되어 있습니다.

## 현재 범위와 주의사항

- 앱의 UI와 조립 로직 대부분은 `curve_mesh_hair_tool_v4.html`의 단일 `<script type="module">`에 있습니다.
- FBX 출력은 ASCII 7.4 실험 기능이므로 대상 DCC에서 반드시 Import 결과를 확인해야 합니다.
- 기준 모델은 세션 중 표면 배치용이며 `.hairmesh.json`에 직렬화되지 않습니다.
- Front / Left / Back 참조 이미지는 Perspective를 포함한 모든 View에서 보이는 세션 전용 3D Plane Mesh입니다. `.hairmesh.json`에는 이미지 데이터 대신 파일명 힌트와 3D Transform·표시·반전·Back-face Cull 값만 저장됩니다.
- Viewport Material과 수동 Reference 텍스처는 표시 전용입니다. Import 원본 재질은 보존되며 OBJ/FBX Export 형상에는 포함되지 않습니다.
- FBX/GLTF Loader가 복원한 내장/해결된 텍스처는 `Original`/`Auto`에서 유지됩니다. 단일 파일 선택으로 찾을 수 없는 외부 sidecar 이미지는 `Reference Objects → Color Texture`에서 Mesh별로 다시 지정하십시오.
- 메시 예산은 Path Segments `2–512`, Tube Sides `3–64`로 제한됩니다.
- 제품 평가, 안정화 근거와 후속 로드맵은 [재귀 제품 감사 보고서](docs/product-audit/recursive-audit.md)에 있습니다.

원본 프로토타입 기준선은 커밋 `b1b121a84e845d1afd215a63a7f03e9e6533b33a`입니다. 이후 안정화·Viewport·Reference material/texture·다중 선택 작업은 기본 브랜치 `master`에 통합되었고 임시 작업 브랜치는 제거되었습니다.
