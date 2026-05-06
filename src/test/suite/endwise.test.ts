import * as assert from "assert";
import { EndwiseDocument, indentationFor, shouldAddEnd } from "../../endwise";
import { isSupportedLanguage } from "../../languages";

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

function closes(languageId: string, text: string, calledWithModifier = false) {
  const document = new TestDocument(text);

  return closesAt(languageId, document, 0, calledWithModifier);
}

function closesAt(
  languageId: string,
  document: TestDocument,
  lineNumber: number,
  calledWithModifier = false
) {
  const lineText = document.lineAt(lineNumber);

  return shouldAddEnd({
    calledWithModifier,
    columnNumber: lineText.length,
    document,
    languageId,
    lineNumber,
  });
}

suite("Endwise block detection", () => {
  test("detects Ruby openings", () => {
    assert.strictEqual(isSupportedLanguage("ruby"), true);

    const openings = [
      "if condition",
      "unless condition",
      "while condition",
      "for item in items",
      "items.each do",
      "items.each do |item|",
      "def foo",
      "class Foo",
      "module Foo",
      "case value",
      "begin ",
      "until condition",
    ];

    for (const opening of openings) {
      assert.strictEqual(closes("ruby", opening), true, opening);
    }
  });

  test("detects Crystal openings", () => {
    assert.strictEqual(isSupportedLanguage("crystal"), true);

    const openings = [
      "if condition",
      "unless condition",
      "while condition",
      "for item in items",
      "items.each do",
      "enum Color",
      "struct Point",
      "macro debug",
      "union Result",
      "lib LibC",
      "annotation Route",
      "def foo",
      "class Foo",
      "module Foo",
      "case value",
      "begin ",
      "until condition",
    ];

    for (const opening of openings) {
      assert.strictEqual(closes("crystal", opening), true, opening);
    }
  });

  test("detects Lua openings", () => {
    assert.strictEqual(isSupportedLanguage("lua"), true);

    const openings = [
      "if condition then",
      "while condition do",
      "for i = 1, 10 do",
      "for key, value in pairs(items) do",
      "function name(arg)",
      "local function name(arg)",
      "do",
    ];

    for (const opening of openings) {
      assert.strictEqual(closes("lua", opening), true, opening);
    }
  });

  test("detects shellscript openings", () => {
    assert.strictEqual(isSupportedLanguage("shellscript"), true);

    const openings = [
      "if [ -f file ]; then",
      "while read -r line; do",
      "until ready; do",
      "for file in *; do",
      'case "$value" in',
    ];

    for (const opening of openings) {
      assert.strictEqual(closes("shellscript", opening), true, opening);
    }
  });

  test("skips already balanced blocks", () => {
    assert.strictEqual(closes("ruby", "if condition\nend"), false);
    assert.strictEqual(
      closes("ruby", "if condition\nif other\nend\nend"),
      false
    );
    assert.strictEqual(
      closes("shellscript", "if [ -f file ]; then\nfi"),
      false
    );
    assert.strictEqual(
      closes("shellscript", "for file in *; do\ndone"),
      false
    );
    assert.strictEqual(
      closes("shellscript", 'case "$value" in\nesac'),
      false
    );
    assert.strictEqual(
      closes("shellscript", "while true; do\nfi"),
      true
    );
  });

  test("skips unsupported languages", () => {
    assert.strictEqual(closes("javascript", "if condition"), false);
  });

  test("skips single-line and endless definitions", () => {
    assert.strictEqual(closes("ruby", 'def foo; puts "bar"; end'), false);
    assert.strictEqual(closes("ruby", "def foo = bar"), false);
    assert.strictEqual(closes("ruby", "def foo(bar) = bar"), false);
  });

  test("ignores Ruby line comments", () => {
    assert.strictEqual(closes("ruby", "# if condition"), false);
    assert.strictEqual(closes("ruby", "items.each # do"), false);
    assert.strictEqual(closes("ruby", "if condition # comment"), true);
  });

  test("ignores Ruby block comments", () => {
    assert.strictEqual(
      closes("ruby", "=begin\nif condition\ndo\nend\n=end"),
      false
    );
    assert.strictEqual(
      closes("ruby", "if condition\n=begin\nend\n=end"),
      true
    );
  });

  test("ignores Crystal line comments", () => {
    assert.strictEqual(closes("crystal", "# enum Color"), false);
  });

  test("ignores Lua comments", () => {
    assert.strictEqual(closes("lua", "-- if condition then"), false);
    assert.strictEqual(closes("lua", "if condition then -- comment"), true);
    assert.strictEqual(closes("lua", "--[[\nif condition then\n]]"), false);
  });

  test("ignores shellscript comments", () => {
    assert.strictEqual(closes("shellscript", "# if condition; then"), false);
    assert.strictEqual(closes("shellscript", "echo value # do"), false);
    assert.strictEqual(
      closes("shellscript", "if [ -f file ]; then # comment"),
      true
    );
  });

  test("keeps Lua same-line block comments from affecting later lines", () => {
    const document = new TestDocument("--[[ if condition then ]]\nif condition then");

    assert.strictEqual(closesAt("lua", document, 1), true);
  });

  test("does not add end for Lua repeat until blocks", () => {
    assert.strictEqual(closes("lua", "repeat"), false);
    assert.strictEqual(closes("lua", "until condition"), false);
  });

  test("skips middle-of-line enter unless modifier is used", () => {
    const document = new TestDocument("if condition");

    assert.strictEqual(
      shouldAddEnd({
        columnNumber: 2,
        document,
        languageId: "ruby",
        lineNumber: 0,
      }),
      false
    );

    assert.strictEqual(
      shouldAddEnd({
        calledWithModifier: true,
        columnNumber: 2,
        document,
        languageId: "ruby",
        lineNumber: 0,
      }),
      true
    );
  });

  test("closes before a lower-indentation end", () => {
    assert.strictEqual(closes("ruby", "  if condition\nend"), true);
  });

  test("keeps current indentation semantics", () => {
    assert.strictEqual(indentationFor("  if condition"), "  ");
    assert.strictEqual(indentationFor("   "), "   ");
    assert.strictEqual(indentationFor(""), "");
  });

});
