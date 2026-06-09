require('dotenv').config();
const { Pool } = require('pg');
const logger = require('./config/logger');

// Cloud SQL connection name for the Unix-socket path used in production
// (Cloud Run + Cloud SQL Auth Proxy). Overridable via env for other instances.
const INSTANCE_CONNECTION_NAME =
  process.env.INSTANCE_CONNECTION_NAME ||
  'sportsanalytics-495612:europe-west2:sportsdb';

const isProduction = process.env.NODE_ENV === 'production';

// Two connection methods:
//  - production: Unix socket via the Cloud SQL Auth Proxy (/cloudsql/<conn>).
//    No TCP host/port, no TLS — the proxy handles transport security.
//  - development: TCP to DB_HOST:DB_PORT (Cloud SQL public IP requires TLS).
const poolConfig = isProduction
  ? {
      host: `/cloudsql/${INSTANCE_CONNECTION_NAME}`,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      // Cloud SQL public IP requires TLS. Default on; set DB_SSL=false only for a
      // plain local Postgres that doesn't speak TLS.
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    };

const pool = new Pool({
  ...poolConfig,
  max: 20,                       // max pool connections
  idleTimeoutMillis: 30000,      // close idle connections after 30s
  connectionTimeoutMillis: 5000  // fail fast if DB unreachable
});

// Log pool errors without crashing
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

// Test connectivity on startup
const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as connected_at, current_database() as db_name');
    logger.info('Database connection established', {
      connected_at: result.rows[0].connected_at,
      db_name: result.rows[0].db_name,
      mode: isProduction ? 'unix_socket' : 'tcp',
      target: isProduction ? `/cloudsql/${INSTANCE_CONNECTION_NAME}` : process.env.DB_HOST
    });
  } catch (err) {
    logger.error('Database connection failed', {
      error: err.message,
      mode: isProduction ? 'unix_socket' : 'tcp',
      db: process.env.DB_NAME
    });
    process.exit(1); // Cannot run without DB
  } finally {
    if (client) client.release();
  }
};

// Parameterized query helper — prevents SQL injection
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn('Slow query detected', { query: text, duration_ms: duration });
    }
    return result;
  } catch (err) {
    logger.error('Query error', { query: text, error: err.message });
    throw err;
  }
};

// Transaction helper — wraps operations in BEGIN/COMMIT/ROLLBACK
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, withTransaction, testConnection };
