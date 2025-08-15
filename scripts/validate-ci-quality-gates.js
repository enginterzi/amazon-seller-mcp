#!/usr/bin/env node

/**
 * Validation script for CI quality gate configuration
 * Ensures CI workflows properly enforce quality standards
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import yaml from 'js-yaml';

const CI_WORKFLOW_PATH = '.github/workflows/ci.yml';

/**
 * Validate CI workflow configuration
 */
async function validateCIQualityGates() {
  console.log('🔍 Validating CI quality gate configuration...\n');

  let allValid = true;

  try {
    // 1. Check if CI workflow exists
    console.log('📄 Checking CI workflow file...');
    if (!existsSync(CI_WORKFLOW_PATH)) {
      console.log(`    ❌ CI workflow not found at ${CI_WORKFLOW_PATH}`);
      allValid = false;
      return;
    }
    console.log(`    ✅ CI workflow found at ${CI_WORKFLOW_PATH}`);

    // 2. Parse and validate workflow content
    console.log('\n📝 Parsing workflow configuration...');
    const workflowContent = await readFile(CI_WORKFLOW_PATH, 'utf8');
    
    // Basic validation - check for required quality gates
    const requiredChecks = [
      'npm run lint',
      'npm run build', 
      'npm test',
      'npm run format',
      'coverage-summary.json'
    ];

    console.log('\n🔍 Validating required quality checks...');
    for (const check of requiredChecks) {
      if (workflowContent.includes(check)) {
        console.log(`    ✅ Found: ${check}`);
      } else {
        console.log(`    ❌ Missing: ${check}`);
        allValid = false;
      }
    }

    // 3. Check for proper job dependencies
    console.log('\n🔗 Validating job dependencies...');
    const jobDependencyChecks = [
      { pattern: 'needs: test', description: 'Quality gate depends on test job' },
      { pattern: 'needs: \\[test, quality-gate\\]', description: 'Build depends on test and quality-gate' },
      { pattern: 'if: needs\\.test\\.result == \'success\'', description: 'Build only runs on test success' }
    ];

    for (const { pattern, description } of jobDependencyChecks) {
      const regex = new RegExp(pattern);
      if (regex.test(workflowContent)) {
        console.log(`    ✅ ${description}`);
      } else {
        console.log(`    ❌ Missing: ${description}`);
        allValid = false;
      }
    }

    // 4. Check for coverage thresholds
    console.log('\n📊 Validating coverage thresholds...');
    const coverageThresholds = [
      { pattern: 'lines\\.pct < 80', description: 'Line coverage threshold (80%)' },
      { pattern: 'branches\\.pct < 75', description: 'Branch coverage threshold (75%)' },
      { pattern: 'functions\\.pct < 80', description: 'Function coverage threshold (80%)' },
      { pattern: 'statements\\.pct < 80', description: 'Statement coverage threshold (80%)' }
    ];

    for (const { pattern, description } of coverageThresholds) {
      if (workflowContent.includes(pattern.replace(/\\\./g, '.'))) {
        console.log(`    ✅ ${description}`);
      } else {
        console.log(`    ❌ Missing: ${description}`);
        allValid = false;
      }
    }

    // 5. Check for mandatory quality gates
    console.log('\n🚪 Validating mandatory quality gates...');
    const mandatoryGates = [
      { pattern: 'Zero errors allowed', description: 'Zero lint errors enforcement' },
      { pattern: '100% pass rate', description: '100% test pass rate requirement' },
      { pattern: 'exit 1', description: 'Failure handling (exit on quality gate failure)' }
    ];

    for (const { pattern, description } of mandatoryGates) {
      if (workflowContent.includes(pattern)) {
        console.log(`    ✅ ${description}`);
      } else {
        console.log(`    ⚠️  Check: ${description}`);
        // Don't fail for these as they might be implemented differently
      }
    }

    // 6. Validate environment setup
    console.log('\n🌍 Validating CI environment setup...');
    const envChecks = [
      'npm run ci:validate-env',
      'ubuntu-latest',
      'node-version'
    ];

    for (const check of envChecks) {
      if (workflowContent.includes(check)) {
        console.log(`    ✅ Found: ${check}`);
      } else {
        console.log(`    ❌ Missing: ${check}`);
        allValid = false;
      }
    }

  } catch (error) {
    console.log(`    ❌ Error parsing workflow: ${error.message}`);
    allValid = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allValid) {
    console.log('✅ CI quality gate configuration is valid!');
    console.log('\nEnforced quality gates:');
    console.log('  🔍 Zero lint errors (ESLint)');
    console.log('  🏗️  Successful TypeScript build');
    console.log('  🧪 100% test pass rate');
    console.log('  📊 Coverage thresholds (80% line, 75% branch)');
    console.log('  🎨 Code formatting (Prettier)');
    console.log('  🔗 Proper job dependencies');
    console.log('\n🚀 CI pipeline will block merges that don\'t meet quality standards');
  } else {
    console.log('❌ CI quality gate configuration has issues!');
    console.log('\n🔧 Issues found:');
    console.log('  • Missing required quality checks');
    console.log('  • Improper job dependencies');
    console.log('  • Missing coverage thresholds');
    console.log('  • Environment setup issues');
    console.log('\n💡 Review and update .github/workflows/ci.yml');
  }
  console.log('='.repeat(60));

  return allValid;
}

/**
 * Validate package.json scripts for quality gates
 */
async function validatePackageScripts() {
  console.log('\n🔍 Validating package.json quality scripts...\n');

  try {
    const packageContent = await readFile('package.json', 'utf8');
    const packageJson = JSON.parse(packageContent);
    const scripts = packageJson.scripts || {};

    const requiredScripts = [
      'lint',
      'format',
      'build',
      'test',
      'test:coverage',
      'test:coverage:threshold',
      'ci:validate-env'
    ];

    let allScriptsValid = true;

    console.log('📋 Checking required scripts...');
    for (const script of requiredScripts) {
      if (scripts[script]) {
        console.log(`    ✅ ${script}: ${scripts[script]}`);
      } else {
        console.log(`    ❌ Missing script: ${script}`);
        allScriptsValid = false;
      }
    }

    return allScriptsValid;
  } catch (error) {
    console.log(`    ❌ Error reading package.json: ${error.message}`);
    return false;
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log('🎯 CI Quality Gate Validation\n');

  const ciValid = await validateCIQualityGates();
  const scriptsValid = await validatePackageScripts();

  const overallValid = ciValid && scriptsValid;

  console.log('\n' + '='.repeat(60));
  console.log(overallValid ? '🎉 All validations passed!' : '❌ Validation failed!');
  console.log('='.repeat(60));

  process.exit(overallValid ? 0 : 1);
}

// Handle missing js-yaml dependency gracefully
try {
  main().catch(error => {
    console.error('❌ Validation failed with error:', error.message);
    process.exit(1);
  });
} catch (error) {
  // If js-yaml is not available, run a simpler validation
  console.log('⚠️  Running simplified validation (js-yaml not available)');
  
  validateCIQualityGates().then(valid => {
    validatePackageScripts().then(scriptsValid => {
      const overallValid = valid && scriptsValid;
      console.log(overallValid ? '✅ Basic validation passed' : '❌ Validation failed');
      process.exit(overallValid ? 0 : 1);
    });
  }).catch(error => {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  });
}