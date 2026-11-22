import {
  getFifoPositions,
  getRealizedGains,
  getPositionXirr,
  getImpliedGrowthRate,
  parseSheetDate,
  processTransactionsFIFO,
  calculateIntrinsicSharePrice,
  calculateDcfEquityValue,
} from "./main";
import { describe, expect, it } from "vitest";

describe("portfolio utilities", () => {
  it("processTransactionsFIFO computes active positions correctly", () => {
    const transactions = [
      ["2026-01-01", "ABC", "BUY", 10, 5, 0, 50],
      ["2026-02-01", "ABC", "BUY", 5, 6, 0, 30],
      ["2026-03-01", "ABC", "SELL", 8, 8, 0, 64],
    ];

    const positions = processTransactionsFIFO(transactions);
    expect(positions.ABC.activeShares).toBe(7);
    expect(positions.ABC.lots.length).toBe(2);
    expect(positions.ABC.costBasis).toBe(40);
    expect(positions.ABC.lots[0].qty).toBe(2);
    expect(positions.ABC.lots[1].qty).toBe(5);
  });

  it("getFifoPositions returns a structured sheet output", () => {
    const transactions = [["2026-01-01", "XYZ", "BUY", 2, 50, 0, 100]];
    const stocksImport = [["XYZ", "ignored", "ignored", "Example Corp", 0, 0, 0, 0, 0, 10]];

    const output = getFifoPositions(transactions, stocksImport);
    expect(output).toEqual([["XYZ", "Example Corp", 2, 100, 50]]);
  });

  it("getRealizedGains returns correct realized PnL", () => {
    const transactions = [
      ["2026-01-01", "ABC", "BUY", 10, 5, 0, 50],
      ["2026-04-01", "ABC", "SELL", 4, 10, 0, 40],
    ];
    const results = getRealizedGains(transactions);

    expect(results).toHaveLength(1);
    expect(results[0][1]).toBe("ABC");
    expect(results[0][2]).toBe(4);
    expect(results[0][3]).toBe(20);
    expect(results[0][4]).toBe(40);
    expect(results[0][5]).toBe(20);
  });

  it("getPositionXirr returns a positive rate for a simple buy/sell", () => {
    const transactions = [
      ["2026-01-01", "ABC", "BUY", 1, 100, 0, 100],
      ["2027-01-01", "ABC", "SELL", 1, 110, 0, 110],
    ];
    const dividends: unknown[][] = [];
    const stocksImport: unknown[][] = [
      ["ABC", null, null, null, null, null, null, null, null, 110],
    ];

    const result = getPositionXirr("ABC", transactions, dividends, stocksImport);
    expect(typeof result).toBe("number");
    expect(result as number).toBeGreaterThan(0);
  });

  describe("calculateDcfEquityValue", () => {
    it("computes equity value with explicit cash flows, terminal value, and net cash", () => {
      const fcfBase = 10;
      const growth = 0.05;
      const discount = 0.1;
      const terminalGrowth = 0.02;
      const cash = 25;
      const debt = 10;

      // Hand-calculated reference for 10 years:
      // Year t FCF = 10 * 1.05^t, discounted at 1.10^t
      let expectedPv = 0;
      let fcf = fcfBase;
      for (let t = 1; t <= 10; t++) {
        fcf *= 1 + growth;
        expectedPv += fcf / Math.pow(1 + discount, t);
      }
      const terminalValue = (fcf * (1 + terminalGrowth)) / (discount - terminalGrowth);
      expectedPv += terminalValue / Math.pow(1 + discount, 10);
      const expectedEquityValue = expectedPv + cash - debt;

      const actual = calculateDcfEquityValue(fcfBase, growth, discount, terminalGrowth, cash, debt);

      expect(actual).toBeCloseTo(expectedEquityValue, 10);
    });

    it("supports custom forecast horizons and zero/negative FCF", () => {
      const fiveYearNegativeBase = calculateDcfEquityValue(-5, 0.1, 0.09, 0.02, 15, 5, 5);

      expect(Number.isFinite(fiveYearNegativeBase)).toBe(true);
    });

    it("rejects invalid parameters", () => {
      // discountRate <= terminalGrowthRate
      expect(() => calculateDcfEquityValue(10, 0.05, 0.08, 0.08, 0, 0)).toThrow(
        "Invalid DCF parameters."
      );

      // discountRate <= 0
      expect(() => calculateDcfEquityValue(10, 0.05, 0, 0.02, 0, 0)).toThrow(
        "Invalid DCF parameters."
      );

      // shortTermGrowthRate <= -1 (-100% or worse)
      expect(() => calculateDcfEquityValue(10, -1, 0.08, 0.02, 0, 0)).toThrow(
        "Invalid DCF parameters."
      );

      // negative cash or debt, or non-integer/sub-1 years
      expect(() => calculateDcfEquityValue(10, 0.05, 0.08, 0.02, -1, 0)).toThrow(
        "Invalid DCF parameters."
      );
      expect(() => calculateDcfEquityValue(10, 0.05, 0.08, 0.02, 0, -1)).toThrow(
        "Invalid DCF parameters."
      );
      expect(() => calculateDcfEquityValue(10, 0.05, 0.08, 0.02, 0, 0, 0)).toThrow(
        "Invalid DCF parameters."
      );
      expect(() => calculateDcfEquityValue(10, 0.05, 0.08, 0.02, 0, 0, 5.5)).toThrow(
        "Invalid DCF parameters."
      );
    });
  });

  describe("calculateIntrinsicSharePrice", () => {
    it("divides total equity value by shares outstanding", () => {
      const shares = 4;
      const equityValue = calculateDcfEquityValue(10, 0.06, 0.09, 0.02, 30, 10, 10);
      const sharePrice = calculateIntrinsicSharePrice(10, 0.06, 0.09, 0.02, shares, 30, 10, 10);

      expect(sharePrice).toBeCloseTo(equityValue / shares, 10);
    });

    it("rejects non-positive or non-finite shares outstanding", () => {
      expect(() => calculateIntrinsicSharePrice(10, 0.05, 0.09, 0.02, 0, 0, 0)).toThrow(
        "Invalid DCF parameters."
      );
      expect(() => calculateIntrinsicSharePrice(10, 0.05, 0.09, 0.02, -100, 0, 0)).toThrow(
        "Invalid DCF parameters."
      );
      expect(() =>
        calculateIntrinsicSharePrice(10, 0.05, 0.09, 0.02, Number.POSITIVE_INFINITY, 0, 0)
      ).toThrow("Invalid DCF parameters.");
    });
  });

  describe("getImpliedGrowthRate", () => {
    it("solves a 10-year reverse DCF", () => {
      const result = getImpliedGrowthRate(100, 10, 0.1, 0.02, 1, 0, 0);

      expect(result).toBeCloseTo(-0.014317624270915985, 10);
    });

    it("applies cash and debt adjustments", () => {
      const withNetCash = getImpliedGrowthRate(100, 10, 0.1, 0.02, 1, 20, 10);
      const baseline = getImpliedGrowthRate(100, 10, 0.1, 0.02, 1, 0, 0);

      // Higher net cash lowers the implied FCF growth needed to justify the share price.
      expect(withNetCash).toBeLessThan(baseline);
    });

    it("rejects invalid inputs", () => {
      expect(() => getImpliedGrowthRate(100, 10, 0.1, 0.1, 1, 0, 0)).toThrow(
        "Invalid reverse DCF parameters."
      );
      expect(() => getImpliedGrowthRate(0, 10, 0.1, 0.02, 1, 0, 0)).toThrow(
        "Invalid reverse DCF parameters."
      );
      expect(() => getImpliedGrowthRate(100, 10, Number.NaN, 0.02, 1, 0, 0)).toThrow(
        "Invalid reverse DCF parameters."
      );
    });

    it("throws when no solution is in range", () => {
      expect(() =>
        getImpliedGrowthRate(0.01, 10, 0.1, 0.02, 1, 0, 0, {
          minGrowthRate: -0.5,
          maxGrowthRate: 1.0,
        })
      ).toThrow("No implied growth rate found within [-50.0%, 100.0%].");
    });

    it("respects custom forecast years and growth bounds", () => {
      const fiveYear = getImpliedGrowthRate(120, 10, 0.09, 0.025, 1, 5, 15, {
        forecastYears: 5,
        minGrowthRate: -0.5,
        maxGrowthRate: 1.5,
      });

      expect(fiveYear).toBeGreaterThan(-0.5);
      expect(fiveYear).toBeLessThan(1.5);
    });
  });

  it("parseSheetDate returns null for invalid values", () => {
    expect(parseSheetDate("")).toBeNull();
    expect(parseSheetDate("not a date")).toBeNull();
  });
});

