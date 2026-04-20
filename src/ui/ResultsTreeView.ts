import * as vscode from "vscode";
import * as path from "path";
import { SearchResult, CodeUsage } from "../indexer/types";

type TreeItem = ResultGroupItem | CodeUsageItem;

class ResultGroupItem extends vscode.TreeItem {
  constructor(public readonly result: SearchResult) {
    const { localeEntry, codeUsages } = result;
    super(
      localeEntry.value,
      codeUsages.length > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );
    this.description = `${localeEntry.fullKey} [${localeEntry.language}]`;
    this.tooltip = `${localeEntry.value}\n\nKey: ${localeEntry.fullKey}\nUsages: ${codeUsages.length}`;
    this.iconPath = new vscode.ThemeIcon("symbol-string");
  }
}

class CodeUsageItem extends vscode.TreeItem {
  constructor(public readonly usage: CodeUsage) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const relativePath = workspaceFolder
      ? path.relative(workspaceFolder.uri.fsPath, usage.filePath)
      : usage.filePath;

    super(relativePath, vscode.TreeItemCollapsibleState.None);
    this.description = `Line ${usage.line}`;
    this.tooltip = usage.matchText;
    this.iconPath = new vscode.ThemeIcon("file-code");

    this.command = {
      command: "vscode.open",
      title: "Open File",
      arguments: [
        vscode.Uri.file(usage.filePath),
        {
          selection: new vscode.Range(
            new vscode.Position(usage.line - 1, usage.column - 1),
            new vscode.Position(usage.line - 1, usage.column - 1)
          ),
        },
      ],
    };
  }
}

export class ResultsTreeViewProvider
  implements vscode.TreeDataProvider<TreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private results: SearchResult[] = [];

  setResults(results: SearchResult[]): void {
    this.results = results;
    vscode.commands.executeCommand(
      "setContext",
      "i18nSearch.hasResults",
      results.length > 0
    );
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): TreeItem[] {
    if (!element) {
      return this.results.map((r) => new ResultGroupItem(r));
    }

    if (element instanceof ResultGroupItem) {
      return element.result.codeUsages.map((u) => new CodeUsageItem(u));
    }

    return [];
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
