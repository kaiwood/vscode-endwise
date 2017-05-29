/*
 Copyright (c) 2017 Kai Wood <kwood@kwd.io>

 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
*/

'use strict';
import * as vscode from 'vscode';

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

    const possibleClosings = [];
    for (let i = lineNumber + 1; i < lineCount; ++i) {
        let additionalLine = await editor.document.lineAt(i);
        possibleClosings.push(additionalLine.text);
    }

    if (shouldAddEnd(lineText, columnNumber, calledWithModifier, possibleClosings)) {
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
function shouldAddEnd(lineText, columnNumber, calledWithModifier, possibleClosings) {
    const trimmedText: string = lineText.trim();
    const startsWithConditions: string[] = [
        "if", "unless", "while", "for", "do", "def", "class", "module", "case"
    ];


    // Do not add "end" if enter is pressed in the middle of a line, *except* when a modifier key is used
    if (!calledWithModifier && lineText.length > columnNumber) {
        return false;
    }

    // Do not add a closing "end" if there is one on the same indentation level
    for (let closing of possibleClosings) {
        // Check if another block got opened
        let breakEarly = false;
        for (let condition of startsWithConditions) {
            if (closing.startsWith(indentationFor(lineText) + condition)) breakEarly = true;
        }
        if (breakEarly) break;

        if (closing === indentationFor(lineText) + "end") {
            return false;
        }
    }


    for (let condition of startsWithConditions) {
        if (trimmedText.startsWith(`${condition} `)) return true;
    }

    if (trimmedText.endsWith(" do")) return true;
    if (trimmedText.match(/.*\ do \|.*\|$/)) return true;

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
