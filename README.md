# portfolio-sheet-utils

A Google Apps Script utility library for portfolio analysis, including FIFO position tracking, realized gain reporting, and XIRR/MWRR calculations.

## Project scripts

- `npm run build` — compile TypeScript and copy `src/appsscript.json` into `dist/`
- `npm run test` — run Vitest tests once
- `npm run test:watch` — run Vitest in watch mode
- `npm run coverage` — run tests and generate coverage reports in `coverage/`
- `npm run push` — build and push the Apps Script project via `clasp`
- `npm run pull` — pull the latest Apps Script project from Google Drive

## Coverage

After running `npm run coverage`, open `coverage/index.html` in your browser to view the HTML coverage report.

## Usage

The main Google Apps Script entrypoint is `src/main.ts`, which exposes:

- `GET_FIFO_POSITIONS`
- `GET_REALIZED_GAINS`
- `GET_POSITION_XIRR`

### Expected inputs

- `GET_FIFO_POSITIONS(transactions, stocksImport)`
  - `transactions`: `[date, wkn, type, shares, price, fees, total]`
  - `stocksImport`: `[WKN, ..., name, ..., currentPrice]` (stock name is expected at column D and price at column J)

- `GET_REALIZED_GAINS(transactions)`
  - `transactions`: `[date, wkn, type, shares, price, fees, total]`

- `GET_POSITION_XIRR(wknFilter, transactions, dividends, stocksImport)`
  - `wknFilter`: WKN string or `TOTAL`
  - `transactions`: `[date, wkn, type, shares, price, fees, total]`
  - `dividends`: `[date, wkn, ..., net payout]`
  - `stocksImport`: `[WKN, ..., stockName, ..., currentPrice]`

The implementation logic lives in `src/portfolio.ts` for easier testing and maintenance.
