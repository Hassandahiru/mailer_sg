# Project Summary: Email Service with SendPulse

## Overview

This is a **production-ready email notification microservice** built with **ES6 JavaScript** that provides a REST API for sending emails via SendPulse SMTP. Any application can integrate with it to send transactional emails (verification, welcome, password reset, notifications) without implementing email logic themselves.

## What Problem Does It Solve?

### Before (Without Email Service)

Every application needs to:
- ❌ Implement SMTP configuration
- ❌ Create and maintain email templates
- ❌ Handle email delivery errors
- ❌ Manage email rate limiting
- ❌ Duplicate email logic across projects

### After (With Email Service)

- ✅ Single centralized email service
- ✅ One SMTP configuration for all apps
- ✅ Reusable, consistent email templates
- ✅ Centralized error handling and logging
- ✅ Simple REST API integration
- ✅ Just make an HTTP request to send email!

## How It Works

```
Your App                    Email Service                 SendPulse
  │                              │                             │
  │  User registers              │                             │
  │  ─────────────►              │                             │
  │                              │                             │
  │  HTTP POST ──────────────►  │                             │
  │  /api/email/send             │                             │
  │  {                           │                             │
  │    to: "user@email.com",     │                             │
  │    template: "verification", │                             │
  │    data: {...}               │  Render template            │
  │  }                           │  ──────────────►            │
  │                              │                             │
  │                              │  Send SMTP  ───────────────►│
  │                              │                             │
  │  ◄──────────── Response      │  ◄───────── Email sent      │
  │  {success: true}             │                             │
```

## Key Features

### 1. **REST API**
Simple HTTP API that any language/framework can use:
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "X-API-Key: your_key" \
  -d '{"to":"user@email.com","template":"welcome",...}'
```

### 2. **Pre-built Templates**
4 beautiful, responsive email templates:
- 📧 **Verification** - Email/account verification
- 👋 **Welcome** - Welcome new users
- 🔑 **Password Reset** - Password reset requests
- 🔔 **Notification** - General notifications

### 3. **SendPulse Integration**
Direct integration with SendPulse SMTP for reliable email delivery.

### 4. **Security**
Multiple security layers:
- API Key authentication
- Rate limiting (100 req/15min)
- CORS protection
- Request validation
- Secure headers (Helmet)

### 5. **Modern ES6**
Built with modern JavaScript:
- ES6 modules (`import`/`export`)
- Async/await
- Arrow functions
- Template literals
- Destructuring

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Language** | JavaScript (ES6/ESM) |
| **Template Engine** | Handlebars |
| **Email Client** | Nodemailer |
| **SMTP Provider** | SendPulse |
| **Validation** | Joi |
| **Security** | Helmet, CORS |
| **Rate Limiting** | express-rate-limit |

## Project Structure

```
Emailer_SG/
│
├── src/                          # Source code (ES6)
│   ├── config/                   # Configuration
│   ├── controllers/              # Request handlers
│   ├── middleware/               # Auth & validation
│   ├── routes/                   # API routes
│   ├── services/                 # Business logic
│   ├── templates/                # Email templates (.hbs)
│   ├── utils/                    # Utilities
│   ├── app.js                    # Express app
│   └── server.js                 # Entry point
│
├── example-app/                  # Integration example
│   ├── userRegistration.js      # Complete example
│   └── README.md
│
├── .env                          # Configuration
├── package.json
│
├── README.md                     # Full documentation
├── QUICK_START.md               # 5-minute start guide
├── INTEGRATION_GUIDE.md         # Detailed integration
├── EXAMPLES.md                   # Multi-language examples
├── ARCHITECTURE.md              # System architecture
└── PROJECT_SUMMARY.md           # This file
```

## Quick Start

### 1. Install
```bash
npm install
```

### 2. Configure
Edit `.env`:
```env
# SendPulse SMTP
SMTP_USER=your_sendpulse_email@example.com
SMTP_PASSWORD=your_sendpulse_password

# API Security
API_KEYS=your_secret_api_key_1

