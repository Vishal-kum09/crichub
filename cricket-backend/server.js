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

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security & Parsing Middleware ───────────────────────────────────────────

// Helmet sets secure HTTP headers (HSTS, X-Content-Type-Options, frameguard,
// etc.) automatically.
app.use(helmet());

// CORS: in production lock to the deployed frontend origin (set FRONTEND_ORIGIN
// to the Cloud Run frontend URL); in development allow the local Vite dev server.
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_ORIGIN || 'https://cricket-frontend-REPLACE-nw.a.run.app')
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' })); // Prevent payload bloat attacks
app.use(express.urlencoded({ extended: true }));

// ─── Request Logging ─────────────────────────────────────────────────────────

app.use(requestLogger);

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const WINDOW = 15 * 60 * 1000; // 15 minutes
const limiter = (max, message) => rateLimit({
  windowMs: WINDOW,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false
});

const globalLimiter = limiter(200, 'Too many requests, please try again later');
const authLimiter = limiter(20, 'Too many authentication attempts, please try again later');
const loginLimiter = limiter(10, 'Too many login attempts, please try again later');
const otpLimiter = limiter(5, 'Too many OTP requests, please try again later');

// Order matters — express runs every matching limiter. The most specific
// (login, otp) are registered before the broader /api/auth and /api buckets, so
// a login request is capped by the strictest applicable limit.
app.use('/api', globalLimiter);                 // all /api          → 200 / 15m
app.use('/api/auth', authLimiter);              // all /api/auth/*   → 20  / 15m
app.use('/api/auth/login', loginLimiter);       // login             → 10  / 15m
app.use('/api/auth/otp/send', otpLimiter);      // otp send          → 5   / 15m

// ─── Routes ───────────────────────────────────────────────────────────────────

// Phase 0: Health check
app.get('/health', healthCheck);

// Phase 2+: Auth routes
app.use('/api/auth', require('./src/routes/authRoutes'));

// Phase 3+: Viewer routes
app.use('/api/viewer', require('./src/routes/viewerRoutes'));

// Phase 4+: Scorer routes
app.use('/api/scorer', require('./src/routes/scorerRoutes'));

// Phase 5+: Club Admin routes
app.use('/api/club-admin', require('./src/routes/clubAdminRoutes'));

// Phase 5+: Super Admin routes
app.use('/api/super-admin', require('./src/routes/superAdminRoutes'));

// Phase 6+: Player routes
app.use('/api/player', require('./src/routes/playerRoutes'));

// Phase 6+: Analyst routes
app.use('/api/analyst', require('./src/routes/analystRoutes'));

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const start = async () => {
  try {
    // Verify DB before accepting traffic
    await testConnection();

    app.listen(PORT, () => {
      logger.info('CricketHub backend started', {
        port: PORT,
        environment: process.env.NODE_ENV,
        database: process.env.DB_NAME,
        db_host: process.env.DB_HOST
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
};

start();

module.exports = app; // Export for Jest tests
