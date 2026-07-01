import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'happy-dom',
    include: [
      'lib/**/*.spec.ts',
      'components/**/*.spec.ts',
      'components/**/*.spec.tsx',
      'hooks/**/*.spec.ts',
      'hooks/**/*.spec.tsx',
    ],
  },
});
