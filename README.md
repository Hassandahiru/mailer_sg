# Email Service with SendPulse

A robust, production-ready email notification service that integrates with SendPulse SMTP and provides a REST API for sending emails from multiple applications.

**Built with ES6 Modules** - Modern JavaScript (ES6/ESM) syntax throughout the project.

## Features

- ✉️ **SendPulse Integration** - Direct SMTP integration with SendPulse
- 🔐 **API Authentication** - Secure API key-based authentication
- 📧 **Multiple Templates** - Pre-built templates for various use cases
- 🚀 **REST API** - Easy integration with any application
- 🎨 **Handlebars Templates** - Dynamic email content with Handlebars
- 🛡️ **Rate Limiting** - Built-in protection against abuse
- 📊 **Logging** - Comprehensive logging for debugging
- ⚡ **Bulk Sending** - Support for sending bulk emails
- 🎯 **ES6 Modules** - Modern JavaScript with import/export syntax

## Project Structure

```
emailer_sg/
├── src/
│   ├── config/           # Configuration files
│   │   └── index.js
│   ├── controllers/      # Request handlers
│   │   └── emailController.js
│   ├── middleware/       # Express middleware
│   │   ├── auth.js
│   │   └── validator.js
│   ├── routes/          # API routes
│   │   └── emailRoutes.js
│   ├── services/        # Business logic
│   │   ├── emailService.js
│   │   └── templateService.js
│   ├── templates/       # Email templates
│   │   ├── verification/
│   │   ├── notification/
│   │   ├── password-reset/
│   │   ├── welcome/
│   │   └── layouts/
│   ├── utils/          # Utility functions
│   │   └── logger.js
│   ├── app.js          # Express app configuration
│   └── server.js       # Server entry point
├── .env                # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Edit the `.env` file with your SendPulse credentials:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# SendPulse SMTP Configuration
SMTP_HOST=smtp-pulse.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_sendpulse_email@example.com
SMTP_PASSWORD=your_sendpulse_password

# Email Configuration
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your Service Name

# API Security (Generate strong random keys)
API_KEYS=your_secret_api_key_1,your_secret_api_key_2

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Application URLs
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

### 3. Get SendPulse Credentials

1. Go to [SendPulse](https://sendpulse.com)
2. Create an account or log in
3. Navigate to **Settings** → **SMTP**
4. Enable SMTP and get your credentials
5. Use these credentials in your `.env` file

### 4. Generate API Keys

Generate secure API keys for authentication:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add these keys to the `API_KEYS` variable in `.env` (comma-separated).

### 5. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The service will be available at `http://localhost:3000`

## API Documentation

### Base URL
```
http://localhost:3000/api/email
```

### Authentication

All endpoints (except `/health`) require API key authentication. Include your API key in the request headers:

```
X-API-Key: your_api_key_here
```

Or:

```
Authorization: Bearer your_api_key_here
```

### Endpoints

#### 1. Health Check

Check if the service is running and SMTP connection is active.

```http
GET /api/email/health
```

**Response:**
```json
{
  "success": true,
  "message": "Email service is running",
  "data": {
    "smtp": {
      "success": true,
      "message": "SMTP connection is ready"
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 2. Send Email

Send a single email using a template or custom HTML.

```http
POST /api/email/send
```

**Headers:**
```
Content-Type: application/json
X-API-Key: your_api_key
```

**Request Body (Using Template):**
```json
{
  "to": "user@example.com",
  "subject": "Verify your email address",
  "template": "verification",
  "data": {
    "userName": "John Doe",
    "verificationUrl": "https://yourapp.com/verify?token=abc123",
    "verificationCode": "123456",
    "expiresIn": "30",
    "companyName": "Your Company",
    "year": "2024"
  }
}
```

**Request Body (Using Custom HTML):**
```json
{
  "to": "user@example.com",
  "subject": "Custom Email",
  "html": "<h1>Hello!</h1><p>This is a custom email.</p>",
  "text": "Hello! This is a custom email."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "messageId": "<abc123@smtp-pulse.com>",
    "recipients": ["user@example.com"]
  }
}
```

#### 3. Send Bulk Email

Send multiple emails in one request.

```http
POST /api/email/send-bulk
```

**Headers:**
```
Content-Type: application/json
X-API-Key: your_api_key
```

**Request Body:**
```json
{
  "emails": [
    {
      "to": "user1@example.com",
      "subject": "Welcome!",
      "template": "welcome",
      "data": {
        "userName": "User 1",
        "companyName": "Your Company"
      }
    },
    {
      "to": "user2@example.com",
      "subject": "Welcome!",
      "template": "welcome",
      "data": {
        "userName": "User 2",
        "companyName": "Your Company"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk email processing completed",
  "data": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "results": [...]
  }
}
```

#### 4. Get Available Templates

List all available email templates.

```http
GET /api/email/templates
```

**Headers:**
```
X-API-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      "verification",
      "notification",
      "password-reset",
      "welcome"
    ],
    "count": 4
  }
}
```

## Available Email Templates

### 1. Verification Template

For email verification and account activation.

**Template Name:** `verification`

**Required Data:**
```json
{
  "userName": "John Doe",
  "verificationUrl": "https://yourapp.com/verify?token=abc123",
  "verificationCode": "123456",
  "expiresIn": "30",
  "companyName": "Your Company",
  "year": "2024"
}
```

### 2. Notification Template

For general notifications (supports different types: info, success, warning, error).

**Template Name:** `notification`

**Required Data:**
```json
{
  "userName": "John Doe",
  "notificationTitle": "System Notification",
  "notificationType": "success",
  "title": "Action Completed",
  "message": "Your action was completed successfully.",
  "details": {
    "Action": "Profile Update",
    "Time": "2024-01-15 10:30 AM"
  },
  "actionUrl": "https://yourapp.com/dashboard",
  "actionText": "View Dashboard",
  "companyName": "Your Company",
  "year": "2024"
}
```

### 3. Password Reset Template

For password reset requests.

**Template Name:** `password-reset`

**Required Data:**
```json
{
  "userName": "John Doe",
  "resetUrl": "https://yourapp.com/reset?token=abc123",
  "expiresIn": "60",
  "ipAddress": "192.168.1.1",
  "userAgent": "Chrome on Windows",
  "requestTime": "2024-01-15 10:30 AM",
  "companyName": "Your Company",
  "year": "2024"
}
```

### 4. Welcome Template

For welcoming new users.

**Template Name:** `welcome`

**Required Data:**
```json
{
  "userName": "John Doe",
  "companyName": "Your Company",
  "welcomeMessage": "We're excited to have you here!",
  "features": [
    {
      "title": "Feature 1",
      "description": "Description of feature 1"
    }
  ],
  "gettingStarted": [
    {
      "title": "Step 1",
      "description": "Complete your profile"
    }
  ],
  "dashboardUrl": "https://yourapp.com/dashboard",
  "supportEmail": "support@yourcompany.com",
  "helpUrl": "https://yourapp.com/help",
  "year": "2024"
}
```

## Integration Examples

### Node.js / Express

```javascript
const axios = require('axios');

