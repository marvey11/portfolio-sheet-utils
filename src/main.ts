/**
 * Google Apps Script utilities for portfolio performance analysis.
 *
 * This module computes FIFO open positions, realized sells, and XIRR cash flow analysis.
 */

type SheetRow = readonly unknown[];
type SheetRange = ReadonlyArray<SheetRow>;

type PositionLot = {
  qty: number;
  cost: number;
};

type PositionData = {
  activeShares: number;
  costBasis: number;
  lots: PositionLot[];
};

const EPSILON = Number.EPSILON;
const SMALL_THRESHOLD = 0.000001;

/**
 * Returns the current open FIFO positions for each stock in the transaction history.
 *
 * @customfunction
 * @param transactions - A sheet-style range where each row is a transaction record.
 *   Expected columns: [date, wkn, type, shares, price, fees, total]
 * @param stocksImport - A sheet-style range for stock metadata.
 *   Expected columns include WKN in column A and stock name in column D.
 * @returns A two-dimensional array suitable for Google Sheets output with rows of:
 *   [WKN, stock name, active shares, cost basis, average buy price].
 *   Returns a single empty row when there are no active positions.
 */
const GET_FIFO_POSITIONS = (
  transactions: SheetRange,
  stocksImport: SheetRange
): (string | number)[][] => {
  const positions = processTransactionsFIFO(transactions);
  const result: (string | number)[][] = [];
  const nameMap: Record<string, string> = {};

  if (Array.isArray(stocksImport)) {
    for (const row of stocksImport) {
      if (!Array.isArray(row)) continue;
      const wkn = String(row[0] ?? "").trim();
      const name = row[3] ?? "";
      if (wkn) nameMap[wkn] = String(name);
    }
  }

  for (const [wkn, data] of Object.entries(positions)) {
    const activeShares = Math.round((data.activeShares + EPSILON) * 1e6) / 1e6;
    if (activeShares <= 0) continue;

    const avgBuyPrice = data.costBasis / activeShares;
    const stockName = nameMap[wkn] ?? "Unknown";
    result.push([wkn, stockName, activeShares, data.costBasis, avgBuyPrice]);
  }

  return result.length > 0 ? result : [["", "", "", "", ""]];
};

/**
 * Computes the realized gain/loss for each sell transaction using FIFO cost basis.
 *
 * @customfunction
 * @param transactions - A sheet-style range with transaction rows.
 *   Expected columns: [date, wkn, type, shares, price, fees, total]
 * @returns A result matrix suitable for Google Sheets containing rows of:
 *   [date, WKN, sold quantity, cost basis of sold shares, net proceeds, realized PnL, return ratio].
 *   Returns a single empty row when there are no realized sell events.
 */
const GET_REALIZED_GAINS = (transactions: SheetRange): (string | number)[][] => {
  const realizedList: (string | number)[][] = [];
  const fifoMap: Record<string, Array<{ qty: number; price: number }>> = {};

  for (const transaction of Array.isArray(transactions) ? transactions : []) {
    if (!Array.isArray(transaction)) continue;

    const [date, rawWkn, rawType, shares, price, fees] = transaction;
    if (rawWkn == null || rawType == null) continue;

    const wkn = String(rawWkn).trim().toUpperCase();
    const type = String(rawType).trim().toUpperCase();
    const qty = Number(shares ?? 0);
    const px = Number(price ?? 0);
    const fee = Number(fees ?? 0);

    if (!Number.isFinite(qty) || qty === 0) continue;

    if (!fifoMap[wkn]) {
      fifoMap[wkn] = [];
    }

    if (type === "BUY") {
      const costPerShare = (px * qty + fee) / qty;
      fifoMap[wkn].push({ qty, price: costPerShare });
    } else if (type === "SPLIT") {
      const totalOldShares = fifoMap[wkn].reduce((acc, lot) => acc + lot.qty, 0);
      if (totalOldShares > 0) {
        const ratio = qty / totalOldShares;
        fifoMap[wkn].forEach((lot) => {
          lot.qty *= ratio;
          lot.price /= ratio;
        });
      }
    } else if (type === "SELL") {
      let remainingToSell = qty;
      let costOfSoldShares = 0;

      while (remainingToSell > SMALL_THRESHOLD && fifoMap[wkn].length > 0) {
        const currentLot = fifoMap[wkn][0];
        if (currentLot.qty <= remainingToSell) {
          costOfSoldShares += currentLot.qty * currentLot.price;
          remainingToSell -= currentLot.qty;
          fifoMap[wkn].shift();
        } else {
          costOfSoldShares += remainingToSell * currentLot.price;
          currentLot.qty -= remainingToSell;
          remainingToSell = 0;
        }
      }

      const netProceeds = qty * px - fee;
      const realizedPnL = netProceeds - costOfSoldShares;
      const returnPct = costOfSoldShares > 0 ? realizedPnL / costOfSoldShares : 0;

      realizedList.push([
        date ?? "",
        wkn,
        qty,
        costOfSoldShares,
        netProceeds,
        realizedPnL,
        returnPct,
      ]);
    }
  }

  return realizedList.length > 0 ? realizedList : [["", "", "", "", "", "", ""]];
};

