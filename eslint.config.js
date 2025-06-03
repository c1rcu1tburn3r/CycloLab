const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off"
    }
  },
  {
    ignores: [
      "src/lib/database.types.ts",
      ".next/**",
      "out/**", 
      "dist/**",
      "node_modules/**",
      "*.config.js",
      "*.config.ts"
    ]
  }
];

module.exports = eslintConfig; 