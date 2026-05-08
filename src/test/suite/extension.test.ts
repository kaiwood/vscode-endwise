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
  character?: number,
): Promise<vscode.TextEditor> {
  let document = await vscode.workspace.openTextDocument({
    content,
    language,
  });
  if (document.languageId !== language) {
    document = await vscode.languages.setTextDocumentLanguage(
      document,
      language,
    );
  }
  const editor = await vscode.window.showTextDocument(document);
  const position = new vscode.Position(
    line,
    character ?? document.lineAt(line).text.length,
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

async function withEditorIndentation(
  options: vscode.FormattingOptions,
  run: () => Promise<void>,
) {
  const config = vscode.workspace.getConfiguration("editor");
  const previousDetectIndentation =
    config.inspect("detectIndentation")?.globalValue;
  const previousInsertSpaces = config.inspect("insertSpaces")?.globalValue;
  const previousTabSize = config.inspect("tabSize")?.globalValue;

  try {
    await config.update(
      "detectIndentation",
      false,
      vscode.ConfigurationTarget.Global,
    );
    await config.update(
      "insertSpaces",
      options.insertSpaces,
      vscode.ConfigurationTarget.Global,
    );
    await config.update(
      "tabSize",
      options.tabSize,
      vscode.ConfigurationTarget.Global,
    );
    await run();
  } finally {
    await config.update(
      "detectIndentation",
      previousDetectIndentation,
      vscode.ConfigurationTarget.Global,
    );
    await config.update(
      "insertSpaces",
      previousInsertSpaces,
      vscode.ConfigurationTarget.Global,
    );
    await config.update(
      "tabSize",
      previousTabSize,
      vscode.ConfigurationTarget.Global,
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
      vscode.ConfigurationTarget.Global,
    );
    await run();
  } finally {
    await config.update(
      "insertFinalNewline",
      previous,
      vscode.ConfigurationTarget.Global,
    );
  }
}

async function withEndwiseLanguageEnabled(
  language:
    | "ruby"
    | "crystal"
    | "elixir"
    | "julia"
    | "lua"
    | "makefile"
    | "shellscript",
  value: boolean,
  run: () => Promise<void>,
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

async function typeTextWithoutWaiting(text: string) {
  await vscode.commands.executeCommand("type", { text });
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

    assert.ok(commands.includes("endwise.enter"));
    assert.ok(commands.includes("endwise.cmdEnter"));
  });

  test("does not use runtime vim keybinding conditions", async () => {
    interface PackageJson {
      contributes?: {
        keybindings?: { when?: string }[];
      };
    }

    const packageJson = JSON.parse(
      await fs.readFile(
        path.join(__dirname, "..", "..", "..", "package.json"),
        "utf8",
      ),
    ) as PackageJson;
    const conditions =
      packageJson.contributes?.keybindings?.map(
        (keybinding) => keybinding.when?.toLowerCase() ?? "",
      ) ?? [];

    assert.ok(!conditions.some((condition) => condition.includes("vim")));
  });

  test("contributes keybindings for supported languages", async () => {
    interface PackageJson {
      contributes?: {
        keybindings?: { when?: string }[];
      };
    }

    const packageJson = JSON.parse(
      await fs.readFile(
        path.join(__dirname, "..", "..", "..", "package.json"),
        "utf8",
      ),
    ) as PackageJson;
    const conditions =
      packageJson.contributes?.keybindings?.map(
        (keybinding) => keybinding.when ?? "",
      ) ?? [];

    for (const language of [
      "ruby",
      "crystal",
      "elixir",
      "julia",
      "lua",
      "makefile",
      "shellscript",
    ]) {
      assert.ok(
        conditions.every((condition) => condition.includes(language)),
        language,
      );
    }
  });

  test("adds end from the middle of a line with the modifier command", async () => {
    const editor = await openDocument("if condition", "ruby", 0, 2);

    await vscode.commands.executeCommand("endwise.cmdEnter");

    assert.strictEqual(editor.document.getText(), "if condition\n    \nend");
    assert.deepStrictEqual(editor.selection.active, new vscode.Position(1, 4));
  });

  test("modifier command indents the cursor when the block already has an end", async () => {
    const editor = await openDocument("if condition\nend", "ruby", 0, 2);

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

    assert.strictEqual(
      editor.document.getText(),
      "  if condition\n    \n  end",
    );
    assert.deepStrictEqual(editor.selection.active, new vscode.Position(1, 4));
  });

  test("adds end for every cursor with the modifier command", async () => {
    const editor = await openDocument(
      "if first\nputs value\n  if second",
      "ruby",
      0,
    );
    editor.options = { ...editor.options, insertSpaces: true, tabSize: 4 };
    editor.selections = [cursor(0, 2), cursor(2, 4)];

    await vscode.commands.executeCommand("endwise.cmdEnter");

    assert.strictEqual(
      editor.document.getText(),
      "if first\n    \nend\nputs value\n  if second\n      \n  end",
    );
    assert.deepStrictEqual(
      editor.selections.map((selection) => selection.active),
      [new vscode.Position(1, 4), new vscode.Position(5, 6)],
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
      [new vscode.Position(1, 4)],
    );
  });

  test("mixes end insertion and plain line breaks with multiple cursors", async () => {
    const editor = await openDocument("if condition\nvalue", "ruby", 0);
    editor.options = { ...editor.options, insertSpaces: true, tabSize: 4 };
    editor.selections = [cursor(0, 2), cursor(1, 2)];

    await vscode.commands.executeCommand("endwise.cmdEnter");

    assert.strictEqual(
      editor.document.getText(),
      "if condition\n    \nend\nvalue\n",
    );
    assert.deepStrictEqual(
      editor.selections.map((selection) => selection.active),
      [new vscode.Position(1, 4), new vscode.Position(4, 0)],
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

  test("modifier command inserts a plain line break when Lua is disabled", async () => {
    await withEndwiseLanguageEnabled("lua", false, async () => {
      const editor = await openDocument("if condition then", "lua", 0, 2);

      await vscode.commands.executeCommand("endwise.cmdEnter");

      assert.ok(!editor.document.getText().includes("end"));
      assert.strictEqual(editor.selection.active.line, 1);
    });
  });

  test("modifier command inserts a plain line break when shellscript is disabled", async () => {
    await withEndwiseLanguageEnabled("shellscript", false, async () => {
      const editor = await openDocument(
        "while true; do",
        "shellscript",
        0,
        2,
      );

      await vscode.commands.executeCommand("endwise.cmdEnter");

      assert.strictEqual(editor.document.getText(), "while true; do\n");
      assert.strictEqual(editor.selection.active.line, 1);
    });
  });

  test("adds end with the normal enter command", async () => {
    await withEditorIndentation(
      { insertSpaces: true, tabSize: 2 },
      async () => {
        const editor = await openDocument("if condition", "ruby", 0);

        await vscode.commands.executeCommand("endwise.enter");

        assert.strictEqual(editor.document.getText(), "if condition\n  \nend");
        assert.deepStrictEqual(
          editor.selection.active,
          new vscode.Position(1, 2),
        );
      },
    );
  });

  test("keeps the caret in the HelloWorld method body when typing", async () => {
    await withEditorIndentation(
      { insertSpaces: true, tabSize: 2 },
      async () => {
        const editor = await openDocument("", "ruby", 0);

        await typeText("class HelloWorld");
        await vscode.commands.executeCommand("endwise.enter");
        await typeText("def hello");
        await vscode.commands.executeCommand("endwise.enter");

        assert.strictEqual(
          editor.document.getText(),
          "class HelloWorld\n  def hello\n    \n  end\nend",
        );
        assert.deepStrictEqual(
          editor.selection.active,
          new vscode.Position(2, 4),
        );
      },
    );
  });

  test("keeps indentation when typing immediately after enter", async () => {
    await withEditorIndentation(
      { insertSpaces: true, tabSize: 2 },
      async () => {
        const editor = await openDocument("", "ruby", 0);

        await typeTextWithoutWaiting("class HelloWorld");
        await vscode.commands.executeCommand("endwise.enter");
        await typeTextWithoutWaiting("def hello");
        await new Promise((resolve) => setTimeout(resolve, 100));

        assert.strictEqual(
          editor.document.getText(),
          "class HelloWorld\n  def hello\nend",
        );
        assert.deepStrictEqual(
          editor.selection.active,
          new vscode.Position(1, 11),
        );
      },
    );
  });

  test("keeps normal indentation when enter does not add end", async () => {
    await withEditorIndentation(
      { insertSpaces: true, tabSize: 2 },
      async () => {
        const editor = await openDocument("  puts value", "ruby", 0);

        await vscode.commands.executeCommand("endwise.enter");

        assert.strictEqual(editor.document.getText(), "  puts value\n  ");
        assert.deepStrictEqual(
          editor.selection.active,
          new vscode.Position(1, 2),
        );
      },
    );
  });

  test("adds end for every cursor with the normal enter command", async () => {
    const editor = await openDocument("if first\nif second", "ruby", 0);
    editor.options = { ...editor.options, insertSpaces: true, tabSize: 4 };
    editor.selections = [cursor(0, 8), cursor(1, 9)];

    await vscode.commands.executeCommand("endwise.enter");

    assert.strictEqual(
      editor.document.getText(),
      "if first\n    \nend\nif second\n    \nend",
    );
    assert.deepStrictEqual(
      editor.selections.map((selection) => selection.active),
      [new vscode.Position(1, 4), new vscode.Position(4, 4)],
    );
  });

  test("does not add end while typing when Ruby is disabled", async () => {
    await withEndwiseLanguageEnabled("ruby", false, async () => {
      const editor = await openDocument("if condition", "ruby", 0);

      await vscode.commands.executeCommand("endwise.enter");

      assert.ok(!editor.document.getText().includes("end"));
      assert.strictEqual(editor.selection.active.line, 1);
    });
  });

  test("does not add end when save inserts the final newline", async () => {
    await withInsertFinalNewlineEnabled(async () => {
      const directory = await fs.mkdtemp(
        path.join(os.tmpdir(), "vscode-endwise-"),
      );
      const filePath = path.join(directory, "final-newline.rb");

      try {
        await fs.writeFile(filePath, "if condition ", "utf8");

        let document = await vscode.workspace.openTextDocument(filePath);
        if (document.languageId !== "ruby") {
          document = await vscode.languages.setTextDocumentLanguage(
            document,
            "ruby",
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
