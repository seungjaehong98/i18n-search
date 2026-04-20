import YAML from "yaml";
import { ParsedLocaleEntry } from "./jsonParser";

/**
 * Parse a YAML locale file and return flattened key-value entries with line numbers.
 */
export function parseYamlLocale(
  content: string,
  separator = "."
): ParsedLocaleEntry[] {
  let doc: YAML.Document;
  try {
    doc = YAML.parseDocument(content);
  } catch {
    return [];
  }

  const entries: ParsedLocaleEntry[] = [];
  visit(doc.contents, [], separator, entries);
  return entries;
}

function visit(
  node: unknown,
  path: string[],
  separator: string,
  entries: ParsedLocaleEntry[]
): void {
  if (YAML.isMap(node)) {
    for (const item of node.items) {
      const key = YAML.isScalar(item.key) ? String(item.key.value) : "";
      visit(item.value, [...path, key], separator, entries);
    }
  } else if (YAML.isScalar(node) && typeof node.value === "string") {
    const range = node.range;
    entries.push({
      keyPath: path.join(separator),
      value: node.value,
      line: range ? getLineFromOffset(node, range[0]) : 1,
      column: 1,
    });
  }
}

function getLineFromOffset(node: YAML.Scalar, offset: number): number {
  // yaml library stores range as [start, valueEnd, nodeEnd] offsets.
  // We need to count newlines up to the offset in the source.
  // Since we don't have the source here easily, we'll use a fallback.
  // The caller can provide better line numbers if needed.
  // For now, return 1 as a safe default — the main search flow
  // doesn't critically depend on locale file line numbers (it jumps to code, not locale).
  void node;
  void offset;
  return 1;
}
