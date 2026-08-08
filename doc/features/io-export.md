# Import·Export 기능 계약

## 범위

Reference model Import, Mesh Brush Import, 프로젝트 파일 I/O, OBJ와 FBX 메시 Export를 다룬다. 프로젝트 JSON의 상세 계약은 `project-state.md`를 함께 읽는다.

## 기능별 소유 심볼

| 기능 | 심볼/DOM | 형식 |
| --- | --- | --- |
| Reference import | `#modelFile`, `loadModel()`, `normalizeMaterials()` | OBJ, FBX, GLB, GLTF |
| Reference framing/display | `fitObject()`, `applyModelDisplay()`, `updateDrawTargetUI()` | Three.js Object3D |
| Reference material | `normalizeMaterials()`, `createViewportMaterial()`, `applyModelDisplay()` | Original / MatCap / Normal / Standard |
| Reference wire layer | `ensureReferenceWireObject()`, `applyReferenceWireframeDisplay()` | `LineSegments`, Wire Only / Surface + Wire |
| Brush import dispatch | `#brushFiles`, `loadBrushFile()`, `loadBrushFiles()` | OBJ, FBX, GLB, GLTF |
| OBJ Brush parser | `parseOBJTopology()` | text OBJ faces/UV |
| Object3D Brush parser | `topologyFromObject3D()` | loaded BufferGeometry |
| Brush UI/lifecycle | `refreshBrushUI()`, `#removeBrushBtn` | `brushes[]` |
| Project I/O | `saveProject()`, `openProjectFile()` | `.hairmesh.json` |
| Export set/world transform | `activeExportMeshes()`, `worldTopology()`, `exportPoint()` | ready Live curves only |
| OBJ Export | `exportQuadOBJ()`, `#exportQuadObjBtn` | logical Quad/N-gon OBJ |
| FBX Export | `computeVertexNormals()`, `exportAsciiFBX()`, `#exportFbxBtn` | FBX 7.4 ASCII experimental |
| 다운로드 | `downloadBlob()` | browser Blob/Object URL |

## Import 경계

- Reference model은 raycast/display용이며 프로젝트에 포함하지 않는다.
- Import한 material 또는 material 배열은 `REFERENCE_ORIGINAL_MATERIAL`에 보존한다. Viewport override를 제거하면 같은 원본 객체로 복귀한다.
- Reference MatCap은 표시 전용이며 Reference binary나 Mesh Export에 bake하지 않는다.
- Reference Wireframe은 material의 `wireframe` flag를 쓰지 않는 독립 `LineSegments`이다. 선 색상은 Original/MatCap과 독립적이며 Export에 포함되지 않는다.
- 새 Reference를 불러오면 이전 `modelRoot` 자원을 dispose하고 `surfaceMeshes`를 다시 수집한다.
- Brush는 cross-section topology로 정규화하고 프로젝트 snapshot에 포함한다.
- OBJ negative index와 optional UV를 처리한다.
- Object3D는 Mesh의 indexed/non-indexed BufferGeometry를 논리 topology로 변환한다.
- Object URL은 성공/실패와 관계없이 revoke한다.

## Export 경계

```text
curves
  → enabled + valid topology만 선택
  → curve.group.matrixWorld 적용
  → exportScale 적용
  → Y-up 또는 Z-up 좌표 변환
  → logical faces + optional UV 직렬화
```

Export는 Live 관계를 bake한다. Curve/Point/Modifier 편집성은 OBJ/FBX에 포함되지 않는다.

## 변경 체크리스트

- 지원하지 않는 확장자와 parser 오류가 사용자 status에 표시되는가?
- Import 실패 후 이전/부분 Scene과 Object URL이 누수되지 않는가?
- OBJ/FBX/GLB/GLTF가 같은 Reference material override 경로를 사용하고 Original로 복귀하는가?
- Reference Wire Only에서 surface가 숨고, Surface + Wire에서 원본/override surface와 독립 색상의 선이 같이 보이는가?
- override 교체/원본 복귀/새 모델 Import에서 원본과 임시 Material을 중복 없이 dispose하는가?
- Brush face index와 `faceUvs` 길이가 일치하는가?
- Curve root의 position/quaternion/scale이 Export vertex에 정확히 적용되는가?
- 축 변환과 scale이 vertex/normal 의미를 일치시키는가?
- OBJ의 vertex/UV offset이 여러 Curve 사이에서 누적되는가?
- FBX polygon termination negative index와 Normal/UV mapping이 importer에서 유효한가?
- Export 버튼은 ready topology가 없을 때 파일을 만들지 않는가?

## 검증

- Fixture: `tests/fixtures/quad-brush.obj`.
- Browser: 각 Reference/Brush 형식의 성공·실패, 모든 Reference material preset과 Original 복귀, Wire Off/Wire Only/Surface + Wire와 선 색상, 여러 Brush 추가/삭제, 프로젝트 round-trip.
- OBJ: 여러 Curve, UV on/off, Quad/N-gon, Y-up/Z-up을 Blender/3ds Max에서 Import.
- FBX: ASCII 7.4를 목표 DCC에서 Import하고 topology, axis, scale, normals, UV를 확인. 실험 상태를 유지한다.
