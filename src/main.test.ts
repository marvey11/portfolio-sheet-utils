import { describe, expect, it } from "vitest";
import "./main";

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

  it("GET_FIFO_POSITIONS returns a structured sheet output", () => {
    const transactions = [["2026-01-01", "XYZ", "BUY", 2, 50, 0, 100]];
    const stocksImport = [["XYZ", "ignored", "ignored", "Example Corp", 0, 0, 0, 0, 0, 10]];

    const output = GET_FIFO_POSITIONS(transactions, stocksImport);
    expect(output).toEqual([["XYZ", "Example Corp", 2, 100, 50]]);
  });

  it("GET_REALIZED_GAINS returns correct realized PnL", () => {
    const transactions = [
      ["2026-01-01", "ABC", "BUY", 10, 5, 0, 50],
      ["2026-04-01", "ABC", "SELL", 4, 10, 0, 40],
    ];
    const results = GET_REALIZED_GAINS(transactions);

    expect(results).toHaveLength(1);
    expect(results[0][1]).toBe("ABC");
    expect(results[0][2]).toBe(4);
    expect(results[0][3]).toBe(20);
    expect(results[0][4]).toBe(40);
    expect(results[0][5]).toBe(20);
  });

  it("GET_POSITION_XIRR returns a positive rate for a simple buy/sell", () => {
    const transactions = [
      ["2026-01-01", "ABC", "BUY", 1, 100, 0, 100],
      ["2027-01-01", "ABC", "SELL", 1, 110, 0, 110],
    ];
    const dividends: unknown[][] = [];
    const stocksImport: unknown[][] = [
      ["ABC", null, null, null, null, null, null, null, null, 110],
    ];

    const result = GET_POSITION_XIRR("ABC", transactions, dividends, stocksImport);
    expect(typeof result).toBe("number");
    expect(result as number).toBeGreaterThan(0);
  });

  it("parseSheetDate returns null for invalid values", () => {
    expect(parseSheetDate("")).toBeNull();
    expect(parseSheetDate("not a date")).toBeNull();
  });
});
