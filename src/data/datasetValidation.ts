type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRank(value: unknown): boolean {
  return value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value > 0);
}

function isCategoryCutoffs(value: unknown): boolean {
  if (!isObject(value) || Object.keys(value).length === 0) return false;
  return Object.values(value).every(genderCutoff =>
    isObject(genderCutoff) &&
    Object.hasOwn(genderCutoff, 'Boys') &&
    Object.hasOwn(genderCutoff, 'Girls') &&
    isRank(genderCutoff.Boys) &&
    isRank(genderCutoff.Girls)
  );
}

/** Accept either local-area cutoffs or an explicit category-only source, with no malformed ranks. */
export function hasValidCutoffData(row: unknown): boolean {
  if (!isObject(row)) return false;
  const unscopedValid = isCategoryCutoffs(row.cutoffsByCategory);
  const localAreas = row.cutoffsByLocalArea;
  const localValid = isObject(localAreas) && Object.keys(localAreas).length > 0 &&
    Object.values(localAreas).every(isCategoryCutoffs);
  return unscopedValid || localValid;
}
