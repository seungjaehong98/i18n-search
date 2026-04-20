import * as vscode from "vscode";
import { LocaleIndexer } from "./LocaleIndexer";
import { CodeIndexer } from "./CodeIndexer";
import { SearchResult, CodeUsage, LocaleEntry } from "./types";
import { I18nSearchConfig, getConfig } from "../config/Configuration";

export type IndexState = "idle" | "indexing" | "ready";

export class IndexManager {
  private localeIndexer = new LocaleIndexer();
  private codeIndexer = new CodeIndexer();
  private _state: IndexState = "idle";
  private _onStateChange = new vscode.EventEmitter<IndexState>();
  readonly onStateChange = this._onStateChange.event;

  get state(): IndexState {
    return this._state;
  }

  get totalLocaleEntries(): number {
    return this.localeIndexer.totalEntries;
  }

  async buildFullIndex(): Promise<void> {
    const config = getConfig();
    this.setState("indexing");

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: "i18n Search: Indexing...",
        },
        async (progress) => {
          progress.report({ message: "Scanning locale files..." });
          await this.localeIndexer.buildIndex(config);

          progress.report({ message: "Scanning source files..." });
          await this.codeIndexer.buildIndex(config);
        }
      );

      this.setState("ready");
    } catch (e) {
      console.error("[i18n-search] Indexing failed:", e);
      this.setState("idle");
    }
  }

  async updateLocaleFile(uri: vscode.Uri): Promise<void> {
    const config = getConfig();
    await this.localeIndexer.indexFile(uri, config);
  }

  async updateSourceFile(uri: vscode.Uri): Promise<void> {
    const config = getConfig();
    await this.codeIndexer.indexFile(uri, config);
  }

  removeLocaleFile(filePath: string): void {
    this.localeIndexer.removeFile(filePath);
  }

  removeSourceFile(filePath: string): void {
    this.codeIndexer.removeFile(filePath);
  }

  searchByValue(query: string): SearchResult[] {
    const config = getConfig();
    const localeEntries = this.localeIndexer.searchByValue(query, config);
    return this.attachCodeUsages(localeEntries);
  }

  searchByKey(query: string): SearchResult[] {
    const config = getConfig();
    const localeEntries = this.localeIndexer.searchByKey(query, config);
    return this.attachCodeUsages(localeEntries);
  }

  private attachCodeUsages(localeEntries: LocaleEntry[]): SearchResult[] {
    return localeEntries.map((entry) => {
      // Try exact fullKey match first
      let usages: CodeUsage[] = this.codeIndexer.getUsages(entry.fullKey);

      // If no usages found, try wildcard namespace match
      if (usages.length === 0) {
        const wildcardKey = `*:${entry.keyPath}`;
        usages = this.codeIndexer.getUsages(wildcardKey);
      }

      // If still no usages, try searching by keyPath alone
      if (usages.length === 0) {
        usages = this.codeIndexer.getUsagesByKeyPath(entry.keyPath);
      }

      return { localeEntry: entry, codeUsages: usages };
    });
  }

  private setState(state: IndexState): void {
    this._state = state;
    this._onStateChange.fire(state);
  }

  dispose(): void {
    this._onStateChange.dispose();
  }
}
