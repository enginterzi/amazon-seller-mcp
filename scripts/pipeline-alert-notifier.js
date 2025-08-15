#!/usr/bin/env node

/**
 * Pipeline Alert Notification System
 * Sends notifications for pipeline health alerts
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

// Notification configuration
const NOTIFICATION_CONFIG = {
  alertsPath: 'monitoring/alerts',
  webhookUrl: process.env.PIPELINE_WEBHOOK_URL,
  slackToken: process.env.SLACK_BOT_TOKEN,
  slackChannel: process.env.SLACK_CHANNEL || '#pipeline-alerts',
  emailRecipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
  enableConsoleOutput: true,
  enableWebhook: false, // Set to true when webhook URL is configured
  enableSlack: false,   // Set to true when Slack token is configured
  enableEmail: false    // Set to true when email is configured
};

class PipelineAlertNotifier {
  constructor() {
    this.alerts = [];
  }

  /**
   * Load recent alerts from monitoring system
   */
  loadAlerts() {
    console.log('📥 Loading recent alerts...');
    
    if (!existsSync(NOTIFICATION_CONFIG.alertsPath)) {
      console.log('  ℹ️  No alerts directory found');
      return;
    }

    try {
      const alertFiles = readdirSync(NOTIFICATION_CONFIG.alertsPath)
        .filter(file => file.endsWith('.json'))
        .sort()
        .slice(-3); // Get last 3 days of alerts

      for (const file of alertFiles) {
        const filePath = join(NOTIFICATION_CONFIG.alertsPath, file);
        const alertData = JSON.parse(readFileSync(filePath, 'utf-8'));
        
        if (alertData.alerts && alertData.alerts.length > 0) {
          this.alerts.push({
            date: file.replace('alerts-', '').replace('.json', ''),
            timestamp: alertData.timestamp,
            alerts: alertData.alerts
          });
        }
      }

      console.log(`  ✅ Loaded ${this.alerts.length} alert sets`);
    } catch (error) {
      console.error('  ❌ Error loading alerts:', error.message);
    }
  }

  /**
   * Format alerts for notification
   */
  formatAlerts() {
    if (this.alerts.length === 0) {
      return {
        title: '✅ Pipeline Health: All Clear',
        message: 'No active alerts detected. Pipeline is healthy.',
        color: 'good',
        severity: 'info'
      };
    }

    const latestAlerts = this.alerts[this.alerts.length - 1];
    const errorAlerts = latestAlerts.alerts.filter(a => a.type === 'error');
    const warningAlerts = latestAlerts.alerts.filter(a => a.type === 'warning');

    const severity = errorAlerts.length > 0 ? 'error' : 'warning';
    const color = severity === 'error' ? 'danger' : 'warning';
    const icon = severity === 'error' ? '🚨' : '⚠️';

    let message = `${icon} Pipeline Health Alert - ${new Date(latestAlerts.timestamp).toLocaleString()}\\n\\n`;

    if (errorAlerts.length > 0) {
      message += `**Critical Issues (${errorAlerts.length}):**\\n`;
      errorAlerts.forEach(alert => {
        message += `• ${alert.message}\\n`;
      });
      message += '\\n';
    }

    if (warningAlerts.length > 0) {
      message += `**Warnings (${warningAlerts.length}):**\\n`;
      warningAlerts.forEach(alert => {
        message += `• ${alert.message}\\n`;
      });
      message += '\\n';
    }

    message += '**Recommended Actions:**\\n';
    if (errorAlerts.some(a => a.category === 'pipeline')) {
      message += '• Check recent commits for breaking changes\\n';
      message += '• Review CI logs for detailed error information\\n';
    }
    if (errorAlerts.some(a => a.category === 'quality') || warningAlerts.some(a => a.category === 'quality')) {
      message += '• Run `npm run lint -- --fix` to auto-fix lint errors\\n';
      message += '• Add tests to improve coverage\\n';
    }
    if (warningAlerts.some(a => a.category === 'performance')) {
      message += '• Optimize slow tests or increase timeout thresholds\\n';
      message += '• Review resource usage and cleanup\\n';
    }

    message += '\\n📊 View dashboard: `open monitoring/dashboard.html`';
    message += '\\n🔧 Troubleshooting: `cat monitoring/TROUBLESHOOTING.md`';

    return {
      title: `${icon} Pipeline Health Alert`,
      message,
      color,
      severity,
      alertCount: latestAlerts.alerts.length,
      errorCount: errorAlerts.length,
      warningCount: warningAlerts.length
    };
  }

  /**
   * Send console notification
   */
  sendConsoleNotification(notification) {
    if (!NOTIFICATION_CONFIG.enableConsoleOutput) return;

    console.log('\\n' + '='.repeat(80));
    console.log(notification.title);
    console.log('='.repeat(80));
    console.log(notification.message.replace(/\\\\n/g, '\\n'));
    console.log('='.repeat(80));
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(notification) {
    if (!NOTIFICATION_CONFIG.enableWebhook || !NOTIFICATION_CONFIG.webhookUrl) {
      return;
    }

    try {
      const payload = {
        text: notification.title,
        attachments: [{
          color: notification.color,
          text: notification.message,
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      // In a real implementation, you would use fetch or axios here
      console.log('🔗 Webhook notification would be sent to:', NOTIFICATION_CONFIG.webhookUrl);
      console.log('📤 Payload:', JSON.stringify(payload, null, 2));
      
    } catch (error) {
      console.error('❌ Webhook notification failed:', error.message);
    }
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(notification) {
    if (!NOTIFICATION_CONFIG.enableSlack || !NOTIFICATION_CONFIG.slackToken) {
      return;
    }

    try {
      const payload = {
        channel: NOTIFICATION_CONFIG.slackChannel,
        text: notification.title,
        attachments: [{
          color: notification.color,
          text: notification.message,
          footer: 'Pipeline Health Monitor',
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      // In a real implementation, you would use the Slack Web API here
      console.log('💬 Slack notification would be sent to:', NOTIFICATION_CONFIG.slackChannel);
      console.log('📤 Payload:', JSON.stringify(payload, null, 2));
      
    } catch (error) {
      console.error('❌ Slack notification failed:', error.message);
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(notification) {
    if (!NOTIFICATION_CONFIG.enableEmail || NOTIFICATION_CONFIG.emailRecipients.length === 0) {
      return;
    }

    try {
      const emailContent = {
        to: NOTIFICATION_CONFIG.emailRecipients,
        subject: notification.title,
        body: notification.message.replace(/\\\\n/g, '\\n'),
        priority: notification.severity === 'error' ? 'high' : 'normal'
      };

      // In a real implementation, you would use nodemailer or similar here
      console.log('📧 Email notification would be sent to:', NOTIFICATION_CONFIG.emailRecipients.join(', '));
      console.log('📤 Content:', JSON.stringify(emailContent, null, 2));
      
    } catch (error) {
      console.error('❌ Email notification failed:', error.message);
    }
  }

  /**
   * Send all configured notifications
   */
  async sendNotifications() {
    console.log('📢 Sending notifications...');
    
    const notification = this.formatAlerts();
    
    // Send to all configured channels
    this.sendConsoleNotification(notification);
    await this.sendWebhookNotification(notification);
    await this.sendSlackNotification(notification);
    await this.sendEmailNotification(notification);
    
    console.log('✅ Notifications sent');
    
    return notification;
  }

  /**
   * Run complete notification cycle
   */
  async run() {
    console.log('📢 Starting Pipeline Alert Notifications...');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);

    try {
      // Load recent alerts
      this.loadAlerts();
      
      // Send notifications
      const notification = await this.sendNotifications();
      
      // Return status for scripting
      return {
        success: true,
        hasAlerts: this.alerts.length > 0,
        severity: notification.severity,
        alertCount: notification.alertCount || 0
      };
      
    } catch (error) {
      console.error('❌ Alert notification failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Configuration helper
 */
function displayConfiguration() {
  console.log('⚙️  Notification Configuration:');
  console.log(`  • Console Output: ${NOTIFICATION_CONFIG.enableConsoleOutput ? '✅' : '❌'}`);
  console.log(`  • Webhook: ${NOTIFICATION_CONFIG.enableWebhook ? '✅' : '❌'} ${NOTIFICATION_CONFIG.webhookUrl ? `(${NOTIFICATION_CONFIG.webhookUrl})` : '(not configured)'}`);
  console.log(`  • Slack: ${NOTIFICATION_CONFIG.enableSlack ? '✅' : '❌'} ${NOTIFICATION_CONFIG.slackChannel ? `(${NOTIFICATION_CONFIG.slackChannel})` : '(not configured)'}`);
  console.log(`  • Email: ${NOTIFICATION_CONFIG.enableEmail ? '✅' : '❌'} ${NOTIFICATION_CONFIG.emailRecipients.length > 0 ? `(${NOTIFICATION_CONFIG.emailRecipients.length} recipients)` : '(not configured)'}`);
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Pipeline Alert Notifier

Usage:
  node scripts/pipeline-alert-notifier.js [options]

Options:
  --help, -h     Show this help message
  --config       Show current configuration
  --test         Send test notification

Environment Variables:
  PIPELINE_WEBHOOK_URL      Webhook URL for notifications
  SLACK_BOT_TOKEN          Slack bot token for Slack notifications
  SLACK_CHANNEL            Slack channel (default: #pipeline-alerts)
  ALERT_EMAIL_RECIPIENTS   Comma-separated email addresses

This script sends notifications for pipeline health alerts through:
- Console output (always enabled)
- Webhook notifications (when URL configured)
- Slack notifications (when token configured)
- Email notifications (when recipients configured)

Examples:
  node scripts/pipeline-alert-notifier.js
  node scripts/pipeline-alert-notifier.js --config
  npm run pipeline:notify
`);
    process.exit(0);
  }

  if (args.includes('--config')) {
    displayConfiguration();
    process.exit(0);
  }

  if (args.includes('--test')) {
    console.log('🧪 Sending test notification...');
    
    const notifier = new PipelineAlertNotifier();
    // Add a test alert
    notifier.alerts = [{
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      alerts: [{
        type: 'warning',
        category: 'test',
        message: 'This is a test notification from the pipeline alert system'
      }]
    }];
    
    await notifier.sendNotifications();
    process.exit(0);
  }

  try {
    displayConfiguration();
    
    const notifier = new PipelineAlertNotifier();
    const result = await notifier.run();
    
    if (result.success) {
      console.log(`\\n✅ Alert notification completed`);
      console.log(`   • Alerts found: ${result.hasAlerts ? 'Yes' : 'No'}`);
      if (result.hasAlerts) {
        console.log(`   • Severity: ${result.severity}`);
        console.log(`   • Alert count: ${result.alertCount}`);
      }
      
      // Exit with non-zero code if there are error-level alerts
      process.exit(result.severity === 'error' ? 1 : 0);
    } else {
      console.error(`\\n❌ Alert notification failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});