describe("DCF round-trip consistency", () => {
  it("reproduces the market share price when feeding implied growth back into forward DCF", () => {
    const scenarios = [
      {
        sharePrice: 100,
        fcfBase: 10,
        discountRate: 0.1,
        terminalGrowthRate: 0.02,
        sharesOutstanding: 1,
        totalCash: 0,
        totalDebt: 0,
        forecastYears: 10,
      },
      {
        sharePrice: 145.5,
        fcfBase: 12.4,
        discountRate: 0.085,
        terminalGrowthRate: 0.025,
        sharesOutstanding: 2.5,
        totalCash: 40,
        totalDebt: 15,
        forecastYears: 10,
      },
      {
        sharePrice: 68.25,
        fcfBase: 8,
        discountRate: 0.09,
        terminalGrowthRate: 0.02,
        sharesOutstanding: 1.8,
        totalCash: 5,
        totalDebt: 22,
        forecastYears: 7,
      },
    ];

    for (const s of scenarios) {
      const impliedGrowth = getImpliedGrowthRate(
        s.sharePrice,
        s.fcfBase,
        s.discountRate,
        s.terminalGrowthRate,
        s.sharesOutstanding,
        s.totalCash,
        s.totalDebt,
        { forecastYears: s.forecastYears }
      );

      const reconstructedPrice = calculateIntrinsicSharePrice(
        s.fcfBase,
        impliedGrowth,
        s.discountRate,
        s.terminalGrowthRate,
        s.sharesOutstanding,
        s.totalCash,
        s.totalDebt,
        s.forecastYears
      );

      // Default rateTolerance is 1e-7, so price precision is tight (within ~0.001%–0.01%).
      expect(reconstructedPrice).toBeCloseTo(s.sharePrice, 3);
    }
  });
});
