import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import react from "eslint-plugin-react";
import reactCompiler from "eslint-plugin-react-compiler";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules",
      "build",
      "dist",
      "coverage",
      "storybook-static",
      "test-results",
      "playwright-report",
      "**/*.generated.ts",
      "src/routeTree.gen.ts",
      // the legacy config only linted ts/tsx (--ext ts,tsx)
      "**/*.js",
      "**/*.cjs",
      "**/*.mjs",
    ],
  },
  ...tseslint.configs.recommended,
  importPlugin.flatConfigs.errors,
  importPlugin.flatConfigs.warnings,
  importPlugin.flatConfigs.typescript,
  react.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
      "react-compiler": reactCompiler,
    },
    rules: reactHooks.configs.recommended.rules,
  },
  prettierRecommended,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      "react-compiler/react-compiler": "error",
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "interface",
          format: ["PascalCase"],
        },
      ], // forbids naming interfaces in lower case
      "react/jsx-uses-react": "off", // off because New JSX Transform - https://uk.reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html#eslint
      "react/react-in-jsx-scope": "off", // off because New JSX Transform
      "react/prop-types": "off", // off because TypeScript
      "@typescript-eslint/no-unused-vars": "off", // off because tsconfig have noUnusedLocals, noUnusedParameters
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal"],
          pathGroups: [
            {
              pattern: "react",
              group: "external",
              position: "before",
            },
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ], // configure import order, import from react always first
      "react/jsx-curly-brace-presence": [
        "error",
        { props: "never", children: "never" },
      ], // disallow unnecessary curly braces in JSX props and/or children
    },
  }
);
