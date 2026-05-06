import * as vscode from "vscode";

export function documentAdapter(document: vscode.TextDocument) {
  return {
    lineCount: document.lineCount,
    lineAt: (line: number) => document.lineAt(line).text,
  };
}
