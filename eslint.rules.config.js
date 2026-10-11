import i18nextPlugin from 'eslint-plugin-i18next';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*']
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      i18next: i18nextPlugin
    },
    rules: {
      'i18next/no-literal-string': ['error', {
        ignoreAttribute: [
          'data-testid', 'className', 'id', 'role', 'href', 'src', 'to', 'name', 
          'type', 'd', 'viewBox', 'key', 'placeholder', 'alt', 'aria-label', 'value'
        ],
        ignoreCallee: [
          't', 'i18n.t', 'toast', 'console.log', 'console.error', 'console.warn', 
          'console.info', 'setTimeout', 'setInterval', 'format', 'parse'
        ],
        markupOnly: false
      }]
    }
  }
];
