export interface FlatEntry {
  keyPath: string;
  value: string;
}

/**
 * Flatten a nested object into dot-notation key-value pairs.
 * Handles both nested and already-flat structures.
 */
export function flattenObject(
  obj: Record<string, unknown>,
  separator = ".",
  prefix = ""
): FlatEntry[] {
  const entries: FlatEntry[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}${separator}${key}` : key;
    const val = obj[key];

    if (typeof val === "string") {
      entries.push({ keyPath: fullKey, value: val });
    } else if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      entries.push(
        ...flattenObject(val as Record<string, unknown>, separator, fullKey)
      );
    }
    // skip arrays, numbers, booleans, nulls — not translatable values
  }

  return entries;
}
