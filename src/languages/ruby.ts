import { LanguageDefinition } from "./types";

export const ruby: LanguageDefinition = {
  comments: {
    line: ["#"],
    block: [{ start: /^\s*=begin\b/, end: /^\s*=end\b/ }],
  },
  openings: [
    /^\s*?if(\s|\()/,
    /^\s*?unless(\s|\()/,
    /^\s*?while(\s|\()/,
    /^\s*?for(\s|\()/,
    /\s?do(\s?$|\s\|.*\|\s?$)/,
    /^\s*?def\s/,
    /^\s*?class\s/,
    /^\s*?module\s/,
    /^\s*?case(\s|\()/,
    /^\s*?begin\s/,
    /^\s*?until(\s|\()/,
  ],
};
