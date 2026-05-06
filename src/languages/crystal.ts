import { LanguageDefinition } from "./types";

export const crystal: LanguageDefinition = {
  comments: {
    line: ["#"],
    block: [],
  },
  openings: [
    { pattern: /^\s*?if(\s|\()/, close: "end" },
    { pattern: /^\s*?unless(\s|\()/, close: "end" },
    { pattern: /^\s*?while(\s|\()/, close: "end" },
    { pattern: /^\s*?for(\s|\()/, close: "end" },
    { pattern: /\s?do(\s?$|\s\|.*\|\s?$)/, close: "end" },
    { pattern: /^\s*?enum\s/, close: "end" },
    { pattern: /^\s*?struct\s/, close: "end" },
    { pattern: /^\s*?macro\s/, close: "end" },
    { pattern: /^\s*?union\s/, close: "end" },
    { pattern: /^\s*?lib\s/, close: "end" },
    { pattern: /^\s*?annotation\s/, close: "end" },
    { pattern: /^\s*?def\s/, close: "end" },
    { pattern: /^\s*?class\s/, close: "end" },
    { pattern: /^\s*?module\s/, close: "end" },
    { pattern: /^\s*?case(\s|\()/, close: "end" },
    { pattern: /^\s*?begin\s/, close: "end" },
    { pattern: /^\s*?until(\s|\()/, close: "end" },
  ],
};
