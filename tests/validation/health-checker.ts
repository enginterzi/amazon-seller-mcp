import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

export interface TestHealthMetrics {
  totalTests: number;
  totalTestFiles: number;
  averageTestsPerFile: number;
  slowTests: TestFileMetrics[];
  complexMockTests: TestFileMetrics[];
  patternViolations: PatternViolation[];
  coverageGaps: string[];
  maintenanceScore: number;
}

export interface TestFileMetrics {
  filePath: string;
  testCount: number;
  describeNesting: number;
  mockComplexity: number;
  lineCount: number;
  executionTime?: number;
}

export interface PatternViolation {
  filePath: string;
  violation: string;
  severity: 'low' | 'medium' | 'high';
  line?: number;
}

export class TestHealthChecker {
  private testDirectory = 'tests';
  private sourceDirectory = 'src';

  /**
   * Performs comprehensive health check of the test suite
   */
  async performHealthCheck(): Promise<TestHealthMetrics> {
    // eslint-disable-next-line no-console
    console.log('🔍 Starting test suite health check...\n');

    const testFiles = this.findTestFiles();
    const metrics: TestHealthMetrics = {
      totalTests: 0,
      totalTestFiles: testFiles.length,
      averageTestsPerFile: 0,
      slowTests: [],
      complexMockTests: [],
      patternViolations: [],
      coverageGaps: [],
      maintenanceScore: 0,
    };

    // Analyze each test file
    for (const filePath of testFiles) {
      const fileMetrics = await this.analyzeTestFile(filePath);
      metrics.totalTests += fileMetrics.testCount;

      // Identify problematic tests
      if (fileMetrics.describeNesting > 2) {
        metrics.patternViolations.push({
          filePath,
          violation: `Excessive nesting: ${fileMetrics.describeNesting} levels`,
          severity: 'medium',
        });
      }

      if (fileMetrics.mockComplexity > 5) {
        metrics.complexMockTests.push(fileMetrics);
      }

      if (fileMetrics.lineCount > 500) {
        metrics.patternViolations.push({
          filePath,
          violation: `Large test file: ${fileMetrics.lineCount} lines`,
          severity: 'low',
        });
      }

      // Check for pattern compliance
      const violations = this.checkPatternCompliance(filePath);
      metrics.patternViolations.push(...violations);
    }

    metrics.averageTestsPerFile = metrics.totalTests / metrics.totalTestFiles;
    metrics.coverageGaps = await this.identifyCoverageGaps();
    metrics.maintenanceScore = this.calculateMaintenanceScore(metrics);

    this.generateHealthReport(metrics);
    return metrics;
  }

