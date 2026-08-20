import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

// Top-level global functions required by Google Apps Script
// Define metadata for custom sheet functions
const exposedFunctions = [
  {
    name: "GET_REALIZED_GAINS",
    description: "Computes the realized gain/loss for each sell transaction using FIFO cost basis.",
    params: [
      {
        name: "transactions",
        description:
          "A sheet-style range with transaction rows. Expected columns: [date, wkn, type, shares, price, fees, total]",
        type: "Range",
      },
    ],
    returnType: "Range",
    returnDesc:
      "A result matrix suitable for Google Sheets containing rows of: [date, WKN, sold quantity, cost basis of sold shares, net proceeds, realized PnL, return ratio]. Returns a single empty row when there are no realized sell events.",
  },
  {
    name: "GET_FIFO_POSITIONS",
    description:
      "Returns the current open FIFO positions for each stock in the transaction history.",
    params: [
      {
        name: "transactions",
        description:
          "A sheet-style range where each row is a transaction record. Expected columns: [date, wkn, type, shares, price, fees, total]",
        type: "Range",
      },
      {
        name: "stockData",
        description:
          "A sheet-style range for stock metadata. Expected columns include WKN in column A and stock name in column D.",
        type: "Range",
      },
    ],
    returnType: "Array<Array>",
    returnDesc:
      "A two-dimensional array suitable for Google Sheets output with rows of: [WKN, stock name, active shares, cost basis, average buy price]. Returns a single empty row when there are no active positions.",
  },
  {
    name: "GET_POSITION_XIRR",
    description: "Calculates MWRR/XIRR for a specific stock or the full portfolio.",
    params: [
      {
        name: "wknFilter",
        description: "The WKN to analyze, or 'TOTAL' to evaluate the entire portfolio.",
        type: "string",
      },
      {
        name: "transactions",
        description: "Transaction rows with fields [date, wkn, type, shares, price, fees, total].",
        type: "Range",
      },
      {
        name: "dividends",
        description: "Dividend rows with at least [date, wkn, ..., net payout].",
        type: "Range",
      },
      {
        name: "stockData",
        description: "Stock metadata rows used to look up the current market price.",
        type: "Range",
      },
    ],
    returnType: "number | string",
    returnDesc:
      "The annualized XIRR rate as a number, or the string '#N/A' when the calculation fails.",
  },
];

function generateGasFooter(functions) {
  return functions
    .map((fn) => {
      const paramDocs = fn.params
        .map((p) => ` * @param {${p.type}} ${p.name} - ${p.description}`)
        .join("\n");

      return `
/**
 * ${fn.description}
 *
${paramDocs}
 * @return {${fn.returnType}} - ${fn.returnDesc}
 * @customfunction
 */
function ${fn.name}(...args) {
  return App.${fn.name}(...args);
}`;
    })
    .join("\n");
}

export default {
  input: "src/index.ts",
  output: {
    file: "dist/Code.js",
    format: "iife", // Immediately Invoked Function Expression for global exposure
    name: "App",
    footer: generateGasFooter(exposedFunctions),
  },
  plugins: [resolve(), commonjs(), typescript({ tsconfig: "./tsconfig.json" })],
};
