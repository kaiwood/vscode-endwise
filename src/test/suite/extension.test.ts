import * as assert from "assert";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

async function activateExtension() {
  const extension = vscode.extensions.getExtension("kaiwood.endwise");
  assert.ok(extension, "Expected kaiwood.endwise to be available");
  await extension.activate();
}

async function openDocument(
  content: string,
  language: string,
  line: number,
  character?: number
): Promise<vscode.TextEditor> {
  let document = await vscode.workspace.openTextDocument({
    content,
    language,
  });
  if (document.languageId !== language) {
    document = await vscode.languages.setTextDocumentLanguage(
      document,
      language
    );
  }
  const editor = await vscode.window.showTextDocument(document);
  const position = new vscode.Position(
    line,
    character ?? document.lineAt(line).text.length
  );
  editor.selection = new vscode.Selection(position, position);
  return editor;
}

function cursor(line: number, character: number): vscode.Selection {
  const position = new vscode.Position(line, character);
  return new vscode.Selection(position, position);
}

async function closeActiveEditor() {
  await new Promise((resolve) => setTimeout(resolve, 100));
  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
}

async function withFormatOnTypeEnabled(run: () => Promise<void>) {
  const config = vscode.workspace.getConfiguration("editor");
  const previous = config.inspect("formatOnType")?.globalValue;

  try {
    await config.update(
      "formatOnType",
      true,
      vscode.ConfigurationTarget.Global
    );
    await run();
  } finally {
    await config.update(
      "formatOnType",
      previous,
      vscode.ConfigurationTarget.Global
    );
  }
}

async function withInsertFinalNewlineEnabled(run: () => Promise<void>) {
  const config = vscode.workspace.getConfiguration("files");
  const previous = config.inspect("insertFinalNewline")?.globalValue;

  try {
    await config.update(
      "insertFinalNewline",
      true,
      vscode.ConfigurationTarget.Global
    );
    await run();
  } finally {
    await config.update(
      "insertFinalNewline",
      previous,
      vscode.ConfigurationTarget.Global
    );
  }
}

async function withEndwiseLanguageEnabled(
  language: "ruby" | "crystal",
  value: boolean,
  run: () => Promise<void>
) {
  const config = vscode.workspace.getConfiguration("endwise");
  const setting = `languages.${language}.enabled`;
  const previous = config.inspect<boolean>(setting)?.globalValue;

  try {
    await config.update(setting, value, vscode.ConfigurationTarget.Global);
    await run();
  } finally {
    await config.update(setting, previous, vscode.ConfigurationTarget.Global);
  }
}

async function typeText(text: string) {
  await vscode.commands.executeCommand("type", { text });
  await new Promise((resolve) => setTimeout(resolve, 100));
}

