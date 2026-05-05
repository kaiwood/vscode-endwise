import * as assert from "assert";
import * as vscode from "vscode";
import { isLanguageEnabled } from "../../settings";

async function withLanguageEnabledSetting(
  languageId: "ruby" | "crystal",
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
});
