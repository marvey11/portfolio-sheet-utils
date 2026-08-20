import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import functionDocs from "./function-docs.json" with { type: "json" };

// Top-level global functions required by Google Apps Script
// Define metadata for custom sheet functions
const exposedFunctions = functionDocs;

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