suite("Extension commands", () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  teardown(async () => {
    await closeActiveEditor();
  });

  test("registers contributed commands", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes("endwise.cmdEnter"));
  });

  test("adds end from the middle of a line with the modifier command", async () => {
    const editor = await openDocument("if condition", "ruby", 0, 2);

    await vscode.commands.executeCommand("endwise.cmdEnter");

    assert.strictEqual(editor.document.getText(), "if condition\n    \nend");
    assert.deepStrictEqual(editor.selection.active, new vscode.Position(1, 4));
  });

  test("modifier command keeps a def keyword intact", async () => {
    const editor = await openDocument("def hello", "ruby", 0, 1);

    await vscode.commands.executeCommand("endwise.cmdEnter");

    assert.strictEqual(editor.document.getText(), "def hello\n    \nend");
    assert.deepStrictEqual(editor.selection.active, new vscode.Position(1, 4));
  });

  test("modifier command keeps an end keyword intact", async () => {
    const editor = await openDocument("end", "ruby", 0, 1);

    await vscode.commands.executeCommand("endwise.cmdEnter");

    assert.strictEqual(editor.document.getText(), "end\n");
    assert.deepStrictEqual(editor.selection.active, new vscode.Position(1, 0));
  });

  test("preserves indentation when adding end", async () => {
    const editor = await openDocument("  if condition", "ruby", 0);

    await vscode.commands.executeCommand("endwise.cmdEnter");

    assert.strictEqual(editor.document.getText(), "  if condition\n    \n  end");
    assert.deepStrictEqual(editor.selection.active, new vscode.Position(1, 4));
  });

  test("adds end for every cursor with the modifier command", async () => {
    const editor = await openDocument(
      "if first\nputs value\n  if second",
      "ruby",
      0
    );
    editor.options = { ...editor.options, insertSpaces: true, tabSize: 4 };
    editor.selections = [cursor(0, 2), cursor(2, 4)];

    await vscode.commands.executeCommand("endwise.cmdEnter");

    assert.strictEqual(
      editor.document.getText(),
      "if first\n    \nend\nputs value\n  if second\n      \n  end"
    );
    assert.deepStrictEqual(
      editor.selections.map((selection) => selection.active),
      [new vscode.Position(1, 4), new vscode.Position(5, 6)]
    );
  });

  test("adds end once for duplicate cursors on the same line", async () => {
    const editor = await openDocument("if condition", "ruby", 0);
    editor.options = { ...editor.options, insertSpaces: true, tabSize: 4 };
    editor.selections = [cursor(0, 2), cursor(0, 6)];

    await vscode.commands.executeCommand("endwise.cmdEnter");

    assert.strictEqual(editor.document.getText(), "if condition\n    \nend");
    assert.deepStrictEqual(
      editor.selections.map((selection) => selection.active),
      [new vscode.Position(1, 4)]
    );
  });

  test("mixes end insertion and plain line breaks with multiple cursors", async () => {
    const editor = await openDocument("if condition\nvalue", "ruby", 0);
    editor.options = { ...editor.options, insertSpaces: true, tabSize: 4 };
    editor.selections = [cursor(0, 2), cursor(1, 2)];

    await vscode.commands.executeCommand("endwise.cmdEnter");

    assert.strictEqual(
      editor.document.getText(),
      "if condition\n    \nend\nvalue\n"
    );
    assert.deepStrictEqual(
      editor.selections.map((selection) => selection.active),
      [new vscode.Position(1, 4), new vscode.Position(4, 0)]
    );
  });

  test("modifier command inserts a plain line break when Ruby is disabled", async () => {
    await withEndwiseLanguageEnabled("ruby", false, async () => {
      const editor = await openDocument("if condition", "ruby", 0, 2);

      await vscode.commands.executeCommand("endwise.cmdEnter");

      assert.ok(!editor.document.getText().includes("end"));
      assert.strictEqual(editor.selection.active.line, 1);
    });
  });

  test("keeps the caret in the HelloWorld method body when typing", async () => {
    await withFormatOnTypeEnabled(async () => {
      const editor = await openDocument("", "ruby", 0);
      editor.options = { ...editor.options, insertSpaces: true, tabSize: 2 };

      await typeText("class HelloWorld");
      await typeText("\n");
      await typeText("def hello");
      await typeText("\n");

      assert.strictEqual(
        editor.document.getText(),
        "class HelloWorld\n  def hello\n    \n  end\nend"
      );
      assert.deepStrictEqual(
        editor.selection.active,
        new vscode.Position(2, 4)
      );
    });
  });

  test("adds end for every cursor while typing", async () => {
    await withFormatOnTypeEnabled(async () => {
      const editor = await openDocument("if first\nif second", "ruby", 0);
      editor.options = { ...editor.options, insertSpaces: true, tabSize: 4 };
      editor.selections = [cursor(0, 8), cursor(1, 9)];

      await typeText("\n");

      assert.strictEqual(
        editor.document.getText(),
        "if first\n    \nend\nif second\n    \nend"
      );
      assert.deepStrictEqual(
        editor.selections.map((selection) => selection.active),
        [new vscode.Position(1, 4), new vscode.Position(4, 4)]
      );
    });
  });

  test("does not add end while typing when Ruby is disabled", async () => {
    await withFormatOnTypeEnabled(async () => {
      await withEndwiseLanguageEnabled("ruby", false, async () => {
        const editor = await openDocument("", "ruby", 0);

        await typeText("if condition");
        await typeText("\n");

        assert.ok(!editor.document.getText().includes("end"));
      });
    });
  });

  test("does not add end when save inserts the final newline", async () => {
    await withFormatOnTypeEnabled(async () => {
      await withInsertFinalNewlineEnabled(async () => {
        const directory = await fs.mkdtemp(
          path.join(os.tmpdir(), "vscode-endwise-")
        );
        const filePath = path.join(directory, "final-newline.rb");

        try {
          await fs.writeFile(filePath, "if condition ", "utf8");

          let document = await vscode.workspace.openTextDocument(filePath);
          if (document.languageId !== "ruby") {
            document = await vscode.languages.setTextDocumentLanguage(
              document,
              "ruby"
            );
          }
          const editor = await vscode.window.showTextDocument(document);
          const lineLength = editor.document.lineAt(0).text.length;
          await editor.edit((textEditor) => {
            textEditor.delete(new vscode.Range(0, lineLength - 1, 0, lineLength));
          });

          assert.strictEqual(editor.document.getText(), "if condition");
          assert.strictEqual(editor.document.isDirty, true);

          assert.strictEqual(await editor.document.save(), true);
          await new Promise((resolve) => setTimeout(resolve, 100));

          assert.strictEqual(editor.document.getText(), "if condition\n");
        } finally {
          await closeActiveEditor();
          await fs.rm(directory, { force: true, recursive: true });
        }
      });
    });
  });
});