  /**
   * Finds all test files in the test directory
   */
  findTestFiles(): string[] {
    const testFiles: string[] = [];

    const scanDirectory = (dir: string) => {
      try {
        const items = readdirSync(dir);

        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            scanDirectory(fullPath);
          } else if (item.endsWith('.test.ts') || item.endsWith('.spec.ts')) {
            testFiles.push(fullPath);
          }
        }
      } catch (error) {
        // Directory might not exist, skip silently
      }
    };

    scanDirectory(this.testDirectory);
    return testFiles;
  }

  /**
   * Analyzes a single test file for metrics
   */
  private async analyzeTestFile(filePath: string): Promise<TestFileMetrics> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      return {
        filePath,
        testCount: this.countTests(content),
        describeNesting: this.calculateDescribeNesting(content),
        mockComplexity: this.calculateMockComplexity(content),
        lineCount: lines.length,
      };
    } catch (error) {
      return {
        filePath,
        testCount: 0,
        describeNesting: 0,
        mockComplexity: 0,
        lineCount: 0,
      };
    }
  }

  /**
   * Counts the number of test cases in a file
   */
  countTests(content: string): number {
    const testMatches = content.match(/\b(it|test)\s*\(/g);
    return testMatches ? testMatches.length : 0;
  }

  /**
   * Calculates the maximum nesting level of describe blocks
   */
  calculateDescribeNesting(content: string): number {
    const lines = content.split('\n');
    let maxNesting = 0;
    let currentNesting = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('describe(')) {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      } else if (trimmed === '});' && currentNesting > 0) {
        // Simple heuristic: assume closing brace reduces nesting
        // This is not perfect but gives a reasonable approximation
        const openBraces = (content.substring(0, content.indexOf(line)).match(/describe\(/g) || [])
          .length;
        const closeBraces = (content.substring(0, content.indexOf(line)).match(/}\);/g) || [])
          .length;
        currentNesting = Math.max(0, openBraces - closeBraces);
      }
    }

    return maxNesting;
  }

  /**
   * Calculates mock complexity based on mock setup patterns
   */
  calculateMockComplexity(content: string): number {
    let complexity = 0;

    // Count different types of mocking patterns
    const mockPatterns = [
      /vi\.mock\(/g,
      /jest\.mock\(/g,
      /mockImplementation/g,
      /mockResolvedValue/g,
      /mockRejectedValue/g,
      /mockReturnValue/g,
      /createMock/g,
      /MockFactory/g,
    ];

    for (const pattern of mockPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Checks for compliance with established testing patterns
   */
  checkPatternCompliance(filePath: string): PatternViolation[] {
    const violations: PatternViolation[] = [];

    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Check for anti-patterns
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Check for implementation-focused test names
        if (
          line.includes('it(') &&
          (line.includes('should call') ||
            line.includes('should invoke') ||
            line.includes('should execute'))
        ) {
          violations.push({
            filePath,
            violation: 'Implementation-focused test name detected',
            severity: 'medium',
            line: lineNumber,
          });
        }

        // Check for excessive mocking in single test
        if (line.includes('vi.mock') || line.includes('jest.mock')) {
          const testBlock = this.extractTestBlock(lines, i);
          const mockCount = (testBlock.match(/mock/gi) || []).length;

          if (mockCount > 10) {
            violations.push({
              filePath,
              violation: `Excessive mocking in single test: ${mockCount} mocks`,
              severity: 'high',
              line: lineNumber,
            });
          }
        }

        // Check for missing test descriptions
        if (line.includes('it(') && (line.includes('""') || line.includes("''"))) {
          violations.push({
            filePath,
            violation: 'Empty test description',
            severity: 'high',
            line: lineNumber,
          });
        }

        // Check for outdated patterns
        if (line.includes('done()') || line.includes('callback')) {
          violations.push({
            filePath,
            violation: 'Outdated callback-based test pattern',
            severity: 'low',
            line: lineNumber,
          });
        }
      }
    } catch (error) {
      // File might not exist or be readable
    }

    return violations;
  }

  /**
   * Extracts the test block around a given line
   */
  private extractTestBlock(lines: string[], startLine: number): string {
    let braceCount = 0;
    let endLine = startLine;

    // Find the end of the test block
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      if (braceCount === 0 && i > startLine) {
        endLine = i;
        break;
      }
    }

    return lines.slice(startLine, endLine + 1).join('\n');
  }

  /**
   * Identifies potential coverage gaps by comparing source files to test files
   */
  private async identifyCoverageGaps(): Promise<string[]> {
    const gaps: string[] = [];
    const sourceFiles = this.findSourceFiles();
    const testFiles = this.findTestFiles();

    // Create a map of test files to their corresponding source files
    const testFileMap = new Set(
      testFiles.map((testFile) => {
        return testFile
          .replace(/^tests\//, '')
          .replace(/\.(test|spec)\.ts$/, '.ts')
          .replace(/^unit\//, '')
          .replace(/^integration\//, '');
      })
    );

    // Check for source files without corresponding tests
    for (const sourceFile of sourceFiles) {
      const relativePath = sourceFile.replace(/^src\//, '');

      if (!testFileMap.has(relativePath)) {
        gaps.push(sourceFile);
      }
    }

    return gaps;
  }

  /**
   * Finds all source files
   */
  private findSourceFiles(): string[] {
    const sourceFiles: string[] = [];

    const scanDirectory = (dir: string) => {
      try {
        const items = readdirSync(dir);

        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            scanDirectory(fullPath);
          } else if (extname(item) === '.ts' && !item.endsWith('.d.ts')) {
            sourceFiles.push(fullPath);
          }
        }
      } catch (error) {
        // Directory might not exist, skip silently
      }
    };

    scanDirectory(this.sourceDirectory);
    return sourceFiles;
  }

  /**
   * Calculates overall maintenance score (0-100)
   */
  private calculateMaintenanceScore(metrics: TestHealthMetrics): number {
    let score = 100;

    // Deduct points for violations
    const highSeverityViolations = metrics.patternViolations.filter(
      (v) => v.severity === 'high'
    ).length;
    const mediumSeverityViolations = metrics.patternViolations.filter(
      (v) => v.severity === 'medium'
    ).length;
    const lowSeverityViolations = metrics.patternViolations.filter(
      (v) => v.severity === 'low'
    ).length;

    score -= highSeverityViolations * 10;
    score -= mediumSeverityViolations * 5;
    score -= lowSeverityViolations * 2;

    // Deduct points for complex mocks
    score -= metrics.complexMockTests.length * 3;

    // Deduct points for coverage gaps
    score -= metrics.coverageGaps.length * 2;

    // Bonus points for good test distribution
    if (metrics.averageTestsPerFile >= 5 && metrics.averageTestsPerFile <= 15) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generates a comprehensive health report
   */
  private generateHealthReport(metrics: TestHealthMetrics): void {
    // eslint-disable-next-line no-console
    console.log('📊 Test Suite Health Report');
    // eslint-disable-next-line no-console
    console.log('='.repeat(50));
    // eslint-disable-next-line no-console
    console.log(`📁 Total Test Files: ${metrics.totalTestFiles}`);
    // eslint-disable-next-line no-console
    console.log(`🧪 Total Tests: ${metrics.totalTests}`);
    // eslint-disable-next-line no-console
    console.log(`📈 Average Tests per File: ${metrics.averageTestsPerFile.toFixed(1)}`);
    // eslint-disable-next-line no-console
    console.log(`🎯 Maintenance Score: ${metrics.maintenanceScore}/100`);
    // eslint-disable-next-line no-console
    console.log();

    // Pattern violations
    if (metrics.patternViolations.length > 0) {
      // eslint-disable-next-line no-console
      console.log('⚠️  Pattern Violations:');
      const groupedViolations = this.groupViolationsBySeverity(metrics.patternViolations);

      for (const [severity, violations] of Object.entries(groupedViolations)) {
        if (violations.length > 0) {
          // eslint-disable-next-line no-console
          console.log(
            `  ${this.getSeverityIcon(severity as 'error' | 'warning' | 'info')} ${severity.toUpperCase()} (${violations.length}):`
          );
          violations.slice(0, 5).forEach((v) => {
            const location = v.line ? `:${v.line}` : '';
            // eslint-disable-next-line no-console
            console.log(`    • ${v.filePath}${location} - ${v.violation}`);
          });
          if (violations.length > 5) {
            // eslint-disable-next-line no-console
            console.log(`    ... and ${violations.length - 5} more`);
          }
        }
      }
      // eslint-disable-next-line no-console
      console.log();
    }

    // Complex mock tests
    if (metrics.complexMockTests.length > 0) {
      // eslint-disable-next-line no-console
      console.log('🔧 Complex Mock Tests:');
      metrics.complexMockTests.slice(0, 5).forEach((test) => {
        // eslint-disable-next-line no-console
        console.log(`  • ${test.filePath} (complexity: ${test.mockComplexity})`);
      });
      if (metrics.complexMockTests.length > 5) {
        // eslint-disable-next-line no-console
        console.log(`  ... and ${metrics.complexMockTests.length - 5} more`);
      }
      // eslint-disable-next-line no-console
      console.log();
    }

    // Coverage gaps
    if (metrics.coverageGaps.length > 0) {
      // eslint-disable-next-line no-console
      console.log('📉 Potential Coverage Gaps:');
      metrics.coverageGaps.slice(0, 10).forEach((gap) => {
        // eslint-disable-next-line no-console
        console.log(`  • ${gap}`);
      });
      if (metrics.coverageGaps.length > 10) {
        // eslint-disable-next-line no-console
        console.log(`  ... and ${metrics.coverageGaps.length - 10} more`);
      }
      // eslint-disable-next-line no-console
      console.log();
    }

    // Recommendations
    // eslint-disable-next-line no-console
    console.log('💡 Recommendations:');
    this.generateRecommendations(metrics);
    // eslint-disable-next-line no-console
    console.log();

    // Summary
    const healthStatus = this.getHealthStatus(metrics.maintenanceScore);
    // eslint-disable-next-line no-console
    console.log(`🏥 Overall Health: ${healthStatus.emoji} ${healthStatus.status}`);
    // eslint-disable-next-line no-console
    console.log('='.repeat(50));
  }

  /**
   * Groups violations by severity
   */
  private groupViolationsBySeverity(
    violations: PatternViolation[]
  ): Record<string, PatternViolation[]> {
    return violations.reduce(
      (groups, violation) => {
        const severity = violation.severity;
        if (!groups[severity]) {
          groups[severity] = [];
        }
        groups[severity].push(violation);
        return groups;
      },
      {} as Record<string, PatternViolation[]>
    );
  }

  /**
   * Gets icon for severity level
   */
  private getSeverityIcon(severity: 'low' | 'medium' | 'high'): string {
    const icons = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
    };
    return icons[severity];
  }

  /**
   * Generates actionable recommendations
   */
  private generateRecommendations(metrics: TestHealthMetrics): void {
    const recommendations: string[] = [];

    if (metrics.maintenanceScore < 70) {
      recommendations.push(
        '🚨 Immediate attention needed - maintenance score is below acceptable threshold'
      );
    }

    const highViolations = metrics.patternViolations.filter((v) => v.severity === 'high').length;
    if (highViolations > 0) {
      recommendations.push(
        `🔴 Address ${highViolations} high-severity pattern violations immediately`
      );
    }

    if (metrics.complexMockTests.length > 5) {
      recommendations.push('🔧 Refactor complex mock tests using centralized mock factories');
    }

    if (metrics.coverageGaps.length > 10) {
      recommendations.push('📉 Add tests for uncovered source files to improve coverage');
    }

    if (metrics.averageTestsPerFile > 20) {
      recommendations.push('📁 Consider splitting large test files for better maintainability');
    }

    if (metrics.averageTestsPerFile < 3) {
      recommendations.push('🧪 Add more comprehensive test coverage for existing files');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Test suite is in good health - continue current practices');
    }

    // eslint-disable-next-line no-console
    recommendations.forEach((rec) => console.log(`  ${rec}`));
  }

  /**
   * Gets health status based on maintenance score
   */
  private getHealthStatus(score: number): { emoji: string; status: string } {
    if (score >= 90) return { emoji: '🟢', status: 'Excellent' };
    if (score >= 80) return { emoji: '🟡', status: 'Good' };
    if (score >= 70) return { emoji: '🟠', status: 'Fair' };
    return { emoji: '🔴', status: 'Needs Attention' };
  }
}

// CLI execution - check if this file is being run directly
if (
  (process.argv[1] && process.argv[1].endsWith('health-checker.ts')) ||
  process.argv[1].endsWith('health-checker.js')
) {
  const checker = new TestHealthChecker();
  // eslint-disable-next-line no-console
  checker.performHealthCheck().catch(console.error);
}
