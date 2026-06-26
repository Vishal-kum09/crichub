require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const logger = require('./config/logger');
const { testConnection } = require('./db');
const { requestLogger } = require('./src/middlewares/requestLogger');
const { errorHandler } = require('./src/middlewares/errorHandler');
const { healthCheck } = require('./src/controllers/healthController');
const userRoutes = require('./src/routes/userRoutes');

const app = express();

const PORT = process.env.PORT || 8080;

// ─── Security & Parsing Middleware ───────────────────────────────────────────

// Helmet sets secure HTTP headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_ORIGIN || 'https://cricket-frontend-REPLACE-nw.a.run.app')
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Logging ─────────────────────────────────────────────────────────

app.use(requestLogger);

// ─── Rate Limiting ───────────────────────────────────────────────────────────

const WINDOW = 15 * 60 * 1000; // 15 minutes

const limiter = (max, message) => rateLimit({
  windowMs: WINDOW,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false
});

const globalLimiter = limiter(
  200,
  'Too many requests, please try again later'
);

const authLimiter = limiter(
  20,
  'Too many authentication attempts, please try again later'
);

const loginLimiter = limiter(
  10,
  'Too many login attempts, please try again later'
);

const otpLimiter = limiter(
  5,
  'Too many OTP requests, please try again later'
);

// Apply limiters
app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/otp/send', otpLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health check
app.get('/health', healthCheck);

// Auth routes
app.use('/api/auth', require('./src/routes/authRoutes'));

// Viewer routes
app.use('/api/viewer', require('./src/routes/viewerRoutes'));

// Scorer routes
app.use('/api/scorer', require('./src/routes/scorerRoutes'));

// Club Admin routes
app.use('/api/club-admin', require('./src/routes/clubAdminRoutes'));

// Super Admin routes
app.use('/api/super-admin', require('./src/routes/superAdminRoutes'));

// Player routes
app.use('/api/player', require('./src/routes/playerRoutes'));

// Analyst routes
app.use('/api/analyst', require('./src/routes/analystRoutes'));

app.use('/api/users', userRoutes);
// Club analytics (club admin + scorer)
app.use('/api/club-analytics', require('./src/routes/clubAnalyticsRoutes'));

// Add this line where your other app.use('/api/...', ...) routes are:
app.use('/api/notifications', require('./src/routes/notificationRoutes')); // Adjust the path if your routes folder is not inside 'src'

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const start = async () => {
  try {
    // Verify DB before accepting traffic
    await testConnection();

    app.listen(PORT, '0.0.0.0', () => {
      logger.info('CricketHub backend started', {
        port: PORT,
        environment: process.env.NODE_ENV,
        database: process.env.DB_NAME,
        db_host: process.env.DB_HOST
      });

      console.log(`Server is running on port ${PORT}`);
    });

  } catch (err) {
    logger.error('Failed to start server', {
      error: err.message
    });

    process.exit(1);
  }
};

start();

module.exports = app;