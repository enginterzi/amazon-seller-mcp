#!/usr/bin/env node

/**
 * Test maintenance CLI tool
 * Provides command-line interface for test health monitoring and maintenance
 */

import { createTestMaintenanceUtility, performQuickHealthCheck } from '../dist/test-maintenance.js';
import fs from 'fs';
import path from 'path';

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
  trends <test-name>     Show execution time trends for a specific test
  export <format>        Export health report (json|markdown|csv)
  clean                  Clean old test metrics

Examples:
  npm run test:maintenance health-check 14
  npm run test:maintenance quick-check
  npm run test:maintenance export markdown > health-report.md
  npm run test:maintenance trends "should handle API errors"
`);
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function printHealthReport(report) {
  console.log('\n📊 Test Health Report');
  console.log('='.repeat(50));
  
  console.log(`\n📈 Summary:`);
  console.log(`  Total Tests: ${report.totalTests}`);
  console.log(`  Average Execution Time: ${formatDuration(report.averageExecutionTime)}`);
  console.log(`  Slow Tests: ${report.slowTests.length}`);
  console.log(`  Failing Tests: ${report.failingTests.length}`);
  console.log(`  Flaky Tests: ${report.flakyTests.length}`);
  console.log(`  Memory Issues: ${report.memoryLeaks.length}`);

  if (report.recommendations.length > 0) {
    console.log(`\n💡 Recommendations:`);
    report.recommendations.forEach(rec => console.log(`  ${rec}`));
  }

  if (report.slowTests.length > 0) {
    console.log(`\n🐌 Slowest Tests:`);
    report.slowTests.slice(0, 5).forEach(test => {
      console.log(`  ${formatDuration(test.duration)} - ${test.testName}`);
      console.log(`    File: ${test.filePath}`);
    });
  }

  if (report.failingTests.length > 0) {
    console.log(`\n❌ Recent Failures:`);
    report.failingTests.slice(0, 5).forEach(test => {
      console.log(`  ${test.testName}`);
      console.log(`    File: ${test.filePath}`);
      console.log(`    Time: ${new Date(test.timestamp).toLocaleString()}`);
    });
  }

  if (report.flakyTests.length > 0) {
    console.log(`\n🎲 Flaky Tests:`);
    report.flakyTests.slice(0, 5).forEach(test => {
      console.log(`  ${test.testName}`);
      console.log(`    File: ${test.filePath}`);
    });
  }
}

async function runHealthCheck(days = 7) {
  try {
    console.log(`\n🔍 Analyzing test health for the last ${days} days...`);
    
    const utility = createTestMaintenanceUtility();
    const report = utility.generateHealthReport(days);
    
    printHealthReport(report);
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'test-results', 'health-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Error generating health report:', error.message);
    process.exit(1);
  }
}

async function runQuickCheck() {
  try {
    console.log('\n⚡ Performing quick health check...');
    
    const result = performQuickHealthCheck();
    
    if (result.healthy) {
      console.log('✅ All tests are healthy!');
      console.log(`📊 Analyzed ${result.metrics.totalTests} tests`);
    } else {
      console.log('⚠️  Issues detected:');
      result.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    // Exit with error code if unhealthy (for CI/CD)
    process.exit(result.healthy ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Error performing quick check:', error.message);
    process.exit(1);
  }
}

async function showTrends(testName) {
  try {
    if (!testName) {
      console.error('❌ Test name is required for trends analysis');
      process.exit(1);
    }
    
    console.log(`\n📈 Execution time trends for: ${testName}`);
    
    const utility = createTestMaintenanceUtility();
    const trends = utility.getExecutionTimeTrends(testName);
    
    if (trends.dates.length === 0) {
      console.log('📭 No data found for this test');
      return;
    }
    
    console.log(`\n📊 Trend: ${trends.trend.toUpperCase()}`);
    console.log('\nRecent execution times:');
    
    trends.dates.slice(-10).forEach((date, index) => {
      const duration = trends.durations[trends.durations.length - 10 + index];
      console.log(`  ${date}: ${formatDuration(duration)}`);
    });
    
  } catch (error) {
    console.error('❌ Error analyzing trends:', error.message);
    process.exit(1);
  }
}

async function exportReport(format = 'json', days = 7) {
  try {
    const utility = createTestMaintenanceUtility();
    const report = utility.generateHealthReport(days);
    const exported = utility.exportHealthReport(report, format);
    
    console.log(exported);
    
  } catch (error) {
    console.error('❌ Error exporting report:', error.message);
    process.exit(1);
  }
}

async function cleanMetrics() {
  try {
    const metricsPath = path.join(process.cwd(), 'test-results', 'test-metrics.json');
    
    if (fs.existsSync(metricsPath)) {
      fs.unlinkSync(metricsPath);
      console.log('✅ Test metrics cleaned');
    } else {
      console.log('📭 No metrics file found');
    }
    
  } catch (error) {
    console.error('❌ Error cleaning metrics:', error.message);
    process.exit(1);
  }
}

// Main command handler
async function main() {
  switch (command) {
    case 'health-check':
      const days = parseInt(args[1]) || 7;
      await runHealthCheck(days);
      break;
      
    case 'quick-check':
      await runQuickCheck();
      break;
      
    case 'trends':
      await showTrends(args[1]);
      break;
      
    case 'export':
      const format = args[1] || 'json';
      const exportDays = parseInt(args[2]) || 7;
      await exportReport(format, exportDays);
      break;
      
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