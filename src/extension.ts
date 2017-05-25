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
    const editor: vscode.TextEditor = vscode.window.activeTextEditor;

    const lineNumber: number = editor.selection.active.line;
    const columnNumber: number = editor.selection.active.character;
    const lineText: string = editor.document.lineAt(lineNumber).text;
    const lineLength: number = lineText.length;

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
