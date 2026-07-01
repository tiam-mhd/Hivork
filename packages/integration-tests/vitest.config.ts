import path from 'node:path';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
      },
    }),
  ],
  resolve: {
    alias: {
      '@api': path.resolve(__dirname, '../../apps/api/src'),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    fileParallelism: false,
    testTimeout: 60_000,
    server: {
      deps: {
        inline: ['@nestjs/platform-express', '@nestjs/common', '@nestjs/core'],
      },
    },
  },
});
