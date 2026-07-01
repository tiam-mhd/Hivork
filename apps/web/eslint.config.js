const baseConfig = require('@hivork/config/eslint.base.js');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...baseConfig,
];
