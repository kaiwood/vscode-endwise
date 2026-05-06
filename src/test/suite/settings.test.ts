import * as assert from "assert";
import * as vscode from "vscode";
import { isLanguageEnabled } from "../../settings";

async function withLanguageEnabledSetting(
  languageId: "ruby" | "crystal" | "lua" | "shellscript",
  value: boolean | undefined,
  run: () => Promise<void>
) {
  const config = vscode.workspace.getConfiguration("endwise");
  const setting = `languages.${languageId}.enabled`;
  const previous = config.inspect<boolean>(setting)?.globalValue;

  try {
    await config.update(setting, value, vscode.ConfigurationTarget.Global);
    await run();
  } finally {
    await config.update(setting, previous, vscode.ConfigurationTarget.Global);
  }
}

suite("Endwise settings", () => {
  test("enables Ruby by default", async () => {
    await withLanguageEnabledSetting("ruby", undefined, async () => {
      assert.strictEqual(isLanguageEnabled("ruby"), true);
    });
  });

  test("enables Crystal by default", async () => {
    await withLanguageEnabledSetting("crystal", undefined, async () => {
      assert.strictEqual(isLanguageEnabled("crystal"), true);
    });
  });

  test("enables Lua by default", async () => {
    await withLanguageEnabledSetting("lua", undefined, async () => {
      assert.strictEqual(isLanguageEnabled("lua"), true);
    });
  });

  test("enables shellscript by default", async () => {
    await withLanguageEnabledSetting("shellscript", undefined, async () => {
      assert.strictEqual(isLanguageEnabled("shellscript"), true);
    });
  });

  test("disables Ruby when configured off", async () => {
    await withLanguageEnabledSetting("ruby", false, async () => {
      assert.strictEqual(isLanguageEnabled("ruby"), false);
    });
  });

  test("disables Crystal when configured off", async () => {
    await withLanguageEnabledSetting("crystal", false, async () => {
      assert.strictEqual(isLanguageEnabled("crystal"), false);
    });
  });

  test("disables Lua when configured off", async () => {
    await withLanguageEnabledSetting("lua", false, async () => {
      assert.strictEqual(isLanguageEnabled("lua"), false);
    });
  });

  test("disables shellscript when configured off", async () => {
    await withLanguageEnabledSetting("shellscript", false, async () => {
      assert.strictEqual(isLanguageEnabled("shellscript"), false);
    });
  });
});
