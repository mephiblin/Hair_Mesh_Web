# Proxy Mesh 기능 계약

## 범위와 사용자 모델

Proxy Mesh는 헤어 가이드를 배치할 때 두상·볼륨·장애물의 대략적인 형태를 빠르게 만드는 편집 가능한 Scene Object다. `Create`에서 종류를 만들고, `Scene Explorer`에서 선택·표시·잠금을 관리하며, `Modify`는 활성 객체가 Proxy일 때만 Primitive Parameters를 표시한다.

지원 종류:

| UI 이름 | 내부 type | topology |
| --- | --- | --- |
| Box | `box` | 면별 subdivided Quad |
| Sphere · UV | `sphere` | 중간 Quad + 양 극점 Triangle |
| Quad Sphere | `quad-sphere` | subdivided cube를 구면 투영, 모든 면 Quad |
| Cylinder | `cylinder` | Quad side, cap 중심 Triangle + 방사형 Quad ring |

`Quad Sphere`는 “사각형으로 이루어진 스피어”라는 요구를 모호한 GeoSphere 이름 대신 명시한 것이다. Three.js 내장 primitive의 렌더 삼각형만 저장하지 않고, 앱의 논리 polygon face를 직접 생성한다.

## 데이터 흐름

```text
Create button
  → createProxyPrimitive(type)
  → makeProxyRecord(type)
  → buildProxyTopology(type, normalized settings)
  → proxyTopologyToThree()
  → topologyToGeometry() + topologyToWireGeometry()
  → selectProxy()
  → Modify: Proxy context

Primitive input
  → history.begin()
  → readProxySettingsFromUI()
  → normalizeProxySettings()
  → rebuildProxyMesh()
  → history.commit()
```

## 소유 심볼

| 책임 | 심볼/DOM | 파일 |
| --- | --- | --- |
| 순수 기본값·제한 | `defaultProxySettings()`, `normalizeProxySettings()`, `PROXY_LIMITS` | `src/geometry/proxy-primitives.js` |
| 순수 topology | `buildProxyTopology()`, `proxyTopologyStats()` | `src/geometry/proxy-primitives.js` |
| Scene record | `makeProxyRecord()`, `proxyState()`, `proxyFromState()`, `disposeProxy()` | HTML composition root |
| 렌더 재생성 | `rebuildProxyMesh()`, `proxyTopologyToThree()` | HTML composition root |
| 생성 UI | `#create*ProxyBtn`, `createProxyPrimitive()` | HTML composition root |
| 선택·목록 | `selectProxy()`, `refreshProxyList()`, `setProxyVisible()`, `setProxyLocked()` | HTML composition root |
| Modify 문맥 | `syncModifyContext()`, `syncProxyModifierUI()`, `readProxySettingsFromUI()` | HTML composition root |
| Transform | `activeSceneObject()`, `syncGizmo()`, `handleGizmoChange()` | HTML composition root |
| 저장·복원 | `captureAppState()`, `restoreAppState()` | HTML composition root |
| Export | `activeExportMeshes()`, `worldTopology()` | HTML composition root |

## Proxy record

```text
proxy
├── id, name, type
├── visible, locked
├── group                    # 저장되는 Object transform
├── settings                 # 저장되는 primitive parameters
├── topology                 # 매번 settings에서 재생성하는 논리 polygon
└── meshGroup
    ├── solidMesh            # 삼각분할 BufferGeometry
    └── wireMesh             # 논리 face edge만 표시
```

프로젝트에는 `type`, 정규화된 `settings`, transform, visible/locked만 저장한다. `topology`, BufferGeometry, Material은 파생 데이터이므로 저장하지 않고 restore에서 다시 만든다. 기존 version 1 프로젝트에 `proxies`가 없으면 빈 배열로 연다.

## 파라미터 제한

- 크기/반지름/높이: `0.001..10000`
- Box 각 축 Segments: `1..128`
- Sphere Segments: `3..256`, Rings: `2..128`
- Quad Sphere Face Segments: `1..64`
- Cylinder Sides: `3..256`, Height/Cap Segments: `1..128`

UI의 `min/max`는 안내이며 실제 안전 경계는 `normalizeProxySettings()`가 소유한다. 숫자 입력과 label drag scrubber 모두 같은 정규화·History 경로를 사용해야 한다.

## 선택과 Modify 불변조건

- 활성 root object는 Curve 또는 Proxy 중 정확히 하나다. `selectCurve()`는 `selectedProxy`를, `selectProxy()`는 Curve/Point 선택을 해제한다.
- Modify는 `none | curve | proxy` 세 문맥 중 하나만 표시한다.
- Proxy 선택에서는 Point Edit/Insert로 들어가지 않는다. W/E/R은 Proxy group transform에 적용한다.
- hidden/locked Proxy는 parameter, name, transform, clone/delete 변경을 막는다.
- `Show Edges`는 Hair/Reference wire 설정과 독립적인 Proxy 자체 논리 edge layer다.
- Proxy는 Reference surface raycast 대상이 아니다. 현재는 가이드 배치 표면이 아니라 형태 참고/Export용이다.

## History·Project·Export

- 생성, type/parameter 변경, reset, transform, 이름, 표시, 잠금, clone, delete는 History transaction이다.
- `selectedObjectKind`와 `selectedProxyId`가 활성 Modify 문맥을 저장/복원한다.
- OBJ/FBX Export는 표시 중인 Curve Live Mesh와 Proxy Mesh를 함께 수집한다. hidden Proxy는 제외한다.
- World transform, Export Scale, Y-up/Z-up 변환은 Curve와 동일하게 적용한다.
- OBJ는 Quad/N-gon 논리 face를 보존한다. FBX 7.4 ASCII는 실험 기능이며 대상 DCC Import 검증 전에는 완전 호환을 주장하지 않는다.

## 변경 체크리스트

- 새 type/field가 default → normalize → UI read/write → clone/capture/restore → topology 전 경로에 있는가?
- 상한/하한 밖 입력과 비수치 입력이 유한한 값으로 정규화되는가?
- 논리 face winding, 기대 vertex/face/quad/render-triangle 수가 Node 테스트로 고정되는가?
- 반복 rebuild/type 전환/삭제/Undo restore에서 이전 Geometry/Material이 dispose되는가?
- Curve↔Proxy 선택 전환 시 Modify, Scene row, badge, gizmo, keyboard target이 동시에 바뀌는가?
- 잠금/숨김 상태에서 numeric scrub, W/E/R, Clone/Delete가 우회 수정하지 못하는가?
- 이전 프로젝트와 Proxy 포함 프로젝트가 모두 열리고 Undo/Redo/Recovery에서도 파라미터가 유지되는가?
- 여러 Curve/Proxy Export에서 이름과 vertex/UV offset이 충돌하지 않는가?

## 검증

- Node: 파라미터 clamp와 4종 topology count/face type, 프로젝트 proxy state round-trip.
- Browser: 4종 Create, Modify 문맥, 세그먼트 변경, Scene Explorer visibility/lock, W/E/R, Clone/Delete, Undo/Redo, Save→mutate→Open.
- Visual: 1600×900과 1024×768에서 Proxy list, selected edge, Primitive Parameters, stats와 viewport clipping 확인.
- Export: OBJ의 object/face 수와 FBX Geometry/Model 수를 검사하고, 최종 호환 판정은 3ds Max/Blender Import로 수행한다.
