#!/usr/bin/env node

/**
 * Comprehensive quality gate enforcement script
 * Runs all quality checks and enforces thresholds
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

/**
 * Run a command and capture output
 */
function runCommand(command, description, required = true) {
  console.log(`  → ${description}...`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(`    ✅ ${description} passed`);
    return { success: true, output };
  } catch (error) {
    console.log(`    ❌ ${description} failed`);
    
    if (error.stdout) {
      console.log('    Output:', error.stdout.slice(0, 500));
    }
    if (error.stderr) {
      console.log('    Error:', error.stderr.slice(0, 500));
    }
    
    return { success: false, error: error.message, output: error.stdout || error.stderr };
  }
}

/**
 * Validate coverage thresholds
 */
async function validateCoverageThresholds() {
  console.log('📊 Validating coverage thresholds...');
  
  const coverageFile = 'coverage/coverage-summary.json';
  
  if (!existsSync(coverageFile)) {
    console.log('    ❌ Coverage report not found');
    return false;
  }
  
  try {
    const coverageData = JSON.parse(await readFile(coverageFile, 'utf8'));
    const { lines, functions, branches, statements } = coverageData.total;
    
    console.log('    Coverage Summary:');
    console.log(`      Lines: ${lines.pct}% (threshold: 80%)`);
    console.log(`      Functions: ${functions.pct}% (threshold: 80%)`);
    console.log(`      Branches: ${branches.pct}% (threshold: 75%)`);
    console.log(`      Statements: ${statements.pct}% (threshold: 80%)`);
    
    const failures = [];
    
    if (lines.pct < 80) failures.push(`Line coverage ${lines.pct}% < 80%`);
    if (functions.pct < 80) failures.push(`Function coverage ${functions.pct}% < 80%`);
    if (branches.pct < 75) failures.push(`Branch coverage ${branches.pct}% < 75%`);
    if (statements.pct < 80) failures.push(`Statement coverage ${statements.pct}% < 80%`);
    
    if (failures.length > 0) {
      console.log('    ❌ Coverage threshold violations:');
      failures.forEach(failure => console.log(`      • ${failure}`));
      return false;
    }
    
    console.log('    ✅ All coverage thresholds met');
    return true;
  } catch (error) {
    console.log(`    ❌ Error reading coverage data: ${error.message}`);
    return false;
  }
}

/**
 * Main quality gate enforcement
 */
async function enforceQualityGates() {
  console.log('🎯 Enforcing Quality Gates\n');
  console.log('=' .repeat(50));
  
  let overallSuccess = true;
  const results = [];
  
  // 1. Lint validation (MANDATORY)
  console.log('\n🔍 Code Quality Validation');
  const lintResult = runCommand('npm run lint', 'ESLint validation', true);
  results.push({ name: 'Lint', ...lintResult, required: true });
  if (!lintResult.success) overallSuccess = false;
  
  // 2. Format validation (MANDATORY)
  const formatResult = runCommand('npm run format -- --check', 'Code formatting check', true);
  results.push({ name: 'Format', ...formatResult, required: true });
  if (!formatResult.success) {
    console.log('    🔧 Auto-formatting code...');
    const autoFormatResult = runCommand('npm run format', 'Auto-format', false);
    if (autoFormatResult.success) {
      console.log('    ✅ Code formatted automatically');
    }
  }
  
  // 2.5. TypeScript 'any' type validation (MANDATORY)
  const anyTypeResult = runCommand('npm run check:any-types', 'TypeScript any type check', true);
  results.push({ name: 'AnyTypes', ...anyTypeResult, required: true });
  if (!anyTypeResult.success) overallSuccess = false;
  
  // 3. TypeScript build (MANDATORY)
  console.log('\n🏗️  Build Validation');
  const buildResult = runCommand('npm run build', 'TypeScript compilation', true);
  results.push({ name: 'Build', ...buildResult, required: true });
  if (!buildResult.success) overallSuccess = false;
  
  // 4. Test execution (MANDATORY)
  console.log('\n🧪 Test Validation');
  const testResult = runCommand('npm test', 'Test execution', true);
  results.push({ name: 'Tests', ...testResult, required: true });
  if (!testResult.success) overallSuccess = false;
  
  // 5. Coverage validation (MANDATORY)
  console.log('\n📊 Coverage Validation');
  const coverageTestResult = runCommand('npm run test:coverage', 'Coverage generation', true);
  if (coverageTestResult.success) {
    const coverageValid = await validateCoverageThresholds();
    results.push({ name: 'Coverage', success: coverageValid, required: true });
    if (!coverageValid) overallSuccess = false;
  } else {
    results.push({ name: 'Coverage', success: false, required: true });
    overallSuccess = false;
  }
  
  // 6. Test health check (WARNING only)
  console.log('\n🏥 Test Health Check');
  const healthResult = runCommand('npm run test:quick-check', 'Test health validation', false);
  results.push({ name: 'Health', ...healthResult, required: false });
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 Quality Gate Summary');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const requirement = result.required ? 'REQUIRED' : 'WARNING';
    console.log(`${status} ${result.name.padEnd(12)} ${requirement}`);
  });
  
  console.log('='.repeat(50));
  
  if (overallSuccess) {
    console.log('🎉 ALL QUALITY GATES PASSED!');
    console.log('\n✅ Your code meets all quality standards:');
    console.log('  • Zero lint errors');
    console.log('  • No TypeScript "any" types in source files');
    console.log('  • Successful TypeScript build');
    console.log('  • 100% test pass rate');
    console.log('  • Coverage thresholds met (80% line, 75% branch)');
    console.log('  • Proper code formatting');
    console.log('\n🚀 Ready for commit/merge!');
  } else {
    console.log('❌ QUALITY GATES FAILED!');
    console.log('\n🔧 Required fixes:');
    
    results.filter(r => r.required && !r.success).forEach(result => {
      console.log(`  • Fix ${result.name.toLowerCase()} issues`);
    });
    
    console.log('\n💡 Quick fixes:');
    console.log('  • Lint errors: npm run lint -- --fix');
    console.log('  • Format issues: npm run format');
    console.log('  • Build errors: Check TypeScript compilation');
    console.log('  • Test failures: npm test (fix failing tests)');
    console.log('  • Coverage: Add more tests or remove dead code');
    
    console.log('\n🚫 Commit/merge blocked until all required gates pass');
  }
  
  console.log('='.repeat(50));
  
  return overallSuccess;
}

// Run quality gate enforcement
enforceQualityGates().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Quality gate enforcement failed:', error.message);
  process.exit(1);
});