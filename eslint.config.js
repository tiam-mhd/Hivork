const baseConfig = require('@hivork/config/eslint.base.js');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  ...baseConfig,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/.next/**',
      '**/coverage/**',
      'pnpm-lock.yaml',
    ],
  },
];
