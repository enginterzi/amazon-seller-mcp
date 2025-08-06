import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'tests/integration/**/*.test.ts'
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    reporter: ['verbose'],
    coverage: {
      enabled: false
    }
  }
});