/**
 * Error Monitoring and Alerting System
 * Tracks, aggregates, and alerts on email service errors
 */

import logger from './logger.js';
import { categorizeError, ErrorCategory } from './errors.js';

/**
 * Error Monitor - Tracks and aggregates errors
 */
export class ErrorMonitor {
  constructor() {
    this.errors = [];
    this.maxStoredErrors = 1000;
    this.stats = {
      total: 0,
      byCategory: {
        [ErrorCategory.TRANSIENT]: 0,
        [ErrorCategory.PERMANENT]: 0,
        [ErrorCategory.CONFIGURATION]: 0,
        [ErrorCategory.VALIDATION]: 0,
      },
      byErrorCode: {},
      byRecipient: {},
    };
    this.alertThresholds = {
      errorRate: 0.5, // 50% error rate
      errorCount: 100, // 100 errors in window
      windowMs: 300000, // 5 minutes
    };
  }

  /**
   * Record an error
   */
  recordError(error, context = {}) {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      name: error.name,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      category: categorizeError(error),
      recipient: context.to || context.recipient,
      template: context.template,
      context,
    };

    // Add to errors array
    this.errors.push(errorRecord);

    // Trim if exceeds max
    if (this.errors.length > this.maxStoredErrors) {
      this.errors.shift();
    }

    // Update statistics
    this.updateStats(errorRecord);

    // Log error
    logger.error('Email error recorded', {
      errorCode: errorRecord.code,
      category: errorRecord.category,
      recipient: errorRecord.recipient,
      template: errorRecord.template,
    });

    // Check for alerts
    this.checkAlerts();

