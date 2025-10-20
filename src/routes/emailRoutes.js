import express from 'express';
import emailController from '../controllers/emailController.js';
import { validate, schemas } from '../middleware/validator.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Health check endpoint (no auth required)
router.get('/health', emailController.healthCheck);

// Protected routes (require API key)
router.post('/send', authenticate, validate(schemas.sendEmail), emailController.sendEmail);
router.post('/send-bulk', authenticate, validate(schemas.sendBulkEmail), emailController.sendBulkEmail);
router.get('/templates', authenticate, emailController.getTemplates);

// Monitoring and Admin endpoints (require API key)
router.get('/stats/errors', authenticate, emailController.getErrorStats);
router.post('/admin/circuit-breaker/reset', authenticate, emailController.resetCircuitBreaker);

export default router;
