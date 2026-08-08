export const DEFAULT_DIRECTIONAL_LIGHT = Object.freeze({
  azimuth: 37,
  elevation: 45,
  intensity: 2.2,
  fillIntensity: 2.2,
  distance: Math.sqrt(50)
});

function finiteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeDirectionalLightSettings(settings = {}) {
  return {
    azimuth: clamp(finiteNumber(settings.azimuth, DEFAULT_DIRECTIONAL_LIGHT.azimuth), -180, 180),
    elevation: clamp(finiteNumber(settings.elevation, DEFAULT_DIRECTIONAL_LIGHT.elevation), -89, 89),
    intensity: clamp(finiteNumber(settings.intensity, DEFAULT_DIRECTIONAL_LIGHT.intensity), 0, 20),
    fillIntensity: clamp(finiteNumber(settings.fillIntensity, DEFAULT_DIRECTIONAL_LIGHT.fillIntensity), 0, 20),
    distance: Math.max(0.001, finiteNumber(settings.distance, DEFAULT_DIRECTIONAL_LIGHT.distance))
  };
}

export function directionalLightPosition(settings = {}) {
  const normalized = normalizeDirectionalLightSettings(settings);
  const azimuth = normalized.azimuth * Math.PI / 180;
  const elevation = normalized.elevation * Math.PI / 180;
  const horizontal = Math.cos(elevation) * normalized.distance;
  return {
    x: Math.sin(azimuth) * horizontal,
    y: Math.sin(elevation) * normalized.distance,
    z: Math.cos(azimuth) * horizontal
  };
}
