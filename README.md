# Hair Mesh Web

Hair Mesh Web은 브라우저에서 Bézier 가이드를 그리고, 가이드를 따라 Hair Card 또는 Tube 메시를 만드는 Three.js 기반 편집 도구입니다. Blender 전체 Groom 시스템을 복제하기보다 **커브 생성 → 단면 조정 → 메시 생성 → OBJ/FBX 출력** 작업을 가볍게 수행하는 데 초점을 둡니다.

## 현재 가능한 작업

- 모델 없이 카메라 평면에 커브 생성
- OBJ, FBX, GLB/GLTF 기준 모델 또는 Proxy Mesh 표면에 커브 생성
- Bézier Point/Handle 편집과 Point 추가·삭제·분할·평균화
- `Ctrl/⌘` 클릭으로 같은 Curve의 Point와 Scene Explorer의 Curve 행 다중 선택/해제
- 커브 전체 Transform과 Point별 단면 Offset/Rotate/Scale/Taper
- Ribbon, Tube, Imported Mesh Brush 방식의 Live Mesh 생성
- Box, Sphere, 모든 면이 Quad인 Quad Sphere, Cylinder 프록시 생성과 크기·세그먼트 비파괴 조정
- Proxy별 FFD 2×2×2 / 4×4×4 / 8×8×8 영구 Modifier Stack, 영역 다중 선택과 동시 변형
- Scene Explorer에서 Curve/Proxy를 분리 관리하고, 선택 객체 종류에 따라 바뀌는 Modify 패널
- ZBrush 스타일 MatCap 재질로 Hair Mesh와 Import 모델 표시
- 하나의 Reference 파일 안의 여러 Mesh를 개별 표시/숨김하고 재질·이미지 텍스처 지정
- 원본 텍스처를 유지하면서 텍스처 없는 검은 재질만 밝히는 Reference `Auto` 표시
- Viewport 배경색, Perspective Camera FOV, Ground Grid, 환경광과 방향광 조정
- `Ortho Views` 토글로 Front / Left / Back / Top과 ViewCube 6면의 FOV 원근 왜곡 제거
- 우측 상단 3ds Max식 ViewCube 방향 표시, 좌클릭 드래그 자유 회전, `T/B/F/L/P/U` 시점 키와 `V` Viewport Views 메뉴
- AI 처리 없이 Front / Left / Back 이미지를 실제 3D Plane Mesh로 배치하고 Move/Rotate/Scale
- Reference 전용 Wire Only / Surface + Wire와 독립 선 색상
- Quad/N-gon OBJ 및 실험적 FBX 7.4 ASCII 출력
- 편집 가능한 `.hairmesh.json` 저장·열기
- 브라우저 자동 복구와 최대 100단계 Undo/Redo
- 커브 표시/숨김, 잠금, 복제, 삭제
- 프록시 표시/숨김, 잠금, W/E/R Transform, 복제, 삭제와 프로젝트 저장

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
9. 상단 `Ortho Views`를 켜면 Front / Left / Back / Top 버튼과 ViewCube의 6면이 실제 Orthographic Camera로 전환되어 깊이에 따른 크기 왜곡이 사라집니다. `Persp`, ViewCube 모서리·꼭짓점과 Home은 Perspective며, 토글을 끄면 모든 표준 뷰에서도 FOV를 사용합니다.
   우측 상단 ViewCube는 현재 카메라 회전을 실시간 표시합니다. 큐브를 좌클릭 드래그하면 현재 주시점과 Perspective/Orthographic 투영을 유지한 채 자유 회전하고, 짧게 클릭하면 면은 Front/Back/Left/Right/Top/Bottom으로, 모서리나 꼭짓점은 해당 사선 Perspective로 전환됩니다. 아래 `⌂`는 Perspective Home입니다. ViewCube 초점에서는 방향키로 Top/Bottom/Left/Right, `Enter`로 Home을 선택합니다. 앱 전역에서는 3ds Max식 `T/B/F/L/P/U` 시점 키를 사용하며 `V`로 Viewport Views 메뉴를 열 수 있습니다. 우하단 `No Selection`은 ViewCube 상태가 아니라 현재 선택 객체가 없다는 표시이며, 객체를 선택하면 그 이름/하위 선택 정보로 바뀝니다.