# Email From
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Company
```

### 3. Start
```bash
npm start
```

### 4. Test
```bash
curl http://localhost:3000/api/email/health
```

## Integration Example

### Your Application (Node.js)

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

// controllers/authController.js
import { sendVerificationEmail } from '../services/emailClient.js';

export const register = async (req, res) => {
  // 1. Create user
  const user = await User.create(req.body);

  // 2. Send email (non-blocking)
  sendVerificationEmail(user, user.verificationToken)
    .catch(err => console.error('Email failed:', err));

  // 3. Return immediately
  res.json({
    success: true,
    message: 'Registration successful! Check your email.'
  });
};
```

### Your Application (Python/Django)

```python
# services/email_client.py
import requests
import os

def send_verification_email(user, token):
    response = requests.post(
        f"{os.getenv('EMAIL_SERVICE_URL')}/send",
        json={
            'to': user.email,
            'subject': 'Verify Your Email',
            'template': 'verification',
            'data': {
                'userName': user.get_full_name(),
                'verificationUrl': f"https://yourapp.com/verify?token={token}",
                'companyName': 'Your Company',
                'year': str(datetime.now().year)
            }
        },
        headers={'X-API-Key': os.getenv('EMAIL_SERVICE_API_KEY')}
    )
    return response.json()

# views.py
def register(request):
    # 1. Create user
    user = User.objects.create(...)

    # 2. Send email (non-blocking)
    try:
        send_verification_email(user, token)
    except Exception as e:
        print(f'Email failed: {e}')

    # 3. Return immediately
    return JsonResponse({
        'success': True,
        'message': 'Check your email!'
    })
```

### Your Application (PHP/Laravel)

```php
// app/Services/EmailService.php
public function sendVerificationEmail($user, $token)
{
    return Http::withHeaders([
        'X-API-Key' => config('services.email_service.api_key')
    ])->post(config('services.email_service.url') . '/send', [
        'to' => $user->email,
        'subject' => 'Verify Your Email',
        'template' => 'verification',
        'data' => [
            'userName' => $user->name,
            'verificationUrl' => url("/verify?token={$token}"),
            'companyName' => config('app.name'),
            'year' => date('Y')
        ]
    ]);
}

// AuthController.php
public function register(Request $request)
{
    // 1. Create user
    $user = User::create(...);

    // 2. Send email (non-blocking)
    try {
        $this->emailService->sendVerificationEmail($user, $token);
    } catch (\Exception $e) {
        \Log::error('Email failed: ' . $e->getMessage());
    }

    // 3. Return immediately
    return response()->json([
        'success' => true,
        'message' => 'Check your email!'
    ]);
}
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | ❌ | Service information |
| `/api/email/health` | GET | ❌ | Health check |
| `/api/email/send` | POST | ✅ | Send single email |
| `/api/email/send-bulk` | POST | ✅ | Send bulk emails |
| `/api/email/templates` | GET | ✅ | List templates |

## Available Templates

### 1. Verification Template
```javascript
{
  template: 'verification',
  data: {
    userName: 'John Doe',
    verificationUrl: 'https://...',
    verificationCode: '123456',
    expiresIn: '30',
    companyName: 'Your Company',
    year: '2024'
  }
}
```

### 2. Welcome Template
```javascript
{
  template: 'welcome',
  data: {
    userName: 'John Doe',
    companyName: 'Your Company',
    welcomeMessage: 'Welcome!',
    dashboardUrl: 'https://...',
    supportEmail: 'support@...',
    year: '2024'
  }
}
```

### 3. Password Reset Template
```javascript
{
  template: 'password-reset',
  data: {
    userName: 'John Doe',
    resetUrl: 'https://...',
    expiresIn: '60',
    ipAddress: '127.0.0.1',
    companyName: 'Your Company',
    year: '2024'
  }
}
```

### 4. Notification Template
```javascript
{
  template: 'notification',
  data: {
    userName: 'John Doe',
    notificationTitle: 'Title',
    notificationType: 'success', // info, success, warning, error
    title: 'Title',
    message: 'Message',
    companyName: 'Your Company',
    year: '2024'
  }
}
```

## Security

### Authentication
All endpoints (except `/health`) require API key:
```
X-API-Key: your_secret_api_key
```
or
```
Authorization: Bearer your_secret_api_key
```

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable via environment variables

### Other Security Measures
- CORS protection
- Helmet security headers
- Request validation (Joi schemas)
- Input sanitization
- Error message sanitization (no info leakage)

## Documentation

| File | Description |
|------|-------------|
| [README.md](README.md) | Complete API documentation |
| [QUICK_START.md](QUICK_START.md) | 5-minute quick start guide |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Detailed integration guide with examples |
| [EXAMPLES.md](EXAMPLES.md) | Code examples in 7+ languages |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture and design |
| [example-app/](example-app/) | Complete working example |

## Use Cases

### 1. User Registration
```
User signs up → Send verification email → User clicks link → Verified!
```

### 2. Password Reset
```
User forgot password → Send reset link → User resets → Success!
```

### 3. Notifications
```
Event occurs → Send notification email → User informed
```

### 4. Welcome Emails
```
User verified → Send welcome email → User onboarded
```

### 5. Transactional Emails
```
Order placed → Send order confirmation → User receives receipt
```

## Benefits

### For Developers
- ✅ No need to implement email logic in every app
- ✅ Consistent, professional email templates
- ✅ Simple REST API - works with any language
- ✅ Centralized configuration and management
- ✅ Modern ES6 codebase, easy to maintain

### For Business
- ✅ Faster development (no email implementation needed)
- ✅ Consistent branding across all emails
- ✅ Centralized email analytics and monitoring
- ✅ Easy template updates (update once, affects all apps)
- ✅ Better deliverability with SendPulse

### For Users
- ✅ Professional, consistent emails
- ✅ Reliable delivery
- ✅ Mobile-responsive templates
- ✅ Fast sending

## Deployment

### Development
```bash
npm start
```

### Production
```bash
# Set NODE_ENV
export NODE_ENV=production

