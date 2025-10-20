# Email Service Integration Examples

This document provides detailed examples of how to integrate the email service with different applications and frameworks.

## Table of Contents

- [cURL Examples](#curl-examples)
- [JavaScript/TypeScript](#javascripttypescript)
- [Python](#python)
- [PHP](#php)
- [Go](#go)
- [Ruby](#ruby)
- [Java](#java)

## cURL Examples

### Send Verification Email

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
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
  }'
```

### Send Welcome Email

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "to": "newuser@example.com",
    "subject": "Welcome to Our Platform!",
    "template": "welcome",
    "data": {
      "userName": "Jane Smith",
      "companyName": "Your Company",
      "welcomeMessage": "Thank you for joining us!",
      "dashboardUrl": "https://yourapp.com/dashboard",
      "supportEmail": "support@yourcompany.com",
      "year": "2024"
    }
  }'
```

### Send Bulk Emails

```bash
curl -X POST http://localhost:3000/api/email/send-bulk \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
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
  }'
```

## JavaScript/TypeScript

### Node.js with Axios

```javascript
const axios = require('axios');

class EmailServiceClient {
  constructor(apiKey, baseUrl = 'http://localhost:3000/api/email') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });
  }

  async sendVerificationEmail(to, userName, verificationUrl, verificationCode) {
    try {
      const response = await this.client.post('/send', {
        to,
        subject: 'Verify your email address',
        template: 'verification',
        data: {
          userName,
          verificationUrl,
          verificationCode,
          expiresIn: '30',
          companyName: 'Your Company',
          year: new Date().getFullYear().toString(),
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send verification email:', error.response?.data);
      throw error;
    }
  }

  async sendPasswordResetEmail(to, userName, resetUrl) {
    try {
      const response = await this.client.post('/send', {
        to,
        subject: 'Reset your password',
        template: 'password-reset',
        data: {
          userName,
          resetUrl,
          expiresIn: '60',
          companyName: 'Your Company',
          year: new Date().getFullYear().toString(),
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send password reset email:', error.response?.data);
      throw error;
    }
  }

  async sendNotification(to, userName, title, message, notificationType = 'info') {
    try {
      const response = await this.client.post('/send', {
        to,
        subject: title,
        template: 'notification',
        data: {
          userName,
          notificationTitle: title,
          notificationType,
          title,
          message,
          companyName: 'Your Company',
          year: new Date().getFullYear().toString(),
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send notification:', error.response?.data);
      throw error;
    }
  }

  async sendWelcomeEmail(to, userName) {
    try {
      const response = await this.client.post('/send', {
        to,
        subject: 'Welcome to Our Platform!',
        template: 'welcome',
        data: {
          userName,
          companyName: 'Your Company',
          welcomeMessage: 'We are excited to have you on board!',
          dashboardUrl: 'https://yourapp.com/dashboard',
          supportEmail: 'support@yourcompany.com',
          year: new Date().getFullYear().toString(),
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send welcome email:', error.response?.data);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error.response?.data);
      throw error;
    }
  }
}

// Usage
const emailClient = new EmailServiceClient(process.env.EMAIL_SERVICE_API_KEY);

// Send verification email
emailClient.sendVerificationEmail(
  'user@example.com',
  'John Doe',
  'https://yourapp.com/verify?token=abc123',
  '123456'
).then(result => console.log('Email sent:', result));
```

### TypeScript Version

```typescript
import axios, { AxiosInstance } from 'axios';

interface EmailData {
  to: string;
  subject: string;
  template?: string;
  html?: string;
  data?: Record<string, any>;
}

interface EmailResponse {
  success: boolean;
  message: string;
  data?: any;
}

class EmailServiceClient {
  private client: AxiosInstance;

  constructor(
    private apiKey: string,
    private baseUrl: string = 'http://localhost:3000/api/email'
  ) {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });
  }

  async sendVerificationEmail(
    to: string,
    userName: string,
    verificationUrl: string,
    verificationCode: string
  ): Promise<EmailResponse> {
    const response = await this.client.post<EmailResponse>('/send', {
      to,
      subject: 'Verify your email address',
      template: 'verification',
      data: {
        userName,
        verificationUrl,
        verificationCode,
        expiresIn: '30',
        companyName: 'Your Company',
        year: new Date().getFullYear().toString(),
      },
    });
    return response.data;
  }

  async sendCustomEmail(emailData: EmailData): Promise<EmailResponse> {
    const response = await this.client.post<EmailResponse>('/send', emailData);
    return response.data;
  }
}

export default EmailServiceClient;
```

### React Hook Example

```typescript
import { useState } from 'react';
import axios from 'axios';

export const useEmailService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendEmail = async (emailData: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_EMAIL_SERVICE_URL}/api/email/send`,
        emailData,
        {
          headers: {
            'X-API-Key': process.env.REACT_APP_EMAIL_SERVICE_API_KEY,
          },
        }
      );
      setLoading(false);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send email');
      setLoading(false);
      throw err;
    }
  };

  return { sendEmail, loading, error };
};

// Usage in component
function SignupForm() {
  const { sendEmail, loading } = useEmailService();

  const handleSignup = async (email: string, name: string) => {
    // ... signup logic

    await sendEmail({
      to: email,
      subject: 'Welcome!',
      template: 'welcome',
      data: {
        userName: name,
        companyName: 'Your Company',
        year: new Date().getFullYear().toString(),
      },
    });
  };

  return <form>{/* ... */}</form>;
}
```

## Python

### Using Requests Library

```python
import requests
import os
from datetime import datetime
from typing import Dict, Any, Optional

class EmailServiceClient:
    def __init__(self, api_key: str, base_url: str = "http://localhost:3000/api/email"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key
        }

    def send_email(self, to: str, subject: str, template: str = None,
                   html: str = None, data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send an email"""
        payload = {
            "to": to,
            "subject": subject
        }

        if template:
            payload["template"] = template
            payload["data"] = data or {}
        elif html:
            payload["html"] = html

        response = requests.post(
            f"{self.base_url}/send",
            json=payload,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def send_verification_email(self, to: str, user_name: str,
                               verification_url: str, verification_code: str) -> Dict[str, Any]:
        """Send a verification email"""
        return self.send_email(
            to=to,
            subject="Verify your email address",
            template="verification",
            data={
                "userName": user_name,
                "verificationUrl": verification_url,
                "verificationCode": verification_code,
                "expiresIn": "30",
                "companyName": "Your Company",
                "year": str(datetime.now().year)
            }
        )

    def send_password_reset_email(self, to: str, user_name: str,
                                  reset_url: str) -> Dict[str, Any]:
        """Send a password reset email"""
        return self.send_email(
            to=to,
            subject="Reset your password",
            template="password-reset",
            data={
                "userName": user_name,
                "resetUrl": reset_url,
                "expiresIn": "60",
                "companyName": "Your Company",
                "year": str(datetime.now().year)
            }
        )

    def send_notification(self, to: str, user_name: str, title: str,
                         message: str, notification_type: str = "info") -> Dict[str, Any]:
        """Send a notification email"""
        return self.send_email(
            to=to,
            subject=title,
            template="notification",
            data={
                "userName": user_name,
                "notificationTitle": title,
                "notificationType": notification_type,
                "title": title,
                "message": message,
                "companyName": "Your Company",
                "year": str(datetime.now().year)
            }
        )

    def send_welcome_email(self, to: str, user_name: str) -> Dict[str, Any]:
        """Send a welcome email"""
        return self.send_email(
            to=to,
            subject="Welcome to Our Platform!",
            template="welcome",
            data={
                "userName": user_name,
                "companyName": "Your Company",
                "welcomeMessage": "We're excited to have you on board!",
                "dashboardUrl": "https://yourapp.com/dashboard",
                "supportEmail": "support@yourcompany.com",
                "year": str(datetime.now().year)
            }
        )

    def health_check(self) -> Dict[str, Any]:
        """Check service health"""
        response = requests.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()

# Usage
email_client = EmailServiceClient(api_key=os.getenv("EMAIL_SERVICE_API_KEY"))

# Send verification email
result = email_client.send_verification_email(
    to="user@example.com",
    user_name="John Doe",
    verification_url="https://yourapp.com/verify?token=abc123",
    verification_code="123456"
)
print(f"Email sent: {result}")
```

### Django Integration

```python
# settings.py
EMAIL_SERVICE_API_KEY = os.getenv('EMAIL_SERVICE_API_KEY')
EMAIL_SERVICE_URL = os.getenv('EMAIL_SERVICE_URL', 'http://localhost:3000/api/email')

# utils/email.py
from django.conf import settings
import requests

def send_verification_email(user):
    response = requests.post(
        f"{settings.EMAIL_SERVICE_URL}/send",
        json={
            "to": user.email,
            "subject": "Verify your email",
            "template": "verification",
            "data": {
                "userName": user.get_full_name(),
                "verificationUrl": f"https://yourapp.com/verify/{user.verification_token}",
                "companyName": "Your Company",
                "year": str(datetime.now().year)
            }
        },
        headers={
            "X-API-Key": settings.EMAIL_SERVICE_API_KEY
        }
    )
    return response.json()

# views.py
from .utils.email import send_verification_email

def register_view(request):
    # ... registration logic
    send_verification_email(user)
    # ...
```

## PHP

### Using cURL

```php
<?php

class EmailServiceClient {
    private $apiKey;
    private $baseUrl;

    public function __construct($apiKey, $baseUrl = 'http://localhost:3000/api/email') {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }

    private function sendRequest($endpoint, $data) {
        $ch = curl_init($this->baseUrl . $endpoint);

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-API-Key: ' . $this->apiKey
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("Email service error: " . $response);
        }

        return json_decode($response, true);
    }

    public function sendVerificationEmail($to, $userName, $verificationUrl, $verificationCode) {
        return $this->sendRequest('/send', [
            'to' => $to,
            'subject' => 'Verify your email address',
            'template' => 'verification',
            'data' => [
                'userName' => $userName,
                'verificationUrl' => $verificationUrl,
                'verificationCode' => $verificationCode,
                'expiresIn' => '30',
                'companyName' => 'Your Company',
                'year' => date('Y')
            ]
        ]);
    }

    public function sendPasswordResetEmail($to, $userName, $resetUrl) {
        return $this->sendRequest('/send', [
            'to' => $to,
            'subject' => 'Reset your password',
            'template' => 'password-reset',
            'data' => [
                'userName' => $userName,
                'resetUrl' => $resetUrl,
                'expiresIn' => '60',
                'companyName' => 'Your Company',
                'year' => date('Y')
            ]
        ]);
    }

    public function sendWelcomeEmail($to, $userName) {
        return $this->sendRequest('/send', [
            'to' => $to,
            'subject' => 'Welcome to Our Platform!',
            'template' => 'welcome',
            'data' => [
                'userName' => $userName,
                'companyName' => 'Your Company',
                'welcomeMessage' => 'We are excited to have you on board!',
                'dashboardUrl' => 'https://yourapp.com/dashboard',
                'supportEmail' => 'support@yourcompany.com',
                'year' => date('Y')
            ]
        ]);
    }
}

// Usage
$emailClient = new EmailServiceClient(getenv('EMAIL_SERVICE_API_KEY'));

try {
    $result = $emailClient->sendVerificationEmail(
        'user@example.com',
        'John Doe',
        'https://yourapp.com/verify?token=abc123',
        '123456'
    );
    echo "Email sent successfully!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
```

### Laravel Integration

```php
<?php

// config/services.php
return [
    'email_service' => [
        'api_key' => env('EMAIL_SERVICE_API_KEY'),
        'url' => env('EMAIL_SERVICE_URL', 'http://localhost:3000/api/email'),
    ],
];

// app/Services/EmailService.php
namespace App\Services;

use Illuminate\Support\Facades\Http;

class EmailService {
    protected $apiKey;
    protected $baseUrl;

    public function __construct() {
        $this->apiKey = config('services.email_service.api_key');
        $this->baseUrl = config('services.email_service.url');
    }

    public function sendVerificationEmail($user, $verificationUrl) {
        return Http::withHeaders([
            'X-API-Key' => $this->apiKey
        ])->post("{$this->baseUrl}/send", [
            'to' => $user->email,
            'subject' => 'Verify your email address',
            'template' => 'verification',
            'data' => [
                'userName' => $user->name,
                'verificationUrl' => $verificationUrl,
                'companyName' => config('app.name'),
                'year' => date('Y')
            ]
        ])->json();
    }
}

// Usage in Controller
use App\Services\EmailService;

class AuthController extends Controller {
    protected $emailService;

    public function __construct(EmailService $emailService) {
        $this->emailService = $emailService;
    }

    public function register(Request $request) {
        // ... registration logic

        $this->emailService->sendVerificationEmail($user, $verificationUrl);

        return response()->json(['message' => 'Registration successful']);
    }
}
```

## Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

type EmailServiceClient struct {
    APIKey  string
    BaseURL string
    Client  *http.Client
}

type EmailRequest struct {
    To       string                 `json:"to"`
    Subject  string                 `json:"subject"`
    Template string                 `json:"template,omitempty"`
    HTML     string                 `json:"html,omitempty"`
    Data     map[string]interface{} `json:"data,omitempty"`
}

type EmailResponse struct {
    Success bool   `json:"success"`
    Message string `json:"message"`
    Data    interface{} `json:"data,omitempty"`
}

func NewEmailServiceClient(apiKey, baseURL string) *EmailServiceClient {
    return &EmailServiceClient{
        APIKey:  apiKey,
        BaseURL: baseURL,
        Client:  &http.Client{Timeout: 30 * time.Second},
    }
}

func (c *EmailServiceClient) SendEmail(req EmailRequest) (*EmailResponse, error) {
    jsonData, err := json.Marshal(req)
    if err != nil {
        return nil, err
    }

    httpReq, err := http.NewRequest("POST", c.BaseURL+"/send", bytes.NewBuffer(jsonData))
    if err != nil {
        return nil, err
    }

    httpReq.Header.Set("Content-Type", "application/json")
    httpReq.Header.Set("X-API-Key", c.APIKey)

    resp, err := c.Client.Do(httpReq)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var emailResp EmailResponse
    if err := json.NewDecoder(resp.Body).Decode(&emailResp); err != nil {
        return nil, err
    }

    return &emailResp, nil
}

func (c *EmailServiceClient) SendVerificationEmail(to, userName, verificationURL, code string) (*EmailResponse, error) {
    return c.SendEmail(EmailRequest{
        To:       to,
        Subject:  "Verify your email address",
        Template: "verification",
        Data: map[string]interface{}{
            "userName":        userName,
            "verificationUrl": verificationURL,
            "verificationCode": code,
            "expiresIn":       "30",
            "companyName":     "Your Company",
            "year":            fmt.Sprintf("%d", time.Now().Year()),
        },
    })
}

func main() {
    client := NewEmailServiceClient("your_api_key", "http://localhost:3000/api/email")

    resp, err := client.SendVerificationEmail(
        "user@example.com",
        "John Doe",
        "https://yourapp.com/verify?token=abc123",
        "123456",
    )

    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }

    fmt.Printf("Success: %v, Message: %s\n", resp.Success, resp.Message)
}
```

## Ruby

```ruby
require 'net/http'
require 'json'
require 'uri'

class EmailServiceClient
  def initialize(api_key, base_url = 'http://localhost:3000/api/email')
    @api_key = api_key
    @base_url = base_url
  end

  def send_email(to:, subject:, template: nil, html: nil, data: {})
    uri = URI("#{@base_url}/send")

    payload = {
      to: to,
      subject: subject
    }

    payload[:template] = template if template
    payload[:html] = html if html
    payload[:data] = data unless data.empty?

    request = Net::HTTP::Post.new(uri)
    request['Content-Type'] = 'application/json'
    request['X-API-Key'] = @api_key
    request.body = payload.to_json

    response = Net::HTTP.start(uri.hostname, uri.port) do |http|
      http.request(request)
    end

    JSON.parse(response.body)
  end

  def send_verification_email(to, user_name, verification_url, verification_code)
    send_email(
      to: to,
      subject: 'Verify your email address',
      template: 'verification',
      data: {
        userName: user_name,
        verificationUrl: verification_url,
        verificationCode: verification_code,
        expiresIn: '30',
        companyName: 'Your Company',
        year: Time.now.year.to_s
      }
    )
  end

  def send_welcome_email(to, user_name)
    send_email(
      to: to,
      subject: 'Welcome to Our Platform!',
      template: 'welcome',
      data: {
        userName: user_name,
        companyName: 'Your Company',
        welcomeMessage: 'We are excited to have you on board!',
        dashboardUrl: 'https://yourapp.com/dashboard',
        supportEmail: 'support@yourcompany.com',
        year: Time.now.year.to_s
      }
    )
  end
end

# Usage
email_client = EmailServiceClient.new(ENV['EMAIL_SERVICE_API_KEY'])

result = email_client.send_verification_email(
  'user@example.com',
  'John Doe',
  'https://yourapp.com/verify?token=abc123',
  '123456'
)

puts "Email sent: #{result}"
```

## Java

```java
import com.google.gson.Gson;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;

public class EmailServiceClient {
    private final String apiKey;
    private final String baseUrl;
    private final HttpClient client;
    private final Gson gson;

    public EmailServiceClient(String apiKey, String baseUrl) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.client = HttpClient.newHttpClient();
        this.gson = new Gson();
    }

    public String sendEmail(String to, String subject, String template, Map<String, Object> data)
            throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("to", to);
        payload.put("subject", subject);
        payload.put("template", template);
        payload.put("data", data);

        String jsonPayload = gson.toJson(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/send"))
                .header("Content-Type", "application/json")
                .header("X-API-Key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return response.body();
    }

    public String sendVerificationEmail(String to, String userName, String verificationUrl, String code)
            throws Exception {
        Map<String, Object> data = new HashMap<>();
        data.put("userName", userName);
        data.put("verificationUrl", verificationUrl);
        data.put("verificationCode", code);
        data.put("expiresIn", "30");
        data.put("companyName", "Your Company");
        data.put("year", String.valueOf(java.time.Year.now().getValue()));

        return sendEmail(to, "Verify your email address", "verification", data);
    }

    public static void main(String[] args) {
        try {
            EmailServiceClient client = new EmailServiceClient(
                System.getenv("EMAIL_SERVICE_API_KEY"),
                "http://localhost:3000/api/email"
            );

            String result = client.sendVerificationEmail(
                "user@example.com",
                "John Doe",
                "https://yourapp.com/verify?token=abc123",
                "123456"
            );

            System.out.println("Email sent: " + result);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

## Best Practices

1. **Error Handling**: Always wrap API calls in try-catch blocks
2. **Environment Variables**: Store API keys in environment variables
3. **Retry Logic**: Implement retry logic for failed requests
4. **Logging**: Log all email sending attempts for debugging
5. **Validation**: Validate email addresses before sending
6. **Rate Limiting**: Respect rate limits to avoid getting blocked
7. **Testing**: Use test mode or development environment for testing

## Support

For more information, check the main [README.md](README.md) or contact support.
