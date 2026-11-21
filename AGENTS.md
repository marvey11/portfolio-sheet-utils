# Repository instructions

- Use the existing TypeScript and Google Apps Script structure; do not introduce a new framework.
- Implement reusable calculation logic in `src/main.ts` and expose Google Sheet entrypoints through `src/index.ts`.
- Add function help metadata to `function-docs.json` for every custom Google Sheets function.
- Use Vitest for focused unit tests in `src/main.test.ts`.
- Keep all public calculations type-safe and return Google Sheet-compatible values.
- Use `npm run format` to format changes when needed.
- Run `npm run check:all` before completing code changes.
- Run `npm run coverage` and `npm run format:check` for the reverse DCF implementation.
- Review the final diff for accidental, unrelated changes and confirm no secrets or credentials were added.
