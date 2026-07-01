const baseConfig = require('./eslint.base.js');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: ['dist/**', 'eslint.base.js', 'prettier.config.js', 'node_modules/**'],
  },
  ...baseConfig,
];
