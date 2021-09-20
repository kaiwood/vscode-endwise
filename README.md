# vscode-endsitter

This is an extension that wisely adds the "end" keyword to code structures in Ruby while keeping the correct indentation levels.

This version was based on [endwise](https://github.com/kaiwood/vscode-endwise) but uses tree-sitter to decide if end should be added to the code.

Just hit `enter` to get your block automagically closed. `ctrl+enter` / `cmd+enter` closed from the middle of the line as well.