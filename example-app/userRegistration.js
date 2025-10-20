/**
 * Example: User Registration Flow with Email Service Integration
 *
 * This example shows how YOUR APPLICATION would use the email service
 * when a user successfully registers.
 */

import axios from 'axios';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Email Service Client
// ============================================================================

class EmailServiceClient {
  constructor() {
    // Email service configuration
    this.baseURL = process.env.EMAIL_SERVICE_URL || 'http://localhost:3000/api/email';
    this.apiKey = process.env.EMAIL_SERVICE_API_KEY || 'your_secret_api_key_1';

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      timeout: 10000,
    });
  }

  /**
   * Send verification email after user registration
   */
  async sendVerificationEmail({ email, userName, verificationToken }) {
    try {
      const response = await this.client.post('/send', {
        to: email,
        subject: 'Verify Your Email Address',
        template: 'verification',
        data: {
          userName,
          verificationUrl: `${process.env.APP_URL}/auth/verify-email?token=${verificationToken}`,
          verificationCode: this._generateCode(),
          expiresIn: '30',
          companyName: 'Your Company',
          year: new Date().getFullYear().toString(),
        },
      });

      console.log(`✅ Verification email sent to ${email}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send verification email:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send welcome email after email verification
   */
  async sendWelcomeEmail({ email, userName }) {
    try {
      const response = await this.client.post('/send', {
        to: email,
        subject: 'Welcome to Our Platform! 🎉',
        template: 'welcome',
        data: {
          userName,
          companyName: 'Your Company',
          welcomeMessage: `We're thrilled to have you here, ${userName}!`,
          features: [
            {
              title: '🚀 Fast & Reliable',
              description: 'Lightning-fast performance for all your needs',
            },
            {
              title: '🔒 Secure',
              description: 'Your data is protected with enterprise-grade security',
            },
            {
              title: '🎨 Beautiful UI',
              description: 'Intuitive design that makes everything easy',
            },
          ],
          gettingStarted: [
            {
              title: 'Complete Your Profile',
              description: 'Add your information to personalize your experience',
            },
            {
              title: 'Explore Features',
              description: 'Take a tour of all the amazing things you can do',
            },
            {
              title: 'Get Help',
              description: 'Check out our help center or contact support',
            },
          ],
          dashboardUrl: `${process.env.APP_URL}/dashboard`,
          supportEmail: 'support@yourcompany.com',
          helpUrl: `${process.env.APP_URL}/help`,
          year: new Date().getFullYear().toString(),
        },
      });

      console.log(`✅ Welcome email sent to ${email}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail({ email, userName, resetToken }) {
    try {
      const response = await this.client.post('/send', {
        to: email,
        subject: 'Reset Your Password',
        template: 'password-reset',
        data: {
          userName,
          resetUrl: `${process.env.APP_URL}/auth/reset-password?token=${resetToken}`,
          expiresIn: '60',
          ipAddress: '127.0.0.1', // Get from request in real app
          userAgent: 'Chrome on Windows', // Get from request in real app
          requestTime: new Date().toLocaleString(),
          companyName: 'Your Company',
          year: new Date().getFullYear().toString(),
        },
      });

      console.log(`✅ Password reset email sent to ${email}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send notification email
   */
  async sendNotification({ email, userName, title, message, type = 'info', actionUrl, actionText }) {
    try {
      const response = await this.client.post('/send', {
        to: email,
        subject: title,
        template: 'notification',
        data: {
          userName,
          notificationTitle: title,
          notificationType: type, // info, success, warning, error
          title,
          message,
          actionUrl,
          actionText,
          companyName: 'Your Company',
          year: new Date().getFullYear().toString(),
        },
      });

      console.log(`✅ Notification sent to ${email}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send notification:', error.response?.data || error.message);
      throw error;
    }
  }

  _generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

// ============================================================================
// User Controller - Registration Example
// ============================================================================

class UserController {
  constructor() {
    this.emailService = new EmailServiceClient();
  }

  /**
   * Handle user registration
   * This is what YOUR APPLICATION would do when a user registers
   */
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // 1. Validate input
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide name, email, and password',
        });
      }

      // 2. Check if user already exists (simulated)
      // In real app: const existingUser = await User.findOne({ email });
      console.log(`📝 Checking if user exists: ${email}`);

      // 3. Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log(`🔐 Password hashed`);

      // 4. Generate verification token
      const verificationToken = uuidv4();
      console.log(`🎫 Verification token generated: ${verificationToken}`);

      // 5. Save user to database (simulated)
      // In real app: const user = await User.create({ name, email, password: hashedPassword, verificationToken })
      const user = {
        id: uuidv4(),
        name,
        email,
        password: hashedPassword,
        verificationToken,
        isVerified: false,
        createdAt: new Date(),
      };
      console.log(`💾 User saved to database:`, { id: user.id, email: user.email });

      // 6. Send verification email (async - don't block response)
      // This is where we communicate with the email service!
      this.emailService.sendVerificationEmail({
        email: user.email,
        userName: user.name,
        verificationToken: user.verificationToken,
      }).catch(err => {
        // Log error but don't fail registration
        console.error('Email service error (non-blocking):', err.message);
      });

      // 7. Return success response immediately
      console.log(`✅ Registration successful for ${email}`);
      return res.status(201).json({
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        data: {
          userId: user.id,
          name: user.name,
          email: user.email,
          isVerified: user.isVerified,
        },
      });

    } catch (error) {
      console.error('❌ Registration failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message,
      });
    }
  }

  /**
   * Handle email verification
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
        });
      }

      // 1. Find user by verification token (simulated)
      // In real app: const user = await User.findOne({ verificationToken: token });
      console.log(`🔍 Looking up user with token: ${token}`);

      const user = {
        id: uuidv4(),
        name: 'John Doe',
        email: 'john@example.com',
        verificationToken: token,
        isVerified: false,
      };

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token',
        });
      }

      // 2. Update user as verified (simulated)
      // In real app: user.isVerified = true; user.verificationToken = null; await user.save();
      user.isVerified = true;
      user.verificationToken = null;
      console.log(`✅ Email verified for ${user.email}`);

      // 3. Send welcome email (async)
      this.emailService.sendWelcomeEmail({
        email: user.email,
        userName: user.name,
      }).catch(err => {
        console.error('Failed to send welcome email:', err.message);
      });

      // 4. Return success
      return res.status(200).json({
        success: true,
        message: 'Email verified successfully! Welcome aboard! 🎉',
        data: {
          userId: user.id,
          email: user.email,
          isVerified: user.isVerified,
        },
      });

    } catch (error) {
      console.error('❌ Email verification failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Verification failed',
        error: error.message,
      });
    }
  }

  /**
   * Handle password reset request
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      // 1. Find user by email (simulated)
      console.log(`🔍 Looking up user: ${email}`);

      const user = {
        id: uuidv4(),
        name: 'John Doe',
        email: email,
      };

      if (!user) {
        // For security, return success even if user not found
        return res.status(200).json({
          success: true,
          message: 'If an account exists with that email, a password reset link has been sent.',
        });
      }

      // 2. Generate reset token
      const resetToken = uuidv4();
      console.log(`🎫 Reset token generated: ${resetToken}`);

      // 3. Send password reset email
      await this.emailService.sendPasswordResetEmail({
        email: user.email,
        userName: user.name,
        resetToken,
      });

      // 4. Return success
      return res.status(200).json({
        success: true,
        message: 'Password reset link has been sent to your email.',
      });

    } catch (error) {
      console.error('❌ Password reset request failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process password reset request',
      });
    }
  }
}

// ============================================================================
// Example Usage / Testing
// ============================================================================

async function testRegistrationFlow() {
  console.log('\n🚀 Starting Registration Flow Test\n');
  console.log('='.repeat(50));

  const controller = new UserController();

  // Simulate Express request/response objects
  const mockReq = {
    body: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'SecurePassword123!',
    },
    query: {},
  };

  const mockRes = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      console.log('\n📤 API Response:');
      console.log(JSON.stringify(data, null, 2));
      return this;
    },
  };

  // Test registration
  console.log('\n1️⃣  Testing User Registration...\n');
  await controller.register(mockReq, mockRes);

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Registration flow completed!\n');
  console.log('📧 Check your email service logs to see the email being sent.');
  console.log('\nNote: SMTP authentication will fail unless you configure');
  console.log('real SendPulse credentials in .env file.\n');
}

// Run the test if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  // Set environment variables for testing
  process.env.EMAIL_SERVICE_URL = 'http://localhost:3000/api/email';
  process.env.EMAIL_SERVICE_API_KEY = 'your_secret_api_key_1';
  process.env.APP_URL = 'http://localhost:5000';

  console.log('\n📌 Make sure the email service is running on port 3000!');
  console.log('   Run: npm start\n');

  // Give user a moment to read
  setTimeout(() => {
    testRegistrationFlow().catch(console.error);
  }, 2000);
}

// Export for use in other files
export { EmailServiceClient, UserController };
