/**
 * Vitest plugin for test maintenance and health monitoring
 * Collects test execution metrics during test runs
 */

import type { Plugin } from 'vitest/config';
import {
  createTestMaintenanceUtility,
  type TestExecutionMetrics,
} from '../../src/test-maintenance.js';
import fs from 'fs';
import path from 'path';

export interface TestMaintenancePluginOptions {
  enabled?: boolean;
  metricsFile?: string;
  collectMemoryUsage?: boolean;
}

export function testMaintenancePlugin(options: TestMaintenancePluginOptions = {}): Plugin {
  const { enabled = true, metricsFile = 'test-metrics.json', collectMemoryUsage = true } = options;

  if (!enabled) {
    return { name: 'test-maintenance-disabled' };
  }

  const utility = createTestMaintenanceUtility(metricsFile);

  return {
    name: 'test-maintenance',
    configureServer() {
      // Plugin is active
    },

    // Hook into vitest test lifecycle
    config(config) {
      // Ensure we have access to test results
      if (!config.test) {
        config.test = {};
      }

      // Add our reporter to collect metrics
      if (!config.test.reporters) {
        config.test.reporters = ['default'];
      }

      if (Array.isArray(config.test.reporters)) {
        config.test.reporters.push('json');
      }

      return config;
    },

    // Custom vitest hooks
    buildStart() {
      console.log('🔍 Test maintenance plugin active - collecting metrics...');
    },

    // Process test results after completion
    buildEnd() {
      // This will be called after tests complete
      this.processTestResults();
    },

    // Custom method to process test results
    processTestResults() {
      try {
        // Try to read test results from vitest JSON output
        const resultsPath = path.join(process.cwd(), 'test-results', 'results.json');

        if (fs.existsSync(resultsPath)) {
          const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
          this.collectMetricsFromResults(results);
        }
      } catch (error) {
        console.warn('⚠️  Could not collect test metrics:', error.message);
      }
    },

    // Collect metrics from vitest results
    collectMetricsFromResults(results: any) {
      if (!results.testResults) return;

      const timestamp = new Date().toISOString();
      const memoryUsage = collectMemoryUsage
        ? process.memoryUsage().heapUsed / 1024 / 1024
        : undefined;

      for (const testFile of results.testResults) {
        const filePath = testFile.name;
        const fileStartTime = testFile.startTime;
        const fileEndTime = testFile.endTime;
        const fileDuration = fileEndTime - fileStartTime;

        // Record file-level metrics
        const fileMetrics: TestExecutionMetrics = {
          testName: `File: ${filePath.split('/').pop()}`,
          filePath,
          duration: fileDuration,
          status: testFile.status === 'passed' ? 'passed' : 'failed',
          timestamp,
          memoryUsage,
        };

        utility.recordTestMetrics(fileMetrics);

        // Record individual test metrics if available
        if (testFile.assertionResults) {
          for (const assertion of testFile.assertionResults) {
            const testMetrics: TestExecutionMetrics = {
              testName: assertion.title,
              filePath,
              duration: assertion.duration || 0,
              status: assertion.status === 'passed' ? 'passed' : 'failed',
              timestamp,
              memoryUsage,
            };

            utility.recordTestMetrics(testMetrics);
          }
        }
      }

      console.log(`📊 Recorded metrics for ${results.numTotalTests} tests`);
    },
  };
}

// Export default for easier importing
export default testMaintenancePlugin;
