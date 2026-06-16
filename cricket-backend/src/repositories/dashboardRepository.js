// Dashboard data-access — aggregate counts for the viewer KPI cards.
// Read-only. Parameterized via the db.js query helper.
const { query } = require('../../db');

// match_status values that count as "live" for KPI purposes.
const LIVE_STATUSES = ['toss', 'live', 'innings_break'];

const getKpis = async () => {
  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM matches) AS total_matches,
       (SELECT COUNT(*) FROM matches
          WHERE status = ANY($1::match_status[])) AS live_matches,
       (SELECT COUNT(*) FROM players) AS total_players,
       (SELECT COUNT(*) FROM teams)   AS total_teams,
       (SELECT COUNT(*) FROM club)   AS total_clubs`,
    [LIVE_STATUSES]
  );
  return result.rows[0];
};

module.exports = { getKpis };
