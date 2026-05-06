# vscode-endwise

This is an extension that wisely adds closing keywords to code structures in languages like Ruby, Crystal, Elixir, Lua, or Bash while keeping the correct indentation levels. Inspired by tpope's [endwise.vim](https://github.com/tpope/vim-endwise).

![Endwise](./images/endwise.gif)

Hit `enter` after a block opener to get your block automagically closed.

`ctrl+enter` / `cmd+enter` closes from the middle of the line as well.

## TODO

- [X] Wisely detect already closed blocks to skip additional "end"'s
- [ ] Add support for more languages:
  - [x]  Crystal
  - [x]  Elixir
  - [x]  Lua
  - [x]  Bash
- [ ] Add a gif with code that actually makes sense 🙄
