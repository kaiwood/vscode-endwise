import * as assert from "assert";
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
});
