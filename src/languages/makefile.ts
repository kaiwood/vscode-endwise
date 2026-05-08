import { LanguageDefinition } from "./types";

export const makefile: LanguageDefinition = {
  closePattern: /^endif\b/,
  comments: {
    line: ["#"],
    block: [],
  },
  openings: [
    { pattern: /^\s*if(?:eq|neq)\b/, close: "endif" },
    { pattern: /^\s*ifn?def\b/, close: "endif" },
  ],
};
