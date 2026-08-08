# 프로젝트·History 기능 계약

## 범위

앱 snapshot, `.hairmesh.json`, Undo/Redo, Dirty 상태, localStorage 자동 복구를 다룬다.

## 호출 그래프

```text
user mutation
  → history.begin(label)
  → state/scene synchronization
  → history.commit()
    → captureAppState()
    → history onChange
    → markProjectChanged()
    → scheduleRecovery()

save
  → captureAppState()
  → createProjectDocument()
  → serializeProjectDocument()
  → downloadBlob()

open/recovery/undo/redo
  → parse document or select snapshot
  → restoreAppState()
  → rebuild visuals, mesh, selection, UI
```

## 소유 심볼

| 책임 | 심볼 | 파일 |
| --- | --- | --- |
| Snapshot capture/restore | `captureAppState()`, `restoreAppState()` | HTML composition root |
| Curve restore | `curveFromState()` | HTML composition root |
| Point/Brush codec | `pointState()`, `pointFromState()`, `brushState()`, `brushFromState()` | HTML composition root |
| 문서 envelope/검증 | `PROJECT_FORMAT`, `PROJECT_VERSION`, `createProjectDocument()`, `parseProjectDocument()` | `src/state/project-format.js` |
| Save/Open | `saveProject()`, `openProjectFile()` | HTML composition root |
| Recovery | `RECOVERY_KEY`, `writeRecoveryNow()`, `scheduleRecovery()`, `restoreRecovery()` | HTML composition root |
| Dirty UI | `markProjectChanged()`, `updateProjectStatus()` | HTML composition root |
| Undo/Redo | `createHistory()`와 `history` 생성부 | `src/state/history.js`, HTML |

## 저장 경계

저장됨: Curve/Point/Brush, Curve transform/settings/live flag, selection, mode, Hair/Reference material preset, 방향광 azimuth/elevation/intensity, Reference wire mode/color, Grid visibility를 포함한 display 설정과 ID counter.

저장되지 않음: Reference model binary/scene, camera/orbit position, transient pointer/gizmo drag, GPU objects, Object URL.

## 스키마 변경 규칙

1. 필드 기본값과 이전 문서 fallback을 정의한다.
2. create/clone/capture/restore 전체 경로를 수정한다.
3. 호환되는 optional 필드는 version을 불필요하게 올리지 않는다.
4. 호환되지 않는 의미 변경만 `PROJECT_VERSION`을 올리고 migration을 추가한다.
5. 과거 문서, 현재 round-trip, 미래 version 거부를 테스트한다.

## History 규칙

- Mutation 전에 `begin(label)`, 모든 파생 동기화 후 `commit()`한다.
- Drag/연속 input은 한 transaction이다.
- 상태 signature가 같으면 entry를 만들지 않는다.
- 새 commit은 redo stack을 비운다.
- Restore 중 mutation listener가 새 transaction을 만들지 않아야 한다.
- Open/Recovery 뒤 History baseline과 Dirty 표시를 의도대로 초기화한다.

## 변경 체크리스트

- JSON stringify 가능한 값만 capture하는가?
- Vector/Quaternion/Set을 배열로 변환·복원하는가?
- Brush topology와 ID reference가 함께 복원되는가?
- 선택 ID/index가 없는 객체를 가리킬 때 안전한 fallback이 있는가?
- Recovery 실패가 앱 부팅을 막지 않는가?
- 이전 프로젝트에 material preset 필드가 없어도 Hair는 Studio Clay, Reference는 Original로 복원되는가?
- 이전 `modelWireframe: true`는 `referenceWireMode: wire`로 복원되고, 새 display 필드가 없으면 조명/Wire/Grid 기본값을 쓰는가?
- 명시 저장과 자동 복구의 상태 라벨이 혼동되지 않는가?
- `beforeunload` 경고가 Dirty일 때만 작동하는가?

## 검증

- Node: History undo/redo, project round-trip, unrelated/future document reject.
- Browser: save → mutate → open, Brush 포함 저장/열기, reload recovery, corrupt recovery fallback, unsaved warning, Undo/Redo 후 Live Mesh/selection 일치.
