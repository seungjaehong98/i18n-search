export interface LocaleEntry {
  /** Namespace derived from filename, e.g. "auth" */
  namespace: string;
  /** Dot-notation key path within the file, e.g. "login.title" */
  keyPath: string;
  /** The full qualified key: namespace:keyPath */
  fullKey: string;
  /** The locale value / translated string */
  value: string;
  /** Language code, e.g. "ko", "en" */
  language: string;
  /** Absolute path to the locale file */
  filePath: string;
  /** Line number in the locale file (1-based) */
  line: number;
}

export interface CodeUsage {
  /** Absolute path to the source file */
  filePath: string;
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column: number;
  /** The matched text snippet, e.g. `t('login.title')` */
  matchText: string;
  /** The full qualified key resolved from this usage */
  fullKey: string;
}

export interface SearchResult {
  /** The matching locale entry */
  localeEntry: LocaleEntry;
  /** Code locations using this key */
  codeUsages: CodeUsage[];
}
