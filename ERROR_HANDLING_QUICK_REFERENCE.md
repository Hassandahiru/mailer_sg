# Error Handling Quick Reference

## Common Error Codes

| Code | Meaning | Retryable | Action |
|------|---------|-----------|--------|
| `SMTP_CONNECTION_ERROR` | Can't connect to SMTP | ✅ Yes | Automatic retry |
| `SMTP_AUTH_ERROR` | Wrong credentials | ❌ No | Alert admin |
| `SMTP_TIMEOUT_ERROR` | Connection timeout | ✅ Yes | Automatic retry |
| `INVALID_EMAIL_ADDRESS` | Bad email format | ❌ No | Mark as invalid |
| `INVALID_RECIPIENT` | Recipient rejected | ❌ No | Remove from list |
| `EMAIL_BLOCKED` | Blacklisted email | ❌ No | Add to suppression |
| `TEMPLATE_NOT_FOUND` | Template missing | ❌ No | Fix template name |
| `TEMPLATE_RENDER_ERROR` | Template failed | ❌ No | Check template data |
| `EMAIL_REJECTED` | Server rejected | ❌ No | Check content |
| `RATE_LIMIT_EXCEEDED` | Too many requests | ✅ Yes | Automatic backoff |
| `QUOTA_EXCEEDED` | Quota limit hit | ✅ Yes | Wait or upgrade plan |
| `NETWORK_ERROR` | Network issue | ✅ Yes | Automatic retry |

---

## Error Handling Patterns

### 1. Registration Flow (Recommended)
```javascript
// Don't block registration on email failure
export const register = async (req, res) => {
  const user = await User.create({ email, password });

  // Non-blocking email send
  emailClient.sendVerificationEmail(user, token)
    .catch(err => console.error('Email failed:', err.code));

  return res.status(201).json({ success: true });
};
```

### 2. Critical Email (Wait for Result)
```javascript
// Wait for email when it's critical
try {
  await emailClient.sendPasswordReset(user, token);
  return res.json({ success: true, message: 'Check your email' });
} catch (error) {
  return res.status(500).json({
    success: false,
    message: 'Failed to send reset email. Please try again.'
  });
}
```

### 3. Handle Specific Errors
```javascript
try {
  await emailClient.sendEmail(data);
} catch (error) {
  if (error.code === 'INVALID_EMAIL_ADDRESS') {
    await User.update(userId, { emailValid: false });
  } else if (error.code === 'EMAIL_BLOCKED') {
    await SuppressionList.add(email);
  } else if (error.code === 'SMTP_AUTH_ERROR') {
    await alertAdmin('SMTP credentials invalid!');
  }
  // All other errors already handled with retry
}
```

### 4. Bulk Emails with Error Handling
```javascript
const result = await emailClient.sendBulkEmail(emails);

// Check summary
console.log(`Success: ${result.summary.successful}/${result.summary.total}`);

// Handle failed emails
result.results.forEach((item, index) => {
  if (!item.success) {
    console.error(`Email ${index} failed:`, item.error);
    // Handle specific failure
  }
});
```

---

## Monitoring Checks

### Health Check
```bash
curl http://localhost:3000/api/email/health
```

**What to check:**
- `smtp.success` should be `true`
- `metrics.circuitBreaker.state` should be `"CLOSED"`
- `metrics.successRate.successRatePercent` should be > 95%

### Error Statistics
```bash
curl http://localhost:3000/api/email/stats/errors \
  -H "X-API-Key: your_key"
```

**What to watch:**
- High `stats.total` (> 100 in 5 min)
- `Configuration` errors (critical)
- Repeated failures to same recipient

### Reset Circuit Breaker (if needed)
```bash
curl -X POST http://localhost:3000/api/email/admin/circuit-breaker/reset \
  -H "X-API-Key: your_key"
```

---

## Common Issues & Solutions

### Issue: All emails failing
**Check:**
1. Health endpoint - is SMTP connected?
2. Error stats - what's the error code?
3. Circuit breaker state - is it OPEN?

**Solutions:**
- `SMTP_AUTH_ERROR` → Check .env credentials
- Circuit breaker OPEN → Wait 60s or reset manually
- High failure rate → Check SendPulse dashboard

