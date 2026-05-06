import { LanguageDefinition } from "./types";

export const shellscript: LanguageDefinition = {
  closePattern: /^(?:fi|done|esac)\b/,
  comments: {
    line: ["#"],
    block: [],
  },
  openings: [
    { pattern: /\bthen\s*$/, close: "fi" },
    { pattern: /^\s*case\b/, close: "esac" },
    { pattern: /\bdo\s*$/, close: "done" },
  ],
};
