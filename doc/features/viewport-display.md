# Viewport Display 기능 계약

## 범위

Display 탭의 Hair/Reference 재질, Reference Mesh별 표시·재질·텍스처, 표면/Wire, Viewport 배경/FOV/Grid/조명과 프로젝트 표시 상태를 다룬다. Picking과 Transform 모드는 [`viewport-ui.md`](viewport-ui.md), Reference 파일 생명주기는 [`io-export.md`](io-export.md)를 함께 읽는다.

## 기능별 소유 심볼

| 기능 | DOM/조립 심볼 | 순수 정책 모듈 |
| --- | --- | --- |
| Preset 정규화 | `selectedHairMaterialPreset()`, `selectedReferenceMaterialPreset()` | `src/viewport/material-presets.js` |
| MatCap texture | `createMatcapTexture()`, `matcapTextureCache` | preset 정의는 `material-presets.js` |
| Material 생성 | `createViewportMaterial()` | `kind: matcap \| normal \| standard \| original` |
| Hair 적용 | `#hairMaterialPreset`, `applyHairMaterialDisplay()` | Hair fallback `studio-clay` |
| Reference 적용 | `#referenceMaterialPreset`, `applyModelDisplay()` | Reference fallback `auto` |
| Mesh별 관리 | `#referenceObjectList`, `refreshReferenceObjectUI()`, `loadReferenceTexture()` | `src/viewport/reference-object-policy.js` |
| Viewport 환경 | `#viewportBackground`, `#cameraFov`, `#gridVisible`, `applyViewportDisplay()` | `src/viewport/viewport-settings.js` |
| 조명 | `#lightAzimuth`, `#lightElevation`, `#lightIntensity`, `#fillLightIntensity`, `applyLightingDisplay()` | `src/viewport/lighting.js` |
| Wire 생성/표시 | `ensureReferenceWireObject()`, `applyReferenceWireframeDisplay()` | `src/viewport/reference-wireframe.js` |
| 저장/복원 | `captureAppState()`, `restoreAppState()`의 `display` | `.hairmesh.json` optional fields |

## Material 계약

- Hair는 `Original` preset을 허용하지 않고 기본 `studio-clay`를 쓴다.
- Reference는 Import 시 material 또는 material 배열을 `REFERENCE_ORIGINAL_MATERIAL`에 보존한다.
- Reference 기본 `Auto`는 color/emissive texture가 있거나 충분히 밝은 원본은 유지하고, 텍스처 없는 거의 검은 원본만 `Default Lit`로 대체한다. 의도적인 검은 재질은 `Original Imported`로 강제할 수 있다.
- Reference override는 `REFERENCE_OVERRIDE_MATERIAL`/`REFERENCE_OVERRIDE_PRESET`으로 소유하고 preset 교체 또는 Original 복귀 시 dispose한다.
- `Reference Objects`는 한 Import root의 각 Mesh를 나열한다. Mesh별 visibility와 `inherit | auto | original | default-lit | MatCap | normal | classic-teal | texture` 모드를 가진다.
- 수동 Color Texture는 PNG/JPEG/WebP/SVG를 `TextureLoader`로 읽어 sRGB `MeshStandardMaterial`에 연결하며 UV가 없으면 status에 경고한다. Texture/Material/Object URL은 교체·Reference 재Import에서 해제한다.
- Mesh별 visibility/material/texture는 Reference binary와 함께 세션 전용이며 project snapshot에는 넣지 않는다.
- MatCap은 Canvas에서 생성한 texture를 `MeshMatcapMaterial`에 적용하며 장면 조명에 영향받지 않는다.
- Viewport material은 표시 전용이다. Hair topology, Reference binary, OBJ/FBX Export에 bake하지 않는다.

## Lighting 계약

```yaml
azimuth: -180..180 degrees
elevation: -89..89 degrees
intensity: 0..20
fillIntensity: 0..20
reset: 37 / 45 / 2.2 / 2.2
target: scene origin
```

`directionalLightPosition()`은 DOM/Three.js와 무관한 계산을 소유한다. `applyLightingDisplay()`는 `keyLight` 방향/강도와 Hemisphere `fillLight` 강도를 변경한다. 기본 2.2 + 2.2는 약한 조명이 아니므로 검은 무텍스처 원본은 조명을 과도하게 올리는 대신 Auto/Default Lit로 처리한다. MatCap/Normal은 조명과 무관하다.

