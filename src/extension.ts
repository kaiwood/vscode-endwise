/*
 Copyright (c) 2021 Kai Wood <kwood@kwd.io>

 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
*/

"use strict";
import * as vscode from "vscode";
import { documentAdapter } from "./document";
import {
  buildEndwiseEditPlan,
  EndwiseEditPlan,
  EndwiseFormattingOptions,
  EndwiseRange,
} from "./planner";
import { isLanguageEnabled } from "./settings";

interface PlanCollectionOptions {
  calledWithModifier: boolean;
  requireAddedEnd: boolean;
  requireEmptySelections: boolean;
}

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
      await endwiseModifierEnter();
    }
  );

  context.subscriptions.push(enter);
  context.subscriptions.push(cmdEnter);
}

async function applyEndwiseEditPlans(
  editor: vscode.TextEditor,
  plans: EndwiseEditPlan[]
): Promise<boolean> {
  const finalSelections = finalSelectionsForPlans(plans);

  const applied = await editor.edit((textEditor) => {
    for (const plan of plansByDescendingPosition(plans)) {
      textEditor.replace(toVsCodeRange(plan.range), plan.text);
    }
  });

  if (!applied) {
    return false;
  }

  editor.selections = finalSelections;

  // Trigger inline suggestion after any modifications (e.g. GitHub Copilot)
  vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");
  return true;
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
  return (
    plan.text.split("\n").length -
    1 -
    (plan.range.end.line - plan.range.start.line)
  );
}

/**
 * The plugin itself
 */

async function endwiseEnter() {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return;
  }

  const editor: vscode.TextEditor = activeEditor;
  const plans = enterPlans(editor);

  if (plans.length === 0) {
    await vscode.commands.executeCommand("type", { text: "\n" });
    return;
  }

  await applyEndwiseEditPlans(editor, plans);
}

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

function enterPlans(editor: vscode.TextEditor): EndwiseEditPlan[] {
  return plansForSelections(editor, {
    calledWithModifier: false,
    requireAddedEnd: true,
    requireEmptySelections: true,
  });
}

function modifierEnterPlans(editor: vscode.TextEditor): EndwiseEditPlan[] {
  return plansForSelections(editor, {
    calledWithModifier: true,
    requireAddedEnd: false,
    requireEmptySelections: false,
  });
}

function plansForSelections(
  editor: vscode.TextEditor,
  options: PlanCollectionOptions
): EndwiseEditPlan[] {
  const document = documentAdapter(editor.document);
  const languageEnabled = isLanguageEnabled(
    editor.document.languageId,
    editor.document.uri
  );
  const formattingOptions = formattingOptionsForEditor(editor);
  const plannedLines = new Set<number>();
  const plans: EndwiseEditPlan[] = [];

  for (const selection of editor.selections) {
    if (options.requireEmptySelections && !selection.isEmpty) {
      return [];
    }

    const lineNumber = selection.active.line;
    if (plannedLines.has(lineNumber)) {
      continue;
    }

    const plan = buildEndwiseEditPlan({
      calledWithModifier: options.calledWithModifier,
      columnNumber: selection.active.character,
      document,
      formattingOptions,
      languageEnabled,
      languageId: editor.document.languageId,
      lineNumber,
    });

    if (!plan || (options.requireAddedEnd && !plan.addedEnd)) {
      if (options.requireAddedEnd) {
        return [];
      }
      continue;
    }

    plannedLines.add(lineNumber);
    plans.push(plan);
  }

  return plans;
}

function formattingOptionsForEditor(
  editor: vscode.TextEditor
): EndwiseFormattingOptions {
  const tabSize =
    typeof editor.options.tabSize === "number" ? editor.options.tabSize : 4;

  return {
    insertSpaces: editor.options.insertSpaces !== false,
    tabSize,
  };
}

function toVsCodeRange(range: EndwiseRange): vscode.Range {
  return new vscode.Range(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  );
}
