export const OPENINGS_RUBY = [
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
];

export const OPENINGS_CRYSTAL = [
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
];

const SINGLE_LINE_DEFINITION = /;\s*end[\s;]*$/;
const ENDLESS_DEFINITION = /^\s*?def\s+[^\s(]+\s*(?:\(.*\))?\s+=/;
const LINE_PARSE_LIMIT = 100000;

export interface EndwiseDocument {
  lineCount: number;
  lineAt(lineNumber: number): string;
}

export interface ShouldAddEndOptions {
  calledWithModifier?: boolean;
  columnNumber: number;
  document: EndwiseDocument;
  languageId: string;
  lineNumber: number;
}

export function openingsForLanguage(languageId: string): RegExp[] {
  switch (languageId) {
    case "ruby":
      return OPENINGS_RUBY;
    case "crystal":
      return OPENINGS_CRYSTAL;
    default:
      return [];
  }
}

export function indentationFor(lineText: string): string {
  const trimmedLine: string = lineText.trim();
  if (trimmedLine.length === 0) {
    return lineText;
  }

  const whitespaceEndsAt: number = lineText.indexOf(trimmedLine);
  const indentation: string = lineText.substr(0, whitespaceEndsAt);

  return indentation;
}

export function shouldAcceptSelectedSuggestion(
  suggestionOnEnter: unknown
): boolean {
  return suggestionOnEnter !== "off";
}

export function shouldAddEnd(options: ShouldAddEndOptions): boolean {
  const calledWithModifier = options.calledWithModifier ?? false;
  const openings = openingsForLanguage(options.languageId);
  const lineText = options.document.lineAt(options.lineNumber);
  const currentIndentation = indentationFor(lineText);

  // Do not close if enter key is pressed in the middle of a line, except when a modifier key is used.
  if (!calledWithModifier && lineText.length > options.columnNumber) {
    return false;
  }

  if (lineText.match(SINGLE_LINE_DEFINITION)) {
    return false;
  }

  if (lineText.match(ENDLESS_DEFINITION)) {
    return false;
  }

  for (const condition of openings) {
    if (!lineText.match(condition)) {
      continue;
    }

    let stackCount = 0;
    const documentLineCount = options.document.lineCount;

    for (
      let ln = options.lineNumber;
      ln <= options.lineNumber + LINE_PARSE_LIMIT;
      ln++
    ) {
      if (documentLineCount <= ln + 1) {
        return true;
      }

      const line = options.document.lineAt(ln + 1);
      const lineStartsWithEnd = line.trim().startsWith("end");

      if (currentIndentation > indentationFor(line) && lineStartsWithEnd) {
        return true;
      }

      if (currentIndentation === indentationFor(line)) {
        for (const innerCondition of openings) {
          if (line.match(innerCondition)) {
            stackCount += 1;
            break;
          }
        }

        if (lineStartsWithEnd && stackCount > 0) {
          stackCount -= 1;
          continue;
        } else if (lineStartsWithEnd) {
          return false;
        }
      }
    }
  }

  return false;
}
