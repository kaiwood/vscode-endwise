/*
 Copyright (c) 2017 Kai Wood <kwood@kwd.io>

 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
*/

'use strict';
import * as vscode from 'vscode';
const isBalanced = require("is-balanced");

export function activate(context: vscode.ExtensionContext) {

    let enter = vscode.commands.registerCommand('endwise.enter', async () => {
        await endwiseEnter();
    });

    let cmdEnter = vscode.commands.registerCommand('endwise.cmdEnter', async () => {
        await vscode.commands.executeCommand('cursorEnd');
        await endwiseEnter(true);
    });

    context.subscriptions.push(enter);
}

async function endwiseEnter(calledWithModifier = false) {
    const editor: vscode.TextEditor = vscode.window.activeTextEditor;
    const lineNumber: number = editor.selection.active.line;
    const columnNumber: number = editor.selection.active.character;
    const lineCount: number = editor.document.lineCount;
    const lineText: string = editor.document.lineAt(lineNumber).text;
    const lineLength: number = lineText.length;

    if (shouldAddEnd(lineText, columnNumber, lineNumber, calledWithModifier, editor)) {
        await editor.edit((textEditor) => {
            textEditor.insert(new vscode.Position(lineNumber, lineLength), `\n${indentationFor(lineText)}end`);
        });
        await vscode.commands.executeCommand('cursorUp');
        vscode.commands.executeCommand('editor.action.insertLineAfter');
    } else if (shouldUnindent(lineText)) {
        await vscode.commands.executeCommand('editor.action.outdentLines');
        await editor.edit((textEditor) => {
            textEditor.insert(new vscode.Position(lineNumber, lineLength), `\n${indentationFor(lineText)}`);
        });
    } else {
        await vscode.commands.executeCommand('lineBreakInsert');
        if (columnNumber === lineText.length) {
            await vscode.commands.executeCommand('cursorWordEndRight');
        } else {
            await vscode.commands.executeCommand('cursorRight');
            let newLine = await editor.document.lineAt(editor.selection.active.line).text;
            if (newLine[1] === " " && newLine.trim().length > 0) {
                await vscode.commands.executeCommand('cursorWordEndRight');
                await vscode.commands.executeCommand('cursorWordStartLeft');
            }
        }
    }
}

/**
 * Check if a closing "end" should be set
 */
function shouldAddEnd(lineText, columnNumber, lineNumber, calledWithModifier, editor) {
    // const openings = [
    //     /^\s*?if/, /^\s*?unless/, "while", "for", "do", "def", "class", "module", "case", "begin", "until"
    // ];
    const openings = [
        /^\s*?if/,
        /^\s*?unless/,
        /^\s*?while/,
        /^\s*?for/,
        /\s?do(\n|\s\|.*\|\n)/,
        /^\s*?def/,
        /^\s*?class/,
        /^\s*?module/,
        /^\s*?case/,
        /^\s*?begin/,
        /^\s*?until/
    ];

    const currentIndentation = indentationFor(lineText);

    // Do not add "end" if enter is pressed in the middle of a line, *except* when a modifier key is used
    if (!calledWithModifier && lineText.length > columnNumber) {
        return false;
    }

    for (let condition of openings) {
        if (lineText.match(condition)) {

            const LIMIT = 100;
            let stackCount = 0;

            // Do not add "end" if code structure is already balanced
            for (let ln = lineNumber; ln <= lineNumber+LIMIT; ln++) {
                try {
                    let line = editor.document.lineAt(ln+1).text;

                    if (currentIndentation === indentationFor(line)) {
                        // If another opening is found, increment the stack counter
                        for (let innerCondition of openings) {
                            if (line.match(innerCondition)) {
                                stackCount += 1;
                                break;
                            }
                        }

                        if (line.trim().startsWith("end")) {
                            if (stackCount > 0) {
                                stackCount -= 1;
                                continue;
                            } else {
                                return false;
                            }
                        }
                    } else if (currentIndentation > indentationFor(line)) {
                        if (line.trim().startsWith("end")) return true; // If there is an "end" on a smaller indentation level, always close statement.
                    }

                } catch(err) {
                    return true;
                }
            }
            return true;
        };
    }

    return false;
}

/**
 * Check if the line should unindent because of other keywords
 */
function shouldUnindent(lineText) {
    const trimmedText: string = lineText.trim();
    const unindentConditions: string[] = [
        "else", "elsif ", "when"
    ];

    for (let condition of unindentConditions) {
        if (trimmedText.startsWith(condition)) return true;
    }

    return false;
}

/**
 * Get indentation level of the previous line
 */
function indentationFor(lineText) {
    const trimmedLine: string = lineText.trim();
    if (trimmedLine.length === 0) return lineText;

    const whitespaceEndsAt: number = lineText.indexOf(trimmedLine);
    const indentation: string = lineText.substr(0, whitespaceEndsAt)

    return indentation;
}

export function deactivate() {
}
