import config from '../config/index.js';
import logger from '../utils/logger.js';

export const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    logger.warn('Authentication failed: No API key provided', {
      ip: req.ip,
      path: req.path,
    });

    return res.status(401).json({
      success: false,
      error: 'API key is required',
      message: 'Please provide an API key in the X-API-Key header or Authorization header',
    });
  }

  if (!config.security.apiKeys.includes(apiKey)) {
    logger.warn('Authentication failed: Invalid API key', {
      ip: req.ip,
      path: req.path,
    });

    return res.status(403).json({
      success: false,
      error: 'Invalid API key',
      message: 'The provided API key is not valid',
    });
  }

  logger.info('Authentication successful', {
    ip: req.ip,
    path: req.path,
  });

  next();
};
