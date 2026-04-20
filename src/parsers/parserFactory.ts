import { parseJsonLocale, ParsedLocaleEntry } from "./jsonParser";
import { parseYamlLocale } from "./yamlParser";
import * as path from "path";

export function parseLocaleFile(
  filePath: string,
  content: string,
  separator = "."
): ParsedLocaleEntry[] {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".json":
      return parseJsonLocale(content, separator);
    case ".yml":
    case ".yaml":
      return parseYamlLocale(content, separator);
    default:
      return [];
  }
}
