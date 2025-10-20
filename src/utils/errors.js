/**
 * Custom Error Classes for Email Service
 * Provides comprehensive error handling for all email failure scenarios
 */

// Base Email Error Class
export class EmailError extends Error {
  constructor(message, code, statusCode = 500, isOperational = true, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

// SMTP Connection Errors
export class SMTPConnectionError extends EmailError {
  constructor(message = 'Failed to connect to SMTP server', details = {}) {
    super(message, 'SMTP_CONNECTION_ERROR', 503, true, details);
  }
}

export class SMTPAuthenticationError extends EmailError {
  constructor(message = 'SMTP authentication failed', details = {}) {
    super(message, 'SMTP_AUTH_ERROR', 401, true, details);
  }
}

export class SMTPTimeoutError extends EmailError {
  constructor(message = 'SMTP connection timed out', details = {}) {
    super(message, 'SMTP_TIMEOUT_ERROR', 504, true, details);
  }
}

// Email Validation Errors
export class InvalidEmailAddressError extends EmailError {
  constructor(message = 'Invalid email address provided', details = {}) {
    super(message, 'INVALID_EMAIL_ADDRESS', 400, true, details);
  }
}

export class InvalidRecipientError extends EmailError {
  constructor(message = 'Invalid or rejected recipient', details = {}) {
    super(message, 'INVALID_RECIPIENT', 400, true, details);
  }
}

export class EmailAddressBlockedError extends EmailError {
  constructor(message = 'Email address is blocked or blacklisted', details = {}) {
    super(message, 'EMAIL_BLOCKED', 403, true, details);
  }
}

// Template Errors
export class TemplateNotFoundError extends EmailError {
  constructor(templateName, details = {}) {
    super(`Template '${templateName}' not found`, 'TEMPLATE_NOT_FOUND', 404, true, {
      templateName,
      ...details,
    });
  }
}

export class TemplateRenderError extends EmailError {
  constructor(message = 'Failed to render email template', details = {}) {
    super(message, 'TEMPLATE_RENDER_ERROR', 500, true, details);
  }
}

export class MissingTemplateDataError extends EmailError {
  constructor(missingFields = [], details = {}) {
    super(
      `Missing required template data: ${missingFields.join(', ')}`,
      'MISSING_TEMPLATE_DATA',
      400,
      true,
      { missingFields, ...details }
    );
  }
}

// Send Errors
export class EmailSendError extends EmailError {
  constructor(message = 'Failed to send email', details = {}) {
    super(message, 'EMAIL_SEND_ERROR', 500, true, details);
  }
}

export class EmailRejectedError extends EmailError {
  constructor(message = 'Email was rejected by the server', details = {}) {
    super(message, 'EMAIL_REJECTED', 400, true, details);
  }
}

export class EmailBouncedError extends EmailError {
  constructor(message = 'Email bounced', details = {}) {
    super(message, 'EMAIL_BOUNCED', 400, true, details);
  }
}

// Rate Limiting Errors
export class RateLimitExceededError extends EmailError {
  constructor(message = 'Rate limit exceeded', details = {}) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, true, details);
  }
}

export class QuotaExceededError extends EmailError {
  constructor(message = 'Email quota exceeded', details = {}) {
    super(message, 'QUOTA_EXCEEDED', 429, true, details);
  }
}

// Content Errors
export class InvalidContentError extends EmailError {
  constructor(message = 'Invalid email content', details = {}) {
    super(message, 'INVALID_CONTENT', 400, true, details);
  }
}

export class AttachmentError extends EmailError {
  constructor(message = 'Attachment processing failed', details = {}) {
    super(message, 'ATTACHMENT_ERROR', 400, true, details);
  }
}

export class ContentSizeExceededError extends EmailError {
  constructor(message = 'Email content size exceeded limit', details = {}) {
    super(message, 'CONTENT_SIZE_EXCEEDED', 413, true, details);
  }
}

// Network Errors
export class NetworkError extends EmailError {
  constructor(message = 'Network error occurred', details = {}) {
    super(message, 'NETWORK_ERROR', 503, true, details);
  }
}

export class DNSError extends EmailError {
  constructor(message = 'DNS resolution failed', details = {}) {
    super(message, 'DNS_ERROR', 503, true, details);
  }
}

// Configuration Errors
export class ConfigurationError extends EmailError {
  constructor(message = 'Email service configuration error', details = {}) {
    super(message, 'CONFIGURATION_ERROR', 500, false, details);
  }
}

export class MissingCredentialsError extends EmailError {
  constructor(message = 'SMTP credentials are missing', details = {}) {
    super(message, 'MISSING_CREDENTIALS', 500, false, details);
  }
}

// Spam/Security Errors
export class SpamDetectedError extends EmailError {
  constructor(message = 'Email flagged as spam', details = {}) {
    super(message, 'SPAM_DETECTED', 400, true, details);
  }
}

export class SuspiciousContentError extends EmailError {
  constructor(message = 'Email contains suspicious content', details = {}) {
    super(message, 'SUSPICIOUS_CONTENT', 400, true, details);
  }
}

