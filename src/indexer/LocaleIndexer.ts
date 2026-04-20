import * as vscode from "vscode";
import * as path from "path";
import { parseLocaleFile } from "../parsers/parserFactory";
import { LocaleEntry } from "./types";
import { I18nSearchConfig } from "../config/Configuration";

export class LocaleIndexer {
  /** value (lowercased) → LocaleEntry[] */
  private valueToEntries = new Map<string, LocaleEntry[]>();
  /** fullKey (namespace:keyPath) → LocaleEntry[] (across languages) */
  private keyToEntries = new Map<string, LocaleEntry[]>();
  /** filePath → Set<fullKey> — for incremental updates */
  private fileToKeys = new Map<string, Set<string>>();

  get totalEntries(): number {
    let count = 0;
    for (const entries of this.keyToEntries.values()) {
      count += entries.length;
    }
    return count;
  }

  async buildIndex(config: I18nSearchConfig): Promise<void> {
    this.clear();

    const excludePattern =
      config.excludePatterns.length > 0
        ? `{${config.excludePatterns.join(",")}}`
        : undefined;

    const uris: vscode.Uri[] = [];
    for (const pattern of config.localeFilePaths) {
      const found = await vscode.workspace.findFiles(pattern, excludePattern);
      uris.push(...found);
    }

    for (const uri of uris) {
      await this.indexFile(uri, config);
    }
  }

  async indexFile(uri: vscode.Uri, config: I18nSearchConfig): Promise<void> {
    const filePath = uri.fsPath;

    // Remove old entries for this file first (incremental update)
    this.removeFile(filePath);

    let content: string;
    try {
      const raw = await vscode.workspace.fs.readFile(uri);
      content = Buffer.from(raw).toString("utf-8");
    } catch {
      return;
    }

    const namespace = this.extractNamespace(filePath);
    const language = this.extractLanguage(filePath, config);
    const parsed = parseLocaleFile(filePath, content, config.keyPathSeparator);

    const keys = new Set<string>();

    for (const entry of parsed) {
      const fullKey = `${namespace}:${entry.keyPath}`;
      const localeEntry: LocaleEntry = {
        namespace,
        keyPath: entry.keyPath,
        fullKey,
        value: entry.value,
        language,
        filePath,
        line: entry.line,
      };

      // valueToEntries
      const lowerVal = entry.value.toLowerCase();
      const existing = this.valueToEntries.get(lowerVal);
      if (existing) {
        existing.push(localeEntry);
      } else {
        this.valueToEntries.set(lowerVal, [localeEntry]);
      }

      // keyToEntries
      const keyEntries = this.keyToEntries.get(fullKey);
      if (keyEntries) {
        keyEntries.push(localeEntry);
      } else {
        this.keyToEntries.set(fullKey, [localeEntry]);
      }

      keys.add(fullKey);
    }

    this.fileToKeys.set(filePath, keys);
  }

  removeFile(filePath: string): void {
    const keys = this.fileToKeys.get(filePath);
    if (!keys) {
      return;
    }

    for (const fullKey of keys) {
      // Remove from keyToEntries
      const keyEntries = this.keyToEntries.get(fullKey);
      if (keyEntries) {
        const filtered = keyEntries.filter((e) => e.filePath !== filePath);
        if (filtered.length > 0) {
          this.keyToEntries.set(fullKey, filtered);
        } else {
          this.keyToEntries.delete(fullKey);
        }
      }
    }

    // Rebuild valueToEntries (simpler than tracking per-value per-file)
    this.rebuildValueIndex();
    this.fileToKeys.delete(filePath);
  }

  /**
   * Search for locale entries whose value contains the query (case-insensitive).
   */
  searchByValue(
    query: string,
    config: I18nSearchConfig
  ): LocaleEntry[] {
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: LocaleEntry[] = [];
    const seen = new Set<string>();

    for (const [lowerVal, entries] of this.valueToEntries) {
      if (!lowerVal.includes(lowerQuery)) {
        continue;
      }

      for (const entry of entries) {
        // Filter by primary language if set
        if (
          config.primaryLanguage &&
          entry.language !== config.primaryLanguage
        ) {
          continue;
        }

        // Deduplicate by fullKey + language
        const dedup = `${entry.fullKey}:${entry.language}`;
        if (seen.has(dedup)) {
          continue;
        }
        seen.add(dedup);
        results.push(entry);
      }

      if (results.length >= config.maxSearchResults) {
        break;
      }
    }

    // Sort: exact match first, then starts-with, then contains
    return results.sort((a, b) => {
      const aLower = a.value.toLowerCase();
      const bLower = b.value.toLowerCase();
      const aExact = aLower === lowerQuery;
      const bExact = bLower === lowerQuery;
      if (aExact !== bExact) return aExact ? -1 : 1;
      const aStarts = aLower.startsWith(lowerQuery);
      const bStarts = bLower.startsWith(lowerQuery);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return a.value.length - b.value.length;
    });
  }

  /**
   * Search for locale entries whose key contains the query.
   */
  searchByKey(query: string, config: I18nSearchConfig): LocaleEntry[] {
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: LocaleEntry[] = [];

    for (const [fullKey, entries] of this.keyToEntries) {
      if (!fullKey.toLowerCase().includes(lowerQuery)) {
        continue;
      }

      for (const entry of entries) {
        if (
          config.primaryLanguage &&
          entry.language !== config.primaryLanguage
        ) {
          continue;
        }
        results.push(entry);
      }

      if (results.length >= config.maxSearchResults) {
        break;
      }
    }

    return results;
  }

  getEntriesByKey(fullKey: string): LocaleEntry[] {
    return this.keyToEntries.get(fullKey) ?? [];
  }

  private clear(): void {
    this.valueToEntries.clear();
    this.keyToEntries.clear();
    this.fileToKeys.clear();
  }

  private rebuildValueIndex(): void {
    this.valueToEntries.clear();
    for (const entries of this.keyToEntries.values()) {
      for (const entry of entries) {
        const lowerVal = entry.value.toLowerCase();
        const existing = this.valueToEntries.get(lowerVal);
        if (existing) {
          existing.push(entry);
        } else {
          this.valueToEntries.set(lowerVal, [entry]);
        }
      }
    }
  }

  private extractNamespace(filePath: string): string {
    // Derive namespace from filename without extension
    // e.g., "/locales/ko/auth.json" → "auth"
    return path.basename(filePath, path.extname(filePath));
  }

  private extractLanguage(filePath: string, _config: I18nSearchConfig): string {
    // Try to extract language from parent directory name
    // e.g., "/locales/ko/auth.json" → "ko"
    const dir = path.basename(path.dirname(filePath));
    // Common language codes: 2-letter (en, ko, ja) or locale codes (en-US, zh-CN)
    if (/^[a-z]{2}(-[A-Z]{2})?$/.test(dir)) {
      return dir;
    }
    return "unknown";
  }
}
