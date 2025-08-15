#!/usr/bin/env node

/**
 * Pipeline Health Monitoring System
 * Creates monitoring dashboard for pipeline success rates and alerts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Health monitoring configuration
const MONITORING_CONFIG = {
  healthCheckInterval: 300000, // 5 minutes
  alertThresholds: {
    pipelineSuccessRate: 95, // Alert if below 95%
    testPassRate: 98, // Alert if below 98%
    buildFailureRate: 5, // Alert if above 5%
    coverageDropThreshold: 5, // Alert if coverage drops by 5%
    lintErrorThreshold: 5, // Alert if more than 5 lint errors
    slowTestThreshold: 10 // Alert if more than 10 slow tests
  },
  retentionDays: 30, // Keep 30 days of history
  reportPath: 'monitoring/pipeline-health',
  dashboardPath: 'monitoring/dashboard.html'
};

// Health metrics structure
const HEALTH_METRICS = {
  timestamp: null,
  pipeline: {
    successRate: 0,
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    averageDuration: 0
  },
  quality: {
    lintErrors: 0,
    testPassRate: 0,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    coverage: {
      lines: 0,
      functions: 0,
      branches: 0,
      statements: 0
    }
  },
  performance: {
    buildTime: 0,
    testTime: 0,
    slowTests: [],
    flakyTests: []
  },
  alerts: []
};

class PipelineHealthMonitor {
  constructor() {
    this.ensureDirectories();
    this.currentMetrics = { ...HEALTH_METRICS };
    this.historicalData = this.loadHistoricalData();
  }

  /**
   * Ensure monitoring directories exist
   */
  ensureDirectories() {
    const dirs = [
      'monitoring', 
      'monitoring/reports', 
      'monitoring/alerts',
      MONITORING_CONFIG.reportPath
    ];
    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Load historical monitoring data
   */
  loadHistoricalData() {
    const historyPath = join(MONITORING_CONFIG.reportPath, 'history.json');
    
    if (existsSync(historyPath)) {
      try {
        const data = JSON.parse(readFileSync(historyPath, 'utf-8'));
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.warn('⚠️  Could not load historical data:', error.message);
        return [];
      }
    }
    
    return [];
  }

  /**
   * Save historical data with retention policy
   */
  saveHistoricalData() {
    const historyDir = MONITORING_CONFIG.reportPath;
    const historyPath = join(historyDir, 'history.json');
    
    // Ensure directory exists
    if (!existsSync(historyDir)) {
      mkdirSync(historyDir, { recursive: true });
    }
    
    // Add current metrics to history
    this.historicalData.push({
      ...this.currentMetrics,
      timestamp: new Date().toISOString()
    });

    // Apply retention policy
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MONITORING_CONFIG.retentionDays);
    
    this.historicalData = this.historicalData.filter(entry => 
      new Date(entry.timestamp) > cutoffDate
    );

    // Save to file
    writeFileSync(historyPath, JSON.stringify(this.historicalData, null, 2));
  }

  /**
   * Collect current pipeline metrics
   */
  async collectMetrics() {
    console.log('📊 Collecting pipeline health metrics...');
    
    this.currentMetrics.timestamp = new Date().toISOString();
    
    // Collect quality metrics
    await this.collectQualityMetrics();
    
    // Collect performance metrics
    await this.collectPerformanceMetrics();
    
    // Collect pipeline success metrics
    await this.collectPipelineMetrics();
    
    // Generate alerts
    this.generateAlerts();
    
    console.log('✅ Metrics collection completed');
  }

  /**
   * Collect quality-related metrics
   */
  async collectQualityMetrics() {
    console.log('  🔍 Collecting quality metrics...');
    
    try {
      // Lint errors
      const lintResult = this.executeCommand('npm run lint', { allowFailure: true });
      if (!lintResult.success) {
        const errorMatch = lintResult.output.match(/(\d+) problems? \((\d+) errors?/);
        this.currentMetrics.quality.lintErrors = errorMatch ? parseInt(errorMatch[2]) : 0;
      } else {
        this.currentMetrics.quality.lintErrors = 0;
      }

      // Test metrics
      const testResult = this.executeCommand('npm test -- --run --reporter=json --outputFile=test-results/health-check.json', { allowFailure: true });
      
      if (existsSync('test-results/health-check.json')) {
        try {
          const testData = JSON.parse(readFileSync('test-results/health-check.json', 'utf-8'));
          this.currentMetrics.quality.totalTests = testData.numTotalTests || 0;
          this.currentMetrics.quality.passedTests = testData.numPassedTests || 0;
          this.currentMetrics.quality.failedTests = testData.numFailedTests || 0;
          this.currentMetrics.quality.testPassRate = this.currentMetrics.quality.totalTests > 0 
            ? (this.currentMetrics.quality.passedTests / this.currentMetrics.quality.totalTests) * 100 
            : 0;
        } catch (error) {
          console.warn('    ⚠️  Could not parse test results:', error.message);
        }
      }

      // Coverage metrics
      if (existsSync('coverage/coverage-summary.json')) {
        try {
          const coverage = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf-8'));
          const { lines, functions, branches, statements } = coverage.total;
          
          this.currentMetrics.quality.coverage = {
            lines: lines.pct,
            functions: functions.pct,
            branches: branches.pct,
            statements: statements.pct
          };
        } catch (error) {
          console.warn('    ⚠️  Could not parse coverage data:', error.message);
        }
      }

    } catch (error) {
      console.warn('    ⚠️  Error collecting quality metrics:', error.message);
    }
  }

  /**
   * Collect performance-related metrics
   */
  async collectPerformanceMetrics() {
    console.log('  ⚡ Collecting performance metrics...');
    
    try {
      // Build time
      const buildStart = Date.now();
      const buildResult = this.executeCommand('npm run build', { allowFailure: true });
      this.currentMetrics.performance.buildTime = Date.now() - buildStart;

      // Test time (from previous test run)
      if (existsSync('test-results/health-check.json')) {
        try {
          const testData = JSON.parse(readFileSync('test-results/health-check.json', 'utf-8'));
          if (testData.testResults) {
            const totalTestTime = testData.testResults.reduce((sum, result) => {
              return sum + (result.endTime - result.startTime);
            }, 0);
            this.currentMetrics.performance.testTime = totalTestTime;

            // Identify slow tests (>5 seconds)
            this.currentMetrics.performance.slowTests = testData.testResults
              .filter(result => (result.endTime - result.startTime) > 5000)
              .map(result => ({
                name: result.name,
                duration: result.endTime - result.startTime
              }));
          }
        } catch (error) {
          console.warn('    ⚠️  Could not analyze test performance:', error.message);
        }
      }

      // Check for flaky tests using test maintenance
      const maintenanceResult = this.executeCommand('npm run test:maintenance export json', { allowFailure: true });
      if (maintenanceResult.success) {
        try {
          const maintenanceData = JSON.parse(maintenanceResult.output);
          this.currentMetrics.performance.flakyTests = maintenanceData.flakyTests || [];
        } catch (error) {
          console.warn('    ⚠️  Could not parse maintenance data:', error.message);
        }
      }

    } catch (error) {
      console.warn('    ⚠️  Error collecting performance metrics:', error.message);
    }
  }

  /**
   * Collect pipeline success metrics
   */
  async collectPipelineMetrics() {
    console.log('  🚀 Collecting pipeline metrics...');
    
    // For now, simulate pipeline metrics based on current health
    // In a real CI environment, this would query the CI system API
    
    const isHealthy = this.currentMetrics.quality.lintErrors === 0 && 
                     this.currentMetrics.quality.testPassRate >= 95 &&
                     this.currentMetrics.quality.coverage.lines >= 75;

    // Update pipeline metrics based on current run
    this.currentMetrics.pipeline.totalRuns = (this.historicalData.length || 0) + 1;
    
    if (isHealthy) {
      this.currentMetrics.pipeline.successfulRuns = this.historicalData.filter(h => 
        h.quality?.lintErrors === 0 && h.quality?.testPassRate >= 95
      ).length + 1;
    } else {
      this.currentMetrics.pipeline.successfulRuns = this.historicalData.filter(h => 
        h.quality?.lintErrors === 0 && h.quality?.testPassRate >= 95
      ).length;
    }

    this.currentMetrics.pipeline.failedRuns = this.currentMetrics.pipeline.totalRuns - this.currentMetrics.pipeline.successfulRuns;
    this.currentMetrics.pipeline.successRate = this.currentMetrics.pipeline.totalRuns > 0 
      ? (this.currentMetrics.pipeline.successfulRuns / this.currentMetrics.pipeline.totalRuns) * 100 
      : 100;

    // Calculate average duration from historical data
    if (this.historicalData.length > 0) {
      const totalDuration = this.historicalData.reduce((sum, entry) => {
        return sum + (entry.performance?.buildTime || 0) + (entry.performance?.testTime || 0);
      }, 0);
      this.currentMetrics.pipeline.averageDuration = totalDuration / this.historicalData.length;
    }
  }

  /**
   * Generate alerts based on thresholds
   */
  generateAlerts() {
    console.log('  🚨 Generating alerts...');
    
    const alerts = [];
    const thresholds = MONITORING_CONFIG.alertThresholds;

    // Pipeline success rate alert
    if (this.currentMetrics.pipeline.successRate < thresholds.pipelineSuccessRate) {
      alerts.push({
        type: 'error',
        category: 'pipeline',
        message: `Pipeline success rate (${this.currentMetrics.pipeline.successRate.toFixed(1)}%) below threshold (${thresholds.pipelineSuccessRate}%)`,
        value: this.currentMetrics.pipeline.successRate,
        threshold: thresholds.pipelineSuccessRate
      });
    }

    // Test pass rate alert
    if (this.currentMetrics.quality.testPassRate < thresholds.testPassRate) {
      alerts.push({
        type: 'error',
        category: 'quality',
        message: `Test pass rate (${this.currentMetrics.quality.testPassRate.toFixed(1)}%) below threshold (${thresholds.testPassRate}%)`,
        value: this.currentMetrics.quality.testPassRate,
        threshold: thresholds.testPassRate
      });
    }

    // Lint errors alert
    if (this.currentMetrics.quality.lintErrors > thresholds.lintErrorThreshold) {
      alerts.push({
        type: 'warning',
        category: 'quality',
        message: `${this.currentMetrics.quality.lintErrors} lint errors detected (threshold: ${thresholds.lintErrorThreshold})`,
        value: this.currentMetrics.quality.lintErrors,
        threshold: thresholds.lintErrorThreshold
      });
    }

    // Slow tests alert
    if (this.currentMetrics.performance.slowTests.length > thresholds.slowTestThreshold) {
      alerts.push({
        type: 'warning',
        category: 'performance',
        message: `${this.currentMetrics.performance.slowTests.length} slow tests detected (threshold: ${thresholds.slowTestThreshold})`,
        value: this.currentMetrics.performance.slowTests.length,
        threshold: thresholds.slowTestThreshold
      });
    }

    // Coverage drop alert (compare with previous)
    if (this.historicalData.length > 0) {
      const previousEntry = this.historicalData[this.historicalData.length - 1];
      const previousCoverage = previousEntry.quality?.coverage?.lines || 0;
      const currentCoverage = this.currentMetrics.quality.coverage.lines;
      const coverageDrop = previousCoverage - currentCoverage;

      if (coverageDrop > thresholds.coverageDropThreshold) {
        alerts.push({
          type: 'warning',
          category: 'quality',
          message: `Coverage dropped by ${coverageDrop.toFixed(1)}% (from ${previousCoverage.toFixed(1)}% to ${currentCoverage.toFixed(1)}%)`,
          value: coverageDrop,
          threshold: thresholds.coverageDropThreshold
        });
      }
    }

    this.currentMetrics.alerts = alerts;

    // Save alerts to file
    if (alerts.length > 0) {
      const alertsPath = join('monitoring/alerts', `alerts-${new Date().toISOString().split('T')[0]}.json`);
      writeFileSync(alertsPath, JSON.stringify({
        timestamp: this.currentMetrics.timestamp,
        alerts
      }, null, 2));
    }
  }

  /**
   * Generate monitoring dashboard HTML
   */
  generateDashboard() {
    console.log('📊 Generating monitoring dashboard...');
    
    const dashboardHtml = this.createDashboardHtml();
    writeFileSync(MONITORING_CONFIG.dashboardPath, dashboardHtml);
    
    console.log(`✅ Dashboard generated: ${MONITORING_CONFIG.dashboardPath}`);
  }

  /**
   * Create dashboard HTML content
   */
  createDashboardHtml() {
    const metrics = this.currentMetrics;
    const history = this.historicalData.slice(-10); // Last 10 entries for charts

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pipeline Health Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-title {
            font-size: 14px;
            font-weight: 600;
            color: #666;
            margin-bottom: 10px;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .metric-value.success { color: #28a745; }
        .metric-value.warning { color: #ffc107; }
        .metric-value.error { color: #dc3545; }
        .metric-subtitle {
            font-size: 12px;
            color: #888;
        }
        .alerts {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .alert {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            border-left: 4px solid;
        }
        .alert.error {
            background-color: #f8d7da;
            border-color: #dc3545;
            color: #721c24;
        }
        .alert.warning {
            background-color: #fff3cd;
            border-color: #ffc107;
            color: #856404;
        }
        .charts {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .timestamp {
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🚀 Pipeline Health Dashboard</h1>
            <p class="timestamp">Last updated: ${new Date(metrics.timestamp).toLocaleString()}</p>
        </div>

        ${metrics.alerts.length > 0 ? `
        <div class="alerts">
            <h2>🚨 Active Alerts</h2>
            ${metrics.alerts.map(alert => `
                <div class="alert ${alert.type}">
                    <strong>${alert.category.toUpperCase()}:</strong> ${alert.message}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-title">Pipeline Success Rate</div>
                <div class="metric-value ${metrics.pipeline.successRate >= 95 ? 'success' : metrics.pipeline.successRate >= 90 ? 'warning' : 'error'}">
                    ${metrics.pipeline.successRate.toFixed(1)}%
                </div>
                <div class="metric-subtitle">${metrics.pipeline.successfulRuns}/${metrics.pipeline.totalRuns} successful runs</div>
            </div>

            <div class="metric-card">
                <div class="metric-title">Test Pass Rate</div>
                <div class="metric-value ${metrics.quality.testPassRate >= 98 ? 'success' : metrics.quality.testPassRate >= 95 ? 'warning' : 'error'}">
                    ${metrics.quality.testPassRate.toFixed(1)}%
                </div>
                <div class="metric-subtitle">${metrics.quality.passedTests}/${metrics.quality.totalTests} tests passing</div>
            </div>

            <div class="metric-card">
                <div class="metric-title">Lint Errors</div>
                <div class="metric-value ${metrics.quality.lintErrors === 0 ? 'success' : metrics.quality.lintErrors <= 5 ? 'warning' : 'error'}">
                    ${metrics.quality.lintErrors}
                </div>
                <div class="metric-subtitle">errors detected</div>
            </div>

            <div class="metric-card">
                <div class="metric-title">Line Coverage</div>
                <div class="metric-value ${metrics.quality.coverage.lines >= 80 ? 'success' : metrics.quality.coverage.lines >= 75 ? 'warning' : 'error'}">
                    ${metrics.quality.coverage.lines.toFixed(1)}%
                </div>
                <div class="metric-subtitle">line coverage</div>
            </div>

            <div class="metric-card">
                <div class="metric-title">Build Time</div>
                <div class="metric-value">
                    ${Math.round(metrics.performance.buildTime / 1000)}s
                </div>
                <div class="metric-subtitle">average build duration</div>
            </div>

            <div class="metric-card">
                <div class="metric-title">Slow Tests</div>
                <div class="metric-value ${metrics.performance.slowTests.length <= 5 ? 'success' : metrics.performance.slowTests.length <= 10 ? 'warning' : 'error'}">
                    ${metrics.performance.slowTests.length}
                </div>
                <div class="metric-subtitle">tests taking >5s</div>
            </div>
        </div>

        <div class="charts">
            <div class="chart-container">
                <h3>Success Rate Trend</h3>
                <canvas id="successRateChart"></canvas>
            </div>
            <div class="chart-container">
                <h3>Coverage Trend</h3>
                <canvas id="coverageChart"></canvas>
            </div>
        </div>
    </div>

    <script>
        // Success Rate Chart
        const successRateCtx = document.getElementById('successRateChart').getContext('2d');
        new Chart(successRateCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(history.map(h => new Date(h.timestamp).toLocaleDateString()))},
                datasets: [{
                    label: 'Success Rate %',
                    data: ${JSON.stringify(history.map(h => h.pipeline?.successRate || 0))},
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        // Coverage Chart
        const coverageCtx = document.getElementById('coverageChart').getContext('2d');
        new Chart(coverageCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(history.map(h => new Date(h.timestamp).toLocaleDateString()))},
                datasets: [
                    {
                        label: 'Lines %',
                        data: ${JSON.stringify(history.map(h => h.quality?.coverage?.lines || 0))},
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)'
                    },
                    {
                        label: 'Branches %',
                        data: ${JSON.stringify(history.map(h => h.quality?.coverage?.branches || 0))},
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generate troubleshooting documentation
   */
  generateTroubleshootingDocs() {
    console.log('📚 Generating troubleshooting documentation...');
    
    const troubleshootingMd = `# Pipeline Troubleshooting Guide

## Common Issues and Solutions

### 🔍 Lint Errors

**Symptoms:**
- Pipeline fails at lint step
- ESLint reports errors in console

**Solutions:**
1. **Automatic fixes:** Run \`npm run lint -- --fix\`
2. **Manual fixes:** Address remaining errors individually
3. **Type issues:** Replace \`any\` types with proper interfaces
4. **Unused variables:** Remove or prefix with underscore

**Prevention:**
- Set up pre-commit hooks: \`npm run setup:hooks\`
- Use IDE ESLint integration
- Run lint checks before committing

### 🧪 Test Failures

**Symptoms:**
- Tests fail during CI execution
- Flaky or timing-dependent tests

**Solutions:**
1. **Port conflicts:** Use dynamic port allocation
2. **Async issues:** Ensure proper await/async handling
3. **Mock problems:** Update mock factories
4. **Resource cleanup:** Implement proper teardown

**Debugging:**
\`\`\`bash
# Run specific test file
npm test -- tests/path/to/test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Check test health
npm run test:health-check
\`\`\`

### 📊 Coverage Issues

**Symptoms:**
- Coverage below thresholds (80% line, 75% branch)
- Coverage reports missing

**Solutions:**
1. **Add missing tests:** Focus on uncovered lines
2. **Remove dead code:** Delete unused functions
3. **Test edge cases:** Cover error scenarios
4. **Integration tests:** Add end-to-end coverage

**Coverage Commands:**
\`\`\`bash
# Generate coverage report
npm run test:coverage

# Check thresholds
npm run test:coverage:threshold

# View HTML report
open coverage/index.html
\`\`\`

### 🏗️ Build Failures

**Symptoms:**
- TypeScript compilation errors
- Missing dependencies

**Solutions:**
1. **Type errors:** Fix TypeScript strict mode violations
2. **Import issues:** Check import paths and exports
3. **Dependencies:** Run \`npm ci\` to reinstall
4. **Version conflicts:** Check TypeScript version compatibility

### 🚀 Performance Issues

**Symptoms:**
- Slow build times
- Long test execution
- High resource usage

**Solutions:**
1. **Parallel execution:** Use test parallelization
2. **Caching:** Implement build caching
3. **Optimize tests:** Reduce test complexity
4. **Resource limits:** Monitor memory usage

## Alert Response Procedures

### 🚨 Critical Alerts (Pipeline Failure)

1. **Immediate Response:**
   - Check latest commit changes
   - Review CI logs for error details
   - Revert if necessary to restore service

2. **Investigation:**
   - Run pipeline validation locally
   - Identify root cause category
   - Apply appropriate fix from above

3. **Resolution:**
   - Fix underlying issue
   - Verify fix with local testing
   - Monitor next pipeline run

### ⚠️ Warning Alerts (Degradation)

1. **Assessment:**
   - Determine impact severity
   - Check if trend is worsening
   - Plan fix timeline

2. **Action:**
   - Create issue for tracking
   - Apply fix during next development cycle
   - Monitor metrics for improvement

## Monitoring Commands

\`\`\`bash
# Run health check
npm run pipeline:validate

# Generate monitoring report
node scripts/pipeline-health-monitor.js

# View dashboard
open monitoring/dashboard.html

# Check alerts
ls monitoring/alerts/
\`\`\`

## Emergency Contacts

- **Pipeline Issues:** Check GitHub Actions logs
- **Quality Issues:** Review lint and test outputs
- **Performance Issues:** Monitor resource usage

## Escalation Process

1. **Level 1:** Automated alerts and dashboard
2. **Level 2:** Manual investigation using this guide
3. **Level 3:** Team review and architectural changes

---

*Last updated: ${new Date().toISOString()}*
`;

    writeFileSync('monitoring/TROUBLESHOOTING.md', troubleshootingMd);
    console.log('✅ Troubleshooting documentation generated');
  }

  /**
   * Execute command with error handling
   */
  executeCommand(command, options = {}) {
    const { allowFailure = false, timeout = 30000 } = options;
    
    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        timeout,
        stdio: 'pipe'
      });
      
      return {
        success: true,
        output: output.trim()
      };
    } catch (error) {
      if (allowFailure) {
        return {
          success: false,
          output: error.stdout || error.stderr || error.message
        };
      }
      throw error;
    }
  }

  /**
   * Run complete monitoring cycle
   */
  async run() {
    console.log('🔍 Starting Pipeline Health Monitoring...');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);

    try {
      // Collect current metrics
      await this.collectMetrics();
      
      // Save historical data
      this.saveHistoricalData();
      
      // Generate dashboard
      this.generateDashboard();
      
      // Generate troubleshooting docs
      this.generateTroubleshootingDocs();
      
      // Display summary
      this.displaySummary();
      
      console.log('✅ Pipeline health monitoring completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Pipeline health monitoring failed:', error);
      return false;
    }
  }

  /**
   * Display monitoring summary
   */
  displaySummary() {
    const metrics = this.currentMetrics;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 PIPELINE HEALTH MONITORING SUMMARY');
    console.log('='.repeat(60));

    console.log(`\n🚀 Pipeline Status:`);
    console.log(`  • Success Rate: ${metrics.pipeline.successRate.toFixed(1)}%`);
    console.log(`  • Total Runs: ${metrics.pipeline.totalRuns}`);
    console.log(`  • Failed Runs: ${metrics.pipeline.failedRuns}`);

    console.log(`\n🔍 Quality Metrics:`);
    console.log(`  • Lint Errors: ${metrics.quality.lintErrors}`);
    console.log(`  • Test Pass Rate: ${metrics.quality.testPassRate.toFixed(1)}%`);
    console.log(`  • Line Coverage: ${metrics.quality.coverage.lines.toFixed(1)}%`);
    console.log(`  • Branch Coverage: ${metrics.quality.coverage.branches.toFixed(1)}%`);

    console.log(`\n⚡ Performance:`);
    console.log(`  • Build Time: ${Math.round(metrics.performance.buildTime / 1000)}s`);
    console.log(`  • Test Time: ${Math.round(metrics.performance.testTime / 1000)}s`);
    console.log(`  • Slow Tests: ${metrics.performance.slowTests.length}`);
    console.log(`  • Flaky Tests: ${metrics.performance.flakyTests.length}`);

    if (metrics.alerts.length > 0) {
      console.log(`\n🚨 Active Alerts: ${metrics.alerts.length}`);
      metrics.alerts.forEach(alert => {
        const icon = alert.type === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} ${alert.category}: ${alert.message}`);
      });
    } else {
      console.log(`\n✅ No active alerts`);
    }

    console.log(`\n📊 Monitoring Artifacts:`);
    console.log(`  • Dashboard: ${MONITORING_CONFIG.dashboardPath}`);
    console.log(`  • History: ${MONITORING_CONFIG.reportPath}/history.json`);
    console.log(`  • Troubleshooting: monitoring/TROUBLESHOOTING.md`);

    console.log('\n' + '='.repeat(60));
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Pipeline Health Monitor

Usage:
  node scripts/pipeline-health-monitor.js [options]

Options:
  --help, -h     Show this help message
  --dashboard    Generate dashboard only
  --alerts       Check alerts only

This script monitors pipeline health by:
- Collecting quality, performance, and success metrics
- Generating alerts based on configurable thresholds
- Creating visual dashboard with trends
- Maintaining historical data with retention policy
- Providing troubleshooting documentation

Examples:
  node scripts/pipeline-health-monitor.js
  node scripts/pipeline-health-monitor.js --dashboard
  npm run pipeline:monitor
`);
    process.exit(0);
  }

  try {
    const monitor = new PipelineHealthMonitor();
    
    if (args.includes('--dashboard')) {
      await monitor.collectMetrics();
      monitor.generateDashboard();
      console.log('✅ Dashboard generated successfully');
    } else if (args.includes('--alerts')) {
      await monitor.collectMetrics();
      if (monitor.currentMetrics.alerts.length > 0) {
        console.log('🚨 Active alerts found:');
        monitor.currentMetrics.alerts.forEach(alert => {
          console.log(`  ${alert.type.toUpperCase()}: ${alert.message}`);
        });
        process.exit(1);
      } else {
        console.log('✅ No active alerts');
      }
    } else {
      const success = await monitor.run();
      process.exit(success ? 0 : 1);
    }
  } catch (error) {
    console.error('❌ Pipeline health monitoring failed:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});