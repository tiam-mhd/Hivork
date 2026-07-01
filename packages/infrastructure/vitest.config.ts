import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    /** OTP / Redis integration specs must not run in parallel */
    fileParallelism: false,
  },
});
