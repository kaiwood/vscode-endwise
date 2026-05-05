import * as vscode from "vscode";
import { indentationFor, shouldAddEnd } from "./endwise";

export class EndwiseOnTypeFormattingEditProvider
  implements vscode.OnTypeFormattingEditProvider
{
  provideOnTypeFormattingEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    _ch: string,
    options: vscode.FormattingOptions
  ): vscode.ProviderResult<vscode.TextEdit[]> {
    const previousLineNumber = position.line - 1;

    if (previousLineNumber < 0) {
      return;
    }

    const currentLine = document.lineAt(position.line);
    if (!currentLine.isEmptyOrWhitespace) {
      return;
    }

    const previousLineText = document.lineAt(previousLineNumber).text;
    if (
      !shouldAddEnd({
        columnNumber: previousLineText.length,
        document: documentAdapter(document),
        languageId: document.languageId,
        lineNumber: previousLineNumber,
      })
    ) {
      return;
    }

    const closingIndentation = indentationFor(previousLineText);
    const innerIndentation = closingIndentation + indentationUnit(options);
    restoreCaretAfterFormatting(
      document.uri,
      new vscode.Position(position.line, innerIndentation.length)
    );

    return [
      vscode.TextEdit.replace(
        new vscode.Range(
          position.line,
          0,
          position.line,
          currentLine.text.length
        ),
        `${innerIndentation}\n${closingIndentation}end`
      ),
    ];
  }
}

function restoreCaretAfterFormatting(uri: vscode.Uri, position: vscode.Position) {
  setTimeout(() => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    if (editor.document.uri.toString() !== uri.toString()) {
      return;
    }

    editor.selection = new vscode.Selection(position, position);
  }, 25);
}

export function documentAdapter(document: vscode.TextDocument) {
  return {
    lineCount: document.lineCount,
    lineAt: (line: number) => document.lineAt(line).text,
  };
}

function indentationUnit(options: vscode.FormattingOptions): string {
  if (!options.insertSpaces) {
    return "\t";
  }

  return " ".repeat(options.tabSize);
}
