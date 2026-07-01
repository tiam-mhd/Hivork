const baseConfig = require('@hivork/config/eslint.base.js');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  ...baseConfig,
];
