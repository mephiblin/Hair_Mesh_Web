# Viewport Display 기능 계약

## 범위

Display 탭의 Hair/Reference 재질, Reference Mesh별 표시·재질·텍스처, 표면/Wire, Front/Left/Back 참조 이미지, Viewport 배경/FOV/Grid/조명과 프로젝트 표시 상태를 다룬다. Picking과 Transform 모드는 [`viewport-ui.md`](viewport-ui.md), Reference 파일 생명주기는 [`io-export.md`](io-export.md)를 함께 읽는다.

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
| 표준 뷰 투영 | `#orthographicViewsToggleBtn`, `useViewportCamera()`, `setViewportDirection()`, `setStandardView()` | `standardViewProjection()`, `matchedOrthographicHeight()`, `view-cube.js` |
| 조명 | `#lightAzimuth`, `#lightElevation`, `#lightIntensity`, `#fillLightIntensity`, `applyLightingDisplay()` | `src/viewport/lighting.js` |
| Wire 생성/표시 | `ensureReferenceWireObject()`, `applyReferenceWireframeDisplay()` | `src/viewport/reference-wireframe.js` |
| 3방향 이미지 | `#referenceImageStrip`, `loadReferenceImage()`, `applyReferenceImageDisplay()` | `src/viewport/reference-images.js` |
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
cameraFov: Perspective only, 15..120 degrees, default 45
orthographicStandardViews: boolean, default true
gridVisible: boolean
```

기존 `Grid` rollout은 `Viewport`로 이름을 바꾸고 Background, Camera FOV, Ground Grid, Directional/Environment lighting을 한곳에 소유한다. `Ortho Views` ON에서 Front/Left/Back/Top 버튼과 ViewCube 표준 6면은 실제 Orthographic Camera로 전환하고 FOV 입력을 비활성화한다. `Persp`, ViewCube edge/corner/Home은 항상 Perspective Camera이며 토글 OFF에서는 표준 6면도 Perspective FOV를 사용한다. ViewCube 좌클릭 자유 drag는 시작 시점의 Perspective/Orthographic 투영과 orbit target을 유지한다. 전역 `T/B/F/L`과 `V` 메뉴 표준 면도 Ortho Views를 따르며 `P/U`는 viewing angle을 유지한 채 Perspective/User Orthographic 투영으로 바꾼다. Background/FOV/Grid/Ortho Views와 조명 값은 optional display field로 Recovery/Project에 저장한다.

## Viewport Reference Images 계약

```yaml
views: front | left | back
camera_visibility: perspective and all standard views
layer: behind | overlay
per_view: visible, transform { position, rotation, scale }, mirror, backfaceCulling, fileName
shared: opacity, fitted frame center/size
image_payload: session-only
```

- `referenceImageRoot`는 Import한 `modelRoot`와 별개인 표시 전용 Scene group이다. Curve 생성, surface raycast, Reference Objects 목록, OBJ/FBX Export에 참여하지 않는다.
- Front는 `+Z`, Left는 `-X`, Back은 `-Z`를 향하는 초기 Plane Mesh로 배치한다. 카메라 방향으로 visibility를 제한하지 않으므로 Perspective, Top, 궤도 회전에서도 실제 공간상의 평면으로 보인다.
- 이미지 카드를 누르면 활성 Plane을 바꾸고 저장된 frame center를 향한 Front/Left/Back 기준 뷰로 전환한다. Viewport에서는 Curve가 잡히지 않은 경우 보이는 Plane을 직접 클릭해 카메라를 바꾸지 않고 선택할 수 있다.
- 첫 이미지 로드와 `Fit to Model`은 현재 Reference Model bounds를 공통 frame으로 캡처하고 세 Plane의 custom `transform`을 `null`로 되돌려 새 bounds/aspect 기반 초기 배치를 사용한다. 모델이 없으면 기본 원점 frame을 사용한다.
- `referenceImageTransformControls`는 활성 Plane Mesh에 직접 attach한다. Move/Rotate는 XYZ, Scale은 두 Plane 축만 노출하며 World/Local space, W/E/R/Q와 Position/Rotation/Plane Size 수치 입력을 지원한다.
- gizmo 또는 수치 편집이 시작되면 과거 `scaleX/scaleY/offsetX/offsetY/rotation` 호환값 대신 실제 `transform.position/rotation/scale`을 저장한다. 이전 프로젝트의 transform 없는 view는 기존 frame/layout 계산을 그대로 사용한다.
- `Behind Geometry`는 depth test로 모델 뒤에 가려지고, `Overlay on Top`은 depth test 없이 표시한다. 두 모드 모두 depth write를 끄며 다른 material이나 wire color를 바꾸지 않는다.
- `Back-face Cull`은 `FrontSide`와 `DoubleSide`를 전환한다. `Flip Horizontal`은 Mesh scale을 음수로 만들지 않고 texture repeat/offset으로 UV만 반전해 Scale gizmo의 부호를 안정적으로 유지한다.
- PNG/JPEG/WebP/SVG를 sRGB `MeshBasicMaterial` plane으로 읽고, 활성 Plane에는 별도 teal `LineLoop` 선택 외곽선을 표시한다. 교체·Clear에서 plane/outline geometry, material, texture를 dispose하고 Object URL을 revoke한다.
- 프로젝트에는 이미지 binary/data URL을 넣지 않는다. optional `referenceImages` 설정과 `fileName` 힌트만 저장하며 다시 연 뒤 사용자가 같은 로컬 파일을 재선택한다.
- 프로젝트 복원 시 현재 세션 plane의 파일명과 저장된 힌트가 다르면 `reconcileReferenceImageRuntime()`가 이전 이미지를 폐기한다. 같은 파일명인 이미지만 세션 편의를 위해 유지한다.

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
orthographicStandardViews
referenceWireMode
referenceWireColor
referenceImages: { opacity, layer, frame, views }
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
- Ortho Views ON의 Front/Left/Back/Top 버튼, 전역 `T/B/F/L`, `V` 메뉴 표준 면과 ViewCube 6면에서 깊이에 따른 FOV 크기 왜곡이 사라지고 FOV 입력이 비활성화되는가? OFF, Persp와 ViewCube edge/corner/Home에서는 Perspective/FOV가 복구되며, `P/U`와 ViewCube 자유 drag는 시작 viewing angle/target을 유지하는가?
- Reference/Wire/Grid의 visibility가 서로 독립적인가?
- Front/Left/Back plane이 Perspective/Top/궤도 회전에서도 공간상의 실제 Plane Mesh로 보이는가?
- 이미지 카드 전환이 선택 Curve 위치와 무관하게 저장된 frame center를 바라보는가?
- Plane Viewport 클릭과 카드 선택이 활성 외곽선/gizmo/UI를 같은 view로 동기화하는가?
- Move/Rotate/Scale gizmo와 Position/Rotation/Plane Size 수치가 양방향 동기화되고 프로젝트에 실제 transform으로 저장되는가?
- Back-face Cull ON에서 뒷면이 사라지고 OFF에서 양면이 보이며, Flip Horizontal이 geometry scale 부호 없이 UV만 뒤집는가?
- Behind는 모델에 가려지고 Overlay는 위에 보이며, Transform/Mirror/Opacity가 view별 또는 공통 소유권대로 반영되는가?
- 이미지 교체/Clear에서 GPU 자원과 Object URL을 해제하고, 프로젝트 JSON에 binary/data URL이 들어가지 않는가?
- 이전 프로젝트에 `referenceImages`가 없어도 기본값으로 열리고, 새 프로젝트는 정렬값과 파일명 힌트를 왕복하는가?
- 1024px 폭에서 재질 선택기와 모든 rollout에 스크롤로 접근할 수 있고 가로 overflow가 없는가?

## 검증

- Node: material preset fallback/kind, dark-original Auto 정책, object material mode, viewport setting, lighting clamp/position, wire mode/color, reference image 설정/초기 plane/custom 3D transform 정규화.
- Browser: 다중 Mesh Import/숨김/선택, Mesh별 preset/texture/Clear, 모든 Hair/Reference preset, Original 복귀, Directional/Environment 조명/Reset, Wire Off/Wire Only/Surface + Wire, Front/Left/Back Plane의 Perspective 표시·Viewport 선택·gizmo drag·Back-face/Flip·Clear, `T/B/F/L/P/U`·`V` 메뉴와 Ortho/Perspective 표준 6면, ViewCube edge/corner/Home 전환·줌·FOV disabled·picking, Background/FOV/Grid, 프로젝트 왕복과 Recovery.
- Import: 유효한 FBX fixture에 Reference MatCap과 Wire layer를 적용한다.
- Layout: 1600×900과 1024×768에서 console/page error, 가로 overflow, control 접근성을 확인한다.
