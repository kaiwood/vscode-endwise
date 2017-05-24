'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    let enter = vscode.commands.registerCommand('endwise.enter', () => {
        endwiseEnter();
    });

    let cmdEnter = vscode.commands.registerCommand('endwise.cmdEnter', async () => {
        await vscode.commands.executeCommand('cursorEnd');
        endwiseEnter();
    });

    context.subscriptions.push(enter);
}

function endwiseEnter() {
    let editor: vscode.TextEditor = vscode.window.activeTextEditor;

    let lineNumber: number = editor.selection.active.line;
    let columnNumber: number = editor.selection.active.character;
    let lineText: string = editor.document.lineAt(lineNumber).text;
    let lineLength: number = lineText.length;

    if (shouldAddEnd(lineText)) {
        editor.edit((textEditor) => {
            textEditor.insert(new vscode.Position(lineNumber, lineLength), `\n${indentationFor(lineText)}end`);
        }).then(async () => {
            await vscode.commands.executeCommand('cursorUp');
            await vscode.commands.executeCommand('editor.action.insertLineAfter');
        });
    } else {
        editor.edit((textEditor) => {
            textEditor.insert(new vscode.Position(lineNumber, lineLength), `\n${indentationFor(lineText)}`);
        });
    }
}

function shouldAddEnd(lineText) {
    let trimmedText: string = lineText.trim();

    if (trimmedText.startsWith("if ")) return true;
    if (trimmedText.startsWith("def ")) return true;
    if (trimmedText.startsWith("class ")) return true;
    if (trimmedText.startsWith("module ")) return true;
    if (trimmedText.endsWith(" do")) return true;
    if (trimmedText.match(/.*\ do \|.*\|$/)) return true;

    return false;
}

function indentationFor(line) {
    const trimmedLine: string = line.trim();
    if (trimmedLine.length === 0) return line;

    const whitespaceEndsAt: number = line.indexOf(trimmedLine);
    const indentation: string = line.substr(0, whitespaceEndsAt)

    return indentation;
}

export function deactivate() {
}
