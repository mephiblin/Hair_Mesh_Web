export const DEFAULT_VIEWPORT_SETTINGS = Object.freeze({
  background: '#101317',
  cameraFov: 45,
  orthographicStandardViews: true
});

export function normalizeViewportBackground(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : DEFAULT_VIEWPORT_SETTINGS.background;
}

export function normalizeCameraFov(value) {
  const parsed = Number(value);
  const finite = Number.isFinite(parsed) ? parsed : DEFAULT_VIEWPORT_SETTINGS.cameraFov;
  return Math.min(120, Math.max(15, finite));
}

export function normalizeViewportSettings(settings = {}) {
  return {
    background: normalizeViewportBackground(settings.background),
    cameraFov: normalizeCameraFov(settings.cameraFov),
    orthographicStandardViews: settings.orthographicStandardViews !== false
  };
}

export function standardViewProjection(viewName, orthographicStandardViews = true) {
  return viewName === 'perspective' || !orthographicStandardViews ? 'perspective' : 'orthographic';
}

export function matchedOrthographicHeight(distance, cameraFov) {
  const safeDistance = Math.max(0.0001, Number.isFinite(Number(distance)) ? Number(distance) : 1);
  return 2 * safeDistance * Math.tan(normalizeCameraFov(cameraFov) * Math.PI / 360);
}
