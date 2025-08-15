#!/usr/bin/env node

/**
 * Simple test maintenance CLI tool
 * Provides command-line interface for test health monitoring
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Command line argument parsing
const args = process.argv.slice(2);
const command = args[0];

function printUsage() {
  console.log(`
Test Maintenance CLI

Usage:
  npm run test:maintenance <command> [options]

Commands:
  health-check [days]     Generate health report (default: 7 days)
  quick-check            Perform quick health check for CI/CD
  export <format>        Export health report (json|markdown)
  clean                  Clean old test metrics

Examples:
  npm run test:maintenance health-check 14
  npm run test:maintenance quick-check
  npm run test:maintenance export markdown > health-report.md
`);
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function loadTestResults() {
  const resultsPath = join(process.cwd(), 'test-results', 'results.json');
  
  if (!existsSync(resultsPath)) {
    console.log('📭 No test results found. Run tests first to generate metrics.');
    return null;
  }

  try {
    const data = readFileSync(resultsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('⚠️  Could not parse test results:', error.message);
    return null;
  }
}

function loadCoverageData() {
  const coveragePath = join(process.cwd(), 'coverage', 'coverage-final.json');
  
  if (!existsSync(coveragePath)) {
    return null;
  }

  try {
    const data = readFileSync(coveragePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('⚠️  Could not parse coverage data:', error.message);
    return null;
  }
}

function analyzeTestResults(results) {
  if (!results) {
    return {
      totalTests: 0,
      slowTests: [],
      failingTests: [],
      averageExecutionTime: 0,
      recommendations: ['No test results available. Run tests first.']
    };
  }

  const slowTests = [];
  const failingTests = [];
  let totalDuration = 0;
  let testCount = 0;

  // Analyze test files
  if (results.testResults) {
    for (const testFile of results.testResults) {
      const duration = testFile.endTime - testFile.startTime;
      totalDuration += duration;
      testCount++;

      // Check for slow tests (> 5 seconds per file)
      if (duration > 5000) {
        slowTests.push({
          testName: testFile.name.split('/').pop(),
          filePath: testFile.name,
          duration,
          status: testFile.status
        });
      }

      // Check for failing tests
      if (testFile.status === 'failed') {
        failingTests.push({
          testName: testFile.name.split('/').pop(),
          filePath: testFile.name,
          duration,
          status: testFile.status
        });
      }
    }
  }

  const averageExecutionTime = testCount > 0 ? totalDuration / testCount : 0;

  // Generate recommendations
  const recommendations = [];
  if (failingTests.length > 0) {
    recommendations.push(`❌ ${failingTests.length} test files are failing`);
  }
  if (slowTests.length > 0) {
    recommendations.push(`🐌 ${slowTests.length} test files are slow (>5s)`);
  }
  if (averageExecutionTime > 3000) {
    recommendations.push('⏱️ Average test execution time is high');
  }
  if (recommendations.length === 0) {
    recommendations.push('✅ All tests are performing well!');
  }

  return {
    totalTests: results.numTotalTests || 0,
    slowTests,
    failingTests,
    averageExecutionTime,
    recommendations
  };
}

function analyzeCoverageData(coverageData) {
  if (!coverageData) {
    return {
      linesCoverage: 0,
      branchesCoverage: 0,
      functionsCoverage: 0,
      statementsCoverage: 0
    };
  }

  let totalStatements = 0;
  let coveredStatements = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;
  let totalBranches = 0;
  let coveredBranches = 0;

  for (const [filePath, fileData] of Object.entries(coverageData)) {
    if (!filePath.includes('/src/')) continue;

    // Statements
    totalStatements += Object.keys(fileData.s || {}).length;
    coveredStatements += Object.values(fileData.s || {}).filter(count => count > 0).length;

    // Functions
    totalFunctions += Object.keys(fileData.f || {}).length;
    coveredFunctions += Object.values(fileData.f || {}).filter(count => count > 0).length;

    // Branches
    totalBranches += Object.keys(fileData.b || {}).length;
    coveredBranches += Object.values(fileData.b || {}).filter(branches => 
      branches.some(count => count > 0)
    ).length;
  }

  return {
    linesCoverage: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0,
    branchesCoverage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
    functionsCoverage: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
    statementsCoverage: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0
  };
}

function printHealthReport(testAnalysis, coverageAnalysis) {
  console.log('\n📊 Test Health Report');
  console.log('='.repeat(50));
  
  console.log(`\n📈 Test Summary:`);
  console.log(`  Total Tests: ${testAnalysis.totalTests}`);
  console.log(`  Average Execution Time: ${formatDuration(testAnalysis.averageExecutionTime)}`);
  console.log(`  Slow Test Files: ${testAnalysis.slowTests.length}`);
  console.log(`  Failing Test Files: ${testAnalysis.failingTests.length}`);

  console.log(`\n📊 Coverage Summary:`);
  console.log(`  Lines: ${coverageAnalysis.linesCoverage.toFixed(1)}%`);
  console.log(`  Branches: ${coverageAnalysis.branchesCoverage.toFixed(1)}%`);
  console.log(`  Functions: ${coverageAnalysis.functionsCoverage.toFixed(1)}%`);
  console.log(`  Statements: ${coverageAnalysis.statementsCoverage.toFixed(1)}%`);

  if (testAnalysis.recommendations.length > 0) {
    console.log(`\n💡 Recommendations:`);
    testAnalysis.recommendations.forEach(rec => console.log(`  ${rec}`));
  }

  if (testAnalysis.slowTests.length > 0) {
    console.log(`\n🐌 Slowest Test Files:`);
    testAnalysis.slowTests.slice(0, 5).forEach(test => {
      console.log(`  ${formatDuration(test.duration)} - ${test.testName}`);
      console.log(`    File: ${test.filePath}`);
    });
  }

  if (testAnalysis.failingTests.length > 0) {
    console.log(`\n❌ Failing Test Files:`);
    testAnalysis.failingTests.slice(0, 5).forEach(test => {
      console.log(`  ${test.testName}`);
      console.log(`    File: ${test.filePath}`);
    });
  }
}

async function runHealthCheck(days = 7) {
  try {
    console.log(`\n🔍 Analyzing test health...`);
    
    const testResults = loadTestResults();
    const coverageData = loadCoverageData();
    
    const testAnalysis = analyzeTestResults(testResults);
    const coverageAnalysis = analyzeCoverageData(coverageData);
    
    printHealthReport(testAnalysis, coverageAnalysis);
    
    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      testAnalysis,
      coverageAnalysis
    };
    
    const reportPath = join(process.cwd(), 'test-results', 'health-report.json');
    mkdirSync(join(process.cwd(), 'test-results'), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Error generating health report:', error.message);
    process.exit(1);
  }
}

async function runQuickCheck() {
  try {
    console.log('\n⚡ Performing quick health check...');
    
    const testResults = loadTestResults();
    const testAnalysis = analyzeTestResults(testResults);
    
    const issues = [];
    
    if (testAnalysis.failingTests.length > 0) {
      issues.push(`${testAnalysis.failingTests.length} test files are failing`);
    }
    
    if (testAnalysis.slowTests.length > 5) {
      issues.push(`${testAnalysis.slowTests.length} test files are slow`);
    }
    
    if (issues.length === 0) {
      console.log('✅ All tests are healthy!');
      console.log(`📊 Analyzed ${testAnalysis.totalTests} tests`);
    } else {
      console.log('⚠️  Issues detected:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    // Exit with error code if unhealthy (for CI/CD)
    process.exit(issues.length === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Error performing quick check:', error.message);
    process.exit(1);
  }
}

async function exportReport(format = 'json') {
  try {
    const testResults = loadTestResults();
    const coverageData = loadCoverageData();
    
    const testAnalysis = analyzeTestResults(testResults);
    const coverageAnalysis = analyzeCoverageData(coverageData);
    
    const report = {
      timestamp: new Date().toISOString(),
      testAnalysis,
      coverageAnalysis
    };
    
    if (format === 'markdown') {
      let markdown = '# Test Health Report\n\n';
      markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
      
      markdown += `## Test Summary\n`;
      markdown += `- **Total Tests**: ${testAnalysis.totalTests}\n`;
      markdown += `- **Average Execution Time**: ${formatDuration(testAnalysis.averageExecutionTime)}\n`;
      markdown += `- **Slow Test Files**: ${testAnalysis.slowTests.length}\n`;
      markdown += `- **Failing Test Files**: ${testAnalysis.failingTests.length}\n\n`;
      
      markdown += `## Coverage Summary\n`;
      markdown += `- **Lines**: ${coverageAnalysis.linesCoverage.toFixed(1)}%\n`;
      markdown += `- **Branches**: ${coverageAnalysis.branchesCoverage.toFixed(1)}%\n`;
      markdown += `- **Functions**: ${coverageAnalysis.functionsCoverage.toFixed(1)}%\n`;
      markdown += `- **Statements**: ${coverageAnalysis.statementsCoverage.toFixed(1)}%\n\n`;
      
      if (testAnalysis.recommendations.length > 0) {
        markdown += `## Recommendations\n\n`;
        for (const rec of testAnalysis.recommendations) {
          markdown += `- ${rec}\n`;
        }
        markdown += '\n';
      }
      
      console.log(markdown);
    } else {
      console.log(JSON.stringify(report, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error exporting report:', error.message);
    process.exit(1);
  }
}

async function cleanMetrics() {
  try {
    const metricsPath = join(process.cwd(), 'test-results', 'test-metrics.json');
    const resultsPath = join(process.cwd(), 'test-results', 'results.json');
    
    let cleaned = 0;
    
    if (existsSync(metricsPath)) {
      fs.unlinkSync(metricsPath);
      cleaned++;
    }
    
    if (existsSync(resultsPath)) {
      fs.unlinkSync(resultsPath);
      cleaned++;
    }
    
    if (cleaned > 0) {
      console.log(`✅ Cleaned ${cleaned} metric files`);
    } else {
      console.log('📭 No metric files found');
    }
    
  } catch (error) {
    console.error('❌ Error cleaning metrics:', error.message);
    process.exit(1);
  }
}

// Main command handler
async function main() {
  switch (command) {
    case 'health-check': {
      const days = parseInt(args[1]) || 7;
      await runHealthCheck(days);
      break;
    }
      
    case 'quick-check':
      await runQuickCheck();
      break;
      
    case 'export': {
      const format = args[1] || 'json';
      await exportReport(format);
      break;
    }
      
    case 'clean':
      await cleanMetrics();
      break;
      
    default:
      printUsage();
      process.exit(1);
  }
}

// Run the CLI
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});