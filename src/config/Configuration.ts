import * as vscode from "vscode";

const SECTION = "i18nSearch";

export interface I18nSearchConfig {
  localeFilePaths: string[];
  sourceFilePaths: string[];
  excludePatterns: string[];
  translationCallPatterns: string[];
  namespaceDetectionPatterns: string[];
  namespaceSeparator: string;
  keyPathSeparator: string;
  primaryLanguage: string;
  searchMode: "contains" | "fuzzy" | "exact";
  maxSearchResults: number;
}

export function getConfig(): I18nSearchConfig {
  const cfg = vscode.workspace.getConfiguration(SECTION);

  return {
    localeFilePaths: cfg.get<string[]>("localeFilePaths", [
      "**/locales/**/*.json",
      "**/locales/**/*.yml",
      "**/locales/**/*.yaml",
    ]),
    sourceFilePaths: cfg.get<string[]>("sourceFilePaths", [
      "**/*.{ts,tsx,js,jsx,vue,svelte}",
    ]),
    excludePatterns: cfg.get<string[]>("excludePatterns", [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
    ]),
    translationCallPatterns: cfg.get<string[]>("translationCallPatterns", [
      "\\bt\\s*\\(\\s*['\"]([^'\"]+)['\"]",
      "\\bi18next\\.t\\s*\\(\\s*['\"]([^'\"]+)['\"]",
      "\\bi18n\\.t\\s*\\(\\s*['\"]([^'\"]+)['\"]",
      "\\$t\\s*\\(\\s*['\"]([^'\"]+)['\"]",
    ]),
    namespaceDetectionPatterns: cfg.get<string[]>(
      "namespaceDetectionPatterns",
      [
        "useTranslation\\s*\\(\\s*['\"]([^'\"]+)['\"]",
        "getFixedT\\s*\\(\\s*[^,]+,\\s*['\"]([^'\"]+)['\"]",
      ]
    ),
    namespaceSeparator: cfg.get<string>("namespaceSeparator", ":"),
    keyPathSeparator: cfg.get<string>("keyPathSeparator", "."),
    primaryLanguage: cfg.get<string>("primaryLanguage", ""),
    searchMode: cfg.get<"contains" | "fuzzy" | "exact">(
      "searchMode",
      "contains"
    ),
    maxSearchResults: cfg.get<number>("maxSearchResults", 50),
  };
}
