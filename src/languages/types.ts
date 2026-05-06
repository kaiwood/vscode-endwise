export interface BlockCommentSyntax {
  start: RegExp;
  end: RegExp;
}

export interface CommentSyntax {
  line: string[];
  block: BlockCommentSyntax[];
}

export interface BlockOpeningSyntax {
  close: string;
  pattern: RegExp;
}

export interface LanguageDefinition {
  closePattern?: RegExp;
  comments: CommentSyntax;
  openings: BlockOpeningSyntax[];
}
