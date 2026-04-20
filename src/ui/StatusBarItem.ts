import * as vscode from "vscode";
import { IndexManager, IndexState } from "../indexer/IndexManager";

export class StatusBarItem {
  private item: vscode.StatusBarItem;

  constructor(private indexManager: IndexManager) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.command = "i18n-search.searchByValue";
    this.update(indexManager.state);

    indexManager.onStateChange((state) => this.update(state));
    this.item.show();
  }

  private update(state: IndexState): void {
    switch (state) {
      case "idle":
        this.item.text = "$(globe) i18n Search";
        this.item.tooltip = "i18n Search: Not indexed yet";
        break;
      case "indexing":
        this.item.text = "$(sync~spin) i18n Search: Indexing...";
        this.item.tooltip = "i18n Search: Building index...";
        break;
      case "ready":
        this.item.text = `$(globe) i18n: ${this.indexManager.totalLocaleEntries} keys`;
        this.item.tooltip = "i18n Search: Click to search";
        break;
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
