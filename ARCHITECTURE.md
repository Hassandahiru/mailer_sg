# Email Service Architecture

This document explains the architecture and how different applications communicate with the email service.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         YOUR APPLICATIONS                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Node.js    │  │    Python    │  │     PHP      │  │    React    │ │
│  │   Express    │  │    Django    │  │   Laravel    │  │   Next.js   │ │
│  │  Port: 5000  │  │  Port: 8000  │  │  Port: 8080  │  │  Port: 3001 │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                 │                 │         │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────┘
          │                 │                 │                 │
          │                 │                 │                 │
          │          REST API (HTTP POST)                      │
          │          Headers: X-API-Key                        │
          │          Body: JSON                                │
          │                 │                 │                 │
          └─────────────────┴─────────────────┴─────────────────┘
                             │
                             ▼
          ┌─────────────────────────────────────────────────┐
          │         EMAIL SERVICE (Port 3000)               │
          │                                                 │
          │  ┌───────────────────────────────────────────┐ │
          │  │          API Layer (Express)              │ │
          │  │  • Authentication (API Key)               │ │
          │  │  • Rate Limiting                          │ │
          │  │  • Request Validation                     │ │
          │  │  • Error Handling                         │ │
          │  └──────────────┬────────────────────────────┘ │
          │                 │                               │
          │  ┌──────────────▼────────────────────────────┐ │
          │  │         Controller Layer                  │ │
          │  │  • Route handling                         │ │
          │  │  • Response formatting                    │ │
          │  └──────────────┬────────────────────────────┘ │
          │                 │                               │
          │  ┌──────────────▼────────────────────────────┐ │
          │  │         Service Layer                     │ │
          │  │                                           │ │
          │  │  ┌─────────────────┐  ┌────────────────┐ │ │
          │  │  │ Template Service│  │  Email Service │ │ │
          │  │  │                 │  │                │ │ │
          │  │  │ • Load template │  │ • SMTP config  │ │ │
          │  │  │ • Compile HBS   │  │ • Send email   │ │ │
          │  │  │ • Render data   │  │ • Verify conn  │ │ │
          │  │  └────────┬────────┘  └────────┬───────┘ │ │
          │  └───────────┼──────────────────────┼─────────┘ │
          │              │                      │             │
          │  ┌───────────▼────────┐  ┌─────────▼─────────┐  │
          │  │    Templates       │  │   Nodemailer      │  │
          │  │  • verification    │  │   Transporter     │  │
          │  │  • welcome         │  └─────────┬─────────┘  │
          │  │  • password-reset  │            │             │
          │  │  • notification    │            │             │
          │  └────────────────────┘            │             │
          └────────────────────────────────────┼─────────────┘
                                               │
                                    SMTP Protocol
                                               │
                                               ▼
                          ┌────────────────────────────────┐
                          │      SENDPULSE SMTP SERVER     │
                          │         smtp-pulse.com         │
                          │          Port: 465             │
                          └────────────┬───────────────────┘
                                       │
                                       ▼
                          ┌────────────────────────────────┐
                          │      EMAIL DELIVERY            │
                          │   ✉️  user@example.com         │
                          └────────────────────────────────┘
```

## Request Flow

### 1. User Registration Flow

```
┌─────────┐                    ┌──────────┐                  ┌──────────┐
│  User   │                    │ Your App │                  │  Email   │
│ Browser │                    │  Server  │                  │ Service  │
└────┬────┘                    └────┬─────┘                  └────┬─────┘
     │                              │                              │
     │ 1. POST /register            │                              │
     │ {name, email, password}      │                              │
     ├─────────────────────────────►│                              │
     │                              │                              │
     │                              │ 2. Validate & Save User      │
     │                              │    to Database               │
     │                              │                              │
     │                              │ 3. Generate Token            │
     │                              │    token = uuid()            │
     │                              │                              │
     │                              │ 4. POST /api/email/send      │
     │                              │    X-API-Key: xxx            │
     │                              │    {                         │
     │                              │      to: email,              │
     │                              │      template: "verification"│
     │                              │      data: {...}             │
     │                              │    }                         │
     │                              ├─────────────────────────────►│
     │                              │                              │
     │                              │                              │ 5. Authenticate
     │                              │                              │    API Key
     │                              │                              │
     │                              │                              │ 6. Load & Render
     │                              │                              │    Template
     │                              │                              │
     │                              │                              │ 7. Send to SMTP
     │                              │                              │    (SendPulse)
     │                              │                              │
     │                              │ 8. {success: true}          │
     │                              │◄─────────────────────────────┤
     │                              │                              │
     │ 9. {success: true,          │                              │
     │    message: "Check email"}  │                              │
     │◄─────────────────────────────┤                              │
     │                              │                              │
     │                              │                          ┌───▼────┐
     │                              │                          │SendPulse│
     │                              │                          │  SMTP  │
     │                              │                          └───┬────┘
     │                              │                              │
     │                          ┌───▼────┐                         │
     │      10. Email received  │ Email  │◄────────────────────────┘
     │◄─────────────────────────┤Provider│
     │                          │ (Gmail)│
     │                          └────────┘
     │
     │ 11. Click verification link
     │
