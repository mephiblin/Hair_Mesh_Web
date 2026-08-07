export const PROJECT_FORMAT = 'hair-mesh-web-project';
export const PROJECT_VERSION = 1;

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} 형식이 올바르지 않습니다.`);
  }
}

export function createProjectDocument(appState, metadata = {}) {
  assertObject(appState, '프로젝트 상태');
  if (!Array.isArray(appState.curves)) throw new Error('프로젝트 Curve 목록이 없습니다.');
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    metadata: { generator: 'Curve Mesh Hair Tool v4', ...metadata },
    appState
  };
}

export function parseProjectDocument(source) {
  let document;
  try {
    document = typeof source === 'string' ? JSON.parse(source) : source;
  } catch {
    throw new Error('프로젝트 JSON을 읽을 수 없습니다.');
  }
  assertObject(document, '프로젝트');
  if (document.format !== PROJECT_FORMAT) throw new Error('Hair Mesh Web 프로젝트 파일이 아닙니다.');
  if (!Number.isInteger(document.version) || document.version < 1) throw new Error('프로젝트 버전이 올바르지 않습니다.');
  if (document.version > PROJECT_VERSION) throw new Error(`더 새로운 프로젝트 버전입니다. 지원 버전: ${PROJECT_VERSION}`);
  assertObject(document.appState, '프로젝트 상태');
  if (!Array.isArray(document.appState.curves)) throw new Error('프로젝트 Curve 목록이 없습니다.');
  return document;
}

export function serializeProjectDocument(document) {
  return `${JSON.stringify(parseProjectDocument(document), null, 2)}\n`;
}
