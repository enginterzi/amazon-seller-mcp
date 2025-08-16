#!/usr/bin/env node

/**
 * Pre-commit hook to check for 'any' types in source files
 * This script prevents the introduction of 'any' types in production code
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Configuration
const SOURCE_DIRS = ['src'];
const ALLOWED_ANY_PATTERNS = [
  // Constructor signatures for error classes (acceptable)
  /new \(\.\.\.args: any\[\]\) =>/,
  // Comments containing 'any' (acceptable)
  /\/\/.*any/,
  /\/\*.*any.*\*\//,
  // Specific acceptable patterns
  /Clear existing timeout if any/,
];

/**
 * Check if a line contains an acceptable 'any' usage
 */
function isAcceptableAnyUsage(line) {
  return ALLOWED_ANY_PATTERNS.some(pattern => pattern.test(line));
}

/**
 * Scan a file for 'any' types
 */
function scanFileForAnyTypes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    if (line.includes('any') && !isAcceptableAnyUsage(line)) {
      // Check if it's actually a type annotation
      if (line.match(/:\s*any\b/) || line.match(/\bany\b.*=/) || line.match(/Array<any>/) || line.match(/Record<.*any.*>/)) {
        violations.push({
          line: index + 1,
          content: line.trim(),
          file: filePath
        });
      }
    }
  });

  return violations;
}

/**
 * Get all TypeScript files in source directories
 */
function getSourceFiles() {
  const files = [];
  
  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  SOURCE_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      scanDirectory(dir);
    }
  });
  
  return files;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Checking for TypeScript "any" types in source files...\n');
  
  const sourceFiles = getSourceFiles();
  let totalViolations = 0;
  const violationsByFile = {};

  // Scan all source files
  sourceFiles.forEach(file => {
    const violations = scanFileForAnyTypes(file);
    if (violations.length > 0) {
      violationsByFile[file] = violations;
      totalViolations += violations.length;
    }
  });

  // Report results
  if (totalViolations === 0) {
    console.log('✅ No "any" types found in source files. Great job!');
    process.exit(0);
  } else {
    console.log(`❌ Found ${totalViolations} "any" type violations in source files:\n`);
    
    Object.entries(violationsByFile).forEach(([file, violations]) => {
      console.log(`📄 ${file}:`);
      violations.forEach(violation => {
        console.log(`   Line ${violation.line}: ${violation.content}`);
      });
      console.log('');
    });

    console.log('💡 How to fix:');
    console.log('   1. Replace "any" with proper interfaces');
    console.log('   2. Use "unknown" for truly unknown types');
    console.log('   3. Create specific type unions');
    console.log('   4. See: .kiro/steering/typescript-any-prevention.md\n');
    
    console.log('🚫 Commit blocked until "any" types are fixed.');
    process.exit(1);
  }
}

// Run the check
main();