    return errorRecord;
  }

  /**
   * Update error statistics
   */
  updateStats(errorRecord) {
    this.stats.total++;

    // By category
    if (errorRecord.category) {
      this.stats.byCategory[errorRecord.category] =
        (this.stats.byCategory[errorRecord.category] || 0) + 1;
    }

    // By error code
    if (errorRecord.code) {
      this.stats.byErrorCode[errorRecord.code] = (this.stats.byErrorCode[errorRecord.code] || 0) + 1;
    }

    // By recipient
    if (errorRecord.recipient) {
      this.stats.byRecipient[errorRecord.recipient] =
        (this.stats.byRecipient[errorRecord.recipient] || 0) + 1;
    }
  }

  /**
   * Get errors within time window
   */
  getRecentErrors(windowMs = this.alertThresholds.windowMs) {
    const cutoff = Date.now() - windowMs;
    return this.errors.filter(e => new Date(e.timestamp).getTime() > cutoff);
  }

  /**
   * Calculate error rate within window
   */
  getErrorRate(successCount, windowMs = this.alertThresholds.windowMs) {
    const recentErrors = this.getRecentErrors(windowMs);
    const totalOperations = successCount + recentErrors.length;
    return totalOperations > 0 ? recentErrors.length / totalOperations : 0;
  }

  /**
   * Check if alerts should be triggered
   */
  checkAlerts() {
    const recentErrors = this.getRecentErrors();

    // Check error count threshold
    if (recentErrors.length >= this.alertThresholds.errorCount) {
      this.triggerAlert('HIGH_ERROR_COUNT', {
        count: recentErrors.length,
        threshold: this.alertThresholds.errorCount,
        windowMs: this.alertThresholds.windowMs,
      });
    }

    // Check for configuration errors (critical)
    const configErrors = recentErrors.filter(
      e => e.category === ErrorCategory.CONFIGURATION
    );
    if (configErrors.length > 0) {
      this.triggerAlert('CONFIGURATION_ERROR', {
        count: configErrors.length,
        errors: configErrors.slice(0, 5), // First 5
      });
    }

    // Check for repeated errors to same recipient
    const recipientErrors = {};
    recentErrors.forEach(e => {
      if (e.recipient) {
        recipientErrors[e.recipient] = (recipientErrors[e.recipient] || 0) + 1;
      }
    });

    Object.entries(recipientErrors).forEach(([recipient, count]) => {
      if (count >= 5) {
        this.triggerAlert('REPEATED_RECIPIENT_FAILURE', {
          recipient,
          count,
        });
      }
    });
  }

  /**
   * Trigger an alert
   */
  triggerAlert(alertType, details) {
    logger.error(`🚨 ALERT: ${alertType}`, details);

    // In production, you would:
    // - Send to monitoring service (e.g., Sentry, DataDog)
    // - Send email/SMS to admin
    // - Post to Slack/Discord
    // - Create incident in PagerDuty

    // For now, just log prominently
    console.error('\n' + '='.repeat(80));
    console.error(`🚨 ALERT: ${alertType}`);
    console.error(JSON.stringify(details, null, 2));
    console.error('='.repeat(80) + '\n');
  }

  /**
   * Get error statistics
   */
  getStats(windowMs = null) {
    if (!windowMs) {
      return { ...this.stats };
    }

    const recentErrors = this.getRecentErrors(windowMs);
    const windowStats = {
      total: recentErrors.length,
      byCategory: {},
      byErrorCode: {},
      byRecipient: {},
    };

    recentErrors.forEach(error => {
      // By category
      if (error.category) {
        windowStats.byCategory[error.category] =
          (windowStats.byCategory[error.category] || 0) + 1;
      }

      // By error code
      if (error.code) {
        windowStats.byErrorCode[error.code] =
          (windowStats.byErrorCode[error.code] || 0) + 1;
      }

      // By recipient
      if (error.recipient) {
        windowStats.byRecipient[error.recipient] =
          (windowStats.byRecipient[error.recipient] || 0) + 1;
      }
    });

    return windowStats;
  }

  /**
   * Get top errors
   */
  getTopErrors(limit = 10, windowMs = null) {
    const errors = windowMs ? this.getRecentErrors(windowMs) : this.errors;

    const errorCounts = {};
    errors.forEach(error => {
      const key = `${error.code}:${error.message}`;
      if (!errorCounts[key]) {
        errorCounts[key] = {
          code: error.code,
          message: error.message,
          category: error.category,
          count: 0,
        };
      }
      errorCounts[key].count++;
    });

    return Object.values(errorCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get problematic recipients
   */
  getProblematicRecipients(limit = 10, windowMs = null) {
    const stats = this.getStats(windowMs);
    return Object.entries(stats.byRecipient)
      .map(([recipient, count]) => ({ recipient, errorCount: count }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, limit);
  }

  /**
   * Clear old errors
   */
  clearOldErrors(olderThanMs = 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - olderThanMs;
    const initialLength = this.errors.length;

    this.errors = this.errors.filter(e => new Date(e.timestamp).getTime() > cutoff);

    const removed = initialLength - this.errors.length;
    if (removed > 0) {
      logger.info(`Cleared ${removed} old errors from monitor`);
    }

    return removed;
  }

  /**
   * Reset statistics
   */
  reset() {
    this.errors = [];
    this.stats = {
      total: 0,
      byCategory: {
        [ErrorCategory.TRANSIENT]: 0,
        [ErrorCategory.PERMANENT]: 0,
        [ErrorCategory.CONFIGURATION]: 0,
        [ErrorCategory.VALIDATION]: 0,
      },
      byErrorCode: {},
      byRecipient: {},
    };
    logger.info('Error monitor reset');
  }

  /**
   * Export errors for analysis
   */
  exportErrors(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.errors, null, 2);
    }

    if (format === 'csv') {
      const headers = ['timestamp', 'name', 'code', 'category', 'recipient', 'message'];
      const rows = this.errors.map(e =>
        headers.map(h => JSON.stringify(e[h] || '')).join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    }

    throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Success Rate Tracker
 */
export class SuccessRateTracker {
  constructor(windowMs = 300000) {
    this.windowMs = windowMs;
    this.operations = [];
  }

  /**
   * Record operation result
   */
  record(success, context = {}) {
    this.operations.push({
      timestamp: Date.now(),
      success,
      context,
    });

    // Remove old operations
    const cutoff = Date.now() - this.windowMs;
    this.operations = this.operations.filter(op => op.timestamp > cutoff);
  }

  /**
   * Get success rate
   */
  getSuccessRate() {
    if (this.operations.length === 0) return 1.0;

    const successful = this.operations.filter(op => op.success).length;
    return successful / this.operations.length;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    const total = this.operations.length;
    const successful = this.operations.filter(op => op.success).length;
    const failed = total - successful;

    return {
      total,
      successful,
      failed,
      successRate: this.getSuccessRate(),
      successRatePercent: (this.getSuccessRate() * 100).toFixed(2) + '%',
    };
  }
}

// Singleton instances
export const errorMonitor = new ErrorMonitor();
export const successRateTracker = new SuccessRateTracker();

export default errorMonitor;
