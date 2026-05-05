import { languageDefinitionFor } from "./languages";
import { BlockCommentSyntax, CommentSyntax } from "./languages/types";

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
  return languageDefinitionFor(languageId)?.openings ?? [];
}

function commentSyntaxForLanguage(languageId: string): CommentSyntax {
  return languageDefinitionFor(languageId)?.comments ?? { line: [], block: [] };
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

function codeLineAt(
  document: EndwiseDocument,
  languageId: string,
  lineNumber: number
): string {
  const lineText = document.lineAt(lineNumber);
  const syntax = commentSyntaxForLanguage(languageId);

  if (isInsideBlockComment(document, lineNumber, syntax.block)) {
    return "";
  }

  return stripLineComment(lineText, syntax.line);
}

function isInsideBlockComment(
  document: EndwiseDocument,
  lineNumber: number,
  blockComments: BlockCommentSyntax[]
): boolean {
  let activeBlockComment: BlockCommentSyntax | undefined;

  for (let ln = 0; ln <= lineNumber; ln++) {
    const line = document.lineAt(ln);

    if (activeBlockComment) {
      const isTargetLine = ln === lineNumber;
      if (line.match(activeBlockComment.end)) {
        activeBlockComment = undefined;
      }
      if (isTargetLine) {
        return true;
      }
      continue;
    }

    for (const blockComment of blockComments) {
      if (line.match(blockComment.start)) {
        activeBlockComment = blockComment;
        if (ln === lineNumber) {
          return true;
        }
        break;
      }
    }
  }

  return false;
}

function stripLineComment(lineText: string, lineComments: string[]): string {
  let commentStartsAt = -1;

  for (const lineComment of lineComments) {
    const index = lineText.indexOf(lineComment);
    if (index === -1) {
      continue;
    }

    if (commentStartsAt === -1 || index < commentStartsAt) {
      commentStartsAt = index;
    }
  }

  if (commentStartsAt === -1) {
    return lineText;
  }

  return lineText.slice(0, commentStartsAt);
}

export function shouldAddEnd(options: ShouldAddEndOptions): boolean {
  const calledWithModifier = options.calledWithModifier ?? false;
  const openings = openingsForLanguage(options.languageId);
  const lineText = options.document.lineAt(options.lineNumber);
  const codeLine = codeLineAt(
    options.document,
    options.languageId,
    options.lineNumber
  );
  const currentIndentation = indentationFor(lineText);

  // Do not close if enter key is pressed in the middle of a line, except when a modifier key is used.
  if (!calledWithModifier && lineText.length > options.columnNumber) {
    return false;
  }

  if (codeLine.match(SINGLE_LINE_DEFINITION)) {
    return false;
  }

  if (codeLine.match(ENDLESS_DEFINITION)) {
    return false;
  }

  for (const condition of openings) {
    if (!codeLine.match(condition)) {
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
      const codeLineBelow = codeLineAt(
        options.document,
        options.languageId,
        ln + 1
      );
      const lineStartsWithEnd = codeLineBelow.trim().startsWith("end");

      if (currentIndentation > indentationFor(line) && lineStartsWithEnd) {
        return true;
      }

      if (currentIndentation === indentationFor(line)) {
        for (const innerCondition of openings) {
          if (codeLineBelow.match(innerCondition)) {
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
