/*
 Copyright (c) 2021 Kai Wood <kwood@kwd.io>

 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
*/

"use strict";
import * as vscode from "vscode";
import { indentationFor, shouldAddEnd } from "./endwise";
import { documentAdapter } from "./formatter";
import { isSupportedLanguage } from "./languages";
import { isLanguageEnabled } from "./settings";

let applyingEndwiseEdit = false;

interface EndwiseEditPlan {
  range: vscode.Range;
  text: string;
  cursorPosition: vscode.Position;
}

/**
 * Activate plugin commands
 */
export function activate(context: vscode.ExtensionContext) {
  const cmdEnter = vscode.commands.registerCommand(
    "endwise.cmdEnter",
    async () => {
      await endwiseModifierEnter();
    }
  );

  const documentChange = vscode.workspace.onDidChangeTextDocument((event) =>
    handleDocumentChange(event)
  );

  context.subscriptions.push(cmdEnter);
  context.subscriptions.push(documentChange);
}

async function handleDocumentChange(event: vscode.TextDocumentChangeEvent) {
  if (applyingEndwiseEdit) {
    return;
  }

  const editor = vscode.window.activeTextEditor;
  const documentUri = event.document.uri.toString();
  if (!editor || editor.document.uri.toString() !== documentUri) {
    return;
  }

  if (!isSupportedLanguage(event.document.languageId)) {
    return;
  }

  if (!isLanguageEnabled(event.document.languageId, event.document.uri)) {
    return;
  }

  if (
    !vscode.workspace
      .getConfiguration("editor", event.document.uri)
      .get<boolean>("formatOnType")
  ) {
    return;
  }

  if (!event.contentChanges.some((contentChange) => contentChange.text.includes("\n"))) {
    return;
  }

  await waitForSelectionUpdate();
  const plans = closingEndPlansForCurrentSelections(editor);
  if (plans.length === 0) {
    return;
  }

  await applyEndwiseEditPlans(editor, plans);
}

function waitForSelectionUpdate(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 25));
}

function closingEndPlan(
  editor: vscode.TextEditor,
  lineNumber: number,
  currentLineNumber: number,
  lineText: string
): EndwiseEditPlan {
  const closingIndentation = indentationFor(lineText);
  const innerIndentation = closingIndentation + indentationUnit(editor);
  const currentLine = editor.document.lineAt(currentLineNumber);

  return {
    range: new vscode.Range(
      currentLineNumber,
      0,
      currentLineNumber,
      currentLine.text.length
    ),
    text: `${innerIndentation}\n${closingIndentation}end`,
    cursorPosition: new vscode.Position(currentLineNumber, innerIndentation.length),
  };
}

async function applyEndwiseEditPlans(
  editor: vscode.TextEditor,
  plans: EndwiseEditPlan[]
) {
  const finalSelections = finalSelectionsForPlans(plans);

  applyingEndwiseEdit = true;
  try {
    await editor.edit((textEditor) => {
      for (const plan of plansByDescendingPosition(plans)) {
        textEditor.replace(plan.range, plan.text);
      }
    });
  } finally {
    applyingEndwiseEdit = false;
  }

  editor.selections = finalSelections;

  // Trigger inline suggestion after any modifications (e.g. GitHub Copilot)
  vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");
}

function plansByDescendingPosition(plans: EndwiseEditPlan[]): EndwiseEditPlan[] {
  return [...plans].sort((a, b) => {
    if (a.range.start.line !== b.range.start.line) {
      return b.range.start.line - a.range.start.line;
    }

    return b.range.start.character - a.range.start.character;
  });
}

