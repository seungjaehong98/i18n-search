import * as vscode from "vscode";
import { IndexManager } from "./indexer/IndexManager";
import { SearchEngine } from "./search/SearchEngine";
import { SearchQuickPick } from "./ui/SearchQuickPick";
import { StatusBarItem } from "./ui/StatusBarItem";
import { ResultsTreeViewProvider } from "./ui/ResultsTreeView";
import { FileWatcher } from "./watcher/FileWatcher";
import { getConfig } from "./config/Configuration";

let indexManager: IndexManager;
let fileWatcher: FileWatcher;
let statusBarItem: StatusBarItem;
let treeViewProvider: ResultsTreeViewProvider;

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  indexManager = new IndexManager();
  const searchEngine = new SearchEngine(indexManager);
  const searchQuickPick = new SearchQuickPick(searchEngine);

  // Status bar
  statusBarItem = new StatusBarItem(indexManager);
  context.subscriptions.push(statusBarItem);

  // Tree view
  treeViewProvider = new ResultsTreeViewProvider();
  const treeView = vscode.window.createTreeView("i18nSearchResults", {
    treeDataProvider: treeViewProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("i18n-search.searchByValue", async () => {
      if (indexManager.state !== "ready") {
        const choice = await vscode.window.showWarningMessage(
          "i18n Search index is not ready. Build index now?",
          "Build Index",
          "Cancel"
        );
        if (choice === "Build Index") {
          await indexManager.buildFullIndex();
        } else {
          return;
        }
      }
      await searchQuickPick.showSearchByValue();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("i18n-search.searchByKey", async () => {
      if (indexManager.state !== "ready") {
        const choice = await vscode.window.showWarningMessage(
          "i18n Search index is not ready. Build index now?",
          "Build Index",
          "Cancel"
        );
        if (choice === "Build Index") {
          await indexManager.buildFullIndex();
        } else {
          return;
        }
      }
      await searchQuickPick.showSearchByKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("i18n-search.reindex", async () => {
      await indexManager.buildFullIndex();
      vscode.window.showInformationMessage(
        `i18n Search: Indexed ${indexManager.totalLocaleEntries} locale entries.`
      );
    })
  );

  // File watcher
  const config = getConfig();
  fileWatcher = new FileWatcher(indexManager, config);
  context.subscriptions.push(fileWatcher);

  // Re-setup watcher on config change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("i18nSearch")) {
        fileWatcher.dispose();
        const newConfig = getConfig();
        fileWatcher = new FileWatcher(indexManager, newConfig);
        // Re-index with new config
        indexManager.buildFullIndex();
      }
    })
  );

  // Cleanup
  context.subscriptions.push({
    dispose() {
      indexManager.dispose();
      fileWatcher.dispose();
      treeViewProvider.dispose();
    },
  });

  // Build index on startup
  await indexManager.buildFullIndex();
}

export function deactivate(): void {
  // Cleanup handled by subscriptions
}
