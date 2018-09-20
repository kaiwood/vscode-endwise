/*
 Copyright (c) 2017 Kai Wood <kwood@kwd.io>

 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
*/

"use strict";
import * as vscode from "vscode";

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

      if (suggestionOnEnter !== "off") {
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
  const editor: vscode.TextEditor = vscode.window.activeTextEditor;
  const lineNumber: number = editor.selection.active.line;
  const columnNumber: number = editor.selection.active.character;
  const lineText: string = editor.document.lineAt(lineNumber).text;
  const lineLength: number = lineText.length;

  if (shouldAddEnd()) {
    await linebreakWithClosing();
  } else {
    await linebreak();
  }

  /**
   * Insert a line break, add the correct closing and correct cursor position
   */
  async function linebreakWithClosing() {
    await editor.edit(textEditor => {
      textEditor.insert(
        new vscode.Position(lineNumber, lineLength),
        `\n${indentationFor(lineText)}end`
      );
    });

    await vscode.commands.executeCommand("cursorUp");
    vscode.commands.executeCommand("editor.action.insertLineAfter");
  }

  /**
   * Insert a linebreak, no closing, correct cursor position
   */
  async function linebreak() {
    await vscode.commands.executeCommand("lineBreakInsert");
    if (columnNumber === lineText.length) {
      await vscode.commands.executeCommand("cursorEnd");
      await vscode.commands.executeCommand("cursorWordStartRight");
    } else {
      await vscode.commands.executeCommand("cursorRight");

      let newLine = await editor.document.lineAt(editor.selection.active.line)
        .text;

      if (newLine[1] === " " && newLine.trim().length > 0) {
        await vscode.commands.executeCommand("cursorWordEndRight");
        await vscode.commands.executeCommand("cursorHome");
      }
    }
  }

  /**
   * Check if a closing "end" should be set. Pretty much the meat of this plugin.
   */
  function shouldAddEnd() {
    const openings = [
      /^\s*?if(\s|\()/,
      /^\s*?unless(\s|\()/,
      /^\s*?while(\s|\()/,
      /^\s*?for(\s|\()/,
      /\s?do(\s?$|\s\|.*\|\s?$)/,
      /^\s*?def\s/,
      /^\s*?class\s/,
      /^\s*?module\s/,
      /^\s*?case(\s|\()/,
      /^\s*?begin\s/,
      /^\s*?until(\s|\()/
    ];

    const singleLineDefCondition = /;\s*end[\s;]*$/;

    const currentIndentation = indentationFor(lineText);

    // Do not close if enter key is pressed in the middle of a line, *except* when a modifier key is used
    if (!calledWithModifier && lineText.length > columnNumber) return false;
    // Also, do not close on single line definitions
    if (lineText.match(singleLineDefCondition)) return false;

    for (let condition of openings) {
      if (!lineText.match(condition)) continue;

      const LIMIT = 100000;
      let stackCount = 0;
      let documentLineCount = editor.document.lineCount;

      // Do not add "end" if code structure is already balanced
      for (let ln = lineNumber; ln <= lineNumber + LIMIT; ln++) {
        // Close if we are at the end of the document
        if (documentLineCount <= ln + 1) return true;

        let line = editor.document.lineAt(ln + 1).text;
        let lineStartsWithEnd = line.trim().startsWith("end");

        // Always close the statement if there is another closing found on a smaller indentation level
        if (currentIndentation > indentationFor(line) && lineStartsWithEnd) {
          return true;
        }

        if (currentIndentation === indentationFor(line)) {
          // If another opening is found, increment the stack counter
          for (let innerCondition of openings) {
            if (line.match(innerCondition)) {
              stackCount += 1;
              break;
            }
          }

          if (lineStartsWithEnd && stackCount > 0) {
            stackCount -= 1;
            continue;
          } else if (lineStartsWithEnd) {
            return false;
          }
        }
      }
    }

    return false;
  }

  /**
   * Helper to get indentation level of the previous line
   */
  function indentationFor(lineText) {
    const trimmedLine: string = lineText.trim();
    if (trimmedLine.length === 0) return lineText;

    const whitespaceEndsAt: number = lineText.indexOf(trimmedLine);
    const indentation: string = lineText.substr(0, whitespaceEndsAt);

    return indentation;
  }
}
