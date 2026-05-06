import {
  closingKeywordForLine,
  EndwiseDocument,
  indentationFor,
  lineOpensBlock,
} from "./endwise";

export interface EndwiseFormattingOptions {
  insertSpaces: boolean;
  tabSize: number;
}

export interface EndwisePosition {
  character: number;
  line: number;
}

export interface EndwiseRange {
  end: EndwisePosition;
  start: EndwisePosition;
}

export interface EndwiseEditPlan {
  addedEnd: boolean;
  cursorPosition: EndwisePosition;
  range: EndwiseRange;
  text: string;
}

export interface BuildEndwiseEditPlanOptions {
  calledWithModifier?: boolean;
  columnNumber: number;
  document: EndwiseDocument;
  formattingOptions: EndwiseFormattingOptions;
  languageEnabled?: boolean;
  languageId: string;
  lineNumber: number;
}

export function buildEndwiseEditPlan(
  options: BuildEndwiseEditPlanOptions
): EndwiseEditPlan | undefined {
  if (options.calledWithModifier) {
    return buildModifierPlan(options);
  }

  return buildEnterCommandPlan(options);
}

function buildEnterCommandPlan(
  options: BuildEndwiseEditPlanOptions
): EndwiseEditPlan | undefined {
  if (
    options.languageEnabled === false ||
    !lineExists(options.document, options.lineNumber)
  ) {
    return undefined;
  }

  const close = closingKeywordForBlock(options, false);
  if (!close) {
    return undefined;
  }

  const lineText = options.document.lineAt(options.lineNumber);
  const lineLength = lineText.length;
  const closingIndentation = indentationFor(lineText);
  const innerIndentation =
    closingIndentation + indentationUnit(options.formattingOptions);

  return {
    addedEnd: true,
    cursorPosition: position(options.lineNumber + 1, innerIndentation.length),
    range: range(
      options.lineNumber,
      lineLength,
      options.lineNumber,
      lineLength
    ),
    text: `\n${innerIndentation}\n${closingIndentation}${close}`,
  };
}

function buildModifierPlan(
  options: BuildEndwiseEditPlanOptions
): EndwiseEditPlan | undefined {
  if (!lineExists(options.document, options.lineNumber)) {
    return undefined;
  }

  const lineText = options.document.lineAt(options.lineNumber);
  const lineLength = lineText.length;

  if (options.languageEnabled === false) {
    return buildPlainNewlinePlan(options, lineLength);
  }

  const closingIndentation = indentationFor(lineText);
  const innerIndentation =
    closingIndentation + indentationUnit(options.formattingOptions);

  const close = closingKeywordForBlock(options, true);
  if (!close) {
    if (!lineOpensBlock(options)) {
      return buildPlainNewlinePlan(options, lineLength);
    }

    return {
      addedEnd: false,
      cursorPosition: position(options.lineNumber + 1, innerIndentation.length),
      range: range(
        options.lineNumber,
        lineLength,
        options.lineNumber,
        lineLength
      ),
      text: `\n${innerIndentation}`,
    };
  }

  return {
    addedEnd: true,
    cursorPosition: position(options.lineNumber + 1, innerIndentation.length),
    range: range(
      options.lineNumber,
      lineLength,
      options.lineNumber,
      lineLength
    ),
    text: `\n${innerIndentation}\n${closingIndentation}${close}`,
  };
}

function buildPlainNewlinePlan(
  options: BuildEndwiseEditPlanOptions,
  lineLength: number
): EndwiseEditPlan {
  return {
    addedEnd: false,
    cursorPosition: position(options.lineNumber + 1, 0),
    range: range(
      options.lineNumber,
      lineLength,
      options.lineNumber,
      lineLength
    ),
    text: "\n",
  };
}

function closingKeywordForBlock(
  options: BuildEndwiseEditPlanOptions,
  calledWithModifier: boolean
): string | undefined {
  return closingKeywordForLine({
    calledWithModifier,
    columnNumber: options.columnNumber,
    document: options.document,
    languageId: options.languageId,
    lineNumber: options.lineNumber,
  });
}

function lineExists(document: EndwiseDocument, lineNumber: number): boolean {
  return lineNumber >= 0 && lineNumber < document.lineCount;
}

function indentationUnit(options: EndwiseFormattingOptions): string {
  if (!options.insertSpaces) {
    return "\t";
  }

  return " ".repeat(options.tabSize);
}

function position(line: number, character: number): EndwisePosition {
  return { character, line };
}

function range(
  startLine: number,
  startCharacter: number,
  endLine: number,
  endCharacter: number
): EndwiseRange {
  return {
    end: position(endLine, endCharacter),
    start: position(startLine, startCharacter),
  };
}
