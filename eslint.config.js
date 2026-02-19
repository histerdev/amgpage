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
      // ── ESTRICTO: en e-commerce con pagos, any = bug potencial ──
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // ── REGLAS ADICIONALES PARA SEGURIDAD ──
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
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