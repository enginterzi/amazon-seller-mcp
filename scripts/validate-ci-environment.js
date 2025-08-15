#!/usr/bin/env node

/**
 * CI Environment Validation Script
 * Ensures all required dependencies are available for CI/CD workflows
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// Required dependencies for CI environment
const REQUIRED_COMMANDS = [
  {
    name: 'node',
    command: 'node --version',
    minVersion: '18.0.0',
    description: 'Node.js runtime'
  },
  {
    name: 'npm',
    command: 'npm --version',
    minVersion: '8.0.0',
    description: 'NPM package manager'
  },
  {
    name: 'jq',
    command: 'jq --version',
    minVersion: '1.6',
    description: 'JSON processor for parsing coverage reports',
    fallback: 'node -e "console.log(JSON.stringify(require(\'./coverage/coverage-final.json\')))"'
  },
  {
    name: 'bc',
    command: 'bc --version',
    minVersion: '1.0',
    description: 'Calculator for floating point comparisons',
    fallback: 'node -e "console.log(parseFloat(process.argv[1]) >= parseFloat(process.argv[2]))"'
  }
];

// Required files and directories
const REQUIRED_PATHS = [
  {
    path: 'package.json',
    type: 'file',
    description: 'Package configuration'
  },
  {
    path: 'vitest.config.ts',
    type: 'file',
    description: 'Test configuration'
  },
  {
    path: 'tsconfig.json',
    type: 'file',
    description: 'TypeScript configuration'
  },
  {
    path: 'src',
    type: 'directory',
    description: 'Source code directory'
  },
  {
    path: 'tests',
    type: 'directory',
    description: 'Test directory'
  }
];

function checkCommand(cmd) {
  try {
    const output = execSync(cmd.command, { encoding: 'utf-8', stdio: 'pipe' });
    const version = output.trim().replace(/[^\d.]/g, '').split('.').slice(0, 3).join('.');
    
    return {
      available: true,
      version,
      meetsMinimum: compareVersions(version, cmd.minVersion) >= 0
    };
  } catch (error) {
    return {
      available: false,
      version: null,
      meetsMinimum: false,
      error: error.message
    };
  }
}

function compareVersions(version1, version2) {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

function checkPath(pathInfo) {
  const fullPath = join(process.cwd(), pathInfo.path);
  const exists = existsSync(fullPath);
  
  return {
    exists,
    path: pathInfo.path,
    type: pathInfo.type,
    description: pathInfo.description
  };
}

function createFallbackScript(cmd) {
  if (!cmd.fallback) return null;
  
  const scriptName = `fallback-${cmd.name}.js`;
  const scriptPath = join(process.cwd(), 'scripts', scriptName);
  
  try {
    const { writeFileSync } = require('fs');
    writeFileSync(scriptPath, `#!/usr/bin/env node\n${cmd.fallback}\n`);
    execSync(`chmod +x ${scriptPath}`);
    return scriptPath;
  } catch (error) {
    console.warn(`⚠️  Could not create fallback script for ${cmd.name}:`, error.message);
    return null;
  }
}

function generateEnvironmentReport(commandResults, pathResults) {
  console.log('\n🔍 CI Environment Validation Report');
  console.log('='.repeat(50));
  
  // Command availability
  console.log('\n📦 Required Commands:');
  let commandIssues = 0;
  
  for (const [i, cmd] of REQUIRED_COMMANDS.entries()) {
    const result = commandResults[i];
    const status = result.available && result.meetsMinimum ? '✅' : '❌';
    
    console.log(`  ${status} ${cmd.name}: ${cmd.description}`);
    
    if (result.available) {
      const versionStatus = result.meetsMinimum ? '✅' : '⚠️ ';
      console.log(`    ${versionStatus} Version: ${result.version} (min: ${cmd.minVersion})`);
    } else {
      console.log(`    ❌ Not available: ${result.error}`);
      if (cmd.fallback) {
        console.log(`    💡 Fallback available: Node.js implementation`);
      }
      commandIssues++;
    }
  }
  
  // Path availability
  console.log('\n📁 Required Files & Directories:');
  let pathIssues = 0;
  
  for (const result of pathResults) {
    const status = result.exists ? '✅' : '❌';
    console.log(`  ${status} ${result.path}: ${result.description}`);
    
    if (!result.exists) {
      pathIssues++;
    }
  }
  
  // Environment variables
  console.log('\n🔧 Environment Configuration:');
  const nodeEnv = process.env.NODE_ENV || 'development';
  const ciEnv = process.env.CI || 'false';
  
  console.log(`  📊 NODE_ENV: ${nodeEnv}`);
  console.log(`  🤖 CI: ${ciEnv}`);
  
  // Summary
  console.log('\n📋 Summary:');
  const totalIssues = commandIssues + pathIssues;
  
  if (totalIssues === 0) {
    console.log('  ✅ All environment requirements satisfied');
    console.log('  🚀 Ready for CI/CD execution');
    return true;
  } else {
    console.log(`  ❌ ${totalIssues} issues detected`);
    console.log('  🔧 Please resolve issues before running CI/CD');
    
    // Provide installation guidance
    if (commandIssues > 0) {
      console.log('\n💡 Installation Guidance:');
      
      for (const [i, cmd] of REQUIRED_COMMANDS.entries()) {
        const result = commandResults[i];
        if (!result.available) {
          console.log(`\n  ${cmd.name}:`);
          
          switch (cmd.name) {
            case 'jq':
              console.log('    macOS: brew install jq');
              console.log('    Ubuntu: apt-get install jq');
              console.log('    CentOS: yum install jq');
              break;
            case 'bc':
              console.log('    macOS: brew install bc');
              console.log('    Ubuntu: apt-get install bc');
              console.log('    CentOS: yum install bc');
              break;
            default:
              console.log(`    Please install ${cmd.name} according to your system requirements`);
          }
        }
      }
    }
    
    return false;
  }
}

function main() {
  console.log('🔍 Validating CI environment...');
  
  // Check required commands
  const commandResults = REQUIRED_COMMANDS.map(checkCommand);
  
  // Check required paths
  const pathResults = REQUIRED_PATHS.map(checkPath);
  
  // Generate report
  const environmentHealthy = generateEnvironmentReport(commandResults, pathResults);
  
  // Create fallback scripts for missing commands
  if (!environmentHealthy) {
    console.log('\n🛠️  Creating fallback implementations...');
    
    for (const [i, cmd] of REQUIRED_COMMANDS.entries()) {
      const result = commandResults[i];
      if (!result.available && cmd.fallback) {
        const fallbackPath = createFallbackScript(cmd);
        if (fallbackPath) {
          console.log(`  ✅ Created fallback for ${cmd.name}: ${fallbackPath}`);
        }
      }
    }
  }
  
  // Exit with appropriate code
  process.exit(environmentHealthy ? 0 : 1);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
CI Environment Validator

Usage:
  node scripts/validate-ci-environment.js [options]

Options:
  --help, -h     Show this help message

This script validates that all required dependencies are available
for CI/CD workflows and provides installation guidance for missing tools.

Examples:
  node scripts/validate-ci-environment.js
  npm run ci:validate-env
`);
  process.exit(0);
}

try {
  main();
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  process.exit(1);
}