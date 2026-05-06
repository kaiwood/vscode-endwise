import { LanguageDefinition } from "./types";

export const lua: LanguageDefinition = {
  comments: {
    line: ["--"],
    block: [{ start: /^\s*--\[\[/, end: /\]\]/ }],
  },
  openings: [
    { pattern: /^\s*do\s*$/, close: "end" },
    { pattern: /^\s*while\b.*\bdo\s*$/, close: "end" },
    { pattern: /^\s*if\b.*\bthen\s*$/, close: "end" },
    { pattern: /^\s*for\b.*\bdo\s*$/, close: "end" },
    { pattern: /^\s*(?:local\s+)?function\b.*\)\s*$/, close: "end" },
  ],
};
