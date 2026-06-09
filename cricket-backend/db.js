require('dotenv').config();
const { Pool } = require('pg');
const logger = require('./config/logger');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,                  // max pool connections
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 5000, // fail fast if DB unreachable
  // Cloud SQL public IP requires TLS. Default on; set DB_SSL=false only for a
  // plain local Postgres that doesn't speak TLS.
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
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
      host: process.env.DB_HOST
    });
  } catch (err) {
    logger.error('Database connection failed', {
      error: err.message,
      host: process.env.DB_HOST,
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
