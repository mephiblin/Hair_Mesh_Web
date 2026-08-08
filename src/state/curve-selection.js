function validIdSet(validIds) {
  return new Set([...validIds || []].map(Number).filter(Number.isInteger));
}

export function normalizeCurveSelection(ids, validIds, fallbackId = null) {
  const valid = validIdSet(validIds);
  const normalized = new Set();
  for (const value of ids || []) {
    const id = Number(value);
    if (Number.isInteger(id) && valid.has(id)) normalized.add(id);
  }
  const fallback = Number(fallbackId);
  if (!normalized.size && Number.isInteger(fallback) && valid.has(fallback)) normalized.add(fallback);
  return normalized;
}

export function toggleCurveSelection(selection, curveId, validIds) {
  const normalized = normalizeCurveSelection(selection, validIds);
  const id = Number(curveId);
  if (!Number.isInteger(id) || !validIdSet(validIds).has(id)) return normalized;
  if (normalized.has(id)) normalized.delete(id);
  else normalized.add(id);
  return normalized;
}

export function selectedCurveIds(selection, validIds, fallbackId = null) {
  return [...normalizeCurveSelection(selection, validIds, fallbackId)];
}

export function activeCurveId(selection, preferredId = null) {
  const ids = [...selection || []].map(Number).filter(Number.isInteger);
  const preferred = Number(preferredId);
  if (Number.isInteger(preferred) && ids.includes(preferred)) return preferred;
  return ids.at(-1) ?? null;
}
