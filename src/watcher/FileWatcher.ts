import * as vscode from "vscode";
import { IndexManager } from "../indexer/IndexManager";
import { I18nSearchConfig } from "../config/Configuration";

export class FileWatcher {
  private watchers: vscode.FileSystemWatcher[] = [];
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private indexManager: IndexManager,
    config: I18nSearchConfig
  ) {
    this.setupWatchers(config);
  }

  private setupWatchers(config: I18nSearchConfig): void {
    // Watch locale files
    for (const pattern of config.localeFilePaths) {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);

      watcher.onDidChange((uri) =>
        this.debounced(uri.fsPath, () =>
          this.indexManager.updateLocaleFile(uri)
        )
      );
      watcher.onDidCreate((uri) =>
        this.debounced(uri.fsPath, () =>
          this.indexManager.updateLocaleFile(uri)
        )
      );
      watcher.onDidDelete((uri) =>
        this.indexManager.removeLocaleFile(uri.fsPath)
      );

      this.watchers.push(watcher);
    }

    // Watch source files
    for (const pattern of config.sourceFilePaths) {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);

      watcher.onDidChange((uri) =>
        this.debounced(uri.fsPath, () =>
          this.indexManager.updateSourceFile(uri)
        )
      );
      watcher.onDidCreate((uri) =>
        this.debounced(uri.fsPath, () =>
          this.indexManager.updateSourceFile(uri)
        )
      );
      watcher.onDidDelete((uri) =>
        this.indexManager.removeSourceFile(uri.fsPath)
      );

      this.watchers.push(watcher);
    }
  }

  private debounced(key: string, fn: () => void): void {
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);
    this.debounceTimers.set(
      key,
      setTimeout(() => {
        this.debounceTimers.delete(key);
        fn();
      }, 500)
    );
  }

  dispose(): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.watchers = [];
    this.debounceTimers.clear();
  }
}