# Use process manager
pm2 start src/server.js --name email-service

# Or use Docker
docker build -t email-service .
docker run -p 3000:3000 email-service
```

### Environment Variables (Production)
```env
NODE_ENV=production
PORT=3000

# SendPulse (get from dashboard)
SMTP_HOST=smtp-pulse.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=real_user@example.com
SMTP_PASSWORD=real_password

# API Keys (generate secure ones)
API_KEYS=secure_key_1,secure_key_2

# From Address
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Company

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Monitoring

### Health Check
```bash
curl http://localhost:3000/api/email/health
```

### Logs
Service logs all:
- Email send attempts
- Success/failures
- SMTP connection status
- API requests
- Errors

### Metrics to Track
- Email send success rate
- Response time
- SMTP connection uptime
- API request rate
- Error rate

## Scaling

### Horizontal Scaling
```
Load Balancer
     │
     ├─► Email Service Instance 1
     ├─► Email Service Instance 2
     └─► Email Service Instance 3
```

### With Queue System
```
Your Apps → Email Service → Queue (Bull/RabbitMQ) → Workers → SendPulse
```

## Support

### Getting Help
- Read the [README.md](README.md)
- Check [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- Try [example-app/](example-app/)
- Review [ARCHITECTURE.md](ARCHITECTURE.md)

### Common Issues
- **SMTP not connecting**: Check SendPulse credentials
- **Auth errors**: Verify API key matches
- **Template not found**: Check template name spelling
- **Rate limited**: Wait 15 minutes or increase limits

## Contributing

To add new templates:
1. Create directory in `src/templates/`
2. Add `template.hbs` file
3. Use Handlebars syntax for variables
4. Test with API

To modify existing templates:
1. Edit `.hbs` file in `src/templates/{template-name}/`
2. Restart service (templates cached on load)
3. Test changes

## License

ISC

## Author

Hassan Dahiru Ado

---

## Summary

This is a **production-ready email microservice** that:
- ✅ Provides REST API for sending emails
- ✅ Integrates with SendPulse SMTP
- ✅ Includes 4 beautiful, responsive templates
- ✅ Built with modern ES6 JavaScript
- ✅ Secure, scalable, and maintainable
- ✅ Easy to integrate with any application
- ✅ Comprehensive documentation

**Perfect for:**
- Multi-application environments
- Microservices architecture
- Teams wanting consistent email templates
- Projects needing reliable email delivery
- Developers wanting to avoid email implementation

**Getting Started:**
```bash
npm install
npm start
curl http://localhost:3000/api/email/health
```

**Integration:**
Just make an HTTP POST request from your app! 🚀
