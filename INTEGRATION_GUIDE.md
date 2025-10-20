# Integration Guide - How to Use the Email Service from Your Application

This guide shows you exactly how to integrate this email service with your application, especially after successful user registration.

## Table of Contents
- [Quick Start](#quick-start)
- [Real-World Registration Flow](#real-world-registration-flow)
- [Integration Examples](#integration-examples)
- [Best Practices](#best-practices)

---

## Quick Start

### 1. Start the Email Service

```bash
# In the emailer_sg directory
npm start
```

The service will run on `http://localhost:3000`

### 2. Get Your API Key

From your `.env` file, copy one of the API keys:
```
API_KEYS=your_secret_api_key_1,your_secret_api_key_2
```

### 3. Make a Test Request

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_secret_api_key_1" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "template": "welcome",
    "data": {
      "userName": "Test User",
      "companyName": "Your Company",
      "year": "2024"
    }
  }'
```

---

## Real-World Registration Flow

Here's how your application communicates with the email service when a user registers:

### Architecture Overview

```
Your Application (Port 5000)          Email Service (Port 3000)          SendPulse SMTP
    │                                        │                                 │
    │  1. User registers                    │                                 │
    │  POST /register                        │                                 │
    │                                        │                                 │
    │  2. Save user to DB                   │                                 │
    │                                        │                                 │
    │  3. Send HTTP request ────────────>   │                                 │
    │     POST /api/email/send              │                                 │
    │     with user data                     │                                 │
    │                                        │  4. Render template              │
    │                                        │                                 │
    │                                        │  5. Send email ──────────────> │
    │                                        │                                 │
    │  <──────────── 6. Response             │  <────────── SMTP response      │
    │     {success: true, messageId: ...}    │                                 │
    │                                        │                                 │
    │  7. Return success to user            │                                 │
    └────────────────────────────────────────┴─────────────────────────────────┘
```

---

## Integration Examples

### Example 1: Node.js/Express Application (ES6)

Create a service file to handle email communication:

#### `services/emailClient.js`

```javascript
import axios from 'axios';

class EmailClient {
  constructor() {
    this.baseURL = process.env.EMAIL_SERVICE_URL || 'http://localhost:3000/api/email';
    this.apiKey = process.env.EMAIL_SERVICE_API_KEY;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      timeout: 10000, // 10 seconds
    });
  }

  async sendVerificationEmail(user, verificationToken) {
    try {
      const response = await this.client.post('/send', {
        to: user.email,
        subject: 'Verify Your Email Address',
        template: 'verification',
        data: {
          userName: user.name,
          verificationUrl: `${process.env.APP_URL}/verify-email?token=${verificationToken}`,
          verificationCode: this.generateVerificationCode(),
          expiresIn: '30',
          companyName: process.env.COMPANY_NAME || 'Your Company',
          year: new Date().getFullYear().toString(),
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to send verification email:', error.response?.data || error.message);
      throw new Error('Email service error');
    }
  }

  async sendWelcomeEmail(user) {
    try {
      const response = await this.client.post('/send', {
        to: user.email,
        subject: 'Welcome to Our Platform!',
        template: 'welcome',
        data: {
          userName: user.name,
          companyName: process.env.COMPANY_NAME || 'Your Company',
          welcomeMessage: `We're thrilled to have you join us, ${user.name}!`,
          dashboardUrl: `${process.env.APP_URL}/dashboard`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@company.com',
          year: new Date().getFullYear().toString(),
        },
      });

      return response.data;
    } catch (error) {
      console.error('Failed to send welcome email:', error.response?.data || error.message);
      throw new Error('Email service error');
    }
  }

  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export default new EmailClient();
```

#### `controllers/authController.js`

```javascript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import emailClient from '../services/emailClient.js';

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Generate verification token
    const verificationToken = uuidv4();

    // 4. Create user in database
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      verificationToken,
      isVerified: false,
    });

    // 5. Send verification email (async - don't block response)
    emailClient.sendVerificationEmail(user, verificationToken)
      .then(() => console.log(`Verification email sent to ${email}`))
      .catch(err => console.error(`Failed to send verification email:`, err));

    // 6. Return success response immediately
    return res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    // 1. Find user by verification token
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
      });
    }

    // 2. Update user as verified
    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    // 3. Send welcome email
    emailClient.sendWelcomeEmail(user)
      .then(() => console.log(`Welcome email sent to ${user.email}`))
      .catch(err => console.error(`Failed to send welcome email:`, err));

    // 4. Return success
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! Welcome aboard!',
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
    });
  }
};
```

#### `routes/authRoutes.js`

```javascript
import express from 'express';
import { register, verifyEmail } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.get('/verify-email', verifyEmail);

export default router;
```

#### `.env` (Your Application)

```env
# Your App Configuration
PORT=5000
MONGODB_URI=mongodb://localhost:27017/myapp
JWT_SECRET=your_jwt_secret

# Email Service Configuration
EMAIL_SERVICE_URL=http://localhost:3000/api/email
EMAIL_SERVICE_API_KEY=your_secret_api_key_1

