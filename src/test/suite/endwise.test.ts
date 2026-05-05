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
  const lineText = document.lineAt(0);

  return shouldAddEnd({
    calledWithModifier,
    columnNumber: lineText.length,
    document,
    languageId,
    lineNumber: 0,
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

  test("skips already balanced blocks", () => {
    assert.strictEqual(closes("ruby", "if condition\nend"), false);
    assert.strictEqual(
      closes("ruby", "if condition\nif other\nend\nend"),
      false
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
