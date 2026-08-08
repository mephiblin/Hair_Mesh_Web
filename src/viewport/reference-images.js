export const REFERENCE_IMAGE_VIEWS = Object.freeze(['front', 'left', 'back']);

const DEFAULT_VIEW = Object.freeze({
  visible: true,
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  mirror: false,
  backfaceCulling: true,
  transform: null,
  fileName: ''
});

export const DEFAULT_REFERENCE_IMAGE_SETTINGS = Object.freeze({
  opacity: 0.45,
  layer: 'behind',
  frame: Object.freeze({ center: Object.freeze([0, 0, 0]), size: Object.freeze([2, 2, 2]) }),
  views: Object.freeze({
    front: DEFAULT_VIEW,
    left: DEFAULT_VIEW,
    back: DEFAULT_VIEW
  })
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeVector(value, fallback, { positive = false } = {}) {
  if (!Array.isArray(value) || value.length < 3) return [...fallback];
  return value.slice(0, 3).map((component, index) => {
    const normalized = finiteNumber(component, fallback[index]);
    return positive ? Math.max(Math.abs(normalized), 0.0001) : normalized;
  });
}

function normalizePlaneTransform(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    position: normalizeVector(value.position, [0, 0, 0]),
    rotation: normalizeVector(value.rotation, [0, 0, 0]),
    scale: normalizeVector(value.scale, [1, 1, 1], { positive:true }).map((component, index) => index === 2 ? 1 : clamp(component, 0.0001, 100000))
  };
}

export function normalizeReferenceImageView(value = {}) {
  return {
    visible: value.visible !== false,
    scaleX: clamp(finiteNumber(value.scaleX, DEFAULT_VIEW.scaleX), 0.01, 20),
    scaleY: clamp(finiteNumber(value.scaleY, DEFAULT_VIEW.scaleY), 0.01, 20),
    offsetX: clamp(finiteNumber(value.offsetX, DEFAULT_VIEW.offsetX), -10, 10),
    offsetY: clamp(finiteNumber(value.offsetY, DEFAULT_VIEW.offsetY), -10, 10),
    rotation: clamp(finiteNumber(value.rotation, DEFAULT_VIEW.rotation), -180, 180),
    mirror: value.mirror === true,
    backfaceCulling: value.backfaceCulling !== false,
    transform: normalizePlaneTransform(value.transform),
    fileName: typeof value.fileName === 'string' ? value.fileName.slice(0, 512) : ''
  };
}

export function normalizeReferenceImageSettings(value = {}) {
  const sourceViews = value?.views && typeof value.views === 'object' ? value.views : {};
  const views = {};
  for (const viewName of REFERENCE_IMAGE_VIEWS) {
    views[viewName] = normalizeReferenceImageView(sourceViews[viewName]);
  }
  return {
    opacity: clamp(finiteNumber(value.opacity, DEFAULT_REFERENCE_IMAGE_SETTINGS.opacity), 0, 1),
    layer: value.layer === 'overlay' ? 'overlay' : 'behind',
    frame: {
      center: normalizeVector(value?.frame?.center, DEFAULT_REFERENCE_IMAGE_SETTINGS.frame.center),
      size: normalizeVector(value?.frame?.size, DEFAULT_REFERENCE_IMAGE_SETTINGS.frame.size, { positive:true })
    },
    views
  };
}

export function referenceImagePlaneLayout(viewName, settings, imageAspect = 1) {
  if (!REFERENCE_IMAGE_VIEWS.includes(viewName)) throw new Error(`지원하지 않는 Reference Image view: ${viewName}`);
  const normalized = normalizeReferenceImageSettings(settings);
  const view = normalized.views[viewName];
  const center = [...normalized.frame.center];
  const size = normalized.frame.size;
  const frameHeight = Math.max(size[1], 0.0001);
  const aspect = clamp(finiteNumber(imageAspect, 1), 0.01, 100);
  const depthPadding = Math.max(frameHeight * 0.002, 0.0001);
  const horizontalOffset = view.offsetX * frameHeight * 0.5;
  const verticalOffset = view.offsetY * frameHeight * 0.5;
  let baseRotationY = 0;

  center[1] += verticalOffset;
  if (viewName === 'front') {
    center[0] += horizontalOffset;
    center[2] -= size[2] * 0.5 + depthPadding;
  } else if (viewName === 'left') {
    center[0] += size[0] * 0.5 + depthPadding;
    center[2] += horizontalOffset;
    baseRotationY = -Math.PI * 0.5;
  } else {
    center[0] -= horizontalOffset;
    center[2] += size[2] * 0.5 + depthPadding;
    baseRotationY = Math.PI;
  }

  return {
    position: center,
    width: frameHeight * aspect * view.scaleX,
    height: frameHeight * view.scaleY,
    baseRotationY,
    rollRadians: view.rotation * Math.PI / 180,
    mirror: view.mirror,
    backfaceCulling: view.backfaceCulling,
    transform: view.transform,
    opacity: normalized.opacity,
    layer: normalized.layer,
    visible: view.visible
  };
}
