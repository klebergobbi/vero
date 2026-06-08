/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [require.resolve("@vero/config/eslint-preset")],
  parserOptions: {
    project: "tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
