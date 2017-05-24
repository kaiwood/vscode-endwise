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

async function endwiseEnter() {
    let editor: vscode.TextEditor = vscode.window.activeTextEditor;

    let lineNumber: number = editor.selection.active.line;
    let columnNumber: number = editor.selection.active.character;
    let lineText: string = editor.document.lineAt(lineNumber).text;
    let lineLength: number = lineText.length;

    if (shouldAddEnd(lineText)) {
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
        editor.edit((textEditor) => {
            textEditor.insert(new vscode.Position(lineNumber, lineLength), `\n${indentationFor(lineText)}`);
        });
    }
}

function shouldAddEnd(lineText) {
    const trimmedText: string = lineText.trim();
    const startsWithConditions = [
        "if", "def", "class", "module"
    ];

    for (let condition of startsWithConditions) {
        if (trimmedText.startsWith(`${condition} `)) return true;
    }

    if (trimmedText.endsWith(" do")) return true;
    if (trimmedText.match(/.*\ do \|.*\|$/)) return true;

    return false;
}

function shouldUnindent(lineText) {
    let trimmedText: string = lineText.trim();

    if (trimmedText.startsWith("else")) return true;
    if (trimmedText.startsWith("elsif ")) return true;

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
