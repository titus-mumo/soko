const globals = require("globals");
const pluginJs = require("@eslint/js");
const tseslint = require("typescript-eslint");
const tsParser = require("@typescript-eslint/parser");

// Flat config: each element is a discrete config object, not a legacy .eslintrc shape
const rawConfig = [
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.browser,
        ...globals.node, // replaces `env: { browser, node }`
        Bun: true,
      },
    },
    rules: {
      semi: ["error", "always"],
      "no-unused-vars": [
        "warn",
        { vars: "all", args: "after-used", ignoreRestSiblings: true },
      ],
    },
    ignores: [".node_modules/*"],
    // `extends` and `env` are legacy — not valid in flat config
  },
];

export default [
  ...rawConfig,
  ...tseslint.configs.recommended,
  pluginJs.configs.recommended,
];
