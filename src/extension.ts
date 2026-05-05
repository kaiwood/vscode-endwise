/*
 Copyright (c) 2021 Kai Wood <kwood@kwd.io>

 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
*/

"use strict";
import * as vscode from "vscode";
import {
  indentationFor,
  shouldAcceptSelectedSuggestion,
  shouldAddEnd,
} from "./endwise";

/**
 * Activate plugin commands
 */
export function activate(context: vscode.ExtensionContext) {
  const enter = vscode.commands.registerCommand("endwise.enter", async () => {
    await endwiseEnter();
  });

  const cmdEnter = vscode.commands.registerCommand(
    "endwise.cmdEnter",
    async () => {
      await vscode.commands.executeCommand("cursorEnd");
      await endwiseEnter(true);
    }
  );

  // We have to check "acceptSuggestionOnEnter" is set to a value !== "off" if the suggest widget is currently visible,
  // otherwise the suggestion won't be triggered because of the overloaded enter key.
  const checkForAcceptSelectedSuggestion = vscode.commands.registerCommand(
    "endwise.checkForAcceptSelectedSuggestion",
    async () => {
      const config = vscode.workspace.getConfiguration();
      const suggestionOnEnter = config.get("editor.acceptSuggestionOnEnter");

      if (shouldAcceptSelectedSuggestion(suggestionOnEnter)) {
        await vscode.commands.executeCommand("acceptSelectedSuggestion");
      } else {
        await vscode.commands.executeCommand("endwise.enter");
      }
    }
  );

  context.subscriptions.push(enter);
  context.subscriptions.push(cmdEnter);
  context.subscriptions.push(checkForAcceptSelectedSuggestion);
}

/**
 * The plugin itself
 */

async function endwiseEnter(calledWithModifier = false) {
  const editor = vscode.window.activeTextEditor as vscode.TextEditor;
  const lineNumber: number = editor.selection.active.line;
  const columnNumber: number = editor.selection.active.character;
  const lineText: string = editor.document.lineAt(lineNumber).text;
  const lineLength: number = lineText.length;

  if (
    shouldAddEnd({
      calledWithModifier,
      columnNumber,
      document: {
        lineCount: editor.document.lineCount,
        lineAt: (line) => editor.document.lineAt(line).text,
      },
      languageId: editor.document.languageId,
      lineNumber,
    })
  ) {
    await linebreakWithClosing();
  } else {
    await linebreak();
  }
  // Trigger inline suggestion after any modifications (e.g. GitHub Copilot)
  vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");

  /**
   * Insert a line break, add the correct closing and correct cursor position
   */
  async function linebreakWithClosing() {
    await editor.edit((textEditor) => {
      textEditor.insert(
        new vscode.Position(lineNumber, lineLength),
        `\n${indentationFor(lineText)}end`
      );
    });

    await vscode.commands.executeCommand("cursorUp");
    await vscode.commands.executeCommand("editor.action.insertLineAfter");
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
