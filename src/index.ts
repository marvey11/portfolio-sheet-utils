import { getFifoPositions, SheetRange, getRealizedGains, getPositionXirr } from "./main";

function GET_FIFO_POSITIONS(
  transactions: SheetRange,
  stockData: SheetRange
): (string | number)[][] {
  return getFifoPositions(transactions, stockData);
}

function GET_REALIZED_GAINS(transactions: SheetRange): (string | number)[][] {
  return getRealizedGains(transactions);
}

function GET_POSITION_XIRR(
  wknFilter: string | "TOTAL",
  transactions: SheetRange,
  dividends: SheetRange,
  stockData: SheetRange
): number | string {
  return getPositionXirr(wknFilter, transactions, dividends, stockData);
}

const g = globalThis as Record<string, unknown>;
g.GET_FIFO_POSITIONS = GET_FIFO_POSITIONS;
g.GET_REALIZED_GAINS = GET_REALIZED_GAINS;
g.GET_POSITION_XIRR = GET_POSITION_XIRR;
