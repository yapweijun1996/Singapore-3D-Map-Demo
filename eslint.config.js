// ESLint flat config (v9+). Keeps the rule set deliberately minimal:
// typescript-eslint recommended + react-hooks + prettier-friendly.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'output/', 'sample.html', '*.tsbuildinfo'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // r3f props look like dom-unknown attrs to TS-eslint; relax common false-positives.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // react-hooks v7 added an aggressive "no setState in useEffect" rule that
      // flags legitimate fetch-on-prop-change idioms. We accept the pattern.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  // The vite.config.ts lives outside src/ — give it node globals.
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
