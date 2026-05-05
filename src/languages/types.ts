export interface BlockCommentSyntax {
  start: RegExp;
  end: RegExp;
}

export interface CommentSyntax {
  line: string[];
  block: BlockCommentSyntax[];
}

export interface LanguageDefinition {
  comments: CommentSyntax;
  openings: RegExp[];
}
