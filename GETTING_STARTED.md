# Getting Started with Robust Error Handling

## What Was Added

Your email service now has **enterprise-grade error handling** that automatically handles all failure scenarios.

---

## Quick Start

### 1. Files Added

✅ **[src/utils/errors.js](src/utils/errors.js)** - 25+ error types covering all scenarios
✅ **[src/utils/retryHandler.js](src/utils/retryHandler.js)** - Automatic retry with exponential backoff
✅ **[src/utils/errorMonitor.js](src/utils/errorMonitor.js)** - Error tracking and alerting
✅ **[ERROR_HANDLING.md](ERROR_HANDLING.md)** - Comprehensive documentation
✅ **[ERROR_HANDLING_QUICK_REFERENCE.md](ERROR_HANDLING_QUICK_REFERENCE.md)** - Quick reference guide
✅ **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Implementation details

### 2. Files Updated

✅ **[src/services/emailService.js](src/services/emailService.js)** - Enhanced with retry + circuit breaker
✅ **[src/controllers/emailController.js](src/controllers/emailController.js)** - Better error responses
✅ **[src/routes/emailRoutes.js](src/routes/emailRoutes.js)** - New monitoring endpoints

---

## What It Does

### Automatic Retry
Emails that fail due to temporary issues (network, timeout, rate limit) are **automatically retried** up to 3 times with exponential backoff.

```
Attempt 1 → Fails (timeout)
Wait 1 second
Attempt 2 → Fails (still timing out)
Wait 2 seconds
Attempt 3 → Success! ✅
```

### Circuit Breaker
If SMTP is down, the service **fails fast** instead of waiting:

```
5 consecutive failures → Circuit opens
All requests rejected for 60 seconds (no SMTP calls)
After 60s → Test if service recovered
If recovered → Resume normal operation
```

### Error Monitoring
All errors are **tracked and categorized**:

```
Last 5 minutes:
- Total errors: 42
- SMTP timeouts: 30 (transient - retried)
- Invalid emails: 10 (permanent - no retry)
- Config errors: 2 (critical - alert admin)
```

---

## How to Use It

### In Your SafeGuard Application

#### Example: User Registration (Recommended)

```javascript
import emailClient from './services/emailClient.js';

export const register = async (req, res) => {
  // 1. Create user first
  const user = await User.create({ email, password, name });
  const token = generateVerificationToken();

  // 2. Send email (non-blocking - don't wait)
  emailClient.sendVerificationEmail(user, token)
    .then(() => console.log(`Email sent to ${user.email}`))
    .catch(err => {
      // Email failed but user was created successfully
      console.error('Email failed:', err.code);
      // Could queue for retry or use alternative notification
    });

  // 3. Return immediately - don't block user registration
  return res.status(201).json({
    success: true,
    message: 'Registration successful! Check your email to verify.'
  });
};
```

**Why this pattern?**
- ✅ User registration succeeds even if email fails
- ✅ Email retried automatically if failure is temporary
- ✅ No waiting for email to send (faster response)
- ✅ Better user experience

#### Example: Handle Specific Errors

```javascript
try {
  await emailClient.sendVerificationEmail(user, token);
} catch (error) {
  // Error is already categorized and parsed
  switch (error.code) {
    case 'INVALID_EMAIL_ADDRESS':
      // Permanent error - mark email as invalid
      await User.update(user.id, { emailValid: false });
      break;

    case 'EMAIL_BLOCKED':
      // Email is blacklisted - add to suppression list
      await SuppressionList.add(user.email);
      break;

    case 'SMTP_AUTH_ERROR':
      // Critical - SMTP credentials invalid
      await alertAdmin('SMTP authentication failed! Check credentials.');
      break;

    case 'SMTP_TIMEOUT_ERROR':
    case 'NETWORK_ERROR':
      // Transient - already retried automatically
      // Could queue for later retry
      console.log('Email failed after 3 retries, will try again later');
      break;

    default:
      // Unknown error - log for investigation
      console.error('Unhandled email error:', error);
  }
}
```

---

## Testing

### 1. Start the Service

```bash
cd /Users/hassan/Desktop/Projects_DevFiles/Emailer_SG
npm start
```

Service will start on port 3000.

### 2. Check Health

```bash
curl http://localhost:3000/api/email/health
```

**What to check:**
- `smtp.success` should be `true`
- `circuitBreaker.state` should be `"CLOSED"`
- `successRate.successRatePercent` should be high

### 3. Test Sending Email

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_from_env" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "template": "welcome",
    "data": {
      "userName": "Test User",
      "companyName": "Test Company",
      "year": "2024"
    }
  }'
```

### 4. View Error Statistics

```bash
curl http://localhost:3000/api/email/stats/errors \
  -H "X-API-Key: your_api_key"
