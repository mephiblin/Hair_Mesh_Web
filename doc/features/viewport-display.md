# Viewport Display 기능 계약

## 범위

Display 탭의 Hair/Reference 재질, 방향광, Reference 표면/Wire, Ground Grid와 프로젝트 표시 상태를 다룬다. Picking과 Transform 모드는 [`viewport-ui.md`](viewport-ui.md), Reference 파일 생명주기는 [`io-export.md`](io-export.md)를 함께 읽는다.

## 기능별 소유 심볼

| 기능 | DOM/조립 심볼 | 순수 정책 모듈 |
| --- | --- | --- |
| Preset 정규화 | `selectedHairMaterialPreset()`, `selectedReferenceMaterialPreset()` | `src/viewport/material-presets.js` |
| MatCap texture | `createMatcapTexture()`, `matcapTextureCache` | preset 정의는 `material-presets.js` |
| Material 생성 | `createViewportMaterial()` | `kind: matcap \| normal \| standard \| original` |
| Hair 적용 | `#hairMaterialPreset`, `applyHairMaterialDisplay()` | Hair fallback `studio-clay` |
| Reference 적용 | `#referenceMaterialPreset`, `applyModelDisplay()` | Reference fallback `original` |
| 방향광 | `#lightAzimuth`, `#lightElevation`, `#lightIntensity`, `applyLightingDisplay()`, `resetLightingDisplay()` | `src/viewport/lighting.js` |
| Wire 생성/표시 | `ensureReferenceWireObject()`, `applyReferenceWireframeDisplay()` | `src/viewport/reference-wireframe.js` |
| Grid | `#gridVisible`, `grid.visible` event | display snapshot |
| 저장/복원 | `captureAppState()`, `restoreAppState()`의 `display` | `.hairmesh.json` optional fields |

## Material 계약

- Hair는 `Original` preset을 허용하지 않고 기본 `studio-clay`를 쓴다.
- Reference는 Import 시 material 또는 material 배열을 `REFERENCE_ORIGINAL_MATERIAL`에 보존한다.
- Reference override는 `REFERENCE_OVERRIDE_MATERIAL`/`REFERENCE_OVERRIDE_PRESET`으로 소유하고 preset 교체 또는 Original 복귀 시 dispose한다.
- MatCap은 Canvas에서 생성한 texture를 `MeshMatcapMaterial`에 적용하며 장면 조명에 영향받지 않는다.
- Viewport material은 표시 전용이다. Hair topology, Reference binary, OBJ/FBX Export에 bake하지 않는다.

## Lighting 계약

```yaml
azimuth: -180..180 degrees
elevation: -89..89 degrees
intensity: 0..20
reset: 37 / 45 / 2.2
target: scene origin
```

`directionalLightPosition()`은 DOM/Three.js와 무관한 계산을 소유한다. `applyLightingDisplay()`만 `keyLight` position/intensity를 변경한다. Classic Teal과 조명을 사용하는 Import 원본 재질에 효과가 보이며 MatCap/Normal은 방향광과 무관하다.

## Reference Wireframe 계약

```text
off     : surface on, wire off
wire    : surface material hidden, independent LineSegments on
overlay : surface on, depth-tested independent LineSegments on
```

- `MeshStandardMaterial.wireframe`과 같은 material flag를 쓰지 않는다.
- 각 Import Mesh의 geometry로 `THREE.WireframeGeometry` + `THREE.LineSegments`를 한 번 생성해 child로 소유한다.
- Line material은 Reference Original/MatCap과 분리되므로 `#referenceWireColor`가 재질 전환 후에도 유지된다.
- Reference visibility는 `modelRoot.visible`, Grid visibility는 `grid.visible`이 각각 소유한다.
- Reference 교체 시 Wire geometry/material도 `disposeTree()` 경로로 해제되어야 한다.

## 저장 및 호환성

`display` snapshot에 다음 optional field를 저장한다.

```yaml
hairMaterialPreset
referenceMaterialPreset
directionalLight: { azimuth, elevation, intensity, distance }
referenceWireMode
referenceWireColor
gridVisible
```

이전 project의 `modelWireframe: true`는 `referenceWireMode: wire`로 복원한다. 나머지 누락 field는 각 모듈의 기본값을 사용하므로 project version을 올리지 않는다. Reference model binary와 원본 material은 여전히 저장하지 않는다.

## 변경 체크리스트

- Preset/lighting/wire 입력을 정규화한 후 UI에 정규화된 값을 돌려쓰는가?
- Hair/Reference material 변경이 topology를 다시 만들지 않고 즉시 표시되는가?
- Reference Original 복귀와 override 교체에서 원본 material을 dispose하지 않는가?
- Wire mode/color 변경이 active surface material을 변조하지 않는가?
- 조명 Reset이 정확한 기본값으로 복귀하고 Dirty/Recovery에 반영되는가?
- Reference/Wire/Grid의 visibility가 서로 독립적인가?
- 1024px 폭에서 재질 선택기와 모든 rollout에 스크롤로 접근할 수 있고 가로 overflow가 없는가?

## 검증

- Node: material preset fallback/kind, lighting clamp/position, wire mode/color normalization.
- Browser: 모든 Hair/Reference preset, Reference Original 복귀, Directional Light 회전/강도/Reset, Wire Off/Wire Only/Surface + Wire, 독립 선 색상, Grid 독립 전환, Recovery.
- Import: 유효한 FBX fixture에 Reference MatCap과 Wire layer를 적용한다.
- Layout: 1600×900과 1024×768에서 console/page error, 가로 overflow, control 접근성을 확인한다.
