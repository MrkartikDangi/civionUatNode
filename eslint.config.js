const js = require("@eslint/js");
const globals = require("globals");
const prettierPlugin = require("eslint-plugin-prettier");

module.exports = [
  {
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "error",
    },
  },
];