10. `Display → Viewport`에서 배경색, Perspective Camera FOV, Grid와 조명을 조정합니다.
11. `Save Project`로 편집본을 보존하거나 `Export` 탭에서 OBJ/FBX를 출력합니다.

프록시가 필요하면 `Create → Proxy Mesh`에서 Box, Sphere, Quad Sphere 또는 Cylinder를 만듭니다. 생성 위치는 현재 카메라가 바라보는 Orbit 중심입니다. Scene Explorer의 `Proxy Objects`에서 선택하면 Modify가 Proxy 문맥으로 바뀝니다. `Primitive Parameters`에서는 크기·Segments/Sides/Rings·Smooth·Edges를 조정하고, `Modifier Stack`에서는 FFD 2×2×2 / 4×4×4 / 8×8×8을 여러 개 쌓습니다. `Edit Control Points`를 누른 뒤 좌클릭 또는 사각 영역 드래그로 lattice Point를 선택합니다. Ctrl은 추가/클릭 토글, Alt는 제외이며 선택된 모든 Point가 노란색으로 강조됩니다. 선택 Point를 직접 드래그하거나 선택 중심의 Move gizmo로 함께 변형합니다. `Finish Editing`을 누르면 FFD 데이터는 유지한 채 lattice와 기즈모를 숨깁니다. 각 FFD의 ON/OFF, 순서, Reset, Remove와 Control 선택은 Proxy와 함께 저장되고 한 번의 drag는 한 Undo 단계가 됩니다.

Proxy를 Reference 대용 또는 누락 부위 보충 표면으로 쓰려면 `Create → Line Creation → 포인트 배치`를 `Reference / Proxy Surface`로 바꿉니다. 보이는 Reference와 Proxy 중 카메라에서 가장 가까운 표면에 Point가 찍힙니다. FFD 결과는 Viewport·Surface 배치·OBJ/FBX Export에 반영되며 Export에서는 최종 geometry로 bake됩니다.

Create·Modify·Display 탭의 내부 항목은 처음에 모두 닫힌 상태로 시작합니다. 항목 제목을 눌러 펼치거나 닫으면 탭을 전환하거나 편집하는 동안 그 상태가 유지되며, 페이지를 새로 초기화하면 다시 모두 닫힙니다. Export 탭은 기존처럼 열린 상태로 시작합니다.

프로젝트 자동 복구는 새로고침이나 비정상 종료에 대비한 보조 장치입니다. 중요한 작업은 `.hairmesh.json`으로 직접 저장하십시오. 기준 모델과 참조 이미지 픽셀은 프로젝트 파일에 포함되지 않습니다. 참조 이미지의 파일명 힌트와 정렬값은 저장되므로 프로젝트를 다시 연 뒤 같은 이미지 파일만 재선택하면 됩니다.

## 주요 단축키

| 단축키 | 동작 |
| --- | --- |
| `Ctrl/⌘ + S` | 프로젝트 저장 |
| `Ctrl/⌘ + O` | 프로젝트 열기 |
| `Ctrl/⌘ + Z` | Undo |
| `Ctrl/⌘ + Shift + Z`, `Ctrl/⌘ + Y` | Redo |
| `Ctrl/⌘ + A` | 편집 중인 Curve Point 또는 FFD Control 전체 선택 |
| `Ctrl/⌘ + Point 클릭` | 활성 Curve 안의 Point를 다중 선택/해제 |
| `Ctrl/⌘ + Curve 행 클릭` | Scene Explorer Curve를 다중 선택/해제 |
| `W / E / R` | 활성 Curve/Proxy/Point 또는 Reference Plane의 Move / Rotate / Scale. FFD Point는 `W` Move만 사용 |
| `Q` | 3ds Max식 Select/Object 모드 또는 Reference Plane gizmo 숨김 |
| `Z` | 선택 객체 Frame |
| `T / B / F / L` | Top / Bottom / Front / Left 표준 뷰 |
| `P` | 현재 viewing angle을 유지하며 Perspective로 전환 |
| `U` | 현재 viewing angle을 유지하며 User Orthographic으로 전환 |
| `V` | 마우스 위치에 Viewport Views 메뉴 열기. 메뉴에서 `P/U/F/K/T/B/L`, `K`는 Back |
| `I` | Point Insert 모드 |
| `Shift + G` | 긴 축 가이드만 표시 전환. 기본 XYZ Transform gizmo는 유지 |
| `Esc` | 진행 중인 Line 생성 취소 |
| `Delete` | 선택 Point, Curve 또는 Proxy 삭제. FFD 편집 중에는 삭제하지 않고 안내 표시 |