/**
 * Calculates MWRR/XIRR for a specific stock or the full portfolio.
 *
 * @customfunction
 * @param wknFilter - The WKN to analyze, or "TOTAL" to evaluate the entire portfolio.
 * @param transactions - Transaction rows with fields [date, wkn, type, shares, price, fees, total].
 * @param dividends - Dividend rows with at least [date, wkn, ..., net payout].
 * @param stocksImport - Stock metadata rows used to look up the current market price.
 * @returns The annualized XIRR rate as a number, or the string "#N/A" when the calculation fails.
 */
const GET_POSITION_XIRR = (
  wknFilter: string | "TOTAL",
  transactions: SheetRange,
  dividends: SheetRange,
  stocksImport: SheetRange
): number | string => {
  const dates: Date[] = [];
  const amounts: number[] = [];
  const targetWkn = String(wknFilter ?? "")
    .trim()
    .toUpperCase();

  for (const transaction of Array.isArray(transactions) ? transactions : []) {
    if (!Array.isArray(transaction)) continue;

    const [date, rawWkn, rawType, , , , total] = transaction;
    if (rawWkn == null || rawType == null) continue;

    const wkn = String(rawWkn).trim();
    const type = String(rawType).trim().toUpperCase();
    const parsedDate = parseSheetDate(date);
    const netVal = Number(total ?? 0);

    if (!parsedDate || !Number.isFinite(netVal)) continue;
    if (targetWkn !== "TOTAL" && wkn !== targetWkn) continue;

    if (type === "BUY") {
      dates.push(parsedDate);
      amounts.push(-Math.abs(netVal));
    } else if (type === "SELL") {
      dates.push(parsedDate);
      amounts.push(Math.abs(netVal));
    }
  }

  for (const dividendRow of Array.isArray(dividends) ? dividends : []) {
    if (!Array.isArray(dividendRow)) continue;

    const [dividendDate, rawWkn] = dividendRow;
    if (rawWkn == null) continue;

    const wkn = String(rawWkn).trim();
    const payout = Number(dividendRow[9] ?? 0);
    const parsedDate = parseSheetDate(dividendDate);

    if (!parsedDate || payout <= 0 || !Number.isFinite(payout)) continue;
    if (targetWkn !== "TOTAL" && wkn !== targetWkn) continue;

    dates.push(parsedDate);
    amounts.push(payout);
  }

  const fifoData = processTransactionsFIFO(transactions);
  const now = new Date();

  if (targetWkn === "TOTAL") {
    let totalMarketVal = 0;
    for (const [wkn, pos] of Object.entries(fifoData)) {
      if (pos.activeShares > SMALL_THRESHOLD) {
        const curPx = getPriceFromImport(wkn, stocksImport);
        totalMarketVal += pos.activeShares * curPx;
      }
    }
    if (totalMarketVal > 0) {
      dates.push(now);
      amounts.push(totalMarketVal);
    }
  } else {
    const pos = fifoData[targetWkn];
    if (pos && pos.activeShares > SMALL_THRESHOLD) {
      const curPx = getPriceFromImport(targetWkn, stocksImport);
      dates.push(now);
      amounts.push(pos.activeShares * curPx);
    }
  }

  if (dates.length < 2) return 0;

  try {
    return calculateXIRR(amounts, dates);
  } catch {
    return "#N/A";
  }
};

/**
 * Builds FIFO position state from raw transaction rows.
 *
 * @param transactions - A sheet-style transaction range.
 * @returns A map keyed by WKN with active share count, total cost basis and remaining lots.
 */
