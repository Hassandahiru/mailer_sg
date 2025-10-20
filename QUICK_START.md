# Quick Start Guide

Get the email service running in 5 minutes! ⚡

## 1️⃣ Start the Email Service

```bash
npm start
```

You should see:
```
🚀 Email Service is running!
📧 Port: 3000
```

## 2️⃣ Test It Works

```bash
curl http://localhost:3000/api/email/health
```

Expected response:
```json
{
  "success": true,
  "message": "Email service is running"
}
```

## 3️⃣ Get Available Templates

```bash
curl http://localhost:3000/api/email/templates \
  -H "X-API-Key: your_secret_api_key_1"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "templates": ["verification", "notification", "password-reset", "welcome"],
    "count": 4
  }
}
```

## 4️⃣ Send Your First Email

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_secret_api_key_1" \
  -d '{
    "to": "your.email@example.com",
    "subject": "Welcome!",
    "template": "welcome",
    "data": {
      "userName": "John Doe",
      "companyName": "Your Company",
      "welcomeMessage": "Thanks for joining!",
      "year": "2024"
    }
  }'
```

## 5️⃣ Integrate with Your App

### Node.js/Express Example

**Create email client:**
```javascript
// services/emailClient.js
import axios from 'axios';

const emailClient = axios.create({
  baseURL: 'http://localhost:3000/api/email',
  headers: {
    'X-API-Key': process.env.EMAIL_SERVICE_API_KEY,
  },
});

export const sendVerificationEmail = async (user, token) => {
  return emailClient.post('/send', {
    to: user.email,
    subject: 'Verify Your Email',
    template: 'verification',
    data: {
      userName: user.name,
      verificationUrl: `https://yourapp.com/verify?token=${token}`,
      companyName: 'Your Company',
      year: new Date().getFullYear().toString(),
    },
  });
};
```

**Use in your controller:**
```javascript
// controllers/authController.js
import { sendVerificationEmail } from '../services/emailClient.js';

export const register = async (req, res) => {
  // 1. Create user
  const user = await User.create(req.body);

  // 2. Send email (don't wait)
  sendVerificationEmail(user, user.verificationToken)
    .catch(err => console.error('Email failed:', err));

  // 3. Return immediately
  res.json({ success: true, message: 'Check your email!' });
};
```

## Configuration

### Email Service (.env)

Located at: `Emailer_SG/.env`

```env
# Server
PORT=3000
NODE_ENV=development

# SendPulse SMTP (Get from SendPulse dashboard)
SMTP_HOST=smtp-pulse.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_sendpulse_email@example.com
SMTP_PASSWORD=your_sendpulse_password

# Email From
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Service Name

# API Keys (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
API_KEYS=your_secret_api_key_1,your_secret_api_key_2

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests per window

# URLs
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

### Your App (.env)

Located at: `YourApp/.env`

```env
# Email Service Integration
EMAIL_SERVICE_URL=http://localhost:3000/api/email
EMAIL_SERVICE_API_KEY=your_secret_api_key_1

# Your App Config
APP_URL=http://localhost:5000
COMPANY_NAME=Your Company
SUPPORT_EMAIL=support@yourcompany.com
```

## Available Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/email/health` | GET | ❌ No | Health check |
| `/api/email/send` | POST | ✅ Yes | Send single email |
| `/api/email/send-bulk` | POST | ✅ Yes | Send bulk emails |
| `/api/email/templates` | GET | ✅ Yes | List templates |

## Available Templates

### 1. Verification
Email verification with code/link
```javascript
{
  template: 'verification',
  data: {
    userName: 'John',
    verificationUrl: 'https://...',
    verificationCode: '123456',
    expiresIn: '30',
    companyName: 'Your Company',
    year: '2024'
  }
}
```

### 2. Welcome
Welcome new users
```javascript
{
  template: 'welcome',
  data: {
    userName: 'John',
    companyName: 'Your Company',
    welcomeMessage: 'Welcome!',
    dashboardUrl: 'https://...',
    supportEmail: 'support@...',
    year: '2024'
  }
}
```

### 3. Password Reset
Password reset with security info
```javascript
{
  template: 'password-reset',
  data: {
    userName: 'John',
    resetUrl: 'https://...',
    expiresIn: '60',
    ipAddress: '127.0.0.1',
    companyName: 'Your Company',
    year: '2024'
  }
}
```

### 4. Notification
General notifications
```javascript
{
  template: 'notification',
  data: {
    userName: 'John',
    notificationTitle: 'Title',
    notificationType: 'success', // info, success, warning, error
    title: 'Title',
    message: 'Message',
    companyName: 'Your Company',
    year: '2024'
  }
}
```

## Real-World Example

See complete registration flow example:
```bash
cd example-app
node userRegistration.js
```

## Troubleshooting

### Service won't start
```bash
# Check if port 3000 is in use
lsof -ti:3000

# Kill process if needed
kill -9 $(lsof -ti:3000)
```

### SMTP not connecting
- Update SendPulse credentials in `.env`
- Verify SMTP port is not blocked
- Check SendPulse dashboard for SMTP status

### Authentication errors
- Verify API key matches between services
- Check `X-API-Key` header is set correctly
- Ensure API key doesn't have extra spaces

### Email not received
- Check spam folder
- Verify email address is correct
- Check SendPulse dashboard for delivery status
- Review email service logs

## Next Steps

- ✅ Read [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed integration examples
- ✅ Read [README.md](./README.md) for complete API documentation
- ✅ Read [EXAMPLES.md](./EXAMPLES.md) for code examples in 7+ languages
- ✅ Configure real SendPulse credentials
- ✅ Generate secure API keys for production

## Production Checklist

Before deploying to production:

- [ ] Configure real SendPulse SMTP credentials
- [ ] Generate secure API keys (use crypto.randomBytes)
- [ ] Use HTTPS for all communication
- [ ] Set up email queue system (Bull, RabbitMQ)
- [ ] Implement retry logic for failed emails
- [ ] Add monitoring and alerting
- [ ] Set up proper logging
- [ ] Configure rate limiting appropriately
- [ ] Test all email templates
- [ ] Set up email bounce handling

## Support

Need help? Check these resources:

- [Full API Documentation](./README.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)
- [Code Examples](./EXAMPLES.md)
- [Example App](./example-app/README.md)

---

Built with ❤️ using ES6, Express, SendPulse, and Handlebars