3ds Max식 Viewport 마우스:

| 입력 | 동작 |
| --- | --- |
| `LMB 클릭` | Object 또는 Control 선택. Select/Object 모드의 빈 공간 클릭은 객체 선택 해제 |
| `LMB 드래그` | FFD/Curve Control 사각 영역 선택. 좌→우 Window, 우→좌 Crossing |
| `RMB` | 포인터 아래 Proxy/Curve를 선택하고 대상별 Viewport 메뉴 열기 |
| `Ctrl/⌘ + LMB` | 선택 추가, Control 클릭은 추가/해제 토글 |
| `Alt + LMB` | 선택 제외 |
| 선택 Control `LMB 드래그` | View Plane에서 선택 Control 함께 이동 |
| `W` 상태의 Proxy 표면 `LMB 드래그` | Proxy Object를 View Plane에서 직접 이동 |
| `MMB 드래그` | Pan |
| `Alt + MMB 드래그` | Orbit |
| `Ctrl + Alt + MMB 드래그` | Zoom |
| Mouse Wheel | Zoom |

사각 영역 선택은 현재 Curve Point와 FFD Control을 대상으로 합니다. Proxy Object는 Viewport 클릭 또는 Scene Explorer에서 선택하며, `W` 상태에서는 선택 Proxy 표면을 직접 드래그해 이동합니다.

Select/Object 모드에서 빈 Viewport를 클릭하면 Curve/Proxy 활성 선택, 노란 강조와 Transform gizmo가 모두 해제되고 Modify는 `NONE` 문맥으로 바뀝니다. 단일 Curve/Proxy를 삭제해도 남은 첫 객체를 임의로 선택하지 않습니다. Point/FFD 편집 모드의 빈 클릭은 root 객체를 유지한 채 하위 Control 선택만 해제하므로, root까지 해제하려면 `Q`로 Select/Object 모드로 나온 뒤 빈 공간을 클릭합니다.

Scene Explorer에서 편집 잠금한 Curve/Proxy는 Viewport LMB·RMB 선택과 직접 드래그 대상에서 제외됩니다. 잠긴 객체의 상태 확인과 잠금 해제는 Scene Explorer에서 할 수 있습니다.

Viewport에서 Proxy를 우클릭하면 FFD 2/4/8 추가, Control 편집 진입/종료, Reset/Remove, Smooth Shading과 Show Edges를 바로 실행할 수 있습니다. Curve를 우클릭하면 연결 Point 평균화, Point/Object 편집, Frame/Clone/Delete와 `Live Curve → Mesh · Enable in Viewport`를 사용할 수 있습니다. 숨김·잠금 객체는 Viewport 우클릭 대상이 아니며, Scene Explorer에서 선택한 잠금 객체의 패널 편집 명령도 비활성화됩니다.

## 검증

Node.js 20 이상에서 핵심 상태·정책 테스트와 모듈 문법 검사를 실행합니다.

```bash
npm test
npm run check
npm run test:viewport
```

`npm run test:viewport`는 임시 로컬 서버와 Chromium을 자동으로 실행해 3ds Max식 `T/B/F/L/P/U`와 `V→K`, 입력 필드 단축키 차단, ViewCube 면/드래그/키보드/Home과 Ortho 연동, ViewCube와 우하단 선택 배지 분리, 빈 공간 클릭·단일 삭제 뒤 무선택 상태, Axis Lines/기본 XYZ gizmo 분리, Proxy 직접 drag/Undo, FFD 다중 선택의 노란 표시·동시 drag·편집 토글, FFD 모드의 Proxy 선택 전달, Proxy/Curve 우클릭 메뉴 명령, 잠긴 Curve/Proxy의 Viewport LMB·RMB 선택 차단과 1024px 레이아웃을 검사합니다. 브라우저 핵심 진단은 실행 주소 뒤에 `?selftest=1`을 붙여 확인할 수 있으며 결과는 개발자 도구의 `globalThis.__CURVE_TOOL_SELF_TEST__`, 회귀 진단 상태는 `globalThis.__CURVE_TOOL_RUNTIME_DIAGNOSTICS__`에서 조회할 수 있습니다.

