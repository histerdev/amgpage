import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astroeslint from 'eslint-plugin-astro';
import astroparser from 'astro-eslint-parser';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astroeslint.configs.recommended,
  {
    ignores: ['node_modules/', 'dist/', '.astro/', 'coverage/'],
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/**/*.astro'],
    languageOptions: {
      parser: astroparser,
      parserOptions: {
        parser: tsparser,
        extraFileExtensions: ['.astro'],
      },
    },
  },
];