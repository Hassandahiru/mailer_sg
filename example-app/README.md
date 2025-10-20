# Example Application - User Registration with Email Service

This example shows exactly how YOUR application would integrate with the email service.

## How It Works

```
Your App (Port 5000)          Email Service (Port 3000)          SendPulse
     │                               │                               │
     │  User registers              │                               │
     │  ─────────────>              │                               │
     │                              │                               │
     │  Save to database            │                               │
     │                              │                               │
     │  HTTP POST ────────────────> │                               │
     │  /api/email/send             │                               │
     │  {template: "verification"}  │                               │
     │                              │  Render template              │
     │                              │                               │
     │                              │  Send email ─────────────────>│
     │                              │                               │
     │  <──────── Response          │  <──────── SMTP ACK           │
     │  {success: true}             │                               │
     │                              │                               │
     │  Return to user              │                               │
     │  <─────────────              │                               │
```

## Running the Example

### 1. Start the Email Service (Terminal 1)

```bash
cd /path/to/Emailer_SG
npm start
```

You should see:
```
🚀 Email Service is running!
📧 Port: 3000
```

### 2. Test the Registration Flow (Terminal 2)

```bash
cd /path/to/Emailer_SG/example-app
node userRegistration.js
```

## What Happens

1. **User registers** with name, email, password
2. **Your app**:
   - Validates input
   - Hashes password
   - Saves user to database
   - Generates verification token
3. **Email service call** (HTTP POST):
   ```javascript
   POST http://localhost:3000/api/email/send
   Headers: X-API-Key: your_secret_api_key_1
   Body: {
     to: "user@example.com",
     subject: "Verify Your Email",
     template: "verification",
     data: { userName, verificationUrl, ... }
   }
   ```
4. **Email service**:
   - Authenticates API key
   - Loads verification template
   - Renders with user data
   - Sends via SendPulse SMTP
5. **User receives** beautiful verification email
6. **User clicks** verification link
7. **Your app** verifies email and sends welcome email

## Key Points

### ✅ Do's

- **Use environment variables** for API keys
- **Don't block** user registration waiting for email
- **Handle errors** gracefully - log but don't fail
- **Use async/await** with proper error handling
- **Validate data** before sending to email service

### ❌ Don'ts

- **Don't hardcode** API keys or URLs
- **Don't await** email sending in critical path
- **Don't expose** email service API key to frontend
- **Don't retry** indefinitely without backoff

## Integration in Your Real App

### Step 1: Create Email Client

Create `src/services/emailClient.js`:

```javascript
import axios from 'axios';

class EmailClient {
  constructor() {
    this.baseURL = process.env.EMAIL_SERVICE_URL;
    this.apiKey = process.env.EMAIL_SERVICE_API_KEY;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: { 'X-API-Key': this.apiKey },
      timeout: 10000,
    });
  }

  async sendVerificationEmail(user, token) {
    return this.client.post('/send', {
      to: user.email,
      subject: 'Verify Your Email',
      template: 'verification',
      data: {
        userName: user.name,
        verificationUrl: `${process.env.APP_URL}/verify?token=${token}`,
        companyName: 'Your Company',
        year: new Date().getFullYear().toString(),
      },
    });
  }
}

export default new EmailClient();
```

### Step 2: Use in Registration Controller

```javascript
import emailClient from '../services/emailClient.js';

export const register = async (req, res) => {
  // 1. Save user to database
  const user = await User.create({ ...userData });

  // 2. Send verification email (non-blocking)
  emailClient.sendVerificationEmail(user, token)
    .catch(err => console.error('Email failed:', err));

  // 3. Return immediately
  return res.json({ success: true, message: 'Check your email!' });
};
```

### Step 3: Add Environment Variables

Add to your `.env`:

```env
EMAIL_SERVICE_URL=http://localhost:3000/api/email
EMAIL_SERVICE_API_KEY=your_secret_api_key_1
APP_URL=http://localhost:5000
COMPANY_NAME=Your Company
```

## Testing

### Test with cURL

```bash
# Start email service
npm start

# In another terminal, test sending email
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_secret_api_key_1" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "template": "verification",
    "data": {
      "userName": "Test User",
      "verificationUrl": "http://example.com/verify",
      "companyName": "Test Company",
      "year": "2024"
    }
  }'
```

### Test with Node.js

Run the example:
```bash
node userRegistration.js
```

## Common Issues

### Email Service Not Running
```bash
# Check if service is running
curl http://localhost:3000/api/email/health
```

### Authentication Failed
- Check API key in `.env` matches
- Verify `X-API-Key` header is set correctly

### Template Not Found
```bash
# List available templates
curl http://localhost:3000/api/email/templates \
  -H "X-API-Key: your_secret_api_key_1"
```

### SMTP Not Connected
- Update SendPulse credentials in email service `.env`
- Verify SMTP settings are correct

## Production Checklist

- [ ] Use real SendPulse credentials
- [ ] Store API keys securely (not in code)
- [ ] Use HTTPS for email service in production
- [ ] Implement retry logic for failed emails
- [ ] Add email queue system (Bull, RabbitMQ)
- [ ] Monitor email sending success rate
- [ ] Log all email attempts
- [ ] Handle bounced emails
- [ ] Implement rate limiting
- [ ] Add email templates for all scenarios

## Support

For more examples, see [INTEGRATION_GUIDE.md](../INTEGRATION_GUIDE.md)
