import { describe, it, expect } from 'vitest';
import { TestHealthChecker } from './health-checker';

describe('Test Health Checker', () => {
  const healthChecker = new TestHealthChecker();

  it('should identify test files correctly', () => {
    const testFiles = (healthChecker as any).findTestFiles();
    expect(testFiles.length).toBeGreaterThan(0);
    expect(
      testFiles.every((file: string) => file.endsWith('.test.ts') || file.endsWith('.spec.ts'))
    ).toBe(true);
  });

  it('should count tests in a file correctly', () => {
    const content = `
      describe('Test', () => {
        it('should work', () => {});
        test('should also work', () => {});
      });
    `;
    const count = (healthChecker as any).countTests(content);
    expect(count).toBe(2);
  });

  it('should calculate describe nesting correctly', () => {
    const content = `
      describe('Level 1', () => {
        describe('Level 2', () => {
          describe('Level 3', () => {
            it('test', () => {});
          });
        });
      });
    `;
    const nesting = (healthChecker as any).calculateDescribeNesting(content);
    expect(nesting).toBe(3);
  });

  it('should calculate mock complexity correctly', () => {
    const content = `
      vi.mock('./module');
      const mockFn = vi.fn().mockImplementation();
      mockFn.mockResolvedValue('test');
      mockFn.mockRejectedValue(new Error());
    `;
    const complexity = (healthChecker as any).calculateMockComplexity(content);
    expect(complexity).toBeGreaterThan(0);
  });

  it('should identify pattern violations', () => {
    const violations = (healthChecker as any).checkPatternCompliance(
      'tests/validation/test-health-check.ts'
    );
    expect(Array.isArray(violations)).toBe(true);
  });

  it('should perform complete health check', async () => {
    const metrics = await healthChecker.performHealthCheck();

    expect(metrics).toBeDefined();
    expect(metrics.totalTests).toBeGreaterThan(0);
    expect(metrics.totalTestFiles).toBeGreaterThan(0);
    expect(metrics.maintenanceScore).toBeGreaterThanOrEqual(0);
    expect(metrics.maintenanceScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(metrics.patternViolations)).toBe(true);
    expect(Array.isArray(metrics.complexMockTests)).toBe(true);
    expect(Array.isArray(metrics.coverageGaps)).toBe(true);
  });
});
