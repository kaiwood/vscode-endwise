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
    assert.ok(commands.includes("endwise.checkForAcceptSelectedSuggestion"));
  });

  test("adds end for a Ruby block through the enter command", async () => {
    const editor = await openDocument("if condition", "ruby", 0);

    await vscode.commands.executeCommand("endwise.enter");

    assert.strictEqual(editor.document.getText(), "if condition\n    \nend");
    assert.deepStrictEqual(editor.selection.active, new vscode.Position(1, 4));
  });

  test("does not add end for unsupported languages", async () => {
    const editor = await openDocument("if condition", "plaintext", 0);

    await vscode.commands.executeCommand("endwise.enter");

    assert.strictEqual(editor.document.getText(), "if condition\n");
  });

  test("does not add end when enter is pressed in the middle of a line", async () => {
    const editor = await openDocument("if condition", "ruby", 0, 2);

    await vscode.commands.executeCommand("endwise.enter");

    assert.strictEqual(editor.document.getText(), "if\n     condition");
  });

  test("adds end from the middle of a line with the modifier command", async () => {
    const editor = await openDocument("if condition", "ruby", 0, 2);

    await vscode.commands.executeCommand("endwise.cmdEnter");

    assert.strictEqual(editor.document.getText(), "if condition\n    \nend");
    assert.deepStrictEqual(editor.selection.active, new vscode.Position(1, 4));
  });

  test("preserves indentation when adding end", async () => {
    const editor = await openDocument("  if condition", "ruby", 0);

    await vscode.commands.executeCommand("endwise.enter");

    assert.strictEqual(editor.document.getText(), "  if condition\n    \n  end");
    assert.deepStrictEqual(editor.selection.active, new vscode.Position(1, 4));
  });

  test("keeps whitespace-only line cursor behavior", async () => {
    const editor = await openDocument("  ", "ruby", 0);

    await vscode.commands.executeCommand("endwise.enter");

    assert.strictEqual(editor.document.getText(), "  \n  ");
    assert.deepStrictEqual(editor.selection.active, new vscode.Position(1, 2));
  });

  test("routes suggestion command to endwise.enter when accept-on-enter is off", async () => {
    const config = vscode.workspace.getConfiguration("editor");
    const previous = config.inspect("acceptSuggestionOnEnter")?.globalValue;

    try {
      await config.update(
        "acceptSuggestionOnEnter",
        "off",
        vscode.ConfigurationTarget.Global
      );

      const editor = await openDocument("if condition", "ruby", 0);
      await vscode.commands.executeCommand(
        "endwise.checkForAcceptSelectedSuggestion"
      );

      assert.strictEqual(editor.document.getText(), "if condition\n    \nend");
    } finally {
      await config.update(
        "acceptSuggestionOnEnter",
        previous,
        vscode.ConfigurationTarget.Global
      );
    }
  });
});
