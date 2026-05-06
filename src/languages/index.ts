import { crystal } from "./crystal";
import { lua } from "./lua";
import { ruby } from "./ruby";
import { shellscript } from "./shellscript";
import { LanguageDefinition } from "./types";

export const SUPPORTED_LANGUAGES = [
  "ruby",
  "crystal",
  "lua",
  "shellscript",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_DEFINITIONS: Record<SupportedLanguage, LanguageDefinition> = {
  ruby,
  crystal,
  lua,
  shellscript,
};

export function isSupportedLanguage(
  languageId: string
): languageId is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(languageId as SupportedLanguage);
}

export function languageDefinitionFor(
  languageId: string
): LanguageDefinition | undefined {
  if (!isSupportedLanguage(languageId)) {
    return undefined;
  }

  return LANGUAGE_DEFINITIONS[languageId];
}
