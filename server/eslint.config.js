import js from "@eslint/js";

// npm run lint. The recommended rules of ESLint, for Node.js ES modules (src/, tests/ and this file).

// The Node.js globals the code uses. Listed here because the "globals" package is not a dependency of the project.
const nodeGlobals = Object.fromEntries(
  [
    "process", "console", "Buffer", "URL", "URLSearchParams", "AbortController", "fetch",
    "setTimeout", "clearTimeout", "setInterval", "clearInterval", "setImmediate", "queueMicrotask", "structuredClone",
  ].map((name) => [name, "readonly"])
);

export default [
  { ignores: ["coverage/", "node_modules/"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: nodeGlobals },
    // A disable comment that is no longer needed is an error too
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      // Express knows an error handler by its 4 parameters, so an unused last parameter is named _next
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
