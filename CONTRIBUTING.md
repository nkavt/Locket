# Contributing to Locket

Thanks for helping out. Bug reports, fixes, docs and features are all welcome.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

- **Questions and ideas** go in [Discussions](https://github.com/nkavt/Locket/discussions).
- **Bugs** go in [Issues](https://github.com/nkavt/Locket/issues/new/choose). Search first to avoid duplicates.
- **Security problems** must not be reported in public. See [SECURITY.md](SECURITY.md).
- **Larger changes** (new features, new dependencies, changes to the data model or the MCP tools): open an issue or discussion first, so we can agree on the approach before you write the code.

## Making a change

You don't need write access. Work in your own fork:

1. Fork [nkavt/Locket](https://github.com/nkavt/Locket) and clone your fork.
2. Install Node 22 (see `.nvmrc`), then:

   ```sh
   npm install      # also rebuilds better-sqlite3 against Electron
   npm run dev      # Vite + tsc watch + Electron
   ```

3. Create a branch from `main`, for example `fix/comment-duplicates` or `feature/ticket-search`.
4. Make your change. Add or update tests where it makes sense.
5. Run the same checks as CI:

   ```sh
   npm run lint
   npx tsc -b
   npx tsc -p electron --noEmit
   npx prettier --check src electron   # npm run format fixes it
   npm test
   npm run build
   ```

6. Push to your fork and open a pull request into `main`.

## Pull requests

- Keep each PR to one change. Unrelated fixes belong in separate PRs.
- Explain **why** as well as **what**, and how you tested it. For UI changes, add before/after screenshots in light and dark mode.
- CI must pass. CI on PRs from outside contributors starts after a maintainer approves the run.
- A maintainer reviews every PR. PRs are squash-merged, so the PR title becomes the commit message on `main`. Write it as a short imperative sentence, like "Fix comments appearing twice".
- Don't bump the version in `package.json`. That happens in a separate release PR.

## Project layout

See [Development](README.md#development) in the README for scripts, the folder layout and where data is stored.

## License

Contributions are released under the project's [MIT License](LICENSE).
