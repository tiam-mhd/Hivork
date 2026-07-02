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
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    setupFiles: ['./vitest.setup.ts'],
    /** Integration specs share Redis OTP keys (demo owner phone) — run files sequentially */
    fileParallelism: false,
    server: {
      deps: {
        inline: ['@nestjs/platform-express', '@nestjs/common', '@nestjs/core'],
      },
    },
  },
});
