// ESLint flat configuration for dp-hello: the recommended rules, plus the Node.js globals.
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js", "src/bin/dp-hello"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { Buffer: "readonly", process: "readonly" },
    },
    rules: {
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
];
