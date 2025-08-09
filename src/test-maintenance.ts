/**
 * Test maintenance utilities for monitoring test health and performance
 * Provides tools for identifying problematic tests and tracking test metrics
 */

// Node.js built-ins
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Internal imports
import { getLogger } from './utils/logger.js';

export interface TestExecutionMetrics {
  testName: string;
  filePath: string;
  duration: number;
  status: 'passed' | 'failed' | 'skipped';
  timestamp: string;
  memoryUsage?: number;
  retries?: number;
}

export interface TestHealthReport {
  totalTests: number;
  slowTests: TestExecutionMetrics[];
  failingTests: TestExecutionMetrics[];
  flakyTests: TestExecutionMetrics[];
  averageExecutionTime: number;
  memoryLeaks: TestExecutionMetrics[];
  recommendations: string[];
}

export interface TestPerformanceThresholds {
  slowTestThreshold: number; // milliseconds
  memoryLeakThreshold: number; // MB
  flakyTestRetryThreshold: number; // number of retries
}

/**
 * Default performance thresholds for test monitoring
 */
export const DEFAULT_THRESHOLDS: TestPerformanceThresholds = {
  slowTestThreshold: 5000, // 5 seconds
  memoryLeakThreshold: 100, // 100 MB
  flakyTestRetryThreshold: 2, // 2 retries
};

/**
 * Test maintenance utility class for monitoring test health
 */
export class TestMaintenanceUtility {
  private metricsFile: string;
  private thresholds: TestPerformanceThresholds;

  constructor(
    metricsFile: string = 'test-metrics.json',
    thresholds: TestPerformanceThresholds = DEFAULT_THRESHOLDS
  ) {
    this.metricsFile = join(process.cwd(), 'test-results', metricsFile);
    this.thresholds = thresholds;
  }

  /**
   * Record test execution metrics
   */
  recordTestMetrics(metrics: TestExecutionMetrics): void {
    const existingMetrics = this.loadMetrics();
    existingMetrics.push(metrics);

    // Keep only last 1000 test runs to prevent file from growing too large
    const recentMetrics = existingMetrics.slice(-1000);

    this.saveMetrics(recentMetrics);
  }

  /**
   * Load existing test metrics from file
   */
  private loadMetrics(): TestExecutionMetrics[] {
    if (!existsSync(this.metricsFile)) {
      return [];
    }

    try {
      const data = readFileSync(this.metricsFile, 'utf-8');
      return JSON.parse(data) as TestExecutionMetrics[];
    } catch (error) {
      getLogger().warn(`Failed to load test metrics: ${error}`);
      return [];
    }
  }

  /**
   * Save test metrics to file
   */
  private saveMetrics(metrics: TestExecutionMetrics[]): void {
    try {
      const dir = join(process.cwd(), 'test-results');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
    } catch (error) {
      getLogger().warn(`Failed to save test metrics: ${error}`);
    }
  }

  /**
   * Generate comprehensive test health report
   */
  generateHealthReport(daysSince: number = 7): TestHealthReport {
    const metrics = this.loadMetrics();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSince);

    // Filter metrics to recent period
    const recentMetrics = metrics.filter((m) => new Date(m.timestamp) >= cutoffDate);

    const slowTests = this.identifySlowTests(recentMetrics);
    const failingTests = this.identifyFailingTests(recentMetrics);
    const flakyTests = this.identifyFlakyTests(recentMetrics);
    const memoryLeaks = this.identifyMemoryLeaks(recentMetrics);

    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageExecutionTime =
      recentMetrics.length > 0 ? totalDuration / recentMetrics.length : 0;

    const recommendations = this.generateRecommendations({
      slowTests,
      failingTests,
      flakyTests,
      memoryLeaks,
      averageExecutionTime,
    });

