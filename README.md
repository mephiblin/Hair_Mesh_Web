# Hair Mesh Web

Hair Mesh Web은 브라우저에서 Bézier 가이드를 그리고, 가이드를 따라 Hair Card 또는 Tube 메시를 만드는 Three.js 기반 편집 도구입니다. Blender 전체 Groom 시스템을 복제하기보다 **커브 생성 → 단면 조정 → 메시 생성 → OBJ/FBX 출력** 작업을 가볍게 수행하는 데 초점을 둡니다.

## 현재 가능한 작업

- 모델 없이 카메라 평면에 커브 생성
- OBJ, FBX, GLB/GLTF 기준 모델 표면에 커브 생성
- Bézier Point/Handle 편집과 Point 추가·삭제·분할·평균화
- 커브 전체 Transform과 Point별 단면 Offset/Rotate/Scale/Taper
- Ribbon, Tube, Imported Mesh Brush 방식의 Live Mesh 생성
- Quad/N-gon OBJ 및 실험적 FBX 7.4 ASCII 출력
- 편집 가능한 `.hairmesh.json` 저장·열기
- 브라우저 자동 복구와 최대 100단계 Undo/Redo
- 커브 표시/숨김, 잠금, 복제, 삭제

## 요구 환경

- Python 3.9 이상 권장
- WebGL을 지원하는 최신 Chrome, Edge 또는 Firefox
- 인터넷 연결

Three.js와 Loader를 jsDelivr CDN에서 불러오므로 현재 버전은 최초 화면 로드와 모델 Import에 인터넷 연결이 필요합니다. 별도 `npm install`은 필요하지 않습니다.

## 실행

Linux/macOS:

```bash
cd Hair_Mesh_Web
python3 launch_server.py
```

Windows에서는 `3D_Web_Paint_실행.cmd`를 더블클릭할 수 있습니다. 브라우저가 자동으로 열리지 않으면 터미널에 출력된 `http://127.0.0.1:<port>/curve_mesh_hair_tool_v4.html` 주소를 여십시오.

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
7. `Save Project`로 편집본을 보존하거나 `Export` 탭에서 OBJ/FBX를 출력합니다.

프로젝트 자동 복구는 새로고침이나 비정상 종료에 대비한 보조 장치입니다. 중요한 작업은 `.hairmesh.json`으로 직접 저장하십시오. 기준 모델 자체는 프로젝트 파일에 포함되지 않습니다.

## 주요 단축키

| 단축키 | 동작 |
| --- | --- |
| `Ctrl/⌘ + S` | 프로젝트 저장 |
| `Ctrl/⌘ + O` | 프로젝트 열기 |
| `Ctrl/⌘ + Z` | Undo |
| `Ctrl/⌘ + Shift + Z`, `Ctrl/⌘ + Y` | Redo |
| `Ctrl/⌘ + A` | 선택 커브의 모든 Point 선택 |
| `W / E / R` | Move / Rotate / Scale |
| `I` | Point Insert 모드 |
| `Q` | Object/Camera 모드 |
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
│   ├── viewport/                  # Picking/축 드래그 정책
│   ├── ui/                        # 숫자 입력 Scrubber
│   └── diagnostics/               # 브라우저 Self-test
├── tests/                         # Node 핵심 회귀 테스트와 Fixture
├── doc/                           # 개발자용 코드 지도와 작업 지침
└── docs/product-audit/             # 제품 평가 및 장기 개선 기록
```

개발을 시작할 때는 [개발 문서 색인](doc/README.md), [기능별 코드 지도](doc/FEATURE_CODE_MAP.md), [개발 가이드](doc/DEVELOPMENT_GUIDE.md) 순서로 읽는 것이 가장 빠릅니다.

## 현재 범위와 주의사항

- 앱의 UI와 조립 로직 대부분은 `curve_mesh_hair_tool_v4.html`의 단일 `<script type="module">`에 있습니다.
- FBX 출력은 ASCII 7.4 실험 기능이므로 대상 DCC에서 반드시 Import 결과를 확인해야 합니다.
- 기준 모델은 세션 중 표면 배치용이며 `.hairmesh.json`에 직렬화되지 않습니다.
- 메시 예산은 Path Segments `2–512`, Tube Sides `3–64`로 제한됩니다.
- 제품 평가, 안정화 근거와 후속 로드맵은 [재귀 제품 감사 보고서](docs/product-audit/recursive-audit.md)에 있습니다.

원본 GitHub 상태는 커밋 `b1b121a84e845d1afd215a63a7f03e9e6533b33a`이며, 안정화 작업은 `agent/stabilization-v1-from-b1b121a` 브랜치에서 분리되어 있습니다.
