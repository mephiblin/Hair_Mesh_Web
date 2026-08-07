# Hair Mesh Web

브라우저에서 Bézier 가이드를 만들고 Ribbon, Tube, Imported Brush 프로파일을 따라 Hair Card 메시를 생성하는 Three.js 기반 프로토타입입니다.

## 실행

```bash
python3 launch_server.py
```

브라우저가 자동으로 열리지 않으면 터미널에 표시되는 로컬 주소를 여십시오. 현재 Three.js와 Loader는 jsDelivr에서 불러오므로 최초 실행과 모델 Import에는 인터넷 연결이 필요합니다.

## 기본 작업 흐름

1. `Create` 탭에서 `+ Line`을 선택합니다.
2. 뷰포트에 두 개 이상의 Point를 배치하고 `Finish & Edit`을 선택합니다.
3. Point와 Bézier Handle, 단면 Offset/Rotate/Scale을 편집합니다.
4. `Live Curve → Mesh`에서 Ribbon, Tube 또는 Imported Mesh Brush를 생성합니다.
5. 상단의 `Save Project`로 편집 가능한 `.hairmesh.json` 프로젝트를 저장하거나 Export 탭에서 OBJ/FBX 메시를 출력합니다.

브라우저는 편집 변경을 로컬 자동복구 슬롯에도 저장합니다. 새로고침 시 마지막 복구 상태를 불러오지만, 중요한 작업은 명시적으로 프로젝트 파일을 저장하십시오.

## 검증

```bash
npm test
```

브라우저 핵심 진단은 실행 주소 뒤에 `?selftest=1`을 붙여 확인할 수 있습니다.

## 프로젝트 상태와 범위

이 저장소는 Blender 전체 Hair Curves/Grooming 대체재가 아니라 Hair Card 제작에 초점을 맞춘 MVP입니다. 현재 구현 평가, 수정 근거, 검증 결과와 후속 로드맵은 [재귀 제품 감사 보고서](docs/product-audit/recursive-audit.md)에 기록합니다.

원본 GitHub 상태는 커밋 `b1b121a84e845d1afd215a63a7f03e9e6533b33a`이며, 안정화 작업은 `agent/stabilization-v1-from-b1b121a` 브랜치에서 분리합니다.
