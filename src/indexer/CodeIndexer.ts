import * as vscode from "vscode";
import { CodeUsage } from "./types";
import { I18nSearchConfig } from "../config/Configuration";

interface FileNamespaceMap {
  /** functionName → namespace, e.g. { t: "common", tNav: "nav" } */
  [funcName: string]: string;
}

export class CodeIndexer {
  /** fullKey (namespace:keyPath) → CodeUsage[] */
  private keyToUsages = new Map<string, CodeUsage[]>();
  /** filePath → Set<fullKey> — for incremental updates */
  private fileToKeys = new Map<string, Set<string>>();

  async buildIndex(config: I18nSearchConfig): Promise<void> {
    this.clear();

    const excludePattern =
      config.excludePatterns.length > 0
        ? `{${config.excludePatterns.join(",")}}`
        : undefined;

    const uris: vscode.Uri[] = [];
    for (const pattern of config.sourceFilePaths) {
      const found = await vscode.workspace.findFiles(pattern, excludePattern);
      uris.push(...found);
    }

    // Process in batches for performance
    const batchSize = 50;
    for (let i = 0; i < uris.length; i += batchSize) {
      const batch = uris.slice(i, i + batchSize);
      await Promise.all(batch.map((uri) => this.indexFile(uri, config)));
    }
  }

  async indexFile(uri: vscode.Uri, config: I18nSearchConfig): Promise<void> {
    const filePath = uri.fsPath;

    // Remove old entries first (incremental update)
    this.removeFile(filePath);

    let content: string;
    try {
      const raw = await vscode.workspace.fs.readFile(uri);
      content = Buffer.from(raw).toString("utf-8");
    } catch {
      return;
    }

    const lines = content.split("\n");

    // Pre-pass: detect namespace declarations (useTranslation, etc.)
    const nsMap = this.detectNamespaces(content, config);

    // Main pass: find translation function calls
    const keys = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of config.translationCallPatterns) {
        const regex = new RegExp(pattern, "g");
        let match: RegExpExecArray | null;

        while ((match = regex.exec(line)) !== null) {
          const rawKey = match[1];
          if (!rawKey) continue;

          const resolved = this.resolveFullKey(
            rawKey,
            match[0],
            line,
            nsMap,
            config
          );

          const usage: CodeUsage = {
            filePath,
            line: i + 1,
            column: match.index + 1,
            matchText: match[0],
            fullKey: resolved,
          };

          const existing = this.keyToUsages.get(resolved);
          if (existing) {
            existing.push(usage);
          } else {
            this.keyToUsages.set(resolved, [usage]);
          }

          keys.add(resolved);
        }
      }
    }

    this.fileToKeys.set(filePath, keys);
  }

  removeFile(filePath: string): void {
    const keys = this.fileToKeys.get(filePath);
    if (!keys) return;

    for (const fullKey of keys) {
      const usages = this.keyToUsages.get(fullKey);
      if (usages) {
        const filtered = usages.filter((u) => u.filePath !== filePath);
        if (filtered.length > 0) {
          this.keyToUsages.set(fullKey, filtered);
        } else {
          this.keyToUsages.delete(fullKey);
        }
      }
    }

    this.fileToKeys.delete(filePath);
  }

  getUsages(fullKey: string): CodeUsage[] {
    return this.keyToUsages.get(fullKey) ?? [];
  }

  /**
   * Get usages by searching with just the keyPath (without namespace).
   * Returns all usages across all namespaces that match the keyPath.
   */
  getUsagesByKeyPath(keyPath: string): CodeUsage[] {
    const results: CodeUsage[] = [];
    for (const [fullKey, usages] of this.keyToUsages) {
      // fullKey is "namespace:keyPath" or just "keyPath"
      const colonIdx = fullKey.indexOf(":");
      const keyPart = colonIdx >= 0 ? fullKey.slice(colonIdx + 1) : fullKey;
      if (keyPart === keyPath) {
        results.push(...usages);
      }
    }
    return results;
  }

  private clear(): void {
    this.keyToUsages.clear();
    this.fileToKeys.clear();
  }

  /**
   * Pre-pass: detect namespace declarations from useTranslation calls
   * and build a function-name → namespace mapping.
   */
  private detectNamespaces(
    content: string,
    config: I18nSearchConfig
  ): FileNamespaceMap {
    const nsMap: FileNamespaceMap = {};

    // Detect useTranslation('namespace') and destructuring aliases
    // Pattern: const { t } = useTranslation('common')
    // Pattern: const { t: tNav } = useTranslation('nav')
    for (const pattern of config.namespaceDetectionPatterns) {
      const regex = new RegExp(pattern, "g");
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        const namespace = match[1];
        if (!namespace) continue;

        // Find the surrounding destructuring to detect aliases
        const contextStart = Math.max(0, match.index - 200);
        const context = content.slice(contextStart, match.index + match[0].length + 50);

        // Look for destructuring: { t } or { t: aliasName }
        const destructureMatch = context.match(
          /\{\s*t\s*(?::\s*(\w+))?\s*(?:,\s*i18n)?\s*\}/
        );

        if (destructureMatch) {
          const alias = destructureMatch[1] || "t";
          nsMap[alias] = namespace;
        } else {
          // Default: associate 't' with this namespace
          nsMap["t"] = namespace;
        }
      }
    }

    return nsMap;
  }

  /**
   * Resolve a raw key from a t() call to a full qualified key (namespace:keyPath).
   */
  private resolveFullKey(
    rawKey: string,
    matchText: string,
    _line: string,
    nsMap: FileNamespaceMap,
    config: I18nSearchConfig
  ): string {
    const sep = config.namespaceSeparator;

    // Case 1: Key already contains namespace separator (e.g., "common:login.title")
    if (rawKey.includes(sep)) {
      return rawKey;
    }

    // Case 2: Try to determine which function called this
    // Extract function name from the match: e.g. "t(" -> "t", "tNav(" -> "tNav"
    const funcMatch = matchText.match(/(\w+)\s*\(/);
    const funcName = funcMatch?.[1] ?? "t";

    // Case 3: Look up namespace from the file-level map
    const namespace = nsMap[funcName];
    if (namespace) {
      return `${namespace}${sep}${rawKey}`;
    }

    // Case 4: No namespace resolved — store with wildcard
    return `*${sep}${rawKey}`;
  }
}
