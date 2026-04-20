import * as vscode from "vscode";
import * as path from "path";
import { SearchEngine } from "../search/SearchEngine";
import { SearchResult, CodeUsage } from "../indexer/types";

interface I18nQuickPickItem extends vscode.QuickPickItem {
  result: SearchResult;
}

interface CodeUsageQuickPickItem extends vscode.QuickPickItem {
  usage: CodeUsage;
}

export class SearchQuickPick {
  constructor(private searchEngine: SearchEngine) {}

  async showSearchByValue(): Promise<void> {
    const quickPick = vscode.window.createQuickPick<I18nQuickPickItem>();
    quickPick.placeholder = "Type a locale value to search... (e.g., 비밀번호를 입력)";
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    quickPick.onDidChangeValue((query) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!query.trim()) {
          quickPick.items = [];
          return;
        }
        const results = this.searchEngine.searchByValue(query);
        quickPick.items = results.map((r) => this.toQuickPickItem(r));
      }, 150);
    });

    quickPick.onDidAccept(async () => {
      const selected = quickPick.selectedItems[0];
      if (!selected) return;
      quickPick.dispose();
      await this.handleSelection(selected.result);
    });

    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();
  }

  async showSearchByKey(): Promise<void> {
    const quickPick = vscode.window.createQuickPick<I18nQuickPickItem>();
    quickPick.placeholder = "Type a locale key to search... (e.g., login.title)";
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    quickPick.onDidChangeValue((query) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!query.trim()) {
          quickPick.items = [];
          return;
        }
        const results = this.searchEngine.searchByKey(query);
        quickPick.items = results.map((r) => this.toQuickPickItem(r));
      }, 150);
    });

    quickPick.onDidAccept(async () => {
      const selected = quickPick.selectedItems[0];
      if (!selected) return;
      quickPick.dispose();
      await this.handleSelection(selected.result);
    });

    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();
  }

  private toQuickPickItem(result: SearchResult): I18nQuickPickItem {
    const { localeEntry, codeUsages } = result;
    const usageCount = codeUsages.length;
    const usageText =
      usageCount === 0
        ? "$(warning) No usages found"
        : usageCount === 1
          ? "$(file-code) 1 usage in code"
          : `$(file-code) ${usageCount} usages in code`;

    return {
      label: localeEntry.value,
      description: `${localeEntry.fullKey} [${localeEntry.language}]`,
      detail: usageText,
      result,
    };
  }

  private async handleSelection(result: SearchResult): Promise<void> {
    const { codeUsages, localeEntry } = result;

    if (codeUsages.length === 0) {
      // No code usages — navigate to the locale file instead
      const choice = await vscode.window.showInformationMessage(
        `No code usages found for "${localeEntry.fullKey}". Open locale file?`,
        "Open Locale File",
        "Cancel"
      );
      if (choice === "Open Locale File") {
        await this.navigateToFile(localeEntry.filePath, localeEntry.line);
      }
      return;
    }

    if (codeUsages.length === 1) {
      // Single usage — navigate directly
      await this.navigateToFile(codeUsages[0].filePath, codeUsages[0].line, codeUsages[0].column);
      return;
    }

    // Multiple usages — show secondary picker
    await this.showUsagePicker(codeUsages, localeEntry.fullKey);
  }

  private async showUsagePicker(
    usages: CodeUsage[],
    fullKey: string
  ): Promise<void> {
    const items: CodeUsageQuickPickItem[] = usages.map((usage) => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const relativePath = workspaceFolder
        ? path.relative(workspaceFolder.uri.fsPath, usage.filePath)
        : usage.filePath;

      return {
        label: `$(file-code) ${relativePath}`,
        description: `Line ${usage.line}`,
        detail: usage.matchText,
        usage,
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Select code location for "${fullKey}" (${usages.length} usages)`,
    });

    if (selected) {
      await this.navigateToFile(
        selected.usage.filePath,
        selected.usage.line,
        selected.usage.column
      );
    }
  }

  private async navigateToFile(
    filePath: string,
    line: number,
    column = 1
  ): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc);
    const position = new vscode.Position(line - 1, column - 1);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.InCenter
    );
  }
}
