import * as assert from "assert";
import * as vscode from "vscode";
import { EndwiseOnTypeFormattingEditProvider } from "../../formatter";

class TestDocument {
  readonly languageId: string;
  private readonly lines: string[];

  constructor(content: string, languageId: string) {
    this.languageId = languageId;
    this.lines = content.split("\n");
  }

  get lineCount(): number {
    return this.lines.length;
  }

  lineAt(lineNumber: number): vscode.TextLine {
    const text = this.lines[lineNumber];
    return {
      text,
      isEmptyOrWhitespace: text.trim().length === 0,
    } as vscode.TextLine;
  }

  positionAt(offset: number): vscode.Position {
    const textBeforeOffset = this.lines.join("\n").slice(0, offset);
    const linesBeforeOffset = textBeforeOffset.split("\n");
    return new vscode.Position(
      linesBeforeOffset.length - 1,
      linesBeforeOffset[linesBeforeOffset.length - 1].length
    );
  }
}

function provideEdits(
  content: string,
  language = "ruby",
  formattingOptions: vscode.FormattingOptions = { insertSpaces: true, tabSize: 2 }
): vscode.ProviderResult<vscode.TextEdit[]> {
  const cursorPosition = content.indexOf("$") + 1;
  assert.ok(cursorPosition > 0, "Test content must include a $ cursor marker");

  const document = new TestDocument(
    content.replace("$", "\n"),
    language
  ) as unknown as vscode.TextDocument;
  const formatter: vscode.OnTypeFormattingEditProvider =
    new EndwiseOnTypeFormattingEditProvider();

  return formatter.provideOnTypeFormattingEdits(
    document,
    document.positionAt(cursorPosition),
    "\n",
    formattingOptions,
    new vscode.CancellationTokenSource().token
  );
}

function applyEdits(content: string, edits: readonly vscode.TextEdit[]): string {
  const lines = content.split("\n");
  const offsets = [0];

  for (const line of lines.slice(0, -1)) {
    offsets.push(offsets[offsets.length - 1] + line.length + 1);
  }

  const offsetAt = (position: vscode.Position) =>
    position.line >= offsets.length
      ? content.length
      : offsets[position.line] + position.character;

  return [...edits]
    .sort((a, b) => {
      return offsetAt(b.range.start) - offsetAt(a.range.start);
    })
    .reduce((text, edit) => {
      const start = offsetAt(edit.range.start);
      const end = offsetAt(edit.range.end);
      return text.slice(0, start) + edit.newText + text.slice(end);
    }, content);
}

suite("Endwise on-type formatter", () => {
  test("adds end for a Ruby block", async () => {
    const textAfterEnter = "if condition\n";
    const edits = await provideEdits("if condition$");

    assert.ok(edits);
    assert.strictEqual(applyEdits(textAfterEnter, edits), "if condition\n  \nend");
  });

  test("adds end for a Crystal block", async () => {
    const textAfterEnter = "enum Color\n";
    const edits = await provideEdits("enum Color$", "crystal");

    assert.ok(edits);
    assert.strictEqual(applyEdits(textAfterEnter, edits), "enum Color\n  \nend");
  });

  test("preserves closing indentation", async () => {
    const textAfterEnter = "  if condition\n";
    const edits = await provideEdits("  if condition$");

    assert.ok(edits);
    assert.strictEqual(
      applyEdits(textAfterEnter, edits),
      "  if condition\n    \n  end"
    );
  });

  test("indents a HelloWorld class method body", async () => {
    const textAfterEnter = "class HelloWorld\n  def hello\n\nend";
    const edits = await provideEdits("class HelloWorld\n  def hello$\nend");

    assert.ok(edits);
    assert.strictEqual(
      applyEdits(textAfterEnter, edits),
      "class HelloWorld\n  def hello\n    \n  end\nend"
    );
  });

  test("skips already balanced blocks", async () => {
    const edits = await provideEdits("if condition$\nend");

    assert.strictEqual(edits, undefined);
  });

  test("skips unsupported languages", async () => {
    const edits = await provideEdits("if condition$", "plaintext");

    assert.strictEqual(edits, undefined);
  });

  test("skips middle-of-line newlines", async () => {
    const edits = await provideEdits("if con$dition");

    assert.strictEqual(edits, undefined);
  });

  test("skips endless and single-line definitions", async () => {
    assert.strictEqual(
      await provideEdits('def foo; puts "bar"; end$'),
      undefined
    );
    assert.strictEqual(await provideEdits("def foo = bar$"), undefined);
  });
});
