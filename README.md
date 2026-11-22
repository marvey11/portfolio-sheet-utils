# portfolio-sheet-utils

A Google Apps Script utility library for portfolio analysis, including FIFO position tracking, realized gain reporting, XIRR/MWRR calculations, and reverse DCF analysis.

## Project scripts

- `npm run build` — compile TypeScript and copy `appsscript.json` into `dist/`
- `npm run test` — run Vitest tests once
- `npm run test:watch` — run Vitest in watch mode
- `npm run coverage` — run tests and generate coverage reports in `coverage/`
- `npm run check:all` — build, lint, and test the project
- `npm run format:check` — verify source and Markdown formatting
- `npm run push` — build and push the Apps Script project via `clasp`
- `npm run pull` — pull the latest Apps Script project from Google Drive

## Coverage

After running `npm run coverage`, open `coverage/index.html` in your browser to view the HTML coverage report.

## Usage

The main Google Apps Script entrypoint is `src/main.ts`, which exposes:

- `GET_FIFO_POSITIONS`
- `GET_REALIZED_GAINS`
- `GET_POSITION_XIRR`
- `GET_IMPLIED_GROWTH_RATE`

### Expected inputs

- `GET_FIFO_POSITIONS(transactions, stocksImport)`
  - `transactions`: `[date, wkn, type, shares, price, fees, total]`
  - `stocksImport`: `[WKN, ..., name, ..., currentPrice]` (stock name is expected at column D and price at column K)

- `GET_REALIZED_GAINS(transactions)`
  - `transactions`: `[date, wkn, type, shares, price, fees, total]`

- `GET_POSITION_XIRR(wknFilter, transactions, dividends, stocksImport)`
  - `wknFilter`: WKN string or `TOTAL`
  - `transactions`: `[date, wkn, type, shares, price, fees, total]`
  - `dividends`: `[date, wkn, ..., net payout]`
  - `stocksImport`: `[WKN, ..., stockName, ..., currentPrice]`

- `GET_IMPLIED_GROWTH_RATE(sharePrice, fcfBase, discountRate, terminalGrowthRate, sharesOutstanding, totalCash, totalDebt)`
  - `sharePrice`: current market price per share
  - `fcfBase`: most recent free cash flow for Year 0
  - `discountRate`: fixed annual discount rate as a decimal, such as `0.10`
  - `terminalGrowthRate`: fixed perpetual growth rate as a decimal, such as `0.02`
  - `sharesOutstanding`: total shares outstanding
  - `totalCash`: total cash and cash equivalents
  - `totalDebt`: total debt
  - Returns the implied 10-year annual growth rate as a decimal.
  - Throws an actual sheet-visible error when inputs are invalid or no solution exists within `-50%` to `200%`, allowing it to be handled with `IFERROR`.

The implementation logic lives in `src/main.ts` for easier testing and maintenance.