### Issue: Some emails failing
**Check:**
- Error stats for top errors
- Problematic recipients list

**Solutions:**
- `INVALID_EMAIL_ADDRESS` → Validate emails before sending
- Specific recipients failing → Add to suppression list

### Issue: Slow email sending
**Check:**
- Success rate (should be > 95%)
- Top errors for rate limiting

**Solutions:**
- Rate limited → Reduce send rate
- Quota exceeded → Upgrade plan or wait

### Issue: Circuit breaker keeps opening
**Indicates:** Persistent SMTP issues

**Solutions:**
1. Check SMTP credentials
2. Verify SendPulse account status
3. Check network connectivity
4. Review SendPulse dashboard for blocks

---

## Configuration Quick Reference

### Retry Settings (Default)
```javascript
{
  maxRetries: 3,
  initialDelay: 1000,    // 1 second
  maxDelay: 30000,       // 30 seconds
  backoffMultiplier: 2
}
```

### Circuit Breaker Settings (Default)
```javascript
{
  failureThreshold: 5,   // Open after 5 failures
  successThreshold: 2,   // Close after 2 successes
  timeout: 60000         // Wait 60 seconds
}
```

### Bulk Settings (Default)
```javascript
{
  maxRetries: 2,
  concurrencyLimit: 5    // 5 emails at once
}
```

---

## Alert Thresholds

The system automatically alerts when:

| Alert Type | Threshold |
|------------|-----------|
| High error count | 100 errors in 5 minutes |
| Configuration error | Any config error |
| Repeated recipient failure | 5+ failures to same email |

---

## HTTP Status Codes

| Code | Meaning | Response Action |
|------|---------|----------------|
| 200 | Success | All good |
| 207 | Partial Success | Some bulk emails failed |
| 400 | Bad Request | Fix request data |
| 401 | Unauthorized | Check API key |
| 403 | Forbidden | Email blocked |
| 404 | Not Found | Template doesn't exist |
| 429 | Rate Limited | Slow down |
| 500 | Server Error | Check logs |
| 503 | Service Unavailable | SMTP down or circuit breaker open |
| 504 | Timeout | SMTP timeout |

---

## Testing Errors

### Test Invalid Email
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{"to":"invalid","subject":"Test","html":"<p>Test</p>"}'
```

### Test Missing Template
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_key" \
  -d '{"to":"test@test.com","subject":"Test","template":"fake"}'
```

---

## When to Alert Admin

| Error Code | Alert? | Priority |
|------------|--------|----------|
| `SMTP_AUTH_ERROR` | ✅ YES | 🔴 Critical |
| `SMTP_CONNECTION_ERROR` | Circuit breaker open | 🟡 Warning |
| `CONFIGURATION_ERROR` | ✅ YES | 🔴 Critical |
| `RATE_LIMIT_EXCEEDED` | If persistent | 🟡 Warning |
| `INVALID_EMAIL_ADDRESS` | No | 🟢 Info |

---

## Best Practices Checklist

- ✅ Never block user registration on email failure
- ✅ Always catch email errors in production
- ✅ Monitor health endpoint regularly (every 5 min)
- ✅ Set up alerts for circuit breaker opening
- ✅ Review error stats weekly
- ✅ Clean up invalid emails from database
- ✅ Maintain suppression list for blocked emails
- ✅ Have fallback notification method (SMS, push)

---

## Emergency Procedures

### Circuit Breaker Stuck Open
```bash
# 1. Check health
curl http://localhost:3000/api/email/health

# 2. If SMTP is actually working, reset manually
curl -X POST http://localhost:3000/api/email/admin/circuit-breaker/reset \
  -H "X-API-Key: your_key"
```

### SMTP Credentials Invalid
```bash
# 1. Update .env file with correct credentials
# 2. Restart service
npm start
```

### Service Degraded
```bash
# 1. Check error stats
curl http://localhost:3000/api/email/stats/errors \
  -H "X-API-Key: your_key"

# 2. Identify issue from top errors
# 3. Take appropriate action based on error code
```

---

For detailed information, see [ERROR_HANDLING.md](ERROR_HANDLING.md)