# App URLs
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Company Info
COMPANY_NAME=Your Company Name
SUPPORT_EMAIL=support@yourcompany.com
```

---

### Example 2: React/Next.js Frontend Integration

If you want to send emails directly from your frontend (not recommended for production, but useful for demos):

#### `lib/emailService.js`

```javascript
export class EmailService {
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_EMAIL_SERVICE_URL;
    this.apiKey = process.env.NEXT_PUBLIC_EMAIL_SERVICE_API_KEY;
  }

  async sendNotification(email, userName, title, message) {
    try {
      const response = await fetch(`${this.baseURL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          to: email,
          subject: title,
          template: 'notification',
          data: {
            userName,
            notificationTitle: title,
            notificationType: 'success',
            title,
            message,
            companyName: 'Your Company',
            year: new Date().getFullYear().toString(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email');
      }

      return data;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }
}

export default new EmailService();
```

---

### Example 3: Python/Django Application

#### `services/email_client.py`

```python
import os
import requests
from datetime import datetime
from typing import Dict, Any

class EmailClient:
    def __init__(self):
        self.base_url = os.getenv('EMAIL_SERVICE_URL', 'http://localhost:3000/api/email')
        self.api_key = os.getenv('EMAIL_SERVICE_API_KEY')
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key
        }

    def send_verification_email(self, user, verification_token: str) -> Dict[str, Any]:
        """Send verification email to user"""
        try:
            payload = {
                'to': user.email,
                'subject': 'Verify Your Email Address',
                'template': 'verification',
                'data': {
                    'userName': user.get_full_name() or user.username,
                    'verificationUrl': f"{os.getenv('APP_URL')}/verify-email?token={verification_token}",
                    'verificationCode': self._generate_verification_code(),
                    'expiresIn': '30',
                    'companyName': os.getenv('COMPANY_NAME', 'Your Company'),
                    'year': str(datetime.now().year)
                }
            }

            response = requests.post(
                f"{self.base_url}/send",
                json=payload,
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"Failed to send verification email: {e}")
            raise

    def send_welcome_email(self, user) -> Dict[str, Any]:
        """Send welcome email to user"""
        try:
            payload = {
                'to': user.email,
                'subject': 'Welcome to Our Platform!',
                'template': 'welcome',
                'data': {
                    'userName': user.get_full_name() or user.username,
                    'companyName': os.getenv('COMPANY_NAME', 'Your Company'),
                    'welcomeMessage': f"We're thrilled to have you join us!",
                    'dashboardUrl': f"{os.getenv('APP_URL')}/dashboard",
                    'supportEmail': os.getenv('SUPPORT_EMAIL', 'support@company.com'),
                    'year': str(datetime.now().year)
                }
            }

            response = requests.post(
                f"{self.base_url}/send",
                json=payload,
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"Failed to send welcome email: {e}")
            raise

    @staticmethod
    def _generate_verification_code() -> str:
        """Generate 6-digit verification code"""
        import random
        return str(random.randint(100000, 999999))

# Singleton instance
email_client = EmailClient()
```

#### `views.py`

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services.email_client import email_client
import uuid

User = get_user_model()

@api_view(['POST'])
def register(request):
    """Register a new user"""
    try:
        name = request.data.get('name')
        email = request.data.get('email')
        password = request.data.get('password')

        # 1. Check if user exists
        if User.objects.filter(email=email).exists():
            return Response(
                {'success': False, 'message': 'Email already registered'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Create user
        verification_token = str(uuid.uuid4())
        user = User.objects.create(
            username=email,
            email=email,
            first_name=name,
            password=make_password(password),
            verification_token=verification_token,
            is_active=False
        )

        # 3. Send verification email (async)
        try:
            email_client.send_verification_email(user, verification_token)
        except Exception as e:
            print(f"Failed to send verification email: {e}")
            # Don't fail registration if email fails

        # 4. Return success
        return Response({
            'success': True,
            'message': 'Registration successful! Please check your email.',
            'data': {
                'userId': user.id,
                'email': user.email,
                'name': user.first_name
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'success': False, 'message': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

---

### Example 4: PHP/Laravel Application

#### `app/Services/EmailService.php`

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EmailService
{
    protected $baseUrl;
    protected $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.email_service.url');
        $this->apiKey = config('services.email_service.api_key');
    }

    public function sendVerificationEmail($user, $verificationToken)
    {
        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey
            ])->post("{$this->baseUrl}/send", [
                'to' => $user->email,
                'subject' => 'Verify Your Email Address',
                'template' => 'verification',
                'data' => [
                    'userName' => $user->name,
                    'verificationUrl' => url("/verify-email?token={$verificationToken}"),
                    'verificationCode' => $this->generateVerificationCode(),
                    'expiresIn' => '30',
                    'companyName' => config('app.name'),
                    'year' => date('Y')
                ]
            ]);

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Failed to send verification email: ' . $e->getMessage());
            throw $e;
        }
    }

    public function sendWelcomeEmail($user)
    {
        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->apiKey
            ])->post("{$this->baseUrl}/send", [
                'to' => $user->email,
                'subject' => 'Welcome to ' . config('app.name') . '!',
                'template' => 'welcome',
                'data' => [
                    'userName' => $user->name,
                    'companyName' => config('app.name'),
                    'welcomeMessage' => "We're excited to have you on board!",
                    'dashboardUrl' => url('/dashboard'),
                    'supportEmail' => config('mail.support_email'),
                    'year' => date('Y')
                ]
            ]);

            return $response->json();
        } catch (\Exception $e) {
            Log::error('Failed to send welcome email: ' . $e->getMessage());
            throw $e;
        }
    }

    private function generateVerificationCode()
    {
        return (string) rand(100000, 999999);
    }
}
```

#### `app/Http/Controllers/AuthController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\EmailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    protected $emailService;

    public function __construct(EmailService $emailService)
    {
        $this->emailService = $emailService;
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8'
        ]);

        // Create user
        $verificationToken = Str::uuid();
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'verification_token' => $verificationToken,
            'email_verified_at' => null
        ]);

        // Send verification email (don't block response)
        try {
            $this->emailService->sendVerificationEmail($user, $verificationToken);
        } catch (\Exception $e) {
            \Log::error('Email sending failed: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Registration successful! Please check your email.',
            'data' => [
                'userId' => $user->id,
                'email' => $user->email,
                'name' => $user->name
            ]
        ], 201);
    }
}
```

---

## Best Practices

### 1. **Non-Blocking Email Sending**

Don't make the user wait for email to be sent. Send it asynchronously:

```javascript
// ✅ Good - Non-blocking
emailClient.sendVerificationEmail(user, token)
  .catch(err => console.error('Email failed:', err));

