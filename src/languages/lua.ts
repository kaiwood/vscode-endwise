import { LanguageDefinition } from "./types";

export const lua: LanguageDefinition = {
  comments: {
    line: ["--"],
    block: [{ start: /^\s*--\[\[/, end: /\]\]/ }],
  },
  openings: [
    /^\s*do\s*$/,
    /^\s*while\b.*\bdo\s*$/,
    /^\s*if\b.*\bthen\s*$/,
    /^\s*for\b.*\bdo\s*$/,
    /^\s*(?:local\s+)?function\b.*\)\s*$/,
  ],
};