const processTransactionsFIFO = (transactions: SheetRange): Record<string, PositionData> => {
  const positions: Record<string, PositionData> = {};

  for (const transaction of Array.isArray(transactions) ? transactions : []) {
    if (!Array.isArray(transaction)) continue;

    const [, rawWkn, rawType, shares, price, fees] = transaction;
    if (rawWkn == null || rawType == null) continue;

    const wkn = String(rawWkn).trim();
    const type = String(rawType).trim().toUpperCase();
    const qty = Number(shares ?? 0);
    const px = Number(price ?? 0);
    const fee = Number(fees ?? 0);

    if (!Number.isFinite(qty) || qty === 0) continue;

    if (!positions[wkn]) {
      positions[wkn] = { activeShares: 0, costBasis: 0, lots: [] };
    }

    const pos = positions[wkn];

    if (type === "BUY") {
      const totalCost = qty * px + fee;
      pos.lots.push({ qty, cost: totalCost });
      pos.activeShares += qty;
      pos.costBasis += totalCost;
    } else if (type === "SPLIT") {
      if (pos.activeShares > 0) {
        const ratio = qty / pos.activeShares;
        pos.activeShares = qty;
        pos.lots.forEach((lot) => {
          lot.qty *= ratio;
        });
      }
    } else if (type === "SELL") {
      let remainingToSell = qty;

      while (remainingToSell > SMALL_THRESHOLD && pos.lots.length > 0) {
        const lot = pos.lots[0];
        if (lot.qty <= remainingToSell) {
          remainingToSell -= lot.qty;
          pos.costBasis -= lot.cost;
          pos.activeShares -= lot.qty;
          pos.lots.shift();
        } else {
          const costReduced = (remainingToSell / lot.qty) * lot.cost;
          lot.cost -= costReduced;
          lot.qty -= remainingToSell;
          pos.costBasis -= costReduced;
          pos.activeShares -= remainingToSell;
          remainingToSell = 0;
        }
      }

      if (pos.activeShares <= SMALL_THRESHOLD) {
        pos.activeShares = 0;
        pos.costBasis = 0;
        pos.lots = [];
      }
    }
  }

  return positions;
};

/**
 * Looks up the current price for a stock by WKN from a stock import sheet.
 *
 * @param wkn - The stock identifier to search for.
 * @param stocksImport - A sheet-style metadata range with WKN in column A and price in column J.
 * @returns The parsed current price, or 0 when the price cannot be found or parsed.
 */
const getPriceFromImport = (wkn: string, stocksImport: SheetRange): number => {
  const targetWkn = String(wkn).trim();

  for (const row of Array.isArray(stocksImport) ? stocksImport : []) {
    if (!Array.isArray(row)) continue;
    if (String(row[0] ?? "").trim() === targetWkn) {
      return Number(row[9] ?? 0) || 0;
    }
  }

  return 0;
};

/**
 * Solves for annualized XIRR using the Newton-Raphson method.
 *
 * @param values - Cash flows where negative values are investments and positive values are returns.
 * @param dates - Corresponding dates for each cash flow.
 * @returns The annualized rate of return.
 */
const calculateXIRR = (values: number[], dates: Date[]): number => {
  const MILLISECONDS_PER_YEAR = 365 * 24 * 3600 * 1000;
  const MAX_ITERATIONS = 100;
  const RATE_THRESHOLD = 1e-7;

  let rate = 0.1;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let fValue = 0;
    let fDerivative = 0;

    for (let i = 0; i < values.length; i++) {
      const exp = (dates[i].getTime() - dates[0].getTime()) / MILLISECONDS_PER_YEAR;
      fValue += values[i] / Math.pow(1 + rate, exp);
      fDerivative -= (exp * values[i]) / Math.pow(1 + rate, exp + 1);
    }

    const newRate = rate - fValue / fDerivative;
    if (!Number.isFinite(newRate)) break;
    if (Math.abs(newRate - rate) < RATE_THRESHOLD) return newRate;
    rate = newRate;
  }

  return rate;
};

/**
 * Normalizes a sheet value into a Date object.
 *
 * @param value - A potential date value from Google Sheets.
 * @returns A Date when parsing succeeds, otherwise null.
 */
const parseSheetDate = (value: unknown): Date | null => {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? null : date;
};

const g = globalThis as any;
g.GET_FIFO_POSITIONS = GET_FIFO_POSITIONS;
g.GET_REALIZED_GAINS = GET_REALIZED_GAINS;
g.GET_POSITION_XIRR = GET_POSITION_XIRR;
g.parseSheetDate = parseSheetDate;
g.processTransactionsFIFO = processTransactionsFIFO;