function finalSelectionsForPlans(plans: EndwiseEditPlan[]): vscode.Selection[] {
  return plans
    .map((plan) => {
      let shiftedLine = plan.cursorPosition.line;

      for (const otherPlan of plans) {
        if (otherPlan.range.start.line < plan.range.start.line) {
          shiftedLine += lineDeltaForPlan(otherPlan);
        }
      }

      const position = new vscode.Position(
        shiftedLine,
        plan.cursorPosition.character
      );
      return new vscode.Selection(position, position);
    })
    .sort((a, b) => {
      if (a.active.line !== b.active.line) {
        return a.active.line - b.active.line;
      }

      return a.active.character - b.active.character;
    });
}

function lineDeltaForPlan(plan: EndwiseEditPlan): number {
  return plan.text.split("\n").length - 1 - (plan.range.end.line - plan.range.start.line);
}

function closingEndPlansForCurrentSelections(
  editor: vscode.TextEditor
): EndwiseEditPlan[] {
  const document = documentAdapter(editor.document);
  const plannedLines = new Set<number>();
  const plans: EndwiseEditPlan[] = [];

  for (const selection of editor.selections) {
    const currentLineNumber = selection.active.line;
    const lineNumber = currentLineNumber - 1;

    if (lineNumber < 0 || plannedLines.has(lineNumber)) {
      continue;
    }

    const lineText = editor.document.lineAt(lineNumber).text;
    if (
      !shouldAddEnd({
        columnNumber: lineText.length,
        document,
        languageId: editor.document.languageId,
        lineNumber,
      })
    ) {
      continue;
    }

    plannedLines.add(lineNumber);
    plans.push(closingEndPlan(editor, lineNumber, currentLineNumber, lineText));
  }

  return plans;
}

/**
 * The plugin itself
 */

async function endwiseModifierEnter() {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return;
  }
  const editor: vscode.TextEditor = activeEditor;
  const plans = modifierEnterPlans(editor);

  if (plans.length === 0) {
    return;
  }

  await applyEndwiseEditPlans(editor, plans);
}

function modifierEnterPlans(editor: vscode.TextEditor): EndwiseEditPlan[] {
  const document = documentAdapter(editor.document);
  const languageEnabled = isLanguageEnabled(
    editor.document.languageId,
    editor.document.uri
  );
  const plannedLines = new Set<number>();
  const plans: EndwiseEditPlan[] = [];

  for (const selection of editor.selections) {
    const lineNumber = selection.active.line;
    if (plannedLines.has(lineNumber)) {
      continue;
    }

    const lineText = editor.document.lineAt(lineNumber).text;
    const lineLength = lineText.length;
    const shouldClose =
      languageEnabled &&
      shouldAddEnd({
        calledWithModifier: true,
        columnNumber: selection.active.character,
        document,
        languageId: editor.document.languageId,
        lineNumber,
      });

    plannedLines.add(lineNumber);
    plans.push(
      shouldClose
        ? closingEndModifierPlan(editor, lineNumber, lineText)
        : plainLineBreakPlan(lineNumber, lineLength)
    );
  }

  return plans;
}

function closingEndModifierPlan(
  editor: vscode.TextEditor,
  lineNumber: number,
  lineText: string
): EndwiseEditPlan {
  const closingIndentation = indentationFor(lineText);
  const innerIndentation = closingIndentation + indentationUnit(editor);
  const lineLength = lineText.length;

  return {
    range: new vscode.Range(lineNumber, lineLength, lineNumber, lineLength),
    text: `\n${innerIndentation}\n${closingIndentation}end`,
    cursorPosition: new vscode.Position(lineNumber + 1, innerIndentation.length),
  };
}

function plainLineBreakPlan(
  lineNumber: number,
  lineLength: number
): EndwiseEditPlan {
  return {
    range: new vscode.Range(lineNumber, lineLength, lineNumber, lineLength),
    text: "\n",
    cursorPosition: new vscode.Position(lineNumber + 1, 0),
  };
}

function indentationUnit(editor: vscode.TextEditor): string {
  if (editor.options.insertSpaces === false) {
    return "\t";
  }

  const tabSize = typeof editor.options.tabSize === "number" ? editor.options.tabSize : 4;
  return " ".repeat(tabSize);
}
