import { crystal } from "./crystal";
import { ruby } from "./ruby";
import { LanguageDefinition } from "./types";

export const SUPPORTED_LANGUAGES = ["ruby", "crystal"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_DEFINITIONS: Record<SupportedLanguage, LanguageDefinition> = {
  ruby,
  crystal,
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
