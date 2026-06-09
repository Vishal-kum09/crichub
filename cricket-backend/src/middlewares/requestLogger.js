const logger = require('../../config/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error'
      : res.statusCode >= 400 ? 'warn'
      : 'info';

    logger[level]('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration_ms: duration,
      user_id: req.user?.user_id || 'unauthenticated',
      role: req.user?.role || null
    });
  });

  next();
};

module.exports = { requestLogger };