```

## Component Details

### 1. API Layer (app.js)

**Responsibilities:**
- HTTP server setup (Express)
- Middleware configuration (CORS, Helmet, Rate Limiting)
- Route mounting
- Error handling

**Key Features:**
- **Security**: Helmet for HTTP headers, CORS for cross-origin
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Body Parsing**: JSON/URL-encoded with 10MB limit
- **Request Logging**: All requests logged with timestamp, method, path, IP

**Endpoints:**
```javascript
GET  /                      // Service info
GET  /api/email/health      // Health check (no auth)
POST /api/email/send        // Send single email (auth required)
POST /api/email/send-bulk   // Send bulk emails (auth required)
GET  /api/email/templates   // List templates (auth required)
```

### 2. Authentication Middleware (auth.js)

**Flow:**
```
Request
   │
   ├─► Check for API key in headers
   │     • X-API-Key header
   │     • Authorization: Bearer <key>
   │
   ├─► Validate API key
   │     • Compare with stored keys
   │     • Check if key exists
   │
   ├─► Allow or reject
   │     • 401 if no key
   │     • 403 if invalid key
   │     • next() if valid
   │
   └─► Controller
```

### 3. Validation Middleware (validator.js)

**Using Joi Schemas:**
```javascript
// Validates email request
sendEmail: {
  to: string.email OR array[string.email],
  subject: string (1-500 chars),
  template: string (optional),
  html: string (optional),
  data: object (optional),
  // Must have either template OR html
}
```

**Validation Flow:**
1. Parse request body
2. Validate against schema
3. Strip unknown fields
4. Return 400 if errors
5. Attach validated data to `req.validatedData`

### 4. Email Service (emailService.js)

**Nodemailer Configuration:**
```javascript
{
  host: 'smtp-pulse.com',
  port: 465,
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD
  }
}
```

**Methods:**
- `verifyConnection()` - Test SMTP connection
- `sendEmail()` - Send single email
- `sendBulkEmail()` - Send multiple emails

### 5. Template Service (templateService.js)

**Handlebars Template Engine:**

**Flow:**
1. Load `.hbs` file from disk
2. Compile to function (cached)
3. Execute with data object
4. Return rendered HTML

**Template Variables:**
```javascript
// Example verification template data
{
  userName: 'John Doe',
  verificationUrl: 'https://app.com/verify?token=abc',
  verificationCode: '123456',
  expiresIn: '30',
  companyName: 'Your Company',
  year: '2024'
}
```

**Template Cache:**
- Templates compiled once
- Stored in memory
- Reused for subsequent requests
- `clearCache()` method available

## Data Flow: Sending an Email

```
1. Client Request
   ↓
2. Express receives HTTP POST
   ↓
3. Rate Limiter checks request count
   ↓
4. Body Parser parses JSON
   ↓
5. Auth middleware validates API key
   ↓
6. Validator middleware validates schema
   ↓
7. Controller receives request
   ↓
8. If template specified:
   ├─► Template Service loads template
   ├─► Handlebars compiles template
   └─► Renders with provided data
   ↓
9. Email Service creates mail options
   ↓
10. Nodemailer transporter sends email
    ↓
11. SendPulse SMTP receives email
    ↓
12. SendPulse delivers to recipient
    ↓
13. Response sent back to client
```

## Security Architecture

### Defense Layers

```
┌────────────────────────────────────────┐
│  1. Rate Limiting                      │  ← 100 req/15min per IP
├────────────────────────────────────────┤
│  2. CORS Policy                        │  ← Only allowed origins
├────────────────────────────────────────┤
│  3. Helmet (HTTP Headers)              │  ← Security headers
├────────────────────────────────────────┤
│  4. API Key Authentication             │  ← Validate API key
├────────────────────────────────────────┤
│  5. Request Validation (Joi)           │  ← Schema validation
├────────────────────────────────────────┤
│  6. Input Sanitization                 │  ← Strip unknown fields
├────────────────────────────────────────┤
│  7. Error Handling                     │  ← No info leakage
└────────────────────────────────────────┘
```

### API Key Flow

```
.env file
   │
   ├─► API_KEYS=key1,key2,key3
   │
   ├─► Config loads and splits
   │     config.security.apiKeys = ['key1', 'key2', 'key3']
   │
   └─► Middleware checks incoming key
         │
         ├─► Key matches → Allow
         └─► Key doesn't match → 403 Forbidden