원격 기능 기준 커밋 `969a05e`는 GitHub Actions Validate(run `31267391750`)를 통과했습니다. ViewCube·3ds Max POV 키와 무선택 변경을 포함한 현재 작업 트리는 `npm run check` 31/31, 브라우저 self-test 24/24와 `npm run test:viewport` 통과를 확인했습니다.

## 저장소 구조

```text
Hair_Mesh_Web/
├── curve_mesh_hair_tool_v4.html   # 화면, Three.js 런타임, 기능 조립부
├── launch_server.py               # 로컬 HTTP 서버/브라우저 실행기
├── 3D_Web_Paint_실행.cmd          # Windows 실행 진입점
├── src/
│   ├── geometry/                  # Bézier·Sweep·프록시 primitive·FFD·메시 제한 계산
│   ├── state/                     # History·프로젝트·선택·편집 정책
│   ├── viewport/                  # Picking/축 드래그 + 재질/조명/Wire 표시 정책
│   ├── ui/                        # 숫자 입력 Scrubber·Context menu 위치 정책
│   └── diagnostics/               # 브라우저 Self-test
├── tests/                         # Node 계약, Playwright Viewport 회귀 테스트와 Fixture
├── doc/                           # 개발자용 코드 지도와 작업 지침
└── docs/product-audit/             # 제품 평가 및 장기 개선 기록
```

개발을 시작할 때 사람은 [개발 문서 색인](doc/README.md)을, Codex는 [Codex 작업 색인](doc/CODEX_INDEX.md)을 먼저 읽습니다. 기능 전체 위치는 [기능별 코드 지도](doc/FEATURE_CODE_MAP.md), 구조 변경 절차는 [개발 가이드](doc/DEVELOPMENT_GUIDE.md)에 있습니다. 저장소 전용 Codex Skill은 `.agents/skills/hair-mesh-web-development`에 포함되어 있습니다.

## 현재 범위와 주의사항

- 앱의 UI와 조립 로직 대부분은 `curve_mesh_hair_tool_v4.html`의 단일 `<script type="module">`에 있습니다.
- FBX 출력은 ASCII 7.4 실험 기능이므로 대상 DCC에서 반드시 Import 결과를 확인해야 합니다.
- 기준 모델은 세션 중 표면 배치용이며 `.hairmesh.json`에 직렬화되지 않습니다.
- Front / Left / Back 참조 이미지는 Perspective를 포함한 모든 View에서 보이는 세션 전용 3D Plane Mesh입니다. `.hairmesh.json`에는 이미지 데이터 대신 파일명 힌트와 3D Transform·표시·반전·Back-face Cull 값만 저장됩니다.
- `Ortho Views`는 Front / Left / Back / Top 버튼과 ViewCube의 6면에 적용됩니다. `Persp`, ViewCube 모서리·꼭짓점과 Home은 Perspective Camera를 사용하며 Orthographic 상태에서는 Camera FOV 입력이 비활성화됩니다.
- Viewport Material과 수동 Reference 텍스처는 표시 전용입니다. Import 원본 재질은 보존되며 OBJ/FBX Export 형상에는 포함되지 않습니다.
- FBX/GLTF Loader가 복원한 내장/해결된 텍스처는 `Original`/`Auto`에서 유지됩니다. 단일 파일 선택으로 찾을 수 없는 외부 sidecar 이미지는 `Reference Objects → Color Texture`에서 Mesh별로 다시 지정하십시오.
- 메시 예산은 Path Segments `2–512`, Tube Sides `3–64`로 제한됩니다.
- 프록시 예산은 Box 축별 Segments `1–128`, Sphere Segments `3–256`/Rings `2–128`, Quad Sphere `1–64`, Cylinder Sides `3–256`/Height·Cap Segments `1–128`로 제한됩니다.
- FFD lattice는 각 축 `2`, `4`, `8`만 지원하며 각각 8, 64, 512개의 Control Point를 가집니다. 영역/다중 선택과 선택 중심의 동시 Move를 지원합니다.
- 제품 평가, 안정화 근거와 후속 로드맵은 [재귀 제품 감사 보고서](docs/product-audit/recursive-audit.md)에 있습니다.

원본 프로토타입 기준선은 커밋 `b1b121a84e845d1afd215a63a7f03e9e6533b33a`입니다. 이후 안정화·Viewport·Reference material/texture·다중 선택 작업은 기본 브랜치 `master`에 통합되었고 임시 작업 브랜치는 제거되었습니다.
