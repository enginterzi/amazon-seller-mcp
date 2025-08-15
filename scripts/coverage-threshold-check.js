#!/usr/bin/env node

/**
 * Coverage threshold validation script
 * Provides detailed coverage analysis and threshold enforcement
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Coverage thresholds from vitest config
const THRESHOLDS = {
  lines: 80,
  functions: 80,
  branches: 75,
  statements: 80
};

function loadCoverageData() {
  const coveragePath = join(process.cwd(), 'coverage', 'coverage-final.json');
  
  if (!existsSync(coveragePath)) {
    console.error('❌ Coverage file not found. Run tests with coverage first.');
    console.error('   Command: npm run test:coverage');
    process.exit(1);
  }

  try {
    const data = readFileSync(coveragePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Failed to parse coverage data:', error.message);
    process.exit(1);
  }
}

function calculateGlobalCoverage(coverageData) {
  let totalStatements = 0;
  let coveredStatements = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;
  let totalBranches = 0;
  let coveredBranches = 0;
  let totalLines = 0;
  let coveredLines = 0;

  for (const [filePath, fileData] of Object.entries(coverageData)) {
    // Skip files that are not in src/ directory
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

    // Lines (use statement map for line coverage)
    const lineNumbers = new Set();
    Object.values(fileData.statementMap || {}).forEach(stmt => {
      lineNumbers.add(stmt.start.line);
    });
    totalLines += lineNumbers.size;
    
    const coveredLineNumbers = new Set();
    Object.entries(fileData.s || {}).forEach(([stmtId, count]) => {
      if (count > 0 && fileData.statementMap && fileData.statementMap[stmtId]) {
        coveredLineNumbers.add(fileData.statementMap[stmtId].start.line);
      }
    });
    coveredLines += coveredLineNumbers.size;
  }

  return {
    statements: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0,
    functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
    branches: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
    lines: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0
  };
}

function getFileCoverage(fileData) {
  const totalStatements = Object.keys(fileData.s || {}).length;
  const coveredStatements = Object.values(fileData.s || {}).filter(count => count > 0).length;
  
  const totalFunctions = Object.keys(fileData.f || {}).length;
  const coveredFunctions = Object.values(fileData.f || {}).filter(count => count > 0).length;
  
  const totalBranches = Object.keys(fileData.b || {}).length;
  const coveredBranches = Object.values(fileData.b || {}).filter(branches => 
    branches.some(count => count > 0)
  ).length;

  // Calculate line coverage from statement map
  const lineNumbers = new Set();
  Object.values(fileData.statementMap || {}).forEach(stmt => {
    lineNumbers.add(stmt.start.line);
  });
  const totalLines = lineNumbers.size;
  
  const coveredLineNumbers = new Set();
  Object.entries(fileData.s || {}).forEach(([stmtId, count]) => {
    if (count > 0 && fileData.statementMap && fileData.statementMap[stmtId]) {
      coveredLineNumbers.add(fileData.statementMap[stmtId].start.line);
    }
  });
  const coveredLines = coveredLineNumbers.size;

  return {
    statements: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0,
    functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
    branches: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
    lines: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0
  };
}

function checkThresholds(coverage, thresholds, context = 'Global') {
  const failures = [];
  
  for (const [metric, threshold] of Object.entries(thresholds)) {
    const actual = coverage[metric];
    if (actual < threshold) {
      failures.push({
        metric,
        actual: actual.toFixed(2),
        threshold,
        context
      });
    }
  }
  
  return failures;
}

function formatCoverageReport(globalCoverage, fileCoverageFailures) {
  console.log('\n📊 Coverage Report');
  console.log('='.repeat(50));
  
  console.log('\n📈 Global Coverage:');
  console.log(`  Lines:      ${globalCoverage.lines.toFixed(2)}% (threshold: ${THRESHOLDS.lines}%)`);
  console.log(`  Functions:  ${globalCoverage.functions.toFixed(2)}% (threshold: ${THRESHOLDS.functions}%)`);
  console.log(`  Branches:   ${globalCoverage.branches.toFixed(2)}% (threshold: ${THRESHOLDS.branches}%)`);
  console.log(`  Statements: ${globalCoverage.statements.toFixed(2)}% (threshold: ${THRESHOLDS.statements}%)`);

  const globalFailures = checkThresholds(globalCoverage, THRESHOLDS);
  
  if (globalFailures.length === 0 && fileCoverageFailures.length === 0) {
    console.log('\n✅ All coverage thresholds met!');
    return true;
  }

  if (globalFailures.length > 0) {
    console.log('\n❌ Global threshold failures:');
    globalFailures.forEach(failure => {
      console.log(`  ${failure.metric}: ${failure.actual}% < ${failure.threshold}%`);
    });
  }

  if (fileCoverageFailures.length > 0) {
    console.log('\n❌ Per-file threshold failures:');
    fileCoverageFailures.forEach(failure => {
      console.log(`  ${failure.context}: ${failure.metric} ${failure.actual}% < ${failure.threshold}%`);
    });
    
    if (fileCoverageFailures.length > 10) {
      console.log(`  ... and ${fileCoverageFailures.length - 10} more files`);
    }
  }

  console.log('\n💡 Recommendations:');
  if (globalFailures.some(f => f.metric === 'lines' || f.metric === 'statements')) {
    console.log('  - Add more unit tests to cover untested code paths');
  }
  if (globalFailures.some(f => f.metric === 'functions')) {
    console.log('  - Ensure all functions have test coverage');
  }
  if (globalFailures.some(f => f.metric === 'branches')) {
    console.log('  - Add tests for conditional logic and error scenarios');
  }
  
  return false;
}

function main() {
  console.log('🔍 Checking coverage thresholds...');
  
  const coverageData = loadCoverageData();
  const globalCoverage = calculateGlobalCoverage(coverageData);
  
  // Check per-file coverage
  const fileCoverageFailures = [];
  for (const [filePath, fileData] of Object.entries(coverageData)) {
    // Skip files that are not in src/ directory
    if (!filePath.includes('/src/')) continue;
    
    const fileCoverage = getFileCoverage(fileData);
    const failures = checkThresholds(fileCoverage, THRESHOLDS, filePath.replace(process.cwd(), '.'));
    fileCoverageFailures.push(...failures);
  }

  const success = formatCoverageReport(globalCoverage, fileCoverageFailures);
  
  if (!success) {
    console.log('\n🚨 Coverage thresholds not met. Please add more tests.');
    process.exit(1);
  }
  
  console.log('\n🎉 All coverage requirements satisfied!');
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Coverage Threshold Checker

Usage:
  node scripts/coverage-threshold-check.js [options]

Options:
  --help, -h     Show this help message
  --quiet, -q    Only show failures (no success messages)

Examples:
  node scripts/coverage-threshold-check.js
  npm run test:coverage:threshold
`);
  process.exit(0);
}

main();