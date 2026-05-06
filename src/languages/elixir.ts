import { LanguageDefinition } from "./types";

export const elixir: LanguageDefinition = {
  comments: {
    line: ["#"],
    block: [],
  },
  openings: [
    { pattern: /\bdo\s*$/, close: "end" },
    { pattern: /^\s*fn\s*$/, close: "end" },
    { pattern: /\bfn\b.*->\s*$/, close: "end" },
  ],
};
