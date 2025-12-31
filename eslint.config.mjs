import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node.js scripts using CommonJS
    "scripts/**",
  ]),
  {
    rules: {
      // This rule gives false positives for legitimate client-side initialization patterns
      // where setState is needed in useEffect to avoid hydration mismatches
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
