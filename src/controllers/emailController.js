import emailService from '../services/emailService.js';
import templateService from '../services/templateService.js';
import logger from '../utils/logger.js';
import { EmailError, TemplateRenderError } from '../utils/errors.js';
import { errorMonitor } from '../utils/errorMonitor.js';

class EmailController {
  async sendEmail(req, res) {
    const startTime = Date.now();

    try {
      const { to, subject, template, html, text, data, attachments } = req.validatedData;

      let emailHtml = html;
      let emailText = text;

      // If template is provided, render it
      if (template) {
        try {
          emailHtml = await templateService.render(template, data || {});
        } catch (error) {
          throw new TemplateRenderError(error.message, {
            template,
            originalError: error.message,
          });
        }
      }

      // Send email
      const result = await emailService.sendEmail({
        to,
        subject,
        html: emailHtml,
        text: emailText,
        attachments,
      });

      const duration = Date.now() - startTime;

      logger.info('Email sent via API', {
        to,
        subject,
        template,
        messageId: result.messageId,
        duration: `${duration}ms`,
      });

      return res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        data: {
          messageId: result.messageId,
          recipients: Array.isArray(to) ? to : [to],
          accepted: result.accepted,
          rejected: result.rejected,
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Error sending email via API:', {
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
      });

      // If error is already an EmailError, return its structured response
      if (error instanceof EmailError) {
        return res.status(error.statusCode).json(error.toJSON());
      }

      // Generic error response
      return res.status(500).json({
        success: false,
        error: 'Failed to send email',
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
      });
    }
  }

  async sendBulkEmail(req, res) {
    const startTime = Date.now();

    try {
      const { emails } = req.validatedData;

      logger.info('Processing bulk email request', { count: emails.length });

      // Process all emails - render templates
      const processedEmails = await Promise.all(
        emails.map(async (email, index) => {
          try {
            let emailHtml = email.html;

            if (email.template) {
              emailHtml = await templateService.render(email.template, email.data || {});
            }

            return {
              to: email.to,
              subject: email.subject,
              html: emailHtml,
              text: email.text,
            };
          } catch (error) {
            logger.error(`Failed to process email ${index}`, {
              to: email.to,
              error: error.message,
            });
            throw new TemplateRenderError(`Email ${index}: ${error.message}`, {
              index,
              template: email.template,
            });
          }
        })
      );

      // Send bulk emails with retry handling
      const bulkResult = await emailService.sendBulkEmail(processedEmails);

      const duration = Date.now() - startTime;

      logger.info('Bulk email sent via API', {
        ...bulkResult.summary,
        duration: `${duration}ms`,
      });

      // Determine response status
      const { successful, failed, total } = bulkResult.summary;
      let status = 200;
      let message = 'Bulk email processing completed';

      if (failed === total) {
        status = 500;
        message = 'All bulk emails failed';
      } else if (failed > 0) {
        status = 207; // Multi-Status
        message = 'Bulk email partially completed';
      }

      return res.status(status).json({
        success: successful > 0,
        message,
        data: {
          summary: bulkResult.summary,
          results: bulkResult.results,
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Error sending bulk email via API:', {
        error: error.message,
        code: error.code,
        duration: `${duration}ms`,
      });

      if (error instanceof EmailError) {
        return res.status(error.statusCode).json(error.toJSON());
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to send bulk email',
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
      });
    }
  }

  async getTemplates(req, res) {
    try {
      const templates = await templateService.getAvailableTemplates();

      return res.status(200).json({
        success: true,
        data: {
          templates,
          count: templates.length,
        },
      });
    } catch (error) {
      logger.error('Error getting templates:', error);

      if (error instanceof EmailError) {
        return res.status(error.statusCode).json(error.toJSON());
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to get templates',
        message: error.message,
      });
    }
  }

  async healthCheck(req, res) {
    try {
      const smtpStatus = await emailService.verifyConnection();
      const healthMetrics = emailService.getHealthMetrics();

      const isHealthy = smtpStatus.success && healthMetrics.circuitBreaker.state === 'CLOSED';

      return res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        message: isHealthy ? 'Email service is running' : 'Email service is degraded',
        data: {
          smtp: smtpStatus,
          metrics: healthMetrics,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Health check failed:', error);

      if (error instanceof EmailError) {
        return res.status(error.statusCode).json(error.toJSON());
      }

      return res.status(500).json({
        success: false,
        error: 'Service health check failed',
        message: error.message,
      });
    }
  }

  // New endpoint: Get error statistics
  async getErrorStats(req, res) {
    try {
      const windowMs = parseInt(req.query.window) || 300000; // Default 5 minutes

      const stats = errorMonitor.getStats(windowMs);
      const topErrors = errorMonitor.getTopErrors(10, windowMs);
      const problematicRecipients = errorMonitor.getProblematicRecipients(10, windowMs);

      return res.status(200).json({
        success: true,
        data: {
          window: `${windowMs / 1000}s`,
          stats,
          topErrors,
          problematicRecipients,
        },
      });
    } catch (error) {
      logger.error('Error getting error stats:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to get error statistics',
        message: error.message,
      });
    }
  }

  // New endpoint: Reset circuit breaker (admin only)
  async resetCircuitBreaker(req, res) {
    try {
      emailService.resetCircuitBreaker();

      return res.status(200).json({
        success: true,
        message: 'Circuit breaker reset successfully',
      });
    } catch (error) {
      logger.error('Error resetting circuit breaker:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to reset circuit breaker',
        message: error.message,
      });
    }
  }
}

export default new EmailController();
