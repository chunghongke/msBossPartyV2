import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import securityPlugin from 'eslint-plugin-security';
import noUnsanitized from 'eslint-plugin-no-unsanitized';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      security: securityPlugin,
      'no-unsanitized': noUnsanitized,
    },
    rules: {
      // Mozilla 官方 DOM XSS 檢查
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',

      // OWASP 推薦安全規則
      'security/detect-unsafe-regex': 'warn',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-object-injection': 'off',

      // 允許本地 storage 讀寫等標準的 empty catch 區塊
      'no-empty': ['error', { allowEmptyCatch: true }],

      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
];
