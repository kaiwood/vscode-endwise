/*
 Copyright (c) 2021 Kai Wood <kwood@kwd.io>

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

const OPENINGS = [
  /^\s*?if(\s|\()/,
  /^\s*?unless(\s|\()/,
  /^\s*?while(\s|\()/,
  /^\s*?for(\s|\()/,
  /\s?do(\s?$|\s\|.*\|\s?$)/,
  /^\s*?enum\s/,
  /^\s*?struct\s/,
  /^\s*?macro\s/,
  /^\s*?union\s/,
  /^\s*?lib\s/,
  /^\s*?annotation\s/,
  /^\s*?def\s/,
  /^\s*?class\s/,
  /^\s*?module\s/,
  /^\s*?case(\s|\()/,
  /^\s*?begin\s/,
  /^\s*?until(\s|\()/,
];

const SINGLE_LINE_DEFINITION = /;\s*end[\s;]*$/;
const LINE_PARSE_LIMIT = 100000;

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
    await editor.edit((textEditor) => {
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
    // Insert \n
    await vscode.commands.executeCommand("lineBreakInsert");

    // Move to the right to set the cursor to the next line
    await vscode.commands.executeCommand("cursorRight");

    // Get current line
    let newLine = await editor.document.lineAt(editor.selection.active.line)
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

  /**
   * Check if a closing "end" should be set. Pretty much the meat of this plugin.
   */
  function shouldAddEnd() {
    const currentIndentation = indentationFor(lineText);

    // Do not close if enter key is pressed in the middle of a line, *except* when a modifier key is used
    if (!calledWithModifier && lineText.length > columnNumber) return false;
    // Also, do not close on single line definitions
    if (lineText.match(SINGLE_LINE_DEFINITION)) return false;

    for (let condition of OPENINGS) {
      if (!lineText.match(condition)) continue;

      let stackCount = 0;
      let documentLineCount = editor.document.lineCount;

      // Do not add "end" if code structure is already balanced
      for (let ln = lineNumber; ln <= lineNumber + LINE_PARSE_LIMIT; ln++) {
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
          for (let innerCondition of OPENINGS) {
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
