import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores(['.next/**', 'coverage/**', 'playwright-report/**', 'test-results/**']),
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Existing debt is counted by scripts/check-lint.mjs, never hidden.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react/display-name': 'warn',
      '@next/next/no-location-assign-relative-destination': 'warn',
      '@next/next/no-html-link-for-pages': 'warn',

      '@next/next/no-img-element': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/archive/**', '**/legacy-frontend/**'], message: 'Active source cannot import the retired application.' },
      ] }],
    },
  },
  {
    files: ['scripts/**/*.{js,cjs}'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
