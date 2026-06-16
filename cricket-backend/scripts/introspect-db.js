require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

(async () => {
  try {
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    console.log('TABLES:', tables.rows.length);
    console.log(tables.rows.map((r) => r.table_name).join(', '));

    const userCols = await pool.query(
      "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position"
    );
    console.log('\nUSERS COLUMNS:');
    userCols.rows.forEach((c) => console.log(' -', c.column_name, c.data_type, c.udt_name));

    const enums = await pool.query(
      "SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname IN ('account_role','platform_role','match_status','match_format','delivery_type','dismissal_type','phase_enum','tournament_format') ORDER BY t.typname, e.enumsortorder"
    );
    console.log('\nENUMS:');
    let cur = '';
    enums.rows.forEach((r) => {
      if (r.typname !== cur) {
        cur = r.typname;
        console.log(r.typname + ':');
      }
      console.log('  ', r.enumlabel);
    });

    const counts = await pool.query(`
      SELECT 'users' AS t, count(*)::text AS c FROM users
      UNION ALL SELECT 'clubs', count(*)::text FROM clubs
      UNION ALL SELECT 'matches', count(*)::text FROM matches
      UNION ALL SELECT 'teams', count(*)::text FROM teams
      UNION ALL SELECT 'players', count(*)::text FROM players
      UNION ALL SELECT 'deliveries', count(*)::text FROM deliveries
      UNION ALL SELECT 'scorer_assignments', count(*)::text FROM scorer_assignments
    `);
    console.log('\nROW COUNTS:');
    counts.rows.forEach((r) => console.log(r.t + ':', r.c));
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
