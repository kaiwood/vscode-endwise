/*
 Copyright (c) 2021 Kai Wood <kwood@kwd.io>

 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
*/

"use strict";
import * as vscode from "vscode";
import { indentationFor, shouldAddEnd } from "./endwise";
import { documentAdapter, SUPPORTED_LANGUAGES } from "./formatter";

let applyingEndwiseEdit = false;

/**
 * Activate plugin commands
 */
export function activate(context: vscode.ExtensionContext) {
  const cmdEnter = vscode.commands.registerCommand(
    "endwise.cmdEnter",
    async () => {
      await endwiseModifierEnter();
    }
  );

  const documentChange = vscode.workspace.onDidChangeTextDocument((event) =>
    handleDocumentChange(event)
  );

  context.subscriptions.push(cmdEnter);
  context.subscriptions.push(documentChange);
}

async function handleDocumentChange(event: vscode.TextDocumentChangeEvent) {
  if (applyingEndwiseEdit) {
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.uri.toString() !== event.document.uri.toString()) {
    return;
  }

  if (!isSupportedLanguage(event.document.languageId)) {
    return;
  }

  if (
    !vscode.workspace
      .getConfiguration("editor", event.document.uri)
      .get<boolean>("formatOnType")
  ) {
    return;
  }

  const change = event.contentChanges.find((contentChange) =>
    contentChange.text.includes("\n")
  );
  if (!change) {
    return;
  }

  const lineNumber = change.range.start.line;
  const currentLineNumber = lineNumber + change.text.split("\n").length - 1;
  const lineText = event.document.lineAt(lineNumber).text;

  if (
    !shouldAddEnd({
      columnNumber: change.range.start.character,
      document: documentAdapter(event.document),
      languageId: event.document.languageId,
      lineNumber,
    })
  ) {
    return;
  }

  await insertClosingEnd(editor, lineNumber, currentLineNumber, lineText);
}

async function insertClosingEnd(
  editor: vscode.TextEditor,
  lineNumber: number,
  currentLineNumber: number,
  lineText: string
) {
  const closingIndentation = indentationFor(lineText);
  const innerIndentation = closingIndentation + indentationUnit(editor);
  const currentLine = editor.document.lineAt(currentLineNumber);

  applyingEndwiseEdit = true;
  try {
    await editor.edit((textEditor) => {
      textEditor.replace(
        new vscode.Range(
          currentLineNumber,
          0,
          currentLineNumber,
          currentLine.text.length
        ),
        `${innerIndentation}\n${closingIndentation}end`
      );
    });
  } finally {
    applyingEndwiseEdit = false;
  }

  const position = new vscode.Position(currentLineNumber, innerIndentation.length);
  editor.selection = new vscode.Selection(position, position);

  // Trigger inline suggestion after any modifications (e.g. GitHub Copilot)
  vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");
}

function isSupportedLanguage(languageId: string): boolean {
  return SUPPORTED_LANGUAGES.includes(
    languageId as (typeof SUPPORTED_LANGUAGES)[number]
  );
}

/**
 * The plugin itself
 */

async function endwiseModifierEnter() {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return;
  }
  const editor: vscode.TextEditor = activeEditor;

  const lineNumber: number = editor.selection.active.line;
  const lineText: string = editor.document.lineAt(lineNumber).text;
  const lineLength: number = lineText.length;

  if (
    shouldAddEnd({
      calledWithModifier: true,
      columnNumber: editor.selection.active.character,
      document: documentAdapter(editor.document),
      languageId: editor.document.languageId,
      lineNumber,
    })
  ) {
    await linebreakWithClosing();
  } else {
    editor.selection = new vscode.Selection(
      new vscode.Position(lineNumber, lineLength),
      new vscode.Position(lineNumber, lineLength)
    );
    await linebreak();
  }
  // Trigger inline suggestion after any modifications (e.g. GitHub Copilot)
  vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");

  /**
   * Insert a line break, add the correct closing and correct cursor position
   */
  async function linebreakWithClosing() {
    applyingEndwiseEdit = true;
    try {
      await editor.edit((textEditor) => {
        textEditor.insert(new vscode.Position(lineNumber, lineLength), "\n");
      });
    } finally {
      applyingEndwiseEdit = false;
    }
    await insertClosingEnd(editor, lineNumber, lineNumber + 1, lineText);
  }

  /**
   * Insert a linebreak, no closing, correct cursor position
   */
  async function linebreak() {
    // Insert \n
    await vscode.commands.executeCommand("lineBreakInsert");

    // Move to the right to set the cursor to the next line
    await vscode.commands.executeCommand("cursorRight");

    // Get current line
    const newLine = await editor.document.lineAt(editor.selection.active.line)
      .text;

    // If it's blank, don't do anything
    if (newLine.length === 0) return;

    // On lines containing only whitespace, we need to move to the right
    // to have the cursor at the correct indentation level.
    // Otherwise, we set the cursor to the beginning of the first word.
    if (newLine.match(/^\s+$/)) {
      await vscode.commands.executeCommand("cursorEnd");
    } else {
      await vscode.commands.executeCommand("cursorWordEndRight");
      await vscode.commands.executeCommand("cursorHome");
    }
  }

}

function indentationUnit(editor: vscode.TextEditor): string {
  if (editor.options.insertSpaces === false) {
    return "\t";
  }

  const tabSize = typeof editor.options.tabSize === "number" ? editor.options.tabSize : 4;
  return " ".repeat(tabSize);
}
