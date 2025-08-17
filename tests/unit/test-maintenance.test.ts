/**
 * Tests for test maintenance utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import {
  TestMaintenanceUtility,
  DEFAULT_THRESHOLDS,
  createTestMaintenanceUtility,
  performQuickHealthCheck,
  type TestExecutionMetrics,
  type TestHealthReport,
  type TestPerformanceThresholds,
} from '../../src/test-maintenance.js';
import { TestSetup } from '../utils/test-setup.js';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('Test Maintenance Utilities', () => {
  let testEnv: ReturnType<typeof TestSetup.setupTestEnvironment>;
  let utility: TestMaintenanceUtility;

  beforeEach(() => {
    testEnv = TestSetup.setupTestEnvironment();
    utility = new TestMaintenanceUtility('test-metrics.json', DEFAULT_THRESHOLDS);
    vi.clearAllMocks();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  describe('TestMaintenanceUtility', () => {
    it('should create utility with default configuration', () => {
      const defaultUtility = new TestMaintenanceUtility();
      expect(defaultUtility).toBeInstanceOf(TestMaintenanceUtility);
    });

    it('should create utility with custom configuration', () => {
      const customThresholds: TestPerformanceThresholds = {
        slowTestThreshold: 3000,
        memoryLeakThreshold: 50,
        flakyTestRetryThreshold: 1,
      };

      const customUtility = new TestMaintenanceUtility('custom-metrics.json', customThresholds);
      expect(customUtility).toBeInstanceOf(TestMaintenanceUtility);
    });

    describe('recordTestMetrics', () => {
      it('should record test metrics successfully', () => {
        const mockMetrics: TestExecutionMetrics[] = [];
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockMetrics));

        const testMetrics: TestExecutionMetrics = {
          testName: 'should test something',
          filePath: '/path/to/test.ts',
          duration: 1500,
          status: 'passed',
          timestamp: '2023-01-01T12:00:00Z',
          memoryUsage: 50,
          retries: 0,
        };

        expect(() => utility.recordTestMetrics(testMetrics)).not.toThrow();
        expect(writeFileSync).toHaveBeenCalled();
      });

      it('should handle file creation when metrics file does not exist', () => {
        vi.mocked(existsSync).mockReturnValue(false);

        const testMetrics: TestExecutionMetrics = {
          testName: 'should test something',
          filePath: '/path/to/test.ts',
          duration: 1000,
          status: 'passed',
          timestamp: '2023-01-01T12:00:00Z',
        };

        expect(() => utility.recordTestMetrics(testMetrics)).not.toThrow();
        expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('test-results'), {
          recursive: true,
        });
      });

      it('should limit metrics to 1000 entries', () => {
        const existingMetrics = Array.from({ length: 1005 }, (_, i) => ({
          testName: `test-${i}`,
          filePath: '/path/to/test.ts',
          duration: 1000,
          status: 'passed' as const,
          timestamp: '2023-01-01T12:00:00Z',
        }));

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(existingMetrics));

        const newMetrics: TestExecutionMetrics = {
          testName: 'new test',
          filePath: '/path/to/test.ts',
          duration: 1000,
          status: 'passed',
          timestamp: '2023-01-01T12:00:00Z',
        };

        utility.recordTestMetrics(newMetrics);

        const writeCall = vi.mocked(writeFileSync).mock.calls[0];
        const savedMetrics = JSON.parse(writeCall[1] as string);
        expect(savedMetrics).toHaveLength(1000);
      });

      it('should handle file read errors gracefully', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockImplementation(() => {
          throw new Error('File read error');
        });

        const testMetrics: TestExecutionMetrics = {
          testName: 'should test something',
          filePath: '/path/to/test.ts',
          duration: 1000,
          status: 'passed',
          timestamp: '2023-01-01T12:00:00Z',
        };

        expect(() => utility.recordTestMetrics(testMetrics)).not.toThrow();
      });

      it('should handle file write errors gracefully', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(writeFileSync).mockImplementation(() => {
          throw new Error('File write error');
        });

        const testMetrics: TestExecutionMetrics = {
          testName: 'should test something',
          filePath: '/path/to/test.ts',
          duration: 1000,
          status: 'passed',
          timestamp: '2023-01-01T12:00:00Z',
        };

        expect(() => utility.recordTestMetrics(testMetrics)).not.toThrow();
      });
    });

    describe('generateHealthReport', () => {
      it('should generate comprehensive health report', () => {
        const mockMetrics: TestExecutionMetrics[] = [
          {
            testName: 'fast test',
            filePath: '/path/to/fast.test.ts',
            duration: 100,
            status: 'passed',
            timestamp: new Date().toISOString(),
            memoryUsage: 30,
          },
          {
            testName: 'slow test',
            filePath: '/path/to/slow.test.ts',
            duration: 6000,
            status: 'passed',
            timestamp: new Date().toISOString(),
            memoryUsage: 40,
          },
          {
            testName: 'failing test',
            filePath: '/path/to/failing.test.ts',
            duration: 2000,
            status: 'failed',
            timestamp: new Date().toISOString(),
            memoryUsage: 50,
          },
          {
            testName: 'memory leak test',
            filePath: '/path/to/memory.test.ts',
            duration: 3000,
            status: 'passed',
            timestamp: new Date().toISOString(),
            memoryUsage: 150,
          },
        ];

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockMetrics));

        const report = utility.generateHealthReport();

        expect(report.totalTests).toBe(4);
        expect(report.slowTests).toHaveLength(1);
        expect(report.failingTests).toHaveLength(1);
        expect(report.memoryLeaks).toHaveLength(1);
        expect(report.averageExecutionTime).toBeGreaterThan(0);
        expect(report.recommendations).toBeInstanceOf(Array);
      });

      it('should filter metrics by date range', () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 10);

        const recentDate = new Date();

        const mockMetrics: TestExecutionMetrics[] = [
          {
            testName: 'old test',
            filePath: '/path/to/old.test.ts',
            duration: 1000,
            status: 'passed',
            timestamp: oldDate.toISOString(),
          },
          {
            testName: 'recent test',
            filePath: '/path/to/recent.test.ts',
            duration: 2000,
            status: 'passed',
            timestamp: recentDate.toISOString(),
          },
        ];

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockMetrics));

        const report = utility.generateHealthReport(7); // Last 7 days

        expect(report.totalTests).toBe(1); // Only recent test should be included
      });

      it('should identify flaky tests correctly', () => {
        const testName = 'flaky test';
        const filePath = '/path/to/flaky.test.ts';
        const baseTimestamp = new Date();

        const mockMetrics: TestExecutionMetrics[] = [
          {
            testName,
            filePath,
            duration: 1000,
            status: 'passed',
            timestamp: new Date(baseTimestamp.getTime() - 5000).toISOString(),
          },
          {
            testName,
            filePath,
            duration: 1000,
            status: 'failed',
            timestamp: new Date(baseTimestamp.getTime() - 4000).toISOString(),
          },
          {
            testName,
            filePath,
            duration: 1000,
            status: 'passed',
            timestamp: new Date(baseTimestamp.getTime() - 3000).toISOString(),
          },
          {
            testName,
            filePath,
            duration: 1000,
            status: 'failed',
            timestamp: baseTimestamp.toISOString(),
          },
        ];

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockMetrics));

        const report = utility.generateHealthReport();

        expect(report.flakyTests).toHaveLength(1);
        expect(report.flakyTests[0].testName).toBe(testName);
      });

      it('should handle empty metrics file', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify([]));

        const report = utility.generateHealthReport();

        expect(report.totalTests).toBe(0);
        expect(report.slowTests).toHaveLength(0);
        expect(report.failingTests).toHaveLength(0);
        expect(report.flakyTests).toHaveLength(0);
        expect(report.memoryLeaks).toHaveLength(0);
        expect(report.averageExecutionTime).toBe(0);
        expect(report.recommendations).toContain(
          '✅ All tests are performing well! Keep up the good work.'
        );
      });
    });

    describe('getExecutionTimeTrends', () => {
      it('should calculate execution time trends', () => {
        const mockMetrics: TestExecutionMetrics[] = [
          {
            testName: 'test',
            filePath: '/path/to/test.ts',
            duration: 1000,
            status: 'passed',
            timestamp: '2023-01-01T12:00:00Z',
          },
          {
            testName: 'test',
            filePath: '/path/to/test.ts',
            duration: 2000,
            status: 'passed',
            timestamp: '2023-01-02T12:00:00Z',
          },
          {
            testName: 'test',
            filePath: '/path/to/test.ts',
            duration: 3000,
            status: 'passed',
            timestamp: '2023-01-03T12:00:00Z',
          },
        ];

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockMetrics));

        const trends = utility.getExecutionTimeTrends('test', '/path/to/test.ts');

        expect(trends.dates).toHaveLength(3);
        expect(trends.durations).toHaveLength(3);
        expect(trends.trend).toBe('degrading'); // Times are increasing
      });

      it('should calculate trends for all tests when no specific test provided', () => {
        const mockMetrics: TestExecutionMetrics[] = [
          {
            testName: 'test1',
            filePath: '/path/to/test1.ts',
            duration: 1000,
            status: 'passed',
            timestamp: '2023-01-01T12:00:00Z',
          },
          {
            testName: 'test2',
            filePath: '/path/to/test2.ts',
            duration: 500,
            status: 'passed',
            timestamp: '2023-01-01T12:00:00Z',
          },
        ];

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockMetrics));

        const trends = utility.getExecutionTimeTrends();

        expect(trends.dates).toHaveLength(1);
        expect(trends.durations[0]).toBe(750); // Average of 1000 and 500
      });

      it('should detect improving trend', () => {
        const mockMetrics: TestExecutionMetrics[] = [
          {
            testName: 'test',
            filePath: '/path/to/test.ts',
            duration: 3000,
            status: 'passed',
            timestamp: '2023-01-01T12:00:00Z',
          },
          {
            testName: 'test',
            filePath: '/path/to/test.ts',
            duration: 2000,
            status: 'passed',
            timestamp: '2023-01-02T12:00:00Z',
          },
          {
            testName: 'test',
            filePath: '/path/to/test.ts',
            duration: 1000,
            status: 'passed',
            timestamp: '2023-01-03T12:00:00Z',
          },
        ];

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockMetrics));

        const trends = utility.getExecutionTimeTrends('test', '/path/to/test.ts');

        expect(trends.trend).toBe('improving');
      });

      it('should detect stable trend', () => {
        const mockMetrics: TestExecutionMetrics[] = [
          {
            testName: 'test',
            filePath: '/path/to/test.ts',
            duration: 1000,
            status: 'passed',
            timestamp: '2023-01-01T12:00:00Z',
          },
          {
            testName: 'test',
            filePath: '/path/to/test.ts',
            duration: 1050,
            status: 'passed',
            timestamp: '2023-01-02T12:00:00Z',
          },
        ];

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockMetrics));

        const trends = utility.getExecutionTimeTrends('test', '/path/to/test.ts');

        expect(trends.trend).toBe('stable');
      });
    });

    describe('exportHealthReport', () => {
      let sampleReport: TestHealthReport;

      beforeEach(() => {
        sampleReport = {
          totalTests: 10,
          slowTests: [
            {
              testName: 'slow test',
              filePath: '/path/to/slow.test.ts',
              duration: 6000,
              status: 'passed',
              timestamp: '2023-01-01T12:00:00Z',
            },
          ],
          failingTests: [],
          flakyTests: [],
          averageExecutionTime: 2000,
          memoryLeaks: [],
          recommendations: ['Consider optimizing slow tests'],
        };
      });

      it('should export report as JSON by default', () => {
        const exported = utility.exportHealthReport(sampleReport);
        const parsed = JSON.parse(exported);

        expect(parsed.totalTests).toBe(10);
        expect(parsed.slowTests).toHaveLength(1);
      });

      it('should export report as markdown', () => {
        const exported = utility.exportHealthReport(sampleReport, 'markdown');

        expect(exported).toContain('# Test Health Report');
        expect(exported).toContain('**Total Tests**: 10');
        expect(exported).toContain('## Recommendations');
        expect(exported).toContain('## Slow Tests');
      });

      it('should export report as CSV', () => {
        const exported = utility.exportHealthReport(sampleReport, 'csv');

        expect(exported).toContain('Type,TestName,FilePath,Duration,Status,Timestamp,MemoryUsage');
        expect(exported).toContain('Slow,"slow test"');
      });

      it('should handle empty report sections in markdown', () => {
        const emptyReport: TestHealthReport = {
          totalTests: 0,
          slowTests: [],
          failingTests: [],
          flakyTests: [],
          averageExecutionTime: 0,
          memoryLeaks: [],
          recommendations: [],
        };

        const exported = utility.exportHealthReport(emptyReport, 'markdown');

        expect(exported).toContain('# Test Health Report');
        expect(exported).toContain('**Total Tests**: 0');
      });
    });
  });

  describe('Utility Functions', () => {
    describe('createTestMaintenanceUtility', () => {
      it('should create utility with default parameters', () => {
        const utility = createTestMaintenanceUtility();
        expect(utility).toBeInstanceOf(TestMaintenanceUtility);
      });

      it('should create utility with custom parameters', () => {
        const customThresholds = {
          slowTestThreshold: 2000,
        };

        const utility = createTestMaintenanceUtility('custom.json', customThresholds);
        expect(utility).toBeInstanceOf(TestMaintenanceUtility);
      });
    });

    describe('performQuickHealthCheck', () => {
      it('should perform quick health check and return healthy status', () => {
        const mockMetrics: TestExecutionMetrics[] = [
          {
            testName: 'good test',
            filePath: '/path/to/good.test.ts',
            duration: 1000,
            status: 'passed',
            timestamp: new Date().toISOString(),
          },
        ];

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockMetrics));

        const result = performQuickHealthCheck();

        expect(result.healthy).toBe(true);
        expect(result.issues).toHaveLength(0);
        expect(result.metrics).toBeDefined();
      });

      it('should detect unhealthy status with failing tests', () => {
        const mockMetrics: TestExecutionMetrics[] = [
          {
            testName: 'failing test',
            filePath: '/path/to/failing.test.ts',
            duration: 1000,
            status: 'failed',
            timestamp: new Date().toISOString(),
          },
        ];

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockMetrics));

        const result = performQuickHealthCheck();

        expect(result.healthy).toBe(false);
        expect(result.issues).toContain('1 tests are currently failing');
      });

      it('should detect issues with too many flaky tests', () => {
        const baseTimestamp = new Date();

        // Create 6 flaky tests (above threshold of 5)
        const mockMetrics: TestExecutionMetrics[] = [];
        for (let i = 0; i < 6; i++) {
          mockMetrics.push(
            {
              testName: `flaky test ${i}`,
              filePath: `/path/to/flaky${i}.test.ts`,
              duration: 1000,
              status: 'passed',
              timestamp: new Date(baseTimestamp.getTime() - 5000).toISOString(),
            },
            {
              testName: `flaky test ${i}`,
              filePath: `/path/to/flaky${i}.test.ts`,
              duration: 1000,
              status: 'failed',
              timestamp: new Date(baseTimestamp.getTime() - 4000).toISOString(),
            },
            {
              testName: `flaky test ${i}`,
              filePath: `/path/to/flaky${i}.test.ts`,
              duration: 1000,
              status: 'passed',
              timestamp: baseTimestamp.toISOString(),
            }
          );
        }

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockMetrics));

        const result = performQuickHealthCheck();

        expect(result.healthy).toBe(false);
        expect(result.issues.some((issue) => issue.includes('flaky tests detected'))).toBe(true);
      });

      it('should detect performance issues', () => {
        const mockMetrics: TestExecutionMetrics[] = Array.from({ length: 15 }, (_, i) => ({
          testName: `slow test ${i}`,
          filePath: `/path/to/slow${i}.test.ts`,
          duration: 6000, // Above slow threshold
          status: 'passed' as const,
          timestamp: new Date().toISOString(),
        }));

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockMetrics));

        const result = performQuickHealthCheck();

        expect(result.issues.some((issue) => issue.includes('slow tests detected'))).toBe(true);
        expect(result.issues.some((issue) => issue.includes('Average execution time'))).toBe(true);
      });
    });
  });

  describe('DEFAULT_THRESHOLDS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_THRESHOLDS.slowTestThreshold).toBe(5000);
      expect(DEFAULT_THRESHOLDS.memoryLeakThreshold).toBe(100);
      expect(DEFAULT_THRESHOLDS.flakyTestRetryThreshold).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parse errors gracefully', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue('invalid json');

      expect(() => utility.generateHealthReport()).not.toThrow();
    });

    it('should handle missing test-results directory', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(mkdirSync).mockImplementation(() => {
        throw new Error('Cannot create directory');
      });

      const testMetrics: TestExecutionMetrics = {
        testName: 'test',
        filePath: '/path/to/test.ts',
        duration: 1000,
        status: 'passed',
        timestamp: '2023-01-01T12:00:00Z',
      };

      expect(() => utility.recordTestMetrics(testMetrics)).not.toThrow();
    });
  });
});
