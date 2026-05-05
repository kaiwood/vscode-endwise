import * as vscode from "vscode";
import { isSupportedLanguage } from "./languages";

export function isLanguageEnabled(
  languageId: string,
  scope?: vscode.ConfigurationScope
): boolean {
  if (!isSupportedLanguage(languageId)) {
    return false;
  }

  return vscode.workspace
    .getConfiguration("endwise", scope)
    .get<boolean>(`languages.${languageId}.enabled`, true);
}