// Bulk Email Errors
export class BulkEmailError extends EmailError {
  constructor(message = 'Bulk email operation failed', details = {}) {
    super(message, 'BULK_EMAIL_ERROR', 500, true, details);
  }
}

export class PartialBulkEmailError extends EmailError {
  constructor(successCount, failureCount, details = {}) {
    super(
      `Bulk email partially completed: ${successCount} succeeded, ${failureCount} failed`,
      'PARTIAL_BULK_EMAIL_ERROR',
      207,
      true,
      { successCount, failureCount, ...details }
    );
  }
}

/**
 * Error Parser - Converts nodemailer/SMTP errors to custom error classes
 */
export class ErrorParser {
  static parse(error, context = {}) {
    if (error instanceof EmailError) {
      return error;
    }

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';
    const responseCode = error.responseCode || 0;

    // SMTP Connection Errors
    if (
      errorCode === 'ECONNECTION' ||
      errorCode === 'ECONNREFUSED' ||
      errorMessage.includes('connection')
    ) {
      return new SMTPConnectionError(error.message, { originalError: error, ...context });
    }

    // Authentication Errors
    if (
      responseCode === 535 ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('invalid login')
    ) {
      return new SMTPAuthenticationError(error.message, { originalError: error, ...context });
    }

    // Timeout Errors
    if (errorCode === 'ETIMEDOUT' || errorMessage.includes('timeout')) {
      return new SMTPTimeoutError(error.message, { originalError: error, ...context });
    }

    // Invalid Email Address
    if (
      responseCode === 550 ||
      errorMessage.includes('invalid address') ||
      errorMessage.includes('mailbox not found')
    ) {
      return new InvalidEmailAddressError(error.message, { originalError: error, ...context });
    }

    // Rejected Emails
    if (responseCode === 554 || errorMessage.includes('rejected')) {
      return new EmailRejectedError(error.message, { originalError: error, ...context });
    }

    // Rate Limiting
    if (responseCode === 421 || errorMessage.includes('too many')) {
      return new RateLimitExceededError(error.message, { originalError: error, ...context });
    }

    // Quota Exceeded
    if (responseCode === 552 || errorMessage.includes('quota')) {
      return new QuotaExceededError(error.message, { originalError: error, ...context });
    }

    // Content Size
    if (responseCode === 552 || errorMessage.includes('message too large')) {
      return new ContentSizeExceededError(error.message, { originalError: error, ...context });
    }

    // Network Errors
    if (errorCode === 'ENETUNREACH' || errorCode === 'EHOSTUNREACH') {
      return new NetworkError(error.message, { originalError: error, ...context });
    }

    // DNS Errors
    if (errorCode === 'EDNS' || errorCode === 'ENOTFOUND') {
      return new DNSError(error.message, { originalError: error, ...context });
    }

    // Spam Detection
    if (responseCode === 554 && errorMessage.includes('spam')) {
      return new SpamDetectedError(error.message, { originalError: error, ...context });
    }

    // Default to generic EmailSendError
    return new EmailSendError(error.message || 'Unknown email error', {
      originalError: error,
      ...context,
    });
  }
}

/**
 * Error Categories for monitoring and alerting
 */
export const ErrorCategory = {
  TRANSIENT: 'transient', // Temporary errors that may succeed on retry
  PERMANENT: 'permanent', // Permanent errors that won't succeed on retry
  CONFIGURATION: 'configuration', // Configuration/setup errors
  VALIDATION: 'validation', // Input validation errors
};

/**
 * Categorize errors for retry logic
 */
export function categorizeError(error) {
  if (error instanceof SMTPTimeoutError) return ErrorCategory.TRANSIENT;
  if (error instanceof SMTPConnectionError) return ErrorCategory.TRANSIENT;
  if (error instanceof NetworkError) return ErrorCategory.TRANSIENT;
  if (error instanceof DNSError) return ErrorCategory.TRANSIENT;
  if (error instanceof RateLimitExceededError) return ErrorCategory.TRANSIENT;

  if (error instanceof InvalidEmailAddressError) return ErrorCategory.PERMANENT;
  if (error instanceof EmailRejectedError) return ErrorCategory.PERMANENT;
  if (error instanceof EmailBouncedError) return ErrorCategory.PERMANENT;
  if (error instanceof TemplateNotFoundError) return ErrorCategory.PERMANENT;
  if (error instanceof InvalidContentError) return ErrorCategory.PERMANENT;
  if (error instanceof SpamDetectedError) return ErrorCategory.PERMANENT;

  if (error instanceof ConfigurationError) return ErrorCategory.CONFIGURATION;
  if (error instanceof MissingCredentialsError) return ErrorCategory.CONFIGURATION;
  if (error instanceof SMTPAuthenticationError) return ErrorCategory.CONFIGURATION;

  if (error instanceof MissingTemplateDataError) return ErrorCategory.VALIDATION;
  if (error instanceof AttachmentError) return ErrorCategory.VALIDATION;

  return ErrorCategory.PERMANENT;
}

/**
 * Check if error is retryable
 */
export function isRetryable(error) {
  const category = categorizeError(error);
  return category === ErrorCategory.TRANSIENT;
}
