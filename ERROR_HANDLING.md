# Email Service - Comprehensive Error Handling Guide

This document explains the robust error handling system implemented in the email service, which accounts for all email failure scenarios.

## Table of Contents

- [Overview](#overview)
- [Error Types](#error-types)
- [Error Handling Features](#error-handling-features)
- [Usage Examples](#usage-examples)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [API Error Responses](#api-error-responses)
- [Best Practices](#best-practices)

---

## Overview

The email service now includes a **comprehensive error handling system** that:

✅ **Categorizes all email failures** - SMTP, network, validation, template, etc.
✅ **Automatic retry with exponential backoff** - Retries transient errors intelligently
✅ **Circuit breaker pattern** - Prevents overwhelming a failing service
✅ **Error monitoring and alerting** - Tracks and aggregates errors for insights
✅ **Success rate tracking** - Monitors service health in real-time
✅ **Structured error responses** - Consistent API error format

---

## Error Types

### 1. SMTP Connection Errors

**SMTPConnectionError** - Failed to connect to SMTP server
```javascript
{
  "code": "SMTP_CONNECTION_ERROR",
  "statusCode": 503,
  "category": "transient", // Will retry
  "message": "Failed to connect to SMTP server"
}
```

**SMTPAuthenticationError** - SMTP authentication failed
```javascript
{
  "code": "SMTP_AUTH_ERROR",
  "statusCode": 401,
  "category": "configuration", // Won't retry - needs admin fix
  "message": "SMTP authentication failed"
}
```

**SMTPTimeoutError** - SMTP connection timed out
```javascript
{
  "code": "SMTP_TIMEOUT_ERROR",
  "statusCode": 504,
  "category": "transient",
  "message": "SMTP connection timed out"
}
```

### 2. Email Validation Errors

**InvalidEmailAddressError** - Invalid email format
```javascript
{
  "code": "INVALID_EMAIL_ADDRESS",
  "statusCode": 400,
  "category": "permanent",
  "message": "Invalid email address: invalid@email"
}
```

**InvalidRecipientError** - Recipient rejected by server
```javascript
{
  "code": "INVALID_RECIPIENT",
  "statusCode": 400,
  "category": "permanent",
  "message": "Invalid or rejected recipient"
}
```

**EmailAddressBlockedError** - Email is blacklisted
```javascript
{
  "code": "EMAIL_BLOCKED",
  "statusCode": 403,
  "category": "permanent",
  "message": "Email address is blocked or blacklisted"
}
```

### 3. Template Errors

**TemplateNotFoundError** - Template doesn't exist
```javascript
{
  "code": "TEMPLATE_NOT_FOUND",
  "statusCode": 404,
  "category": "permanent",
  "message": "Template 'verification' not found"
}
```

**TemplateRenderError** - Failed to render template
```javascript
{
  "code": "TEMPLATE_RENDER_ERROR",
  "statusCode": 500,
  "category": "permanent",
  "message": "Failed to render email template"
}
```

**MissingTemplateDataError** - Required template data missing
```javascript
{
  "code": "MISSING_TEMPLATE_DATA",
  "statusCode": 400,
  "category": "validation",
  "message": "Missing required template data: userName, verificationUrl"
}
```

### 4. Send Errors

**EmailSendError** - Generic send failure
**EmailRejectedError** - Email rejected by server
**EmailBouncedError** - Email bounced

### 5. Rate Limiting Errors

**RateLimitExceededError** - Too many requests
```javascript
{
  "code": "RATE_LIMIT_EXCEEDED",
  "statusCode": 429,
  "category": "transient",
  "message": "Rate limit exceeded"
}
```

**QuotaExceededError** - Email quota exceeded
```javascript
{
  "code": "QUOTA_EXCEEDED",
  "statusCode": 429,
  "category": "transient",
  "message": "Email quota exceeded"
}
```

### 6. Content Errors

**InvalidContentError** - Invalid email content
**AttachmentError** - Attachment processing failed
**ContentSizeExceededError** - Email too large

### 7. Network Errors

**NetworkError** - Network issue
**DNSError** - DNS resolution failed

### 8. Configuration Errors

**ConfigurationError** - Service misconfigured
**MissingCredentialsError** - SMTP credentials missing

### 9. Security Errors

**SpamDetectedError** - Email flagged as spam
**SuspiciousContentError** - Suspicious content detected

---

## Error Handling Features

### 1. Automatic Retry with Exponential Backoff

The service automatically retries **transient errors** with exponential backoff:

```javascript
// Default retry configuration
{
  maxRetries: 3,
  initialDelay: 1000,      // 1 second
  maxDelay: 30000,         // 30 seconds
  backoffMultiplier: 2,    // 2x each time
  jitter: true             // Add randomness
}
```

**Retry Schedule:**
- Attempt 1: Immediate
- Attempt 2: ~1 second later
- Attempt 3: ~2 seconds later
- Attempt 4: ~4 seconds later

**Retryable Errors (Transient):**
- SMTP connection failures
- Network errors
- Timeout errors
- Rate limit errors
- DNS errors

**Non-Retryable Errors (Permanent):**
- Invalid email addresses
- Template not found
- Configuration errors
- Spam detection
- Authentication errors

### 2. Circuit Breaker Pattern

Prevents overwhelming a failing SMTP service:

```javascript
// Circuit Breaker States
CLOSED   → Normal operation
OPEN     → Too many failures, reject requests immediately
HALF_OPEN → Testing if service recovered
```

**Configuration:**
```javascript
{
  failureThreshold: 5,    // Open after 5 failures
  successThreshold: 2,    // Close after 2 successes
  timeout: 60000          // Try again after 60 seconds
}
```

**How it works:**
1. After 5 consecutive failures → Circuit opens
2. All requests fail fast for 60 seconds (no SMTP calls)
3. After 60 seconds → Circuit enters half-open state
4. If next 2 requests succeed → Circuit closes (normal operation)
5. If any request fails → Circuit opens again

### 3. Error Monitoring and Tracking

All errors are tracked and aggregated:

```javascript
// Error statistics tracked
{
  total: 42,
  byCategory: {
    transient: 30,
    permanent: 10,
    configuration: 2
  },
  byErrorCode: {
    "SMTP_TIMEOUT_ERROR": 25,
    "INVALID_EMAIL_ADDRESS": 10,
    "SMTP_AUTH_ERROR": 2
  },
  byRecipient: {
    "user@example.com": 5,
    "test@test.com": 3
  }
}
```

### 4. Success Rate Tracking

Monitors service health in real-time:

```javascript
{
  total: 100,
  successful: 95,
  failed: 5,
  successRate: 0.95,
  successRatePercent: "95.00%"
}
```

### 5. Alerting System

Automatically triggers alerts for:

- **HIGH_ERROR_COUNT** - Too many errors in time window
- **CONFIGURATION_ERROR** - Critical config issues
- **REPEATED_RECIPIENT_FAILURE** - Same recipient failing repeatedly

---

## Usage Examples

### Example 1: Sending Email with Error Handling

```javascript
import emailClient from '../services/emailClient.js';

async function sendVerificationEmail(user, token) {
  try {
    const result = await emailClient.sendVerificationEmail(user, token);
    console.log('Email sent:', result.messageId);
  } catch (error) {
    // Error is already parsed and categorized
    console.error('Failed to send email:', {
      code: error.code,
      message: error.message,
      category: error.details?.category,
      retryable: error.details?.retryable
    });

    // Handle based on error type
    if (error.code === 'INVALID_EMAIL_ADDRESS') {
      // Update user record - invalid email
      await User.update(user.id, { emailValid: false });
    } else if (error.code === 'SMTP_CONNECTION_ERROR') {
      // Transient error - might succeed later
      console.log('Will retry automatically');
    } else if (error.code === 'SMTP_AUTH_ERROR') {
      // Configuration issue - alert admin
      alertAdmin('SMTP authentication failed - check credentials');
    }
  }
}
```

### Example 2: Bulk Email with Error Handling

```javascript
async function sendBulkWelcomeEmails(users) {
  const emails = users.map(user => ({
    to: user.email,
    subject: 'Welcome!',
    template: 'welcome',
    data: { userName: user.name }
  }));

  try {
    const response = await axios.post('/api/email/send-bulk',
      { emails },
      { headers: { 'X-API-Key': API_KEY } }
    );

    console.log('Bulk send summary:', response.data.summary);
    // {
    //   total: 100,
    //   successful: 95,
    //   failed: 5,
    //   successRate: "95.00%"
    // }

    // Process results
    response.data.results.forEach((result, index) => {
      if (result.success) {
        console.log(`Email ${index} sent:`, result.messageId);
      } else {
        console.error(`Email ${index} failed:`, result.error);
        // Handle failed email for specific user
      }
    });

  } catch (error) {
    console.error('Bulk send failed:', error.response?.data);
  }
}
```

### Example 3: Monitoring Service Health

```javascript
// Check health endpoint
const health = await axios.get('/api/email/health');

console.log('Service health:', health.data);
// {
//   success: true,
//   message: "Email service is running",
//   data: {
//     smtp: { success: true, message: "SMTP connection is ready" },
//     metrics: {
//       circuitBreaker: { state: "CLOSED", isOpen: false },
//       successRate: { successRatePercent: "98.50%" },
//       errorStats: { total: 5, byCategory: {...} },
//       topErrors: [...]
//     }
//   }
// }

// If degraded (circuit breaker open):
// {
//   success: false,
//   message: "Email service is degraded",
//   statusCode: 503
// }
```

### Example 4: Viewing Error Statistics

```javascript
// Get error stats for last 5 minutes (default)
const stats = await axios.get('/api/email/stats/errors', {
  headers: { 'X-API-Key': API_KEY }
});

console.log('Error statistics:', stats.data);
// {
//   window: "300s",
//   stats: {
//     total: 42,
//     byCategory: { transient: 30, permanent: 10, configuration: 2 },
//     byErrorCode: { "SMTP_TIMEOUT_ERROR": 25, ... }
//   },
//   topErrors: [
//     { code: "SMTP_TIMEOUT_ERROR", count: 25, category: "transient" },
//     { code: "INVALID_EMAIL_ADDRESS", count: 10, category: "permanent" }
//   ],
//   problematicRecipients: [
//     { recipient: "bad@email.com", errorCount: 5 }
//   ]
// }
```

### Example 5: Manual Circuit Breaker Reset (Admin)

```javascript
// If you need to manually reset the circuit breaker
const response = await axios.post('/api/email/admin/circuit-breaker/reset', {}, {
  headers: { 'X-API-Key': API_KEY }
});

console.log(response.data);
// { success: true, message: "Circuit breaker reset successfully" }
```

---

## Monitoring and Alerting

### Real-Time Monitoring

The service continuously monitors:

1. **Error Rate** - Percentage of failed operations
2. **Circuit Breaker State** - CLOSED, OPEN, or HALF_OPEN
3. **Success Rate** - Percentage of successful sends
4. **Top Errors** - Most frequent error types
5. **Problematic Recipients** - Recipients with repeated failures

### Automatic Alerts

Alerts are triggered when:

```javascript
// Alert: High error count
{
  type: "HIGH_ERROR_COUNT",
  count: 100,
  threshold: 100,
  windowMs: 300000  // 5 minutes
}

// Alert: Configuration error (critical)
{
  type: "CONFIGURATION_ERROR",
  count: 1,
  errors: [{ code: "SMTP_AUTH_ERROR", message: "..." }]
}

// Alert: Repeated recipient failure
{
  type: "REPEATED_RECIPIENT_FAILURE",
  recipient: "user@example.com",
  count: 5
}
```

### Integration with External Services

You can extend the alerting system to integrate with:

- **Sentry** - Error tracking and monitoring
- **DataDog** - APM and metrics
- **Slack/Discord** - Team notifications
- **PagerDuty** - Incident management
- **Email/SMS** - Critical alerts to admins

Edit [`src/utils/errorMonitor.js`](src/utils/errorMonitor.js) and update the `triggerAlert()` method:

```javascript
triggerAlert(alertType, details) {
  logger.error(`🚨 ALERT: ${alertType}`, details);

  // Send to Sentry
  Sentry.captureException(new Error(alertType), { extra: details });

  // Send to Slack
  slackClient.send({
    channel: '#alerts',
    text: `🚨 ${alertType}`,
    attachments: [{ text: JSON.stringify(details, null, 2) }]
  });

  // Critical alerts: Page on-call engineer
  if (alertType === 'CONFIGURATION_ERROR') {
    pagerDuty.trigger({ description: alertType, details });
  }
}
```

---

## API Error Responses

All errors follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "messageId": "<abc123@smtp-pulse.com>",
    "recipients": ["user@example.com"],
    "accepted": ["user@example.com"],
    "rejected": []
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "InvalidEmailAddressError",
  "code": "INVALID_EMAIL_ADDRESS",
  "message": "Invalid email address: invalid@email",
  "statusCode": 400,
  "details": {
    "email": "invalid@email"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### HTTP Status Codes

- **200** - Success
- **207** - Multi-Status (bulk operation partially succeeded)
- **400** - Bad Request (validation error)
- **401** - Unauthorized (missing API key)
- **403** - Forbidden (invalid API key or blocked email)
- **404** - Not Found (template not found)
- **413** - Payload Too Large (email too big)
- **429** - Too Many Requests (rate limit or quota exceeded)
- **500** - Internal Server Error (unexpected error)
- **503** - Service Unavailable (SMTP connection failed or circuit breaker open)
- **504** - Gateway Timeout (SMTP timeout)

---

## Best Practices

### 1. Always Handle Errors Gracefully

```javascript
// ✅ Good - Don't fail user registration if email fails
try {
  await emailClient.sendVerificationEmail(user, token);
} catch (error) {
  console.error('Email failed but user was created:', error);
  // Maybe queue for retry or use fallback notification
}

return res.status(201).json({ success: true, message: 'User registered' });
```

```javascript
// ❌ Bad - Failing registration because email failed
await emailClient.sendVerificationEmail(user, token);
return res.status(201).json({ success: true });
```

### 2. Monitor Error Rates

```javascript
// Set up regular health checks
setInterval(async () => {
  const health = await emailService.getHealthMetrics();

  if (health.successRate.successRate < 0.95) {
    alertAdmin('Email success rate dropped below 95%', health);
  }

  if (health.circuitBreaker.state === 'OPEN') {
    alertAdmin('Email circuit breaker is OPEN', health);
  }
}, 60000); // Check every minute
```

### 3. Handle Specific Error Types

```javascript
try {
  await sendEmail(email);
} catch (error) {
  switch (error.code) {
    case 'INVALID_EMAIL_ADDRESS':
      // Mark email as invalid in database
      await User.update(userId, { emailValid: false });
      break;

    case 'EMAIL_BLOCKED':
      // Add to suppression list
      await SuppressionList.add(email);
      break;

    case 'SMTP_AUTH_ERROR':
      // Critical - alert admin immediately
      await alertAdmin('SMTP credentials invalid!');
      break;

    case 'SMTP_TIMEOUT_ERROR':
    case 'SMTP_CONNECTION_ERROR':
      // Transient - already retried, queue for later
      await emailQueue.add({ email, retryAfter: 300000 });
      break;

    default:
      // Log for investigation
      logger.error('Unhandled email error:', error);
  }
}
```

### 4. Use Bulk Operations for Multiple Emails

```javascript
// ✅ Good - Use bulk endpoint with built-in retry
await emailService.sendBulkEmail(emails);

// ❌ Bad - Sending individually without retry coordination
for (const email of emails) {
  await emailService.sendEmail(email);
}
```

### 5. Implement Fallback Mechanisms

```javascript
async function notifyUser(user, message) {
  try {
    // Try primary channel: Email
    await emailService.sendNotification(user.email, message);
  } catch (error) {
    logger.error('Email failed, trying SMS fallback', error);

    try {
      // Fallback channel: SMS
      await smsService.send(user.phone, message);
    } catch (smsError) {
      logger.error('SMS also failed, trying push notification', smsError);

      // Last resort: Push notification
      await pushService.send(user.deviceId, message);
    }
  }
}
```

### 6. Regular Maintenance

```javascript
// Clean up old error records daily
setInterval(() => {
  errorMonitor.clearOldErrors(24 * 60 * 60 * 1000); // Older than 24 hours
}, 24 * 60 * 60 * 1000);

// Export error logs weekly for analysis
setInterval(async () => {
  const csv = errorMonitor.exportErrors('csv');
  await saveToStorage('error-logs-weekly.csv', csv);
}, 7 * 24 * 60 * 60 * 1000);
```

---

## Testing Error Scenarios

### Test Invalid Email
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "to": "invalid-email",
    "subject": "Test",
    "html": "<p>Test</p>"
  }'

# Response:
# {
#   "success": false,
#   "error": "InvalidEmailAddressError",
#   "code": "INVALID_EMAIL_ADDRESS",
#   "statusCode": 400
# }
```

### Test Template Not Found
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "to": "user@example.com",
    "subject": "Test",
    "template": "nonexistent"
  }'

# Response:
# {
#   "success": false,
#   "error": "TemplateNotFoundError",
#   "code": "TEMPLATE_NOT_FOUND",
#   "statusCode": 404
# }
```

---

## Summary

The email service now provides **enterprise-grade error handling** with:

✅ **25+ specific error types** covering all failure scenarios
✅ **Automatic retry** with exponential backoff for transient errors
✅ **Circuit breaker** to protect against cascading failures
✅ **Real-time monitoring** with error tracking and alerting
✅ **Success rate tracking** for service health insights
✅ **Structured error responses** for consistent API behavior

This ensures your application can handle email failures gracefully and provides visibility into service health for proactive issue resolution.

For more information, see:
- [Error Classes](src/utils/errors.js)
- [Retry Handler](src/utils/retryHandler.js)
- [Error Monitor](src/utils/errorMonitor.js)
- [Email Service](src/services/emailService.js)
