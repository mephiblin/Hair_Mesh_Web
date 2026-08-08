# Mesh 생성 기능 계약

## 범위

Curve sampling, sweep frame, Ribbon/Tube/Imported Brush topology, Live Mesh 상태, 렌더 Geometry와 mesh budget을 다룬다. Box/Sphere/Quad Sphere/Cylinder는 [`proxy-mesh.md`](proxy-mesh.md)가 소유하고 이 문서의 `topologyToGeometry()`/`topologyToWireGeometry()`만 공유한다.

## 호출 그래프

```text
settings/curve change
  → getCurrentSettings()
  → rebuildCurveMesh(curve)
    → makeTopologyForCurve(curve)
      → normalizeMeshBudget()
      → buildSweepContext(curve, segments)
      → buildSweepFrames()
      ├── makeRibbonTopology()
      ├── makeTubeTopology()
      └── makeBrushTopology()
    → topologyToGeometry()
    → topologyToWireGeometry()
    → applyViewModeToCurve()
    → updateMeshStats()
```

## 기능별 소유 심볼

| 기능 | 심볼 | 소유 파일 |
| --- | --- | --- |
| 설정 기본값/읽기/쓰기 | `defaultSettings()`, `getCurrentSettings()`, `syncModifierUIFromCurve()` | HTML composition root |
| 예산 제한 | `MESH_LIMITS`, `normalizeMeshBudget()` | `src/geometry/mesh-limits.js` |
| Sweep frame | `buildSweepFrames()` | `src/geometry/sweep-frames.js` |
| Curve sample 문맥 | `buildSweepContext()`, `evaluateSweep()`, `evaluateControlPoint()` | HTML composition root |
| Ribbon | `makeRibbonTopology()` | HTML composition root |
| Tube | `makeTubeTopology()` | HTML composition root |
| Brush sweep | `makeBrushTopology()` | HTML composition root |
| 렌더 Geometry | `topologyToGeometry()`, `topologyToWireGeometry()` | HTML composition root |
| Hair 표시 Material | `createViewportMaterial()`, `applyHairMaterialDisplay()` | HTML + `src/viewport/material-presets.js` |
| Live lifecycle | `rebuildCurveMesh()`, `removeCurveMesh()`, `failCurveMesh()` | HTML composition root |
| 상태 판정 | `hasReadyMesh()` | `src/state/curve-policy.js` |

## 논리 topology 계약

```yaml
positions: Vector3[]
faces: number[][]        # logical quad/ngon 유지
uvs: Vector2[]
faceUvs: (number[] | null)[]
```

렌더 단계에서 face를 삼각분할해도 Curve와 Proxy의 `topology.faces`는 Export를 위해 원래 논리 face를 유지한다.

## Live 상태 머신

```text
disabled: meshEnabled false 또는 명시 제거
ready:    enabled + topology 생성 + render objects 부착
error:    생성 실패; topology/render objects 제거, error message 보존
```

UI의 체크/배지는 `meshEnabled`만 보지 말고 `curveHasReadyMesh()`를 사용한다.

## 변경 체크리스트

- `defaultSettings`, UI input, `getCurrentSettings`, `syncModifierUIFromCurve`가 대칭인가?
- 계산 직전에 Segment/Sides가 정규화되는가?
- 0 길이/겹친 Point/급격한 tangent에서도 frame 값이 finite한가?
- UV off일 때 빈 UV와 faceUvs가 일관적인가?
- Tube cap face winding과 normal이 올바른가?
- 실패 시 이전 topology가 Ready처럼 남지 않는가?
- rebuild/remove 시 이전 Geometry와 Material을 dispose하는가?
- Hair material preset 변경 시 topology/UV/face가 유지되고 교체된 Material만 dispose되는가?
- Brush가 프로젝트 복원 후에도 같은 topology를 생성하는가?

## 검증

- Node: mesh budget clamp, Live-ready policy.
- Self-test: sweep frame finite/continuity/twist correction.
- Browser: Ribbon/Tube/Brush 생성, Segment 2/512, Sides 3/64, caps, UV, smooth/wire, 모든 Hair material preset, invalid Brush error와 복구.
- Export 영향이 있으면 `io-export.md` 검증도 수행한다.