return res.json({ success: true, message: 'Check your email' });

// ❌ Bad - Blocking
await emailClient.sendVerificationEmail(user, token);
return res.json({ success: true });
```

### 2. **Error Handling**

Always catch email errors - don't fail registration if email fails:

```javascript
try {
  await emailClient.sendVerificationEmail(user, token);
} catch (error) {
  console.error('Email failed but user was created:', error);
  // Maybe queue for retry or notify admin
}
```

### 3. **Use Environment Variables**

Never hardcode API keys or URLs:

```javascript
// ✅ Good
const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL;
const EMAIL_SERVICE_API_KEY = process.env.EMAIL_SERVICE_API_KEY;

// ❌ Bad
const EMAIL_SERVICE_URL = 'http://localhost:3000';
const EMAIL_SERVICE_API_KEY = 'my-secret-key';
```

### 4. **Retry Logic**

Implement retry for failed emails:

```javascript
async function sendEmailWithRetry(emailData, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await emailClient.send(emailData);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 5. **Queue System (Production)**

For production, use a queue system like Bull, RabbitMQ, or AWS SQS:

```javascript
import Queue from 'bull';

const emailQueue = new Queue('emails', {
  redis: { host: 'localhost', port: 6379 }
});

// Add to queue
await emailQueue.add({
  type: 'verification',
  user: { email: user.email, name: user.name },
  token: verificationToken
});

// Process queue
emailQueue.process(async (job) => {
  const { type, user, token } = job.data;
  if (type === 'verification') {
    await emailClient.sendVerificationEmail(user, token);
  }
});
```

---

## Testing Your Integration

### 1. Test with cURL

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "to": "test@example.com",
    "subject": "Test",
    "template": "verification",
    "data": {
      "userName": "Test User",
      "verificationUrl": "http://example.com/verify",
      "companyName": "Test Co",
      "year": "2024"
    }
  }'
```

### 2. Test with Postman

Import this collection:

```json
{
  "info": { "name": "Email Service Tests" },
  "item": [{
    "name": "Send Verification Email",
    "request": {
      "method": "POST",
      "header": [
        { "key": "Content-Type", "value": "application/json" },
        { "key": "X-API-Key", "value": "{{API_KEY}}" }
      ],
      "url": "{{BASE_URL}}/api/email/send",
      "body": {
        "mode": "raw",
        "raw": "{\n  \"to\": \"test@example.com\",\n  \"subject\": \"Test\",\n  \"template\": \"verification\",\n  \"data\": {\n    \"userName\": \"Test\"\n  }\n}"
      }
    }
  }]
}
```

---

## Troubleshooting

### Email Service Not Responding

```bash
# Check if service is running
curl http://localhost:3000/api/email/health

# Check logs
npm start # See console output
```

### Authentication Errors

```javascript
// Make sure API key is correct
console.log('Using API key:', process.env.EMAIL_SERVICE_API_KEY);

// Check headers are set
console.log('Request headers:', {
  'X-API-Key': process.env.EMAIL_SERVICE_API_KEY
});
```

### Template Not Found

```bash
# List available templates
curl http://localhost:3000/api/email/templates \
  -H "X-API-Key: your_api_key"
```

---

## Summary

1. **Start the email service** on port 3000
2. **Save the API key** from `.env`
3. **Create an email client** in your app
4. **Call the email service** after user registration
5. **Handle errors gracefully** - don't block user registration

The email service handles all the complexity of templates, SMTP, and delivery. Your app just makes a simple HTTP request! 🚀