## Viewport 계약

```yaml
background: six-digit hex, default '#101317'
cameraFov: 15..120 degrees, default 45
gridVisible: boolean
```

기존 `Grid` rollout은 `Viewport`로 이름을 바꾸고 Background, Camera FOV, Ground Grid, Directional/Environment lighting을 한곳에 소유한다. Background/FOV/Grid와 조명 값은 optional display field로 Recovery/Project에 저장한다.

## Reference Wireframe 계약

```text
off     : surface on, wire off
wire    : surface material hidden, independent LineSegments on
overlay : surface on, depth-tested independent LineSegments on, surface depth bias on
```

- `MeshStandardMaterial.wireframe`과 같은 material flag를 쓰지 않는다.
- 각 Import Mesh의 geometry로 `THREE.WireframeGeometry` + `THREE.LineSegments`를 한 번 생성해 child로 소유한다.
- Line material은 Reference Original/MatCap과 분리되므로 `#referenceWireColor`가 재질 전환 후에도 유지된다.
- Surface + Wire는 active surface material에만 polygon depth bias를 적용해 카메라 이동 중 z-fighting을 막고, 다른 모드로 전환하면 material의 원래 polygon-offset 값을 복원한다.
- Reference visibility는 `modelRoot.visible`, Grid visibility는 `grid.visible`이 각각 소유한다.
- Reference 교체 시 Wire geometry/material도 `disposeTree()` 경로로 해제되어야 한다.

## 저장 및 호환성

`display` snapshot에 다음 optional field를 저장한다.

```yaml
hairMaterialPreset
referenceMaterialPreset
directionalLight: { azimuth, elevation, intensity, fillIntensity, distance }
viewportBackground
cameraFov
referenceWireMode
referenceWireColor
gridVisible
```

이전 project의 `modelWireframe: true`는 `referenceWireMode: wire`로 복원한다. 나머지 누락 field는 각 모듈의 기본값을 사용하므로 project version을 올리지 않는다. Reference model binary와 원본 material은 여전히 저장하지 않는다.

## 변경 체크리스트

- Preset/lighting/wire 입력을 정규화한 후 UI에 정규화된 값을 돌려쓰는가?
- Hair/Reference material 변경이 topology를 다시 만들지 않고 즉시 표시되는가?
- Reference Original 복귀와 override 교체에서 원본 material을 dispose하지 않는가?
- Wire color가 active surface material을 변조하지 않고, Overlay의 임시 depth bias 외 material 속성은 원래 값을 유지하는가?
- Surface + Wire 카메라 이동 중 면/선이 깜빡이지 않고, Off/Wire Only에서 원래 depth 설정으로 복귀하는가?
- 다중 Mesh 목록이 파일 내부 객체 수와 일치하고 숨긴 Mesh가 렌더와 Surface raycast에서 모두 제외되는가?
- 수동 Texture가 UV Mesh에 표시되고 Clear/New Import에서 GPU 자원과 UI 선택이 정리되는가?
- 조명 Reset이 Directional/Environment 기본값으로 복귀하고 Dirty/Recovery에 반영되는가?
- Background/FOV/Grid가 즉시 반영되고 이전 프로젝트 누락 필드는 기본값으로 복원되는가?
- Reference/Wire/Grid의 visibility가 서로 독립적인가?
- 1024px 폭에서 재질 선택기와 모든 rollout에 스크롤로 접근할 수 있고 가로 overflow가 없는가?

## 검증

- Node: material preset fallback/kind, dark-original Auto 정책, object material mode, viewport setting, lighting clamp/position, wire mode/color normalization.
- Browser: 다중 Mesh Import/숨김/선택, Mesh별 preset/texture/Clear, 모든 Hair/Reference preset, Original 복귀, Directional/Environment 조명/Reset, Wire Off/Wire Only/Surface + Wire, Background/FOV/Grid, Recovery.
- Import: 유효한 FBX fixture에 Reference MatCap과 Wire layer를 적용한다.
- Layout: 1600×900과 1024×768에서 console/page error, 가로 overflow, control 접근성을 확인한다.
