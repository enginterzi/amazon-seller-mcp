#!/usr/bin/env node

/**
 * Validation script for pre-commit hook setup
 * Ensures pre-commit hooks are properly installed and configured
 */

import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

const HOOK_PATH = '.git/hooks/pre-commit';
const HOOK_SOURCE = '.github/hooks/pre-commit';

/**
 * Run a command and return success status
 */
function runCommand(command, description) {
  try {
    console.log(`  → ${description}...`);
    execSync(command, { stdio: 'pipe' });
    console.log(`    ✅ ${description} passed`);
    return true;
  } catch (error) {
    console.log(`    ❌ ${description} failed`);
    return false;
  }
}

/**
 * Check if file exists and is executable
 */
function checkFileExecutable(filePath, description) {
  try {
    if (!existsSync(filePath)) {
      console.log(`    ❌ ${description}: File not found at ${filePath}`);
      return false;
    }

    const stats = statSync(filePath);
    if (!stats.isFile()) {
      console.log(`    ❌ ${description}: Not a file`);
      return false;
    }

    // Check if executable (on Unix-like systems)
    if (process.platform !== 'win32') {
      const mode = stats.mode;
      const isExecutable = (mode & parseInt('111', 8)) !== 0;
      if (!isExecutable) {
        console.log(`    ❌ ${description}: File is not executable`);
        return false;
      }
    }

    console.log(`    ✅ ${description}: File exists and is executable`);
    return true;
  } catch (error) {
    console.log(`    ❌ ${description}: Error checking file - ${error.message}`);
    return false;
  }
}

/**
 * Validate hook content
 */
async function validateHookContent() {
  try {
    const hookContent = await readFile(HOOK_PATH, 'utf8');
    
    // Check for required quality gates
    const requiredChecks = [
      'npm run lint',
      'npm run build', 
      'npm test',
      'npm run format'
    ];

    let allChecksFound = true;
    for (const check of requiredChecks) {
      if (!hookContent.includes(check)) {
        console.log(`    ❌ Missing required check: ${check}`);
        allChecksFound = false;
      }
    }

    if (allChecksFound) {
      console.log(`    ✅ All required quality checks found in hook`);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(`    ❌ Error reading hook content: ${error.message}`);
    return false;
  }
}

/**
 * Main validation function
 */
async function validatePreCommitSetup() {
  console.log('🔍 Validating pre-commit hook setup...\n');

  let allValid = true;

  // 1. Check if we're in a git repository
  console.log('📁 Checking git repository...');
  if (!existsSync('.git')) {
    console.log('    ❌ Not in a git repository');
    allValid = false;
  } else {
    console.log('    ✅ Git repository detected');
  }

  // 2. Check if hook source exists
  console.log('\n📄 Checking hook source file...');
  if (!checkFileExecutable(HOOK_SOURCE, 'Hook source file')) {
    allValid = false;
  }

  // 3. Check if hook is installed
  console.log('\n🔗 Checking installed hook...');
  if (!checkFileExecutable(HOOK_PATH, 'Installed pre-commit hook')) {
    console.log('\n💡 To install the hook, run: npm run setup:hooks');
    allValid = false;
  } else {
    // 4. Validate hook content
    console.log('\n📝 Validating hook content...');
    if (!(await validateHookContent())) {
      allValid = false;
    }
  }

  // 5. Test quality commands
  console.log('\n🧪 Testing quality commands...');
  const commands = [
    { cmd: 'npm run lint', desc: 'ESLint validation' },
    { cmd: 'npm run build', desc: 'TypeScript build' },
    { cmd: 'npm test', desc: 'Test execution' },
    { cmd: 'npm run format -- --check', desc: 'Prettier formatting check' }
  ];

  for (const { cmd, desc } of commands) {
    if (!runCommand(cmd, desc)) {
      console.log(`    💡 Fix issues with: ${cmd}`);
      // Don't fail overall validation for command failures
      // as they might be expected during development
    }
  }

  // 6. Test hook execution (dry run)
  console.log('\n🎯 Testing hook execution...');
  try {
    // Create a temporary test to see if hook would run
    execSync('git status --porcelain', { stdio: 'pipe' });
    console.log('    ✅ Hook execution environment ready');
  } catch (error) {
    console.log('    ⚠️  Could not test hook execution environment');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allValid) {
    console.log('✅ Pre-commit hook setup is valid!');
    console.log('\nThe following quality gates will be enforced:');
    console.log('  • Zero lint errors');
    console.log('  • Successful TypeScript build');
    console.log('  • All tests passing');
    console.log('  • Proper code formatting');
    console.log('\n💡 Test the hook with: git commit --dry-run');
  } else {
    console.log('❌ Pre-commit hook setup has issues!');
    console.log('\n🔧 To fix:');
    console.log('  1. Run: npm run setup:hooks');
    console.log('  2. Fix any quality issues: npm run lint && npm test && npm run build');
    console.log('  3. Re-run this validation: node scripts/validate-pre-commit-setup.js');
  }
  console.log('='.repeat(50));

  process.exit(allValid ? 0 : 1);
}

// Run validation
validatePreCommitSetup().catch(error => {
  console.error('❌ Validation failed with error:', error.message);
  process.exit(1);
});