#!/usr/bin/env node

/**
 * Pre-commit health check script
 * Performs basic validation suitable for commit gates
 * More lenient than full health check - focuses on critical issues only
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Pre-commit health thresholds (more lenient)
const PRECOMMIT_THRESHOLDS = {
  maxFailingTests: 0,        // Still zero tolerance for failing tests
  maxSlowTests: 50,          // More lenient for slow tests
  maxFlakyTests: 10,         // More lenient for flaky tests
  minCoverageLines: 70,      // Lower threshold for pre-commit
  minCoverageBranches: 65,   // Lower threshold for pre-commit
  maxTestDuration: 60000     // 60 seconds max for pre-commit
};

function runBasicTestCheck() {
  console.log('⚡ Running basic test validation...');
  
  try {
    // Just check if tests pass - don't worry about performance for pre-commit
    const output = execSync('npm test -- --run --reporter=basic', { 
      encoding: 'utf-8',
      timeout: PRECOMMIT_THRESHOLDS.maxTestDuration,
      stdio: 'pipe'
    });
    
    // Parse basic info from output
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    
    return {
      numTotalTests: passed + failed,
      numPassedTests: passed,
      numFailedTests: failed,
      success: failed === 0
    };
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    return {
      numTotalTests: 0,
      numPassedTests: 0,
      numFailedTests: 1,
      success: false
    };
  }
}

function checkBasicCoverage() {
  const coveragePath = join(process.cwd(), 'coverage', 'coverage-final.json');
  
  if (!existsSync(coveragePath)) {
    // No coverage data is OK for pre-commit
    return { healthy: true, coverage: null };
  }

  try {
    const data = JSON.parse(readFileSync(coveragePath, 'utf-8'));
    
    // Calculate basic coverage metrics
    let totalStatements = 0;
    let coveredStatements = 0;

    for (const [filePath, fileData] of Object.entries(data)) {
      if (!filePath.includes('/src/')) continue;

      totalStatements += Object.keys(fileData.s || {}).length;
      coveredStatements += Object.values(fileData.s || {}).filter(count => count > 0).length;
    }

    const linesCoverage = totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 100;
    const healthy = linesCoverage >= PRECOMMIT_THRESHOLDS.minCoverageLines;

    return {
      healthy,
      coverage: {
        lines: linesCoverage
      }
    };
  } catch (error) {
    // Coverage parsing errors are not critical for pre-commit
    return { healthy: true, coverage: null };
  }
}

function analyzePreCommitResults(testResults) {
  if (!testResults) {
    return {
      healthy: false,
      issues: ['Test execution failed'],
      metrics: { totalTests: 0, passedTests: 0, failedTests: 0 }
    };
  }

  const issues = [];
  const metrics = {
    totalTests: testResults.numTotalTests || 0,
    passedTests: testResults.numPassedTests || 0,
    failedTests: testResults.numFailedTests || 0
  };

  // Only check for failing tests - ignore performance issues for pre-commit
  if (metrics.failedTests > PRECOMMIT_THRESHOLDS.maxFailingTests) {
    issues.push(`${metrics.failedTests} tests are failing`);
  }

  return {
    healthy: issues.length === 0,
    issues,
    metrics
  };
}

function formatPreCommitReport(testHealth, coverageHealth) {
  console.log('\n📊 Pre-commit Health Check Results');
  console.log('='.repeat(40));

  // Test results
  console.log('\n🧪 Test Status:');
  if (testHealth.healthy) {
    console.log(`  ✅ ${testHealth.metrics.passedTests}/${testHealth.metrics.totalTests} tests passing`);
  } else {
    console.log('  ❌ Critical test issues:');
    testHealth.issues.forEach(issue => console.log(`    - ${issue}`));
  }

  // Coverage results (informational only)
  console.log('\n📈 Coverage Status:');
  if (coverageHealth.coverage) {
    const linesHealthy = coverageHealth.coverage.lines >= PRECOMMIT_THRESHOLDS.minCoverageLines;
    console.log(`  ${linesHealthy ? '✅' : '⚠️ '} Lines: ${coverageHealth.coverage.lines.toFixed(1)}%`);
  } else {
    console.log('  ℹ️  Coverage data not available');
  }

  const overallHealthy = testHealth.healthy; // Only test health blocks pre-commit
  
  console.log('\n🎯 Pre-commit Status:');
  if (overallHealthy) {
    console.log('  ✅ Ready to commit!');
  } else {
    console.log('  ❌ Please fix failing tests before committing');
  }

  return overallHealthy;
}

function main() {
  console.log('⚡ Pre-commit health check...');
  
  // Run basic test check
  const testResults = runBasicTestCheck();
  const testHealth = analyzePreCommitResults(testResults);
  
  // Check coverage (informational only)
  const coverageHealth = checkBasicCoverage();
  
  // Generate report
  const healthy = formatPreCommitReport(testHealth, coverageHealth);
  
  // Exit with appropriate code - only fail for critical issues
  process.exit(healthy ? 0 : 1);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Pre-commit Health Check

Usage:
  node scripts/pre-commit-health-check.js [options]

Options:
  --help, -h     Show this help message

This script performs a basic health check suitable for pre-commit hooks:
- Ensures all tests pass (zero tolerance for failures)
- Provides coverage information (informational only)
- Ignores performance issues that don't block commits

Examples:
  node scripts/pre-commit-health-check.js
  npm run test:pre-commit-check
`);
  process.exit(0);
}

main();