```

## Scalability Considerations

### Current Architecture
```
Single Node.js Process
   │
   ├─► Handles 100 req/15min per IP
   ├─► In-memory template cache
   └─► Direct SMTP connection
```

### Production Scaling

```
                    Load Balancer
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    Service 1        Service 2       Service 3
        │                │                │
        └────────────────┼────────────────┘
                         │
                    Redis Cache
                  (Template Cache)
                         │
                    Message Queue
                   (Bull/RabbitMQ)
                         │
                    Email Workers
                         │
                    SendPulse SMTP
```

**Recommendations:**
1. **Multiple Instances**: Deploy behind load balancer
2. **Redis Cache**: Share template cache across instances
3. **Message Queue**: Queue emails for async processing
4. **Worker Processes**: Separate workers for sending
5. **Database**: Store email logs and retry queue
6. **Monitoring**: Track success/failure rates

## File Structure & Responsibilities

```
src/
├── config/
│   └── index.js              # Configuration management
│                             # Loads environment variables
│                             # Exports config object
│
├── controllers/
│   └── emailController.js    # Route handlers
│                             # Request/response logic
│                             # Calls services
│
├── middleware/
│   ├── auth.js              # API key authentication
│   └── validator.js         # Request validation (Joi)
│
├── routes/
│   └── emailRoutes.js       # Route definitions
│                             # Maps paths to controllers
│                             # Applies middleware
│
├── services/
│   ├── emailService.js      # SMTP/Nodemailer logic
│   └── templateService.js   # Template loading/rendering
│
├── templates/
│   ├── verification/        # Email templates
│   ├── welcome/             # (Handlebars .hbs)
│   ├── password-reset/
│   ├── notification/
│   └── layouts/
│
├── utils/
│   └── logger.js            # Logging utility
│
├── app.js                   # Express app setup
│                             # Middleware configuration
│                             # Route mounting
│
└── server.js                # Server entry point
                              # Starts HTTP server
                              # Graceful shutdown
```

## Communication Protocol

### Request Format

```http
POST /api/email/send HTTP/1.1
Host: localhost:3000
Content-Type: application/json
X-API-Key: your_secret_api_key_1

{
  "to": "user@example.com",
  "subject": "Email Subject",
  "template": "verification",
  "data": {
    "userName": "John Doe",
    "verificationUrl": "https://app.com/verify?token=abc123",
    "companyName": "Your Company",
    "year": "2024"
  }
}
```

### Response Format

**Success (200):**
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

**Error (400/401/403/500):**
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "details": []
}
```

## Technology Stack

- **Runtime**: Node.js (ES6 Modules)
- **Framework**: Express.js
- **Template Engine**: Handlebars
- **Email**: Nodemailer
- **Validation**: Joi
- **Security**: Helmet, CORS
- **Rate Limiting**: express-rate-limit
- **SMTP Provider**: SendPulse

## Performance Metrics

### Expected Performance

| Metric | Value |
|--------|-------|
| Average Response Time | < 100ms (without email sending) |
| Email Send Time | 1-3 seconds (depends on SMTP) |
| Concurrent Connections | 1000+ (Node.js default) |
| Template Rendering | < 10ms (cached) |
| Template First Load | < 50ms |
| Memory Usage | ~50MB base + templates |

### Bottlenecks

1. **SMTP Connection**: 1-3 seconds per email
2. **Template Loading**: First load only (~50ms)
3. **Validation**: Minimal (~1ms)
4. **Rate Limiting**: Memory-based (fast)

### Optimization Strategies

1. **Template Caching**: ✅ Already implemented
2. **Connection Pooling**: ✅ Nodemailer handles this
3. **Async Email Sending**: ⚠️ Recommended for production
4. **Database Logging**: ⚠️ Optional, adds latency

---

## Summary

The email service is a **stateless REST API** that:
1. Accepts requests from any application via HTTP
2. Authenticates using API keys
3. Validates and processes requests
4. Renders email templates with dynamic data
5. Sends emails via SendPulse SMTP
6. Returns success/failure response

**Key Design Principles:**
- ✅ Separation of concerns (MVC pattern)
- ✅ Stateless (can scale horizontally)
- ✅ Secure by default (multiple security layers)
- ✅ Easy to integrate (simple REST API)
- ✅ Modern JavaScript (ES6 modules)
- ✅ Production-ready (error handling, logging, rate limiting)
