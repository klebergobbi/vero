// Preset ESLint compartilhado (CLAUDE.md §8 — TS estrito, sem `any` injustificado).
// Consumo: em cada app, `.eslintrc.cjs` → module.exports = { extends: ["@vero/config/eslint-preset"] }
/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
  ignorePatterns: ["dist", ".next", ".turbo", "build", "node_modules", "*.js"],
};
