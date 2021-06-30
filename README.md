# vscode-endwise

This is an extension that wisely adds the "end" keyword to code structures in Ruby and Crystal while keeping the correct indentation levels, inspired by tpope's [endwise.vim](https://github.com/tpope/vim-endwise).

![Endwise](./images/endwise.gif)

Just hit `enter` to get your block automagically closed. `ctrl+enter` / `cmd+enter` closed from the middle of the line as well.

## TODO

- [X] Wisely detect already closed blocks to skip additional "end"'s
- [ ] Add support for more languages:
  - [ ]  Lua
  - [ ]  Bash
  - [x]  Crystal
- [ ] Add a gif with code that actually makes sense 🙄
