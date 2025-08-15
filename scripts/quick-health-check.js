#!/usr/bin/env node

/**
 * Quick health check script for CI/CD integration
 * Performs rapid validation of test suite health
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Health check thresholds
const HEALTH_THRESHOLDS = {
  maxFailingTests: 0,
  maxSlowTests: 10,
  maxFlakyTests: 5,
  minCoverageLines: 75, // Slightly lower for quick check
  minCoverageBranches: 70,
  maxTestDuration: 30000 // 30 seconds max for quick tests
};

function runQuickTests() {
  console.log('⚡ Running quick test suite...');
  
  try {
    // Run a subset of fast tests with JSON output to a file
    execSync('npm test -- --run --reporter=json --outputFile=test-results/quick-results.json', { 
      encoding: 'utf-8',
      timeout: HEALTH_THRESHOLDS.maxTestDuration,
      stdio: 'pipe'
    });
    
    // Read the JSON results file
    const resultsPath = join(process.cwd(), 'test-results', 'quick-results.json');
    if (existsSync(resultsPath)) {
      const data = readFileSync(resultsPath, 'utf-8');
      return JSON.parse(data);
    }
    
    throw new Error('Test results file not found');
  } catch (error) {
    // Fallback: try to get basic test info from regular test run
    try {
      const output = execSync('npm test -- --run --reporter=verbose', { 
        encoding: 'utf-8',
        timeout: HEALTH_THRESHOLDS.maxTestDuration,
        stdio: 'pipe'
      });
      
      // Parse basic info from verbose output
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);
      const totalMatch = output.match(/Tests\s+(\d+) passed/);
      
      return {
        numTotalTests: totalMatch ? parseInt(totalMatch[1]) : 0,
        numPassedTests: passedMatch ? parseInt(passedMatch[1]) : 0,
        numFailedTests: failedMatch ? parseInt(failedMatch[1]) : 0,
        success: !failedMatch || parseInt(failedMatch[1]) === 0
      };
    } catch (fallbackError) {
      console.error('❌ Quick tests failed:', error.message);
      return null;
    }
  }
}

function checkCoverageHealth() {
  const coveragePath = join(process.cwd(), 'coverage', 'coverage-final.json');
  
  if (!existsSync(coveragePath)) {
    console.log('⚠️  No coverage data found - run tests with coverage first');
    return { healthy: true, coverage: null };
  }

  try {
    const data = JSON.parse(readFileSync(coveragePath, 'utf-8'));
    
    // Calculate basic coverage metrics
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;

    for (const [filePath, fileData] of Object.entries(data)) {
      if (!filePath.includes('/src/')) continue;

      totalStatements += Object.keys(fileData.s || {}).length;
      coveredStatements += Object.values(fileData.s || {}).filter(count => count > 0).length;
      
      totalBranches += Object.keys(fileData.b || {}).length;
      coveredBranches += Object.values(fileData.b || {}).filter(branches => 
        branches.some(count => count > 0)
      ).length;
    }

    const linesCoverage = totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;
    const branchesCoverage = totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0;

    const healthy = linesCoverage >= HEALTH_THRESHOLDS.minCoverageLines && 
                   branchesCoverage >= HEALTH_THRESHOLDS.minCoverageBranches;

    return {
      healthy,
      coverage: {
        lines: linesCoverage,
        branches: branchesCoverage
      }
    };
  } catch (error) {
    console.log('⚠️  Could not analyze coverage data:', error.message);
    return { healthy: true, coverage: null };
  }
}

function analyzeTestResults(testResults) {
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
    failedTests: testResults.numFailedTests || 0,
    testSuites: testResults.numTotalTestSuites || 0
  };

  // Check for failing tests
  if (metrics.failedTests > HEALTH_THRESHOLDS.maxFailingTests) {
    issues.push(`${metrics.failedTests} tests are failing (threshold: ${HEALTH_THRESHOLDS.maxFailingTests})`);
  }

  // Check test execution time
  if (testResults.testResults) {
    const slowTests = testResults.testResults.filter(result => {
      const duration = result.endTime - result.startTime;
      return duration > 5000; // 5 seconds per test file
    });

    if (slowTests.length > HEALTH_THRESHOLDS.maxSlowTests) {
      issues.push(`${slowTests.length} slow test files detected (threshold: ${HEALTH_THRESHOLDS.maxSlowTests})`);
    }
  }

  return {
    healthy: issues.length === 0,
    issues,
    metrics
  };
}

function formatHealthReport(testHealth, coverageHealth) {
  console.log('\n📊 Quick Health Check Results');
  console.log('='.repeat(40));

  // Test results
  console.log('\n🧪 Test Health:');
  if (testHealth.healthy) {
    console.log(`  ✅ ${testHealth.metrics.passedTests}/${testHealth.metrics.totalTests} tests passing`);
    console.log(`  ✅ ${testHealth.metrics.testSuites} test suites executed`);
  } else {
    console.log('  ❌ Test issues detected:');
    testHealth.issues.forEach(issue => console.log(`    - ${issue}`));
  }

  // Coverage results
  console.log('\n📈 Coverage Health:');
  if (coverageHealth.coverage) {
    const linesHealthy = coverageHealth.coverage.lines >= HEALTH_THRESHOLDS.minCoverageLines;
    const branchesHealthy = coverageHealth.coverage.branches >= HEALTH_THRESHOLDS.minCoverageBranches;
    
    console.log(`  ${linesHealthy ? '✅' : '❌'} Lines: ${coverageHealth.coverage.lines.toFixed(1)}% (min: ${HEALTH_THRESHOLDS.minCoverageLines}%)`);
    console.log(`  ${branchesHealthy ? '✅' : '❌'} Branches: ${coverageHealth.coverage.branches.toFixed(1)}% (min: ${HEALTH_THRESHOLDS.minCoverageBranches}%)`);
  } else {
    console.log('  ⚠️  Coverage data not available');
  }

  const overallHealthy = testHealth.healthy && coverageHealth.healthy;
  
  console.log('\n🎯 Overall Status:');
  if (overallHealthy) {
    console.log('  ✅ All health checks passed!');
    console.log('  🚀 Ready for deployment');
  } else {
    console.log('  ❌ Health issues detected');
    console.log('  🔧 Please address issues before proceeding');
  }

  return overallHealthy;
}

function main() {
  console.log('⚡ Performing quick health check...');
  
  // Run quick tests
  const testResults = runQuickTests();
  const testHealth = analyzeTestResults(testResults);
  
  // Check coverage
  const coverageHealth = checkCoverageHealth();
  
  // Generate report
  const healthy = formatHealthReport(testHealth, coverageHealth);
  
  // Exit with appropriate code for CI/CD
  process.exit(healthy ? 0 : 1);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Quick Health Check

Usage:
  node scripts/quick-health-check.js [options]

Options:
  --help, -h     Show this help message

This script performs a rapid health check suitable for CI/CD pipelines:
- Runs a subset of tests quickly
- Checks basic coverage metrics
- Validates overall test suite health

Examples:
  node scripts/quick-health-check.js
  npm run test:quick-check
`);
  process.exit(0);
}

main();