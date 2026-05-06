import { LanguageDefinition } from "./types";

export const julia: LanguageDefinition = {
  comments: {
    line: ["#"],
    block: [],
  },
  openings: [
    { pattern: /^\s*begin\s*$/, close: "end" },
    { pattern: /^\s*if\b/, close: "end" },
    { pattern: /^\s*while\b/, close: "end" },
    { pattern: /^\s*for\b/, close: "end" },
    { pattern: /^\s*try\s*$/, close: "end" },
    { pattern: /^\s*let(?:\s|$)/, close: "end" },
    { pattern: /^\s*quote\s*$/, close: "end" },
    { pattern: /^\s*function\b/, close: "end" },
    { pattern: /^\s*macro\b/, close: "end" },
    { pattern: /^\s*module\b/, close: "end" },
    { pattern: /^\s*baremodule\b/, close: "end" },
    { pattern: /^\s*(?:mutable\s+)?struct\b/, close: "end" },
    { pattern: /^\s*abstract\s+type\b/, close: "end" },
    { pattern: /^\s*primitive\s+type\b/, close: "end" },
    { pattern: /\bdo(?:\s+.*)?\s*$/, close: "end" },
  ],
};
