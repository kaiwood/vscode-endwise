import * as assert from "assert";
import { EndwiseDocument } from "../../endwise";
import {
  buildEndwiseEditPlan,
  BuildEndwiseEditPlanOptions,
  EndwiseEditPlan,
} from "../../planner";

class TestDocument implements EndwiseDocument {
  private readonly lines: string[];

  constructor(text: string) {
    this.lines = text.split("\n");
  }

  get lineCount(): number {
    return this.lines.length;
  }

  lineAt(lineNumber: number): string {
    return this.lines[lineNumber];
  }
}

function plan(
  text: string,
  options: Partial<Omit<BuildEndwiseEditPlanOptions, "document">> = {}
): EndwiseEditPlan | undefined {
  const document = new TestDocument(text);
  const lineNumber = options.lineNumber ?? 0;

  return buildEndwiseEditPlan({
    columnNumber: document.lineAt(lineNumber).length,
    document,
    formattingOptions: { insertSpaces: true, tabSize: 2 },
    languageId: "ruby",
    lineNumber,
    ...options,
  });
}

suite("Endwise edit planner", () => {
  test("builds an enter command plan for a Ruby block", () => {
    const result = plan("if condition");

    assert.deepStrictEqual(result, {
      addedEnd: true,
      cursorPosition: { character: 2, line: 1 },
      range: {
        end: { character: 12, line: 0 },
        start: { character: 12, line: 0 },
      },
      text: "\n  \nend",
    });
  });

  test("builds an enter command plan for a Crystal block", () => {
    const result = plan("enum Color", { languageId: "crystal" });

    assert.strictEqual(result?.addedEnd, true);
    assert.strictEqual(result?.text, "\n  \nend");
  });

  test("builds enter command plans for Elixir blocks", () => {
    assert.strictEqual(
      plan("defmodule Foo do", { languageId: "elixir" })?.text,
      "\n  \nend"
    );
    assert.strictEqual(
      plan("Enum.map(items, fn item ->", { languageId: "elixir" })?.text,
      "\n  \nend"
    );
  });

  test("builds shellscript plans with matching close words", () => {
    assert.strictEqual(
      plan("if [ -f file ]; then", { languageId: "shellscript" })?.text,
      "\n  \nfi"
    );
    assert.strictEqual(
      plan("for file in *; do", { languageId: "shellscript" })?.text,
      "\n  \ndone"
    );
    assert.strictEqual(
      plan('case "$value" in', { languageId: "shellscript" })?.text,
      "\n  \nesac"
    );
  });

  test("preserves command indentation", () => {
    const result = plan("  if condition", {
      formattingOptions: { insertSpaces: true, tabSize: 4 },
    });

    assert.strictEqual(result?.text, "\n      \n  end");
    assert.deepStrictEqual(result?.cursorPosition, { character: 6, line: 1 });
  });

  test("skips disabled and already balanced command cases", () => {
    assert.strictEqual(
      plan("if condition", { languageEnabled: false }),
      undefined
    );
    assert.strictEqual(plan("if condition\nend"), undefined);
  });

  test("skips normal enter plans when enter splits a line", () => {
    assert.strictEqual(
      plan("if condition", {
        columnNumber: 6,
      }),
      undefined
    );
  });

  test("skips commented and unsupported command cases", () => {
    assert.strictEqual(plan("# if condition"), undefined);
    assert.strictEqual(
      plan("if condition", { languageId: "plaintext" }),
      undefined
    );
  });

  test("builds a modifier plan from the middle of a line", () => {
    const result = plan("if condition", {
      calledWithModifier: true,
      columnNumber: 2,
      formattingOptions: { insertSpaces: true, tabSize: 4 },
    });

    assert.deepStrictEqual(result, {
      addedEnd: true,
      cursorPosition: { character: 4, line: 1 },
      range: {
        end: { character: 12, line: 0 },
        start: { character: 12, line: 0 },
      },
      text: "\n    \nend",
    });
  });

  test("builds a modifier plain newline fallback", () => {
    const result = plan("puts value", {
      calledWithModifier: true,
      columnNumber: 2,
    });

    assert.deepStrictEqual(result, {
      addedEnd: false,
      cursorPosition: { character: 0, line: 1 },
      range: {
        end: { character: 10, line: 0 },
        start: { character: 10, line: 0 },
      },
      text: "\n",
    });
  });

  test("builds a modifier indented newline fallback for an already balanced block", () => {
    const result = plan("if condition\nend", {
      calledWithModifier: true,
      columnNumber: 2,
      formattingOptions: { insertSpaces: true, tabSize: 4 },
    });

    assert.deepStrictEqual(result, {
      addedEnd: false,
      cursorPosition: { character: 4, line: 1 },
      range: {
        end: { character: 12, line: 0 },
        start: { character: 12, line: 0 },
      },
      text: "\n    ",
    });
  });

  test("builds a modifier fallback when the language is disabled", () => {
    const result = plan("if condition", {
      calledWithModifier: true,
      columnNumber: 2,
      languageEnabled: false,
    });

    assert.strictEqual(result?.addedEnd, false);
    assert.strictEqual(result?.text, "\n");
  });
});
