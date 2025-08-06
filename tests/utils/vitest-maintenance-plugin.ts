/**
 * Vitest plugin for automatic test maintenance metrics collection
 * Integrates with the test maintenance utility to track test performance
 */

import type { Reporter } from 'vitest';
import { createTestMaintenanceUtility, type TestExecutionMetrics } from './test-maintenance.js';

export interface MaintenancePluginOptions {
  enabled?: boolean;
  metricsFile?: string;
  thresholds?: {
    slowTestThreshold?: number;
    memoryLeakThreshold?: number;
    flakyTestRetryThreshold?: number;
  };
}

/**
 * Vitest reporter that automatically collects test maintenance metrics
 */
export class TestMaintenanceReporter implements Reporter {
  private utility: ReturnType<typeof createTestMaintenanceUtility>;
  private options: MaintenancePluginOptions;

  constructor(options: MaintenancePluginOptions = {}) {
    this.options = { enabled: true, ...options };
    this.utility = createTestMaintenanceUtility(
      options.metricsFile,
      options.thresholds
    );
  }

  onInit() {
    if (this.options.enabled) {
      console.log('📊 Test maintenance metrics collection enabled');
    }
  }

  onFinished(files: any[], errors: any[]) {
    if (!this.options.enabled) return;

    // Collect metrics for all completed tests
    for (const file of files) {
      if (!file.tasks) continue;

      this.processTestTasks(file.tasks, file.filepath);
    }

    // Perform quick health check if there are issues
    if (errors.length > 0) {
      this.reportHealthIssues();
    }
  }

  private processTestTasks(tasks: any[], filepath: string) {
    for (const task of tasks) {
      if (task.type === 'test' && task.result) {
        const metrics: TestExecutionMetrics = {
          testName: task.name,
          filePath: filepath,
          duration: task.result.duration || 0,
          status: this.mapTaskState(task.result.state),
          timestamp: new Date().toISOString(),
          memoryUsage: this.getMemoryUsage(),
          retries: task.result.retryCount || 0
        };

        this.utility.recordTestMetrics(metrics);
      }

      // Process nested tasks (describe blocks)
      if (task.tasks) {
        this.processTestTasks(task.tasks, filepath);
      }
    }
  }

  private mapTaskState(state: string): 'passed' | 'failed' | 'skipped' {
    switch (state) {
      case 'pass':
        return 'passed';
      case 'fail':
        return 'failed';
      case 'skip':
      case 'todo':
        return 'skipped';
      default:
        return 'failed';
    }
  }

  private getMemoryUsage(): number {
    try {
      return process.memoryUsage().heapUsed / 1024 / 1024; // Convert to MB
    } catch {
      return 0;
    }
  }

  private reportHealthIssues() {
    try {
      const report = this.utility.generateHealthReport(1); // Last 24 hours
      
      if (report.slowTests.length > 0) {
        console.warn(`⚠️  ${report.slowTests.length} slow tests detected`);
      }
      
      if (report.flakyTests.length > 0) {
        console.warn(`⚠️  ${report.flakyTests.length} flaky tests detected`);
      }
    } catch (error) {
      // Silently ignore errors in health reporting to not interfere with test execution
    }
  }
}

/**
 * Create the test maintenance reporter for Vitest configuration
 */
export function createMaintenanceReporter(options: MaintenancePluginOptions = {}) {
  return new TestMaintenanceReporter(options);
}

/**
 * Vitest plugin factory function
 */
export function testMaintenancePlugin(options: MaintenancePluginOptions = {}) {
  return {
    name: 'test-maintenance',
    configResolved() {
      // Plugin setup logic if needed
    }
  };
}