async function sendVerificationEmail(userEmail, userName, verificationToken) {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/email/send',
      {
        to: userEmail,
        subject: 'Verify your email address',
        template: 'verification',
        data: {
          userName: userName,
          verificationUrl: `https://yourapp.com/verify?token=${verificationToken}`,
          verificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
          expiresIn: '30',
          companyName: 'Your Company',
          year: new Date().getFullYear().toString()
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.EMAIL_SERVICE_API_KEY
        }
      }
    );

    console.log('Email sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to send email:', error.response?.data || error.message);
    throw error;
  }
}
```

### Python / Flask

```python
import requests
import os

def send_notification_email(user_email, user_name, notification_data):
    url = "http://localhost:3000/api/email/send"

    headers = {
        "Content-Type": "application/json",
        "X-API-Key": os.getenv("EMAIL_SERVICE_API_KEY")
    }

    payload = {
        "to": user_email,
        "subject": "New Notification",
        "template": "notification",
        "data": {
            "userName": user_name,
            "notificationTitle": notification_data["title"],
            "notificationType": "info",
            "title": notification_data["title"],
            "message": notification_data["message"],
            "companyName": "Your Company",
            "year": "2024"
        }
    }

    response = requests.post(url, json=payload, headers=headers)
    return response.json()
```

### PHP / Laravel

```php
<?php

use Illuminate\Support\Facades\Http;

function sendPasswordResetEmail($email, $userName, $resetToken) {
    $response = Http::withHeaders([
        'Content-Type' => 'application/json',
        'X-API-Key' => env('EMAIL_SERVICE_API_KEY')
    ])->post('http://localhost:3000/api/email/send', [
        'to' => $email,
        'subject' => 'Reset your password',
        'template' => 'password-reset',
        'data' => [
            'userName' => $userName,
            'resetUrl' => "https://yourapp.com/reset?token={$resetToken}",
            'expiresIn' => '60',
            'ipAddress' => request()->ip(),
            'userAgent' => request()->userAgent(),
            'requestTime' => now()->format('Y-m-d H:i A'),
            'companyName' => 'Your Company',
            'year' => date('Y')
        ]
    ]);

    return $response->json();
}
```

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing API key)
- `403` - Forbidden (invalid API key)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

**Error Response Format:**
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "details": []
}
```

## Rate Limiting

By default, the API allows:
- **100 requests per 15 minutes** per IP address

You can modify these limits in the `.env` file:

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

## Security Best Practices

1. **Keep API Keys Secret** - Never commit API keys to version control
2. **Use HTTPS** - Always use HTTPS in production
3. **Rotate API Keys** - Regularly rotate your API keys
4. **Whitelist IPs** - Consider IP whitelisting for additional security
5. **Monitor Logs** - Regularly check logs for suspicious activity

## Troubleshooting

### SMTP Connection Failed

If you see "SMTP connection failed":
1. Verify your SendPulse credentials in `.env`
2. Check if SMTP is enabled in SendPulse settings
3. Ensure port 465 is not blocked by your firewall
4. Try using port 587 with `SMTP_SECURE=false`

### Email Not Received

1. Check spam/junk folder
2. Verify the recipient email address
3. Check SendPulse dashboard for delivery status
4. Review service logs for errors

### Template Not Found

1. Ensure the template directory exists in `src/templates/`
2. Verify `template.hbs` file exists in the template directory
3. Check template name spelling in API request

## License

ISC

## Author

Hassan Dahiru Ado

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
