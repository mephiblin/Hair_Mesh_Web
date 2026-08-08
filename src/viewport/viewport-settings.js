export const DEFAULT_VIEWPORT_SETTINGS = Object.freeze({
  background: '#101317',
  cameraFov: 45
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
    cameraFov: normalizeCameraFov(settings.cameraFov)
  };
}
