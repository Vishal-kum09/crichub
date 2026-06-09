const logger = require('../../config/logger');

// Central error handler — catches everything thrown in route handlers
const errorHandler = (err, req, res, next) => {
  // Log full error internally
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    user_id: req.user?.user_id || 'unauthenticated'
  });

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Record already exists', detail: err.detail });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist', detail: err.detail });
  }

  // Known operational errors with status codes
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Unknown — 500
  const isDev = process.env.NODE_ENV === 'development';
  return res.status(500).json({
    error: 'Internal server error',
    ...(isDev && { detail: err.message, stack: err.stack })
  });
};

// Helper to create structured app errors
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

module.exports = { errorHandler, AppError };
