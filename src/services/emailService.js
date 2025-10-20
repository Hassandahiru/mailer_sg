import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import {
  ErrorParser,
  SMTPConnectionError,
  SMTPAuthenticationError,
  ConfigurationError,
  MissingCredentialsError,
  InvalidEmailAddressError,
} from '../utils/errors.js';
import { RetryHandler, CircuitBreaker, BulkRetryHandler } from '../utils/retryHandler.js';
import { errorMonitor, successRateTracker } from '../utils/errorMonitor.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.retryHandler = new RetryHandler({
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    });
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
    });
    this.bulkRetryHandler = new BulkRetryHandler({
      maxRetries: 2,
      concurrencyLimit: 5,
    });
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Validate configuration
      this.validateConfig();

      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.auth.user,
          pass: config.smtp.auth.pass,
        },
        pool: true, // Use connection pool
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
      });

      logger.info('Email transporter initialized successfully', {
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
      });
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      throw error;
    }
  }

  validateConfig() {
    if (!config.smtp.host) {
      throw new ConfigurationError('SMTP host is not configured', {
        field: 'SMTP_HOST',
      });
    }

    if (!config.smtp.auth.user || !config.smtp.auth.pass) {
      throw new MissingCredentialsError('SMTP credentials are not configured', {
        hasUser: !!config.smtp.auth.user,
        hasPass: !!config.smtp.auth.pass,
      });
    }

    if (!config.email.from.email) {
      throw new ConfigurationError('FROM email is not configured', {
        field: 'FROM_EMAIL',
      });
    }
  }

  async verifyConnection() {
    try {
      await this.circuitBreaker.execute(
        async () => {
          await this.transporter.verify();
        },
        { operation: 'verifyConnection' }
      );

      logger.info('SMTP connection verified successfully');
      return { success: true, message: 'SMTP connection is ready' };
    } catch (error) {
      const parsedError = ErrorParser.parse(error, { operation: 'verifyConnection' });
      logger.error('SMTP connection verification failed:', {
        error: parsedError.message,
        code: parsedError.code,
      });
      return { success: false, message: parsedError.message, code: parsedError.code };
    }
  }

  validateEmailAddress(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new InvalidEmailAddressError(`Invalid email address: ${email}`, { email });
    }
  }

  async sendEmail({ to, subject, html, text, attachments = [] }) {
    const context = { to, subject, operation: 'sendEmail' };

    try {
      // Validate email address
      this.validateEmailAddress(to);

      // Execute with retry and circuit breaker
      const result = await this.circuitBreaker.execute(async () => {
        return await this.retryHandler.execute(async () => {
          const mailOptions = {
            from: `${config.email.from.name} <${config.email.from.email}>`,
            to,
            subject,
            html,
            text,
            attachments,
          };

          const info = await this.transporter.sendMail(mailOptions);

          return {
            success: true,
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected,
          };
        }, context);
      }, context);

      // Record success
      successRateTracker.record(true, context);

      logger.info(`Email sent successfully to ${to}`, {
        messageId: result.messageId,
        response: result.response,
      });

      return result;
    } catch (error) {
      // Parse and categorize error
      const parsedError = ErrorParser.parse(error, context);

      // Record error in monitor
      errorMonitor.recordError(parsedError, context);

      // Record failure
      successRateTracker.record(false, context);

      logger.error(`Failed to send email to ${to}:`, {
        error: parsedError.message,
        code: parsedError.code,
        category: parsedError.details?.category,
      });

      throw parsedError;
    }
  }

  async sendBulkEmail(emails) {
    logger.info(`Starting bulk email send`, { count: emails.length });

    const operations = emails.map((email, index) => ({
      fn: async () => {
        const result = await this.sendEmail(email);
        return { ...email, ...result, index };
      },
      context: {
        to: email.to,
        subject: email.subject,
        bulkIndex: index,
      },
    }));

    try {
      const bulkResult = await this.bulkRetryHandler.executeBulk(operations, {
        operation: 'sendBulkEmail',
      });

      logger.info('Bulk email send completed', bulkResult.summary);

      return {
        results: bulkResult.results,
        summary: bulkResult.summary,
      };
    } catch (error) {
      const parsedError = ErrorParser.parse(error, { operation: 'sendBulkEmail' });
      logger.error('Bulk email send failed:', {
        error: parsedError.message,
        code: parsedError.code,
      });
      throw parsedError;
    }
  }

  // Get service health metrics
  getHealthMetrics() {
    return {
      circuitBreaker: this.circuitBreaker.getState(),
      successRate: successRateTracker.getMetrics(),
      errorStats: errorMonitor.getStats(300000), // Last 5 minutes
      topErrors: errorMonitor.getTopErrors(5, 300000),
    };
  }

  // Reset circuit breaker (for admin/maintenance)
  resetCircuitBreaker() {
    this.circuitBreaker.reset();
    logger.info('Circuit breaker manually reset');
  }
}

export default new EmailService();
