import { LanguageDefinition } from "./types";

export const crystal: LanguageDefinition = {
  comments: {
    line: ["#"],
    block: [],
  },
  openings: [
    /^\s*?if(\s|\()/,
    /^\s*?unless(\s|\()/,
    /^\s*?while(\s|\()/,
    /^\s*?for(\s|\()/,
    /\s?do(\s?$|\s\|.*\|\s?$)/,
    /^\s*?enum\s/,
    /^\s*?struct\s/,
    /^\s*?macro\s/,
    /^\s*?union\s/,
    /^\s*?lib\s/,
    /^\s*?annotation\s/,
    /^\s*?def\s/,
    /^\s*?class\s/,
    /^\s*?module\s/,
    /^\s*?case(\s|\()/,
    /^\s*?begin\s/,
    /^\s*?until(\s|\()/,
  ],
};
