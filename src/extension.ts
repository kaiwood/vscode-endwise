/*
 Copyright (c) 2017 Kai Wood <kwood@kwd.io>

 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
*/

'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    let enter = vscode.commands.registerCommand('endwise.enter', () => {
        endwiseEnter();
    });

    let cmdEnter = vscode.commands.registerCommand('endwise.cmdEnter', async () => {
        await vscode.commands.executeCommand('cursorEnd');
        endwiseEnter(true);
    });

    context.subscriptions.push(enter);
}

async function endwiseEnter(calledWithModifier = false) {
    const editor: vscode.TextEditor = vscode.window.activeTextEditor;
    const lineNumber: number = editor.selection.active.line;
    const columnNumber: number = editor.selection.active.character;
    const lineText: string = editor.document.lineAt(lineNumber).text;
    const lineLength: number = lineText.length;

    if (shouldAddEnd(lineText, columnNumber, calledWithModifier)) {
        await editor.edit((textEditor) => {
            textEditor.insert(new vscode.Position(lineNumber, lineLength), `\n${indentationFor(lineText)}end`);
        });
        await vscode.commands.executeCommand('cursorUp');
        vscode.commands.executeCommand('editor.action.insertLineAfter');
    } else if (shouldUnindent(lineText)) {
        await vscode.commands.executeCommand('editor.action.outdentLines');
        editor.edit((textEditor) => {
            textEditor.insert(new vscode.Position(lineNumber, lineLength), `\n${indentationFor(lineText)}`);
        });
    } else {
        await vscode.commands.executeCommand('lineBreakInsert');
        await vscode.commands.executeCommand('cursorRight');
        // await vscode.commands.executeCommand('cursorWordStartRight');
        // TODO: Depending on the context where the line break was set, the indentation off in some cases.
    }
}

function shouldAddEnd(lineText, columnNumber, calledWithModifier) {

    // Do not add "end" if enter is pressed in the middle of a line, *except* when a modifier key is used
    if (!calledWithModifier && lineText.length > columnNumber) {
        return false
    }

    const trimmedText: string = lineText.trim();
    const startsWithConditions: string[] = [
        "if", "unless", "while", "for", "do", "def", "class", "module", "case"
    ];

    for (let condition of startsWithConditions) {
        if (trimmedText.startsWith(`${condition} `)) return true;
    }

    if (trimmedText.endsWith(" do")) return true;
    if (trimmedText.match(/.*\ do \|.*\|$/)) return true;

    return false;
}

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

function indentationFor(lineText) {
    const trimmedLine: string = lineText.trim();
    if (trimmedLine.length === 0) return lineText;

    const whitespaceEndsAt: number = lineText.indexOf(trimmedLine);
    const indentation: string = lineText.substr(0, whitespaceEndsAt)

    return indentation;
}

export function deactivate() {
}
