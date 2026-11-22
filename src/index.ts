import {
  calculateIntrinsicSharePrice,
  getFifoPositions,
  getImpliedGrowthRate,
  getPositionXirr,
  getRealizedGains,
  SheetRange,
} from "./main";

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
  wknFilter: string,
  transactions: SheetRange,
  dividends: SheetRange,
  stockData: SheetRange
): number | string {
  return getPositionXirr(wknFilter, transactions, dividends, stockData);
}

function DCF_INTRINSIC_PRICE(
  fcfBase: number,
  shortTermGrowthRate: number,
  discountRate: number,
  terminalGrowthRate: number,
  sharesOutstanding: number,
  totalCash: number,
  totalDebt: number,
  forecastYears = 10
): number {
  return calculateIntrinsicSharePrice(
    fcfBase,
    shortTermGrowthRate,
    discountRate,
    terminalGrowthRate,
    sharesOutstanding,
    totalCash,
    totalDebt,
    forecastYears
  );
}

function GET_IMPLIED_GROWTH_RATE(
  sharePrice: number,
  fcfBase: number,
  discountRate: number,
  terminalGrowthRate: number,
  sharesOutstanding: number,
  totalCash: number,
  totalDebt: number
): number {
  return getImpliedGrowthRate(
    sharePrice,
    fcfBase,
    discountRate,
    terminalGrowthRate,
    sharesOutstanding,
    totalCash,
    totalDebt
  );
}

const g = globalThis as Record<string, unknown>;
g.DCF_INTRINSIC_PRICE = DCF_INTRINSIC_PRICE;
g.GET_FIFO_POSITIONS = GET_FIFO_POSITIONS;
g.GET_IMPLIED_GROWTH_RATE = GET_IMPLIED_GROWTH_RATE;
g.GET_POSITION_XIRR = GET_POSITION_XIRR;
g.GET_REALIZED_GAINS = GET_REALIZED_GAINS;
