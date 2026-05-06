import { LanguageDefinition } from "./types";

export const ruby: LanguageDefinition = {
  comments: {
    line: ["#"],
    block: [{ start: /^\s*=begin\b/, end: /^\s*=end\b/ }],
  },
  openings: [
    { pattern: /^\s*?if(\s|\()/, close: "end" },
    { pattern: /^\s*?unless(\s|\()/, close: "end" },
    { pattern: /^\s*?while(\s|\()/, close: "end" },
    { pattern: /^\s*?for(\s|\()/, close: "end" },
    { pattern: /\s?do(\s?$|\s\|.*\|\s?$)/, close: "end" },
    { pattern: /^\s*?def\s/, close: "end" },
    { pattern: /^\s*?class\s/, close: "end" },
    { pattern: /^\s*?module\s/, close: "end" },
    { pattern: /^\s*?case(\s|\()/, close: "end" },
    { pattern: /^\s*?begin\s/, close: "end" },
    { pattern: /^\s*?until(\s|\()/, close: "end" },
  ],
};
