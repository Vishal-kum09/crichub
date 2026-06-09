const { pool } = require('../../db');
const logger = require('../../config/logger');

const healthCheck = async (req, res) => {
  try {
    // Verify DB is alive
    const dbResult = await pool.query('SELECT NOW() as db_time');

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'cricket-backend',
      version: '1.0.0',
      database: {
        status: 'connected',
        db_time: dbResult.rows[0].db_time
      },
      environment: process.env.NODE_ENV
    };

    logger.info('Health check passed', health);
    return res.status(200).json(health);

  } catch (err) {
    logger.error('Health check failed', { error: err.message });
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'cricket-backend',
      database: { status: 'disconnected', error: err.message }
    });
  }
};

module.exports = { healthCheck };
