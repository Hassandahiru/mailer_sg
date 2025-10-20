import app from './app.js';
import config from './config/index.js';
import logger from './utils/logger.js';
import emailService from './services/emailService.js';

const startServer = async () => {
  try {
    // Verify SMTP connection
    const smtpStatus = await emailService.verifyConnection();

    if (!smtpStatus.success) {
      logger.warn('SMTP connection failed, but server will start anyway', {
        error: smtpStatus.message,
      });
    }

    // Start server
    const server = app.listen(config.server.port, () => {
      logger.info('Email service started', {
        port: config.server.port,
        env: config.server.env,
        smtp: {
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
        },
      });

      console.log('\n=================================');
      console.log(`🚀 Email Service is running!`);
      console.log(`📧 Port: ${config.server.port}`);
      console.log(`🌍 Environment: ${config.server.env}`);
      console.log(`📮 SMTP: ${smtpStatus.success ? '✅ Connected' : '❌ Not Connected'}`);
      console.log('=================================\n');
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      logger.info('Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
