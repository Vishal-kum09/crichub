const { Pool } = require("pg");
const pool = new Pool({ host: "34.39.102.188", port: 5432, database: "postgres", user: "postgres", password: "Admin1234!", ssl: { rejectUnauthorized: false } });
(async () => {
  const c = await pool.connect();
  try {
    const matchId = "20bc77fa-93fc-4e74-8ce6-c522b6c0048e";
    const inn = await c.query("SELECT innings_id, innings_number FROM innings WHERE match_id = $1", [matchId]);
    console.log("Innings count:", inn.rows.length);
    console.log("Innings:", JSON.stringify(inn.rows));
    for (const i of inn.rows) {
      const p = await c.query("SELECT COUNT(*)::int as cnt FROM partnerships WHERE innings_id = $1", [i.innings_id]);
      const o = await c.query("SELECT COUNT(*)::int as cnt FROM overs WHERE innings_id = $1", [i.innings_id]);
      const d = await c.query("SELECT COUNT(*)::int as cnt FROM deliveries WHERE innings_id = $1", [i.innings_id]);
      console.log("Innings " + i.innings_number + ": p=" + p.rows[0].cnt + " o=" + o.rows[0].cnt + " d=" + d.rows[0].cnt);
      if (p.rows[0].cnt > 0) {
        const sample = await c.query("SELECT * FROM partnerships WHERE innings_id = $1 LIMIT 2", [i.innings_id]);
        console.log("  P sample:", JSON.stringify(sample.rows));
      }
      if (o.rows[0].cnt > 0) {
        const sample = await c.query("SELECT * FROM overs WHERE innings_id = $1 LIMIT 2", [i.innings_id]);
        console.log("  O sample:", JSON.stringify(sample.rows));
      }
    }
    console.log("\\nAll matches:");
    const all = await c.query("SELECT m.matches_id, (SELECT COUNT(*) FROM innings i WHERE i.match_id = m.matches_id) as inn, (SELECT COUNT(*) FROM innings i JOIN partnerships p ON p.innings_id = i.innings_id WHERE i.match_id = m.matches_id) as p, (SELECT COUNT(*) FROM innings i JOIN overs o ON o.innings_id = i.innings_id WHERE i.match_id = m.matches_id) as o, (SELECT COUNT(*) FROM innings i JOIN deliveries d ON d.innings_id = i.innings_id WHERE i.match_id = m.matches_id) as del FROM matches m ORDER BY m.created_at DESC LIMIT 10");
    console.log(JSON.stringify(all.rows, null, 2));
  } finally { c.release(); pool.end(); }
})().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
