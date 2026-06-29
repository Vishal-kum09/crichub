const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/crichub'
});

(async () => {
  const client = await pool.connect();
  try {
    // Check partnerships table columns
    const pCols = await client.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1', ['partnerships']);
    console.log('partnerships columns:', pCols.rows.map(c => c.column_name).join(', '));
    
    const oCols = await client.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1', ['overs']);
    console.log('overs columns:', oCols.rows.map(c => c.column_name).join(', '));

    const iCols = await client.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', ['innings']);
    console.log('innings columns:', iCols.rows.map(c => c.column_name).join(', '));

    // Get match IDs with their innings
    const matches = await client.query('SELECT matches_id, status FROM matches ORDER BY created_at DESC LIMIT 5');
    console.log('\nMatches:', JSON.stringify(matches.rows));

    for (const m of matches.rows) {
      console.log('\n--- Match:', m.matches_id);
      
      // Check innings for this match
      const innings = await client.query('SELECT innings_id, innings_number FROM innings WHERE match_id = $1', [m.matches_id]);
      console.log('Innings:', innings.rows.length, JSON.stringify(innings.rows));
      
      for (const inn of innings.rows) {
        const p = await client.query('SELECT COUNT(*) as cnt FROM partnerships WHERE innings_id = $1', [inn.innings_id]);
        const o = await client.query('SELECT COUNT(*) as cnt FROM overs WHERE innings_id = $1', [inn.innings_id]);
        const d = await client.query('SELECT COUNT(*) as cnt FROM deliveries WHERE innings_id = $1', [inn.innings_id]);
        console.log(`  Innings ${inn.innings_number}: partnerships=${p.rows[0].cnt} overs=${o.rows[0].cnt} deliveries=${d.rows[0].cnt}`);
        
        if (Number(p.rows[0].cnt) > 0) {
          const sample = await client.query('SELECT * FROM partnerships WHERE innings_id = $1 LIMIT 2', [inn.innings_id]);
          console.log('  Sample partnerships:', JSON.stringify(sample.rows));
        }
        if (Number(o.rows[0].cnt) > 0) {
          const sample = await client.query('SELECT * FROM overs WHERE innings_id = $1 LIMIT 2', [inn.innings_id]);
          console.log('  Sample overs:', JSON.stringify(sample.rows));
        }
      }
    }
  } finally {
    client.release();
  }
  pool.end();
})().catch(e => { console.error(e); process.exit(1); });
