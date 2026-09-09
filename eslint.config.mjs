import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
  {
    ignores: ["dist/", "node_modules/", "coverage/"],
  },

  // Disables type-aware linting on JS configuration files at root level
  tseslint.configs.disableTypeChecked,

  eslint.configs.recommended,

  // Direct reference to typescript-eslint preset objects
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    // Restrict type-aware rules specifically to TypeScript source files
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mjs"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },

  eslintConfigPrettier,
]);
