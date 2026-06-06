// Preset Prettier compartilhado.
// Consumo: em cada pacote, `prettier.config.js` → module.exports = require("@vero/config/prettier-preset");
/** @type {import("prettier").Config} */
module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 80,
  tabWidth: 2,
  endOfLine: "lf",
  arrowParens: "always",
};