```

---

## New API Endpoints

### Error Statistics
```bash
GET /api/email/stats/errors
```

Returns:
- Total errors in last 5 minutes
- Errors by category and code
- Top 10 most common errors
- Problematic recipients

### Reset Circuit Breaker (Admin)
```bash
POST /api/email/admin/circuit-breaker/reset
```

Manually resets circuit breaker if stuck open.

---

## Error Types Cheat Sheet

| Error Code | Meaning | Retryable? |
|------------|---------|------------|
| `SMTP_CONNECTION_ERROR` | Can't connect to SMTP | ✅ Yes (automatic) |
| `SMTP_TIMEOUT_ERROR` | Connection timeout | ✅ Yes (automatic) |
| `SMTP_AUTH_ERROR` | Wrong credentials | ❌ No (alert admin) |
| `INVALID_EMAIL_ADDRESS` | Bad email format | ❌ No (mark invalid) |
| `EMAIL_BLOCKED` | Blacklisted email | ❌ No (suppress) |
| `TEMPLATE_NOT_FOUND` | Template missing | ❌ No (fix template) |
| `RATE_LIMIT_EXCEEDED` | Too many requests | ✅ Yes (automatic) |
| `NETWORK_ERROR` | Network issue | ✅ Yes (automatic) |

---

## Monitoring Checklist

### Daily
- [ ] Check health endpoint
- [ ] Verify SMTP connection status
- [ ] Check circuit breaker state (should be CLOSED)

### Weekly
- [ ] Review error statistics
- [ ] Check success rate (should be > 95%)
- [ ] Review top errors
- [ ] Clean up problematic recipients

### Monthly
- [ ] Review all error logs
- [ ] Update suppression list
- [ ] Check for patterns in failures

---

## Common Issues & Solutions

### Issue: Circuit breaker is OPEN
**Solution:**
1. Check SMTP credentials in `.env`
2. Verify SendPulse account status
3. Wait 60 seconds or reset manually:
   ```bash
   curl -X POST http://localhost:3000/api/email/admin/circuit-breaker/reset \
     -H "X-API-Key: your_key"
   ```

### Issue: High failure rate
**Solution:**
1. Check error stats to identify issue:
   ```bash
   curl http://localhost:3000/api/email/stats/errors \
     -H "X-API-Key: your_key"
   ```
2. Look at `topErrors` - what's failing most?
3. Address based on error code (see cheat sheet above)

### Issue: Emails not sending
**Solution:**
1. Check health endpoint - is SMTP connected?
2. Verify `.env` has correct SMTP credentials
3. Check SendPulse dashboard for blocks/issues
4. Review service logs for errors

---

## Configuration (Optional)

Default settings work great, but you can customize:

### Retry Settings
```javascript
// In src/services/emailService.js
this.retryHandler = new RetryHandler({
  maxRetries: 5,        // More retries (default: 3)
  initialDelay: 500,    // Faster first retry (default: 1000)
  maxDelay: 60000,      // Longer max wait (default: 30000)
});
```

### Circuit Breaker Settings
```javascript
// In src/services/emailService.js
this.circuitBreaker = new CircuitBreaker({
  failureThreshold: 10,  // More failures before opening (default: 5)
  successThreshold: 3,   // More successes to close (default: 2)
  timeout: 120000,       // Wait 2 min before retry (default: 60000)
});
```

---

## Documentation

### Full Guides
- **[ERROR_HANDLING.md](ERROR_HANDLING.md)** - Complete error handling guide with all details
- **[ERROR_HANDLING_QUICK_REFERENCE.md](ERROR_HANDLING_QUICK_REFERENCE.md)** - Quick reference card
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical implementation details
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview

### Integration Guides
- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - How to integrate with your app
- **[EXAMPLES.md](EXAMPLES.md)** - Code examples in multiple languages
- **[README.md](README.md)** - Main project documentation

---

## Key Benefits

### For Development
🔍 **Clear Error Messages** - Know exactly what went wrong
📊 **Detailed Logging** - Full context for debugging
🧪 **Easy Testing** - Structured error responses

### For Production
🛡️ **Resilience** - Automatic retry for transient failures
⚡ **Performance** - Fail fast with circuit breaker
🚨 **Alerting** - Automatic alerts for critical issues
📈 **Monitoring** - Real-time service health metrics

### For Users
✅ **Reliability** - Automatic retry increases success rate
🚀 **Speed** - Non-blocking email doesn't slow down app
💪 **Robustness** - Service works even when SMTP is degraded

---

## Next Steps

1. **Test it out** - Send test emails and see retry in action
2. **Integrate with your app** - Use non-blocking pattern in registration
3. **Set up monitoring** - Poll health endpoint every 5 minutes
4. **Review errors weekly** - Check error statistics to identify patterns
5. **Optional: Add external monitoring** - Integrate with Sentry, DataDog, etc.

---

## Need Help?

### Check Documentation
- Error codes → [ERROR_HANDLING_QUICK_REFERENCE.md](ERROR_HANDLING_QUICK_REFERENCE.md)
- Integration → [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- Architecture → [ARCHITECTURE.md](ARCHITECTURE.md)

### Debugging Steps
1. Check service health: `curl http://localhost:3000/api/email/health`
2. Review error stats: See [ERROR_HANDLING_QUICK_REFERENCE.md](ERROR_HANDLING_QUICK_REFERENCE.md)
3. Check logs: Service logs all errors with context
4. Test SMTP: Verify credentials in SendPulse dashboard

---

## Summary

You now have **production-ready error handling** that:

✅ Automatically retries failed emails (up to 3 times)
✅ Fails fast when service is down (circuit breaker)
✅ Tracks all errors with detailed statistics
✅ Alerts on critical issues
✅ Returns structured error responses
✅ Works even if SMTP is unavailable at startup

**Your SafeGuard application can now reliably send emails even when things go wrong!** 🚀

Start by testing the health endpoint and sending a test email. Everything is ready to go!
