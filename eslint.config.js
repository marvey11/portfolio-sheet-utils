import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  // Global ignores replacing ignorePatterns
  {
    ignores: ["dist/", "node_modules/", "coverage/"],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Typescript recommended rules
  ...tseslint.configs.recommended,

  // Custom project rules & parser options
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },

  // Turn off rules that conflict with Prettier (must be last)
  eslintConfigPrettier
);
