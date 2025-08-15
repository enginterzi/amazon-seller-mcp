#!/usr/bin/env node

/**
 * End-to-End Pipeline Validation Script
 * Validates that all fixes work together and pipeline passes completely
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

// Pipeline validation configuration
const VALIDATION_CONFIG = {
  timeout: 300000, // 5 minutes max per step
  retries: 2,
  requiredCoverageThresholds: {
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80
  },
  maxLintErrors: 0,
  maxTestFailures: 0,
  requiredScripts: [
    'lint',
    'format',
    'build',
    'test',
    'test:coverage',
    'test:coverage:threshold',
    'ci:validate-env'
  ]
};

// Test scenarios to validate different pipeline workflows
const TEST_SCENARIOS = [
  {
    name: 'Main Branch Workflow',
    description: 'Simulates CI workflow for main branch commits',
    steps: ['environment', 'lint', 'format', 'build', 'test', 'coverage']
  },
  {
    name: 'Pull Request Workflow', 
    description: 'Simulates CI workflow for pull request validation',
    steps: ['environment', 'lint', 'format', 'build', 'test', 'coverage', 'quality-gates']
  },
  {
    name: 'Release Workflow',
    description: 'Simulates CI workflow for release preparation',
    steps: ['environment', 'lint', 'format', 'build', 'test', 'coverage', 'quality-gates', 'package']
  }
];

class PipelineValidator {
  constructor() {
    this.results = {
      scenarios: [],
      overallSuccess: false,
      startTime: Date.now(),
      endTime: null,
      summary: {}
    };
  }

  /**
   * Execute a command with timeout and retry logic
   */
  executeCommand(command, options = {}) {
    const { timeout = VALIDATION_CONFIG.timeout, retries = VALIDATION_CONFIG.retries } = options;
    
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        console.log(`    → Executing: ${command} (attempt ${attempt})`);
        
        const output = execSync(command, {
          encoding: 'utf-8',
          timeout,
          stdio: 'pipe',
          cwd: process.cwd()
        });
        
        return {
          success: true,
          output: output.trim(),
          attempt,
          command
        };
      } catch (error) {
        console.log(`    ❌ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === retries + 1) {
          return {
            success: false,
            error: error.message,
            output: error.stdout || '',
            stderr: error.stderr || '',
            attempt,
            command
          };
        }
        
        // Wait before retry
        if (attempt <= retries) {
          console.log(`    ⏳ Waiting 2s before retry...`);
          execSync('sleep 2');
        }
      }
    }
  }

  /**
   * Validate CI environment setup
   */
  validateEnvironment() {
    console.log('  🌍 Validating CI environment...');
    
    const result = this.executeCommand('npm run ci:validate-env');
    
    if (!result.success) {
      return {
        step: 'environment',
        success: false,
        error: 'CI environment validation failed',
        details: result.error
      };
    }

    // Check required files exist
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'vitest.config.ts',
      '.github/workflows/ci.yml'
    ];

    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        return {
          step: 'environment',
          success: false,
          error: `Required file missing: ${file}`
        };
      }
    }

    // Validate package.json scripts
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    const scripts = packageJson.scripts || {};
    
    const missingScripts = VALIDATION_CONFIG.requiredScripts.filter(
      script => !scripts[script]
    );

    if (missingScripts.length > 0) {
      return {
        step: 'environment',
        success: false,
        error: `Missing required scripts: ${missingScripts.join(', ')}`
      };
    }

    return {
      step: 'environment',
      success: true,
      message: 'Environment validation passed'
    };
  }

  /**
   * Validate lint compliance (zero errors required)
   */
  validateLint() {
    console.log('  🔍 Validating lint compliance...');
    
    const result = this.executeCommand('npm run lint');
    
    if (!result.success) {
      // Parse lint output to count errors
      const output = result.stderr || result.output || '';
      const errorMatch = output.match(/(\d+) problems? \((\d+) errors?/);
      const errorCount = errorMatch ? parseInt(errorMatch[2]) : 1;
      
      return {
        step: 'lint',
        success: false,
        error: `${errorCount} lint errors detected`,
        details: output,
        errorCount
      };
    }

    return {
      step: 'lint',
      success: true,
      message: 'Zero lint errors - compliance achieved'
    };
  }

  /**
   * Validate code formatting
   */
  validateFormat() {
    console.log('  🎨 Validating code formatting...');
    
    const result = this.executeCommand('npm run format -- --check');
    
    if (!result.success) {
      return {
        step: 'format',
        success: false,
        error: 'Code formatting issues detected',
        details: result.error
      };
    }

    return {
      step: 'format',
      success: true,
      message: 'Code formatting validation passed'
    };
  }

  /**
   * Validate TypeScript build
   */
  validateBuild() {
    console.log('  🏗️ Validating TypeScript build...');
    
    const result = this.executeCommand('npm run build');
    
    if (!result.success) {
      return {
        step: 'build',
        success: false,
        error: 'TypeScript build failed',
        details: result.error
      };
    }

    // Check build artifacts exist
    const requiredArtifacts = [
      'dist/index.js',
      'dist/index.d.ts'
    ];

    for (const artifact of requiredArtifacts) {
      if (!existsSync(artifact)) {
        return {
          step: 'build',
          success: false,
          error: `Build artifact missing: ${artifact}`
        };
      }
    }

    return {
      step: 'build',
      success: true,
      message: 'TypeScript build successful'
    };
  }

  /**
   * Validate test execution (100% pass rate required)
   */
  validateTests() {
    console.log('  🧪 Validating test execution...');
    
    const result = this.executeCommand('npm test -- --run');
    
    if (!result.success) {
      // Parse test output to get failure details
      const output = result.output || result.stderr || '';
      const failedMatch = output.match(/(\d+) failed/);
      const failedCount = failedMatch ? parseInt(failedMatch[1]) : 1;
      
      return {
        step: 'test',
        success: false,
        error: `${failedCount} tests failed`,
        details: output,
        failedCount
      };
    }

    // Parse successful test output
    const output = result.output;
    const passedMatch = output.match(/(\d+) passed/);
    const passedCount = passedMatch ? parseInt(passedMatch[1]) : 0;
    
    return {
      step: 'test',
      success: true,
      message: `All ${passedCount} tests passed`,
      passedCount
    };
  }

  /**
   * Validate test coverage thresholds
   */
  validateCoverage() {
    console.log('  📊 Validating coverage thresholds...');
    
    const result = this.executeCommand('npm run test:coverage:threshold');
    
    if (!result.success) {
      return {
        step: 'coverage',
        success: false,
        error: 'Coverage thresholds not met',
        details: result.error
      };
    }

    // Read coverage summary if available
    const coveragePath = 'coverage/coverage-summary.json';
    if (existsSync(coveragePath)) {
      try {
        const coverage = JSON.parse(readFileSync(coveragePath, 'utf-8'));
        const { lines, functions, branches, statements } = coverage.total;
        
        const thresholds = VALIDATION_CONFIG.requiredCoverageThresholds;
        const violations = [];
        
        if (lines.pct < thresholds.lines) {
          violations.push(`Lines: ${lines.pct}% < ${thresholds.lines}%`);
        }
        if (functions.pct < thresholds.functions) {
          violations.push(`Functions: ${functions.pct}% < ${thresholds.functions}%`);
        }
        if (branches.pct < thresholds.branches) {
          violations.push(`Branches: ${branches.pct}% < ${thresholds.branches}%`);
        }
        if (statements.pct < thresholds.statements) {
          violations.push(`Statements: ${statements.pct}% < ${thresholds.statements}%`);
        }

        if (violations.length > 0) {
          return {
            step: 'coverage',
            success: false,
            error: 'Coverage thresholds not met',
            violations,
            coverage: { lines: lines.pct, functions: functions.pct, branches: branches.pct, statements: statements.pct }
          };
        }

        return {
          step: 'coverage',
          success: true,
          message: 'All coverage thresholds met',
          coverage: { lines: lines.pct, functions: functions.pct, branches: branches.pct, statements: statements.pct }
        };
      } catch (error) {
        return {
          step: 'coverage',
          success: false,
          error: 'Could not parse coverage report',
          details: error.message
        };
      }
    }

    return {
      step: 'coverage',
      success: true,
      message: 'Coverage validation passed'
    };
  }

  /**
   * Validate quality gates enforcement
   */
  validateQualityGates() {
    console.log('  🚪 Validating quality gates...');
    
    const result = this.executeCommand('node scripts/validate-ci-quality-gates.js');
    
    if (!result.success) {
      return {
        step: 'quality-gates',
        success: false,
        error: 'Quality gates validation failed',
        details: result.error
      };
    }

    return {
      step: 'quality-gates',
      success: true,
      message: 'Quality gates properly configured'
    };
  }

  /**
   * Validate package generation
   */
  validatePackage() {
    console.log('  📦 Validating package generation...');
    
    // Generate documentation
    const docsResult = this.executeCommand('npm run build:docs');
    if (!docsResult.success) {
      return {
        step: 'package',
        success: false,
        error: 'Documentation generation failed',
        details: docsResult.error
      };
    }

    return {
      step: 'package',
      success: true,
      message: 'Package artifacts generated successfully'
    };
  }

  /**
   * Execute a validation step
   */
  executeStep(stepName) {
    const stepMethods = {
      'environment': () => this.validateEnvironment(),
      'lint': () => this.validateLint(),
      'format': () => this.validateFormat(),
      'build': () => this.validateBuild(),
      'test': () => this.validateTests(),
      'coverage': () => this.validateCoverage(),
      'quality-gates': () => this.validateQualityGates(),
      'package': () => this.validatePackage()
    };

    const method = stepMethods[stepName];
    if (!method) {
      return {
        step: stepName,
        success: false,
        error: `Unknown validation step: ${stepName}`
      };
    }

    const startTime = Date.now();
    const result = method();
    const duration = Date.now() - startTime;

    return {
      ...result,
      duration
    };
  }

  /**
   * Run a complete test scenario
   */
  runScenario(scenario) {
    console.log(`\n🎯 Running scenario: ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    
    const scenarioResult = {
      name: scenario.name,
      description: scenario.description,
      steps: [],
      success: true,
      startTime: Date.now(),
      endTime: null
    };

    for (const stepName of scenario.steps) {
      console.log(`\n  📋 Step: ${stepName}`);
      
      const stepResult = this.executeStep(stepName);
      scenarioResult.steps.push(stepResult);

      if (stepResult.success) {
        console.log(`    ✅ ${stepResult.message || 'Step completed successfully'}`);
        if (stepResult.duration) {
          console.log(`    ⏱️  Duration: ${stepResult.duration}ms`);
        }
      } else {
        console.log(`    ❌ ${stepResult.error}`);
        if (stepResult.details) {
          console.log(`    📝 Details: ${stepResult.details.substring(0, 200)}...`);
        }
        scenarioResult.success = false;
        // Continue with remaining steps to get full picture
      }
    }

    scenarioResult.endTime = Date.now();
    scenarioResult.duration = scenarioResult.endTime - scenarioResult.startTime;

    return scenarioResult;
  }

  /**
   * Generate comprehensive validation report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.results.endTime - this.results.startTime,
      overallSuccess: this.results.overallSuccess,
      scenarios: this.results.scenarios,
      summary: {
        totalScenarios: this.results.scenarios.length,
        successfulScenarios: this.results.scenarios.filter(s => s.success).length,
        failedScenarios: this.results.scenarios.filter(s => !s.success).length,
        totalSteps: this.results.scenarios.reduce((sum, s) => sum + s.steps.length, 0),
        successfulSteps: this.results.scenarios.reduce((sum, s) => 
          sum + s.steps.filter(step => step.success).length, 0),
        failedSteps: this.results.scenarios.reduce((sum, s) => 
          sum + s.steps.filter(step => !step.success).length, 0)
      }
    };

    // Write detailed report
    const reportPath = 'test-results/pipeline-validation-report.json';
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Display validation summary
   */
  displaySummary(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 END-TO-END PIPELINE VALIDATION SUMMARY');
    console.log('='.repeat(80));

    console.log(`\n📊 Overall Results:`);
    console.log(`  • Duration: ${Math.round(report.duration / 1000)}s`);
    console.log(`  • Scenarios: ${report.summary.successfulScenarios}/${report.summary.totalScenarios} passed`);
    console.log(`  • Steps: ${report.summary.successfulSteps}/${report.summary.totalSteps} passed`);
    console.log(`  • Status: ${report.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);

    console.log(`\n📋 Scenario Results:`);
    for (const scenario of report.scenarios) {
      const status = scenario.success ? '✅' : '❌';
      const duration = Math.round(scenario.duration / 1000);
      console.log(`  ${status} ${scenario.name} (${duration}s)`);
      
      if (!scenario.success) {
        const failedSteps = scenario.steps.filter(s => !s.success);
        for (const step of failedSteps) {
          console.log(`    ❌ ${step.step}: ${step.error}`);
        }
      }
    }

    if (report.overallSuccess) {
      console.log(`\n🎉 Pipeline Validation PASSED!`);
      console.log(`\n✅ Quality Gates Verified:`);
      console.log(`  • Zero lint errors enforced`);
      console.log(`  • 100% test pass rate achieved`);
      console.log(`  • Coverage thresholds met (80% line, 75% branch)`);
      console.log(`  • TypeScript build successful`);
      console.log(`  • Code formatting compliant`);
      console.log(`  • CI environment properly configured`);
      console.log(`\n🚀 Pipeline is ready for production use!`);
    } else {
      console.log(`\n❌ Pipeline Validation FAILED!`);
      console.log(`\n🔧 Issues to address:`);
      
      const allFailedSteps = report.scenarios.reduce((acc, scenario) => {
        return acc.concat(scenario.steps.filter(s => !s.success));
      }, []);

      const stepCounts = {};
      allFailedSteps.forEach(step => {
        stepCounts[step.step] = (stepCounts[step.step] || 0) + 1;
      });

      for (const [step, count] of Object.entries(stepCounts)) {
        console.log(`  • ${step}: ${count} failure(s)`);
      }

      console.log(`\n💡 Next steps:`);
      console.log(`  1. Review failed steps above`);
      console.log(`  2. Fix issues systematically`);
      console.log(`  3. Re-run validation: npm run pipeline:validate`);
      console.log(`  4. Check detailed report: test-results/pipeline-validation-report.json`);
    }

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Run complete end-to-end validation
   */
  async run() {
    console.log('🚀 Starting End-to-End Pipeline Validation...');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);

    // Run all test scenarios
    for (const scenario of TEST_SCENARIOS) {
      const scenarioResult = this.runScenario(scenario);
      this.results.scenarios.push(scenarioResult);
    }

    // Determine overall success
    this.results.overallSuccess = this.results.scenarios.every(s => s.success);
    this.results.endTime = Date.now();

    // Generate and display report
    const report = this.generateReport();
    this.displaySummary(report);

    return this.results.overallSuccess;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
End-to-End Pipeline Validation

Usage:
  node scripts/validate-pipeline-end-to-end.js [options]

Options:
  --help, -h     Show this help message
  --scenario     Run specific scenario (main|pr|release)

This script validates that all CI/CD pipeline fixes work together by:
- Testing different workflow scenarios (main branch, PR, release)
- Validating all quality gates are properly enforced
- Ensuring zero lint errors, 100% test pass rate, coverage thresholds
- Verifying build success and package generation
- Generating comprehensive validation reports

Examples:
  node scripts/validate-pipeline-end-to-end.js
  node scripts/validate-pipeline-end-to-end.js --scenario pr
  npm run pipeline:validate
`);
    process.exit(0);
  }

  // Handle specific scenario execution
  if (args.includes('--scenario')) {
    const scenarioIndex = args.indexOf('--scenario');
    const scenarioName = args[scenarioIndex + 1];
    
    const scenarioMap = {
      'main': TEST_SCENARIOS[0],
      'pr': TEST_SCENARIOS[1], 
      'release': TEST_SCENARIOS[2]
    };
    
    const scenario = scenarioMap[scenarioName];
    if (!scenario) {
      console.error(`❌ Unknown scenario: ${scenarioName}`);
      console.error(`Available scenarios: ${Object.keys(scenarioMap).join(', ')}`);
      process.exit(1);
    }
    
    const validator = new PipelineValidator();
    const scenarioResult = validator.runScenario(scenario);
    
    console.log(`\n${scenarioResult.success ? '✅' : '❌'} Scenario ${scenario.name}: ${scenarioResult.success ? 'PASSED' : 'FAILED'}`);
    process.exit(scenarioResult.success ? 0 : 1);
  }

  // Run full validation
  try {
    const validator = new PipelineValidator();
    const success = await validator.run();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Pipeline validation failed with error:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});