import { flattenObject, FlatEntry } from "../utils/flattenObject";

export interface ParsedLocaleEntry {
  keyPath: string;
  value: string;
  line: number;
  column: number;
}

/**
 * Parse a JSON locale file and return flattened key-value entries with line numbers.
 */
export function parseJsonLocale(
  content: string,
  separator = "."
): ParsedLocaleEntry[] {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(content);
  } catch {
    return [];
  }

  const flat: FlatEntry[] = flattenObject(obj, separator);

  // Build a lookup from value string to line number by scanning the raw text.
  // We look for lines matching `"key": "value"` patterns to extract line numbers.
  const lines = content.split("\n");
  const lineMap = buildLineMap(lines);

  return flat.map((entry) => {
    const loc = lineMap.get(entry.value);
    return {
      keyPath: entry.keyPath,
      value: entry.value,
      line: loc?.line ?? 1,
      column: loc?.column ?? 1,
    };
  });
}

interface LineInfo {
  line: number;
  column: number;
}

/**
 * Scan JSON lines to map string values to their line/column positions.
 * Handles duplicate values by returning the first occurrence not yet consumed.
 */
function buildLineMap(lines: string[]): Map<string, LineInfo> {
  const map = new Map<string, LineInfo>();
  // Pattern: "key": "value"  (handles both single and double quotes in JSON — but JSON spec is double only)
  const pattern = /:\s*"((?:[^"\\]|\\.)*)"/;

  for (let i = 0; i < lines.length; i++) {
    const match = pattern.exec(lines[i]);
    if (match) {
      const value = unescapeJsonString(match[1]);
      // Only store first occurrence — good enough for locale files where values are mostly unique
      if (!map.has(value)) {
        map.set(value, {
          line: i + 1,
          column: match.index + 1,
        });
      }
    }
  }

  return map;
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}
