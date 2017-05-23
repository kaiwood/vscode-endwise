'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand('endwise.enter', () => {

        let editor = vscode.window.activeTextEditor;

        let lineNumber: number = editor.selection.active.line;
        let columnNumber: number = editor.selection.active.character;
        let lineText = editor.document.lineAt(lineNumber).text;
        let lineLength = lineText.length;

        if (shouldAddEnd(lineText)) {
            editor.edit((textEditor) => {
                textEditor.insert(new vscode.Position(lineNumber, lineLength), "\nend");
            }).then(async () => {
                await vscode.commands.executeCommand('editor.action.reindentlines');
                await vscode.commands.executeCommand('cursorUp');
                await vscode.commands.executeCommand('editor.action.insertLineAfter');
            });
        } else {
            editor.edit((textEditor) => {
                textEditor.insert(new vscode.Position(lineNumber, lineLength), "\n");
            }).then(async () => {
                await vscode.commands.executeCommand('editor.action.reindentlines');
            })
        }
    });

    context.subscriptions.push(disposable);
}

function shouldAddEnd(lineText) {
    let trimmedText = lineText.trim();

    if (trimmedText.startsWith("if ")) return true;
    if (trimmedText.startsWith("def ")) return true;
    if (trimmedText.startsWith("class ")) return true;
    if (trimmedText.startsWith("module ")) return true;

    return false;
}

export function deactivate() {
}