    return {
      totalTests: recentMetrics.length,
      slowTests,
      failingTests,
      flakyTests,
      averageExecutionTime,
      memoryLeaks,
      recommendations,
    };
  }

  /**
   * Identify tests that consistently run slower than threshold
   */
  private identifySlowTests(metrics: TestExecutionMetrics[]): TestExecutionMetrics[] {
    const testGroups = this.groupByTest(metrics);
    const slowTests: TestExecutionMetrics[] = [];

    for (const [, testMetrics] of testGroups) {
      const averageDuration =
        testMetrics.reduce((sum, m) => sum + m.duration, 0) / testMetrics.length;

      if (averageDuration > this.thresholds.slowTestThreshold) {
        // Find the slowest execution for this test
        const slowestExecution = testMetrics.reduce((slowest, current) =>
          current.duration > slowest.duration ? current : slowest
        );
        slowTests.push(slowestExecution);
      }
    }

    return slowTests.sort((a, b) => b.duration - a.duration);
  }

  /**
   * Identify tests that have failed recently
   */
  private identifyFailingTests(metrics: TestExecutionMetrics[]): TestExecutionMetrics[] {
    return metrics
      .filter((m) => m.status === 'failed')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Identify flaky tests (tests that sometimes pass, sometimes fail)
   */
  private identifyFlakyTests(metrics: TestExecutionMetrics[]): TestExecutionMetrics[] {
    const testGroups = this.groupByTest(metrics);
    const flakyTests: TestExecutionMetrics[] = [];

    for (const [, testMetrics] of testGroups) {
      if (testMetrics.length < 3) continue; // Need at least 3 runs to determine flakiness

      const passedCount = testMetrics.filter((m) => m.status === 'passed').length;
      const failedCount = testMetrics.filter((m) => m.status === 'failed').length;
      const totalRuns = testMetrics.length;

      // Consider flaky if both passes and failures exist and failure rate is between 10-90%
      const failureRate = failedCount / totalRuns;
      if (failedCount > 0 && passedCount > 0 && failureRate >= 0.1 && failureRate <= 0.9) {
        // Get the most recent execution
        const mostRecent = testMetrics.reduce((latest, current) =>
          new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
        );
        flakyTests.push(mostRecent);
      }
    }

    return flakyTests;
  }

  /**
   * Identify tests with potential memory leaks
   */
  private identifyMemoryLeaks(metrics: TestExecutionMetrics[]): TestExecutionMetrics[] {
    return metrics
      .filter((m) => m.memoryUsage && m.memoryUsage > this.thresholds.memoryLeakThreshold)
      .sort((a, b) => (b.memoryUsage || 0) - (a.memoryUsage || 0));
  }

  /**
   * Group metrics by test identifier
   */
  private groupByTest(metrics: TestExecutionMetrics[]): Map<string, TestExecutionMetrics[]> {
    const groups = new Map<string, TestExecutionMetrics[]>();

    for (const metric of metrics) {
      const key = `${metric.filePath}:${metric.testName}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(metric);
    }

    return groups;
  }

  /**
   * Generate actionable recommendations based on test health analysis
   */
  private generateRecommendations(analysis: {
    slowTests: TestExecutionMetrics[];
    failingTests: TestExecutionMetrics[];
    flakyTests: TestExecutionMetrics[];
    memoryLeaks: TestExecutionMetrics[];
    averageExecutionTime: number;
  }): string[] {
    const recommendations: string[] = [];

    if (analysis.slowTests.length > 0) {
      recommendations.push(
        `🐌 ${analysis.slowTests.length} slow tests detected. Consider optimizing or splitting these tests.`
      );

      if (analysis.slowTests.length > 5) {
        recommendations.push(
          '⚡ Consider running slow tests in parallel or using test.concurrent() for independent tests.'
        );
      }
    }

    if (analysis.failingTests.length > 0) {
      recommendations.push(
        `❌ ${analysis.failingTests.length} failing tests detected. Prioritize fixing these tests.`
      );
    }

    if (analysis.flakyTests.length > 0) {
      recommendations.push(
        `🎲 ${analysis.flakyTests.length} flaky tests detected. These tests need stabilization.`
      );
      recommendations.push(
        '🔧 Review flaky tests for race conditions, timing issues, or external dependencies.'
      );
    }

    if (analysis.memoryLeaks.length > 0) {
      recommendations.push(
        `🧠 ${analysis.memoryLeaks.length} tests with high memory usage detected. Check for memory leaks.`
      );
    }

    if (analysis.averageExecutionTime > 2000) {
      recommendations.push(
        '⏱️ Average test execution time is high. Consider optimizing test setup and teardown.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All tests are performing well! Keep up the good work.');
    }

    return recommendations;
  }

  /**
   * Get test execution time trends over time
   */
  getExecutionTimeTrends(
    testName?: string,
    filePath?: string
  ): {
    dates: string[];
    durations: number[];
    trend: 'improving' | 'degrading' | 'stable';
  } {
    const metrics = this.loadMetrics();
    let filteredMetrics = metrics;

    if (testName && filePath) {
      filteredMetrics = metrics.filter((m) => m.testName === testName && m.filePath === filePath);
    }

    // Group by date and calculate average duration per day
    const dailyAverages = new Map<string, { total: number; count: number }>();

    for (const metric of filteredMetrics) {
      const date = new Date(metric.timestamp).toISOString().split('T')[0];
      if (!dailyAverages.has(date)) {
        dailyAverages.set(date, { total: 0, count: 0 });
      }
      const day = dailyAverages.get(date)!;
      day.total += metric.duration;
      day.count += 1;
    }

    const dates = Array.from(dailyAverages.keys()).sort();
    const durations = dates.map((date) => {
      const day = dailyAverages.get(date)!;
      return day.total / day.count;
    });

    // Calculate trend
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (durations.length >= 2) {
      const firstHalf = durations.slice(0, Math.floor(durations.length / 2));
      const secondHalf = durations.slice(Math.floor(durations.length / 2));

      const firstAvg = firstHalf.reduce((sum, d) => sum + d, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, d) => sum + d, 0) / secondHalf.length;

      const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

      if (changePercent > 10) {
        trend = 'degrading';
      } else if (changePercent < -10) {
        trend = 'improving';
      }
    }

    return { dates, durations, trend };
  }

  /**
   * Export health report to various formats
   */
  exportHealthReport(
    report: TestHealthReport,
    format: 'json' | 'markdown' | 'csv' = 'json'
  ): string {
    switch (format) {
      case 'markdown':
        return this.exportToMarkdown(report);
      case 'csv':
        return this.exportToCsv(report);
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  private exportToMarkdown(report: TestHealthReport): string {
    let markdown = '# Test Health Report\n\n';

    markdown += `## Summary\n`;
    markdown += `- **Total Tests**: ${report.totalTests}\n`;
    markdown += `- **Average Execution Time**: ${report.averageExecutionTime.toFixed(2)}ms\n`;
    markdown += `- **Slow Tests**: ${report.slowTests.length}\n`;
    markdown += `- **Failing Tests**: ${report.failingTests.length}\n`;
    markdown += `- **Flaky Tests**: ${report.flakyTests.length}\n`;
    markdown += `- **Memory Issues**: ${report.memoryLeaks.length}\n\n`;

    if (report.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      for (const rec of report.recommendations) {
        markdown += `- ${rec}\n`;
      }
      markdown += '\n';
    }

    if (report.slowTests.length > 0) {
      markdown += `## Slow Tests\n\n`;
      markdown += `| Test | File | Duration | Status |\n`;
      markdown += `|------|------|----------|--------|\n`;
      for (const test of report.slowTests.slice(0, 10)) {
        markdown += `| ${test.testName} | ${test.filePath} | ${test.duration}ms | ${test.status} |\n`;
      }
      markdown += '\n';
    }

    return markdown;
  }

  private exportToCsv(report: TestHealthReport): string {
    let csv = 'Type,TestName,FilePath,Duration,Status,Timestamp,MemoryUsage\n';

    const addTests = (tests: TestExecutionMetrics[], type: string) => {
      for (const test of tests) {
        csv += `${type},"${test.testName}","${test.filePath}",${test.duration},${test.status},${test.timestamp},${test.memoryUsage || ''}\n`;
      }
    };

    addTests(report.slowTests, 'Slow');
    addTests(report.failingTests, 'Failing');
    addTests(report.flakyTests, 'Flaky');
    addTests(report.memoryLeaks, 'MemoryLeak');

    return csv;
  }
}

/**
 * Utility functions for test maintenance
 */

/**
 * Create a test maintenance utility instance
 */
export function createTestMaintenanceUtility(
  metricsFile?: string,
  thresholds?: Partial<TestPerformanceThresholds>
): TestMaintenanceUtility {
  const finalThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  return new TestMaintenanceUtility(metricsFile, finalThresholds);
}

/**
 * Quick health check function for CI/CD integration
 */
export function performQuickHealthCheck(): {
  healthy: boolean;
  issues: string[];
  metrics: TestHealthReport;
} {
  const utility = createTestMaintenanceUtility();
  const report = utility.generateHealthReport(1); // Last 24 hours

  const issues: string[] = [];
  let healthy = true;

  if (report.failingTests.length > 0) {
    issues.push(`${report.failingTests.length} tests are currently failing`);
    healthy = false;
  }

  if (report.flakyTests.length > 5) {
    issues.push(`${report.flakyTests.length} flaky tests detected (threshold: 5)`);
    healthy = false;
  }

  if (report.slowTests.length > 10) {
    issues.push(`${report.slowTests.length} slow tests detected (threshold: 10)`);
  }

  if (report.averageExecutionTime > 3000) {
    issues.push(
      `Average execution time is ${report.averageExecutionTime.toFixed(2)}ms (threshold: 3000ms)`
    );
  }

  return { healthy, issues, metrics: report };
}
