import { defineConfig } from 'vitest/config';
import { testMaintenancePlugin } from './tests/utils/vitest-maintenance-plugin.js';

export default defineConfig({
  plugins: [
    testMaintenancePlugin({
      enabled: process.env.COLLECT_TEST_METRICS !== 'false',
      collectMemoryUsage: true,
    }),
  ],
  test: {
    // Test environment configuration
    environment: 'node',
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // Coverage thresholds - enforce quality gates
      thresholds: {
        // Global thresholds (80% baseline as per requirements)
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,

        // Per-file thresholds for critical paths (100% as per requirements)
        perFile: true,
      },

      // Include/exclude patterns
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts', // Export files typically don't need coverage
        'tests/**/*',
        'dist/**/*',
        'node_modules/**/*',
        'examples/**/*',
      ],

      // Fail tests if coverage is below thresholds
      skipFull: false,

      // Additional coverage options
      all: true, // Include all files in coverage report
      clean: true, // Clean coverage directory before running
      cleanOnRerun: true,
    },

    // Test file patterns
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],

    // Test execution configuration
    testTimeout: 10000, // 10 second timeout for tests
    hookTimeout: 10000,

    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html',
    },

    // Performance monitoring
    logHeapUsage: true,

    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
  },
});
