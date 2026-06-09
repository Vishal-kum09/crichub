// Seed the LIVE schema with deterministic, internally-consistent data.
// Idempotent: fixed UUIDs + ON CONFLICT (pk) DO NOTHING, all in one transaction.
//
// Produces: 2 staff users, 2 teams, 22 players, squads, 1 tournament, and
// 3 matches — one Completed (full ball-by-ball: overs, deliveries, dismissals,
// batting_scorecards, bowling_figures), one Live (in-progress innings), one
// Scheduled. Career stats are derived from the completed match.
//
// Run:  node src/db/seed.js     (or: npm run seed)
require('dotenv').config();
const { withTransaction } = require('../../db');
const logger = require('../../config/logger');

// ─── deterministic PRNG + helpers ───────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260608);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const uuid = (n) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

// ─── reference data ─────────────────────────────────────────────────────────
const users = [
  { id: uuid(1), email: 'admin@crickethub.test', first: 'Sofia', last: 'Admin', role: 'admin' },
  { id: uuid(2), email: 'scorer@crickethub.test', first: 'Priya', last: 'Score', role: 'scorer' }
];
const ADMIN = users[0].id;
const SCORER = users[1].id;

const teams = [
  { id: uuid(101), name: 'Cambridge Phoenix', short: 'CPX', ground: "Fenner's", country: 'England' },
  { id: uuid(102), name: 'Thames Valley Strikers', short: 'TVS', ground: 'Riverside Oval', country: 'England' }
];

const FIRST = ['Arjun', 'Ravi', 'Sam', 'Tariq', 'Leo', 'Noah', 'Ethan', 'Kiran', 'Marcus', 'Owais', 'Jed', 'Daniel', 'Femi', 'Jack', 'Hiro', 'Luca', 'Omar', 'Finn', 'Zane', 'Cole', 'Rory', 'Niall'];
const LAST = ['Mehta', 'Sharma', 'Carter', 'Hussain', 'Bianchi', 'Walsh', 'Reed', 'Patel', 'Stone', 'Khan', 'Boyd', 'Okafor', 'Adeyemi', 'Brooks', 'Tanaka', 'Romano', 'Saleh', 'Doyle', 'Frost', 'Hunt', 'Boyd', 'Quinn'];
const BAT = ['right_hand', 'left_hand'];
const BOWL = ['right_arm_fast', 'left_arm_fast', 'right_arm_medium', 'left_arm_medium', 'right_arm_spin', 'left_arm_spin'];

const players = [];
const squadByTeam = { [teams[0].id]: [], [teams[1].id]: [] };
for (let i = 0; i < 22; i++) {
  const teamIdx = i < 11 ? 0 : 1;
  const posInTeam = i % 11;
  const role = posInTeam === 0 ? 'all_rounder'
    : posInTeam === 1 ? 'wicket_keeper'
    : posInTeam >= 7 ? 'bowler'
    : 'batter';
  const p = {
    id: uuid(1000 + i),
    full: `${FIRST[i]} ${LAST[i]}`,
    display: `${FIRST[i]} ${LAST[i]}`,
    role,
    bat: pick(BAT),
    bowl: role === 'bowler' || role === 'all_rounder' ? pick(BOWL) : 'none',
    jersey: posInTeam + 1,
    squadRole: posInTeam === 0 ? 'captain' : posInTeam === 1 ? 'vice_captain' : 'player'
  };
  players.push(p);
  squadByTeam[teams[teamIdx].id].push(p);
}

const tournament = { id: uuid(5000), name: 'Summer Shield 2026', start: '2026-06-01', created_by: ADMIN };

// ─── full ball-by-ball generator for one innings ────────────────────────────
let oversTag = 200000;
let delivTag = 300000;
let dismissTag = 400000;
let batCardTag = 500000;
let bowlFigTag = 600000;

const DISMISSALS = ['bowled', 'caught', 'lbw', 'stumped', 'run_out'];

function phaseFor(overNumber) {
  if (overNumber <= 6) return 'powerplay';
  if (overNumber >= 16) return 'death';
  return 'middle';
}

// Returns { innings, overs, deliveries, dismissals, battingCards, bowlingFigures }
function genInnings({ inningsId, matchId, inningsNumber, battingTeam, fieldingTeam, maxOvers, target }) {
  const batters = squadByTeam[battingTeam.id];
  const bowlers = squadByTeam[fieldingTeam.id].slice(2); // non-keeper/cap as bowlers pool
  const inn = {
    id: inningsId, match_id: matchId, innings_number: inningsNumber,
    batting_team_id: battingTeam.id, fielding_team_id: fieldingTeam.id, status: 'completed',
    total_runs: 0, total_wickets: 0, total_balls: 0,
    extras_wides: 0, extras_no_balls: 0, extras_leg_byes: 0, extras_byes: 0, extras_penalties: 0,
    target_runs: target || null
  };
  const overs = [], deliveries = [], dismissals = [];
  // per-player batting/bowling accumulators
  const bcard = {}; const bfig = {};
  const ensureBat = (p, pos) => (bcard[p.id] ||= { player_id: p.id, position: pos, runs: 0, balls: 0, fours: 0, sixes: 0, dots: 0, dismissed: false, dismissalId: null, cameInAtOver: null, dismissedAtOver: null });
  const ensureBowl = (p) => (bfig[p.id] ||= { player_id: p.id, balls: 0, runsConceded: 0, wickets: 0, maidens: 0, wides: 0, noBalls: 0, dots: 0 });

  let strikerIdx = 0, nonStrikerIdx = 1, nextBatter = 2, wickets = 0, seq = 0;
  ensureBat(batters[0], 1).cameInAtOver = 0;
  ensureBat(batters[1], 2).cameInAtOver = 0;

  for (let over = 1; over <= maxOvers && wickets < 10; over++) {
    const bowler = bowlers[(over - 1) % bowlers.length];
    const bf = ensureBowl(bowler);
    const overStartConceded = bf.runsConceded;
    const overId = uuid(oversTag++);
    let legal = 0, overConcededExtra = false;

    while (legal < 6 && wickets < 10) {
      const striker = batters[strikerIdx];
      const nonStriker = batters[nonStrikerIdx];
      const bc = ensureBat(striker, Math.max(strikerIdx, nonStrikerIdx) + 1);
      seq += 1;
      const roll = rnd();
      let dtype = 'legal', runsBat = 0, runsExtra = 0, isLegal = true, batFaces = true;
      let isWicket = false, dismissalType = null;

      if (roll < 0.035) { dtype = 'wide'; isLegal = false; batFaces = false; runsExtra = rnd() < 0.85 ? 1 : 2; inn.extras_wides += runsExtra; bf.wides += 1; }
      else if (roll < 0.055) { dtype = 'no_ball'; isLegal = false; batFaces = true; runsBat = pick([0, 1, 2, 4]); runsExtra = 1; inn.extras_no_balls += 1; bf.noBalls += 1; }
      else if (roll < 0.075) { dtype = 'leg_bye'; runsExtra = pick([1, 1, 2]); inn.extras_leg_byes += runsExtra; }
      else if (roll < 0.088) { dtype = 'bye'; runsExtra = pick([1, 1, 4]); inn.extras_byes += runsExtra; }
      else if (roll < 0.135 && wickets < 9) { isWicket = true; dismissalType = pick(DISMISSALS); }
      else { runsBat = pick([0, 0, 0, 1, 1, 1, 2, 1, 4, 0, 6, 1, 0, 4, 2]); }

      const runsTotal = runsBat + runsExtra;
      const ballInOver = legal + 1;
      const del = {
        id: uuid(delivTag++), innings_id: inn.id, over_id: overId, over_number: over,
        ball_in_over: ballInOver, delivery_sequence: seq, bowler_id: bowler.id,
        batter_id: striker.id, non_striker_id: nonStriker.id, delivery_type: dtype,
        runs_batter: runsBat, runs_extras: runsExtra, runs_total: runsTotal,
        is_dot: isLegal && runsTotal === 0, is_four: isLegal && runsBat === 4,
        is_six: isLegal && runsBat === 6, is_wicket: isWicket
      };
      deliveries.push(del);

      // innings + batting
      inn.total_runs += runsTotal;
      if (batFaces) { bc.balls += 1; }
      if (dtype === 'legal' || dtype === 'no_ball') {
        bc.runs += runsBat;
        if (runsBat === 4) bc.fours += 1;
        if (runsBat === 6) bc.sixes += 1;
        if (runsBat === 0) bc.dots += 1;
      } else if (dtype === 'leg_bye' || dtype === 'bye') {
        bc.dots += 1; // batter faced but scored nothing
      }

      // bowling
      if (isLegal) { bf.balls += 1; inn.total_balls += 1; }
      if (dtype === 'legal' || dtype === 'no_ball') bf.runsConceded += runsBat;
      if (dtype === 'no_ball' || dtype === 'wide') { bf.runsConceded += runsExtra; overConcededExtra = true; }
      if (isLegal && runsTotal === 0) bf.dots += 1;

      if (isWicket) {
        wickets += 1; inn.total_wickets = wickets;
        const creditedBowler = dismissalType !== 'run_out';
        if (creditedBowler) bf.wickets += 1;
        const dId = uuid(dismissTag++);
        bc.dismissed = true; bc.dismissalId = dId;
        bc.dismissedAtOver = Number((over - 1 + ballInOver / 10).toFixed(1));
        dismissals.push({
          id: dId, delivery_id: del.id, innings_id: inn.id, dismissed_batter_id: striker.id,
          bowler_id: creditedBowler ? bowler.id : null, dismissal_type: dismissalType,
          primary_fielder_id: (dismissalType === 'caught' || dismissalType === 'stumped' || dismissalType === 'run_out') ? pick(squadByTeam[fieldingTeam.id]).id : null,
          runs_at_fall: inn.total_runs, balls_at_fall: inn.total_balls,
          over_at_fall: Number((over - 1 + ballInOver / 10).toFixed(1)), wicket_number: wickets
        });
        if (nextBatter < batters.length) {
          const nb = batters[nextBatter];
          ensureBat(nb, nextBatter + 1).cameInAtOver = Number((over - 1 + ballInOver / 10).toFixed(1));
          strikerIdx = nextBatter; nextBatter += 1;
        }
      }
      if (isLegal) legal += 1;

      const rot = (dtype === 'legal' || dtype === 'no_ball') ? runsBat : runsExtra;
      if (!isWicket && rot % 2 === 1) { [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx]; }
    }

    const isMaiden = legal === 6 && bf.runsConceded === overStartConceded && !overConcededExtra;
    if (isMaiden) bf.maidens += 1;
    overs.push({
      id: overId, innings_id: inn.id, over_number: over, bowler_id: bowler.id,
      cumulative_runs: inn.total_runs, cumulative_wickets: inn.total_wickets,
      run_rate: Number((inn.total_runs / (inn.total_balls / 6 || 1)).toFixed(2)),
      phase: phaseFor(over)
    });
    if (legal === 6) { [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx]; }
  }
  inn.total_extras = inn.extras_wides + inn.extras_no_balls + inn.extras_leg_byes + inn.extras_byes + inn.extras_penalties;

  // build card rows
  const battingCards = Object.values(bcard).map((b) => ({
    id: uuid(batCardTag++), innings_id: inn.id, player_id: b.player_id, batting_position: b.position,
    runs_scored: b.runs, balls_faced: b.balls, fours: b.fours, sixes: b.sixes, dot_balls_faced: b.dots,
    strike_rate: b.balls ? Number((b.runs / b.balls * 100).toFixed(2)) : 0,
    is_dismissed: b.dismissed, dismissal_id: b.dismissalId,
    came_in_at_over: b.cameInAtOver, dismissed_at_over: b.dismissedAtOver
  }));
  const bowlingFigures = Object.values(bfig).map((b) => ({
    id: uuid(bowlFigTag++), innings_id: inn.id, player_id: b.player_id,
    overs_bowled: Number((Math.floor(b.balls / 6) + (b.balls % 6) / 10).toFixed(1)),
    balls_bowled: b.balls, runs_conceded: b.runsConceded, wickets: b.wickets, maidens: b.maidens,
    wides: b.wides, no_balls: b.noBalls, dot_balls: b.dots,
    economy_rate: b.balls ? Number((b.runsConceded / (b.balls / 6)).toFixed(2)) : 0
  }));

  return { innings: inn, overs, deliveries, dismissals, battingCards, bowlingFigures };
}

// ─── assemble matches ───────────────────────────────────────────────────────
const today = new Date();
const dayOffset = (d) => new Date(today.getTime() - d * 86400000);
const iso = (dt) => dt.toISOString();
const dateOnly = (dt) => dt.toISOString().slice(0, 10);

// M1 completed — full both innings
const m1 = { id: uuid(7001) };
const m1i1 = genInnings({ inningsId: uuid(8001), matchId: m1.id, inningsNumber: 1, battingTeam: teams[0], fieldingTeam: teams[1], maxOvers: 20, target: null });
const m1i2 = genInnings({ inningsId: uuid(8002), matchId: m1.id, inningsNumber: 2, battingTeam: teams[1], fieldingTeam: teams[0], maxOvers: 20, target: m1i1.innings.total_runs + 1 });
// M2 live — one in-progress innings (truncate to ~4 overs, mark in_progress)
const m2 = { id: uuid(7002) };
const m2i1full = genInnings({ inningsId: uuid(8003), matchId: m2.id, inningsNumber: 1, battingTeam: teams[1], fieldingTeam: teams[0], maxOvers: 4, target: null });
m2i1full.innings.status = 'in_progress';
// M3 scheduled — no innings

const innings1Winner = m1i2.innings.total_runs >= m1i1.innings.total_runs ? teams[1] : teams[0];
const m1ResultType = m1i2.innings.total_runs > m1i1.innings.total_runs ? 'win_by_wickets'
  : m1i2.innings.total_runs < m1i1.innings.total_runs ? 'win_by_runs' : 'tie';

const matches = [
  {
    id: m1.id, match_date: dateOnly(dayOffset(14)), start_time: '14:00:00', tournament_id: tournament.id,
    format: 'T20', ball_type: 'leather', overs_per_match: 20, team1_id: teams[0].id, team2_id: teams[1].id,
    venue: "Fenner's", city: 'Cambridge', country: 'England', scheduled_at: iso(dayOffset(14)),
    started_at: iso(dayOffset(14)), completed_at: iso(dayOffset(14)), status: 'completed',
    toss_winner_id: teams[0].id, toss_decision: 'bat', result_type: m1ResultType,
    result_margin: Math.abs(m1i1.innings.total_runs - m1i2.innings.total_runs), winning_team_id: innings1Winner.id,
    result_summary: `${innings1Winner.name} won`, created_by: ADMIN
  },
  {
    id: m2.id, match_date: dateOnly(today), start_time: '18:30:00', tournament_id: tournament.id,
    format: 'T20', ball_type: 'leather', overs_per_match: 20, team1_id: teams[0].id, team2_id: teams[1].id,
    venue: 'Riverside Oval', city: 'Reading', country: 'England', scheduled_at: iso(today),
    started_at: iso(today), completed_at: null, status: 'live',
    toss_winner_id: teams[1].id, toss_decision: 'bat', result_type: null,
    result_margin: null, winning_team_id: null, result_summary: null, created_by: ADMIN
  },
  {
    id: uuid(7003), match_date: dateOnly(dayOffset(-7)), start_time: '11:00:00', tournament_id: tournament.id,
    format: 'T20', ball_type: 'leather', overs_per_match: 20, team1_id: teams[0].id, team2_id: teams[1].id,
    venue: "Parker's Piece", city: 'Cambridge', country: 'England', scheduled_at: iso(dayOffset(-7)),
    started_at: null, completed_at: null, status: 'scheduled',
    toss_winner_id: null, toss_decision: null, result_type: null,
    result_margin: null, winning_team_id: null, result_summary: null, created_by: ADMIN
  }
];

const allInnings = [m1i1, m1i2, m2i1full];

// ─── derive career stats from completed match (M1) ──────────────────────────
let careerTag = 700000;
const careerByPlayer = {};
for (const part of [m1i1, m1i2]) {
  for (const b of part.battingCards) {
    const c = (careerByPlayer[b.player_id] ||= { player_id: b.player_id, matches: new Set(), inningsBatted: 0, runs: 0, balls: 0, hs: 0, fours: 0, sixes: 0, fifties: 0, centuries: 0, inningsBowled: 0, oversBowled: 0, runsConceded: 0, wickets: 0, threeFer: 0, fiveFer: 0 });
    c.matches.add(m1.id); c.inningsBatted += 1; c.runs += b.runs_scored; c.balls += b.balls_faced;
    c.hs = Math.max(c.hs, b.runs_scored); c.fours += b.fours; c.sixes += b.sixes;
    if (b.runs_scored >= 100) c.centuries += 1; else if (b.runs_scored >= 50) c.fifties += 1;
  }
  for (const f of part.bowlingFigures) {
    const c = (careerByPlayer[f.player_id] ||= { player_id: f.player_id, matches: new Set(), inningsBatted: 0, runs: 0, balls: 0, hs: 0, fours: 0, sixes: 0, fifties: 0, centuries: 0, inningsBowled: 0, oversBowled: 0, runsConceded: 0, wickets: 0, threeFer: 0, fiveFer: 0 });
    c.matches.add(m1.id); c.inningsBowled += 1; c.oversBowled += f.balls_bowled / 6;
    c.runsConceded += f.runs_conceded; c.wickets += f.wickets;
    if (f.wickets >= 5) c.fiveFer += 1; else if (f.wickets >= 3) c.threeFer += 1;
  }
}
const careerRows = Object.values(careerByPlayer).map((c) => ({
  id: uuid(careerTag++), player_id: c.player_id, format: 'T20',
  matches_played: c.matches.size, innings_batted: c.inningsBatted, total_runs: c.runs, balls_faced: c.balls,
  highest_score: c.hs, total_fours: c.fours, total_sixes: c.sixes, centuries: c.centuries, fifties: c.fifties,
  innings_bowled: c.inningsBowled, overs_bowled: Number(c.oversBowled.toFixed(1)), runs_conceded: c.runsConceded,
  wickets_taken: c.wickets, three_wicket_haul: c.threeFer, five_wicket_hauls: c.fiveFer
}));

// ─── INSERT (one transaction, FK-safe order, idempotent) ────────────────────
async function seed() {
  await withTransaction(async (client) => {
    const q = (text, params) => client.query(text, params);

    for (const u of users) {
      await q(
        `INSERT INTO users (user_id, email, first_name, last_name, display_name, role)
         VALUES ($1,$2,$3,$4,$5,$6::platform_role) ON CONFLICT (user_id) DO NOTHING`,
        [u.id, u.email, u.first, u.last, `${u.first} ${u.last}`, u.role]
      );
    }
    for (const t of teams) {
      await q(
        `INSERT INTO teams (teams_id, name, short_name, home_ground, country, created_by)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (teams_id) DO NOTHING`,
        [t.id, t.name, t.short, t.ground, t.country, ADMIN]
      );
    }
    for (const p of players) {
      await q(
        `INSERT INTO players (players_id, full_name, display_name, primary_role, batting_style, bowling_style, jersey_number, nationality)
         VALUES ($1,$2,$3,$4::player_role_enum,$5::batting_style_enum,$6::bowling_style_enum,$7,$8) ON CONFLICT (players_id) DO NOTHING`,
        [p.id, p.full, p.display, p.role, p.bat, p.bowl, p.jersey, 'England']
      );
    }
    for (const t of teams) {
      for (const p of squadByTeam[t.id]) {
        await q(
          `INSERT INTO team_players (team_players_id, team_id, player_id, jersey_number, squad_role, joined_at)
           VALUES ($1,$2,$3,$4,$5::squad_role_enum,$6) ON CONFLICT (team_players_id) DO NOTHING`,
          [uuid(900000 + players.indexOf(p)), t.id, p.id, p.jersey, p.squadRole, '2026-01-01']
        );
      }
    }
    await q(
      `INSERT INTO tournaments (tournaments_id, name, format, match_format, no_of_overs_match, start_date, status, created_by)
       VALUES ($1,$2,'league'::tournament_format,'T20'::match_format,20,$3,'In Progress'::tournament_status,$4)
       ON CONFLICT (tournaments_id) DO NOTHING`,
      [tournament.id, tournament.name, tournament.start, ADMIN]
    );
    for (const m of matches) {
      await q(
        `INSERT INTO matches (matches_id, match_date, start_time, tournament_id, format, ball_type, overs_per_match,
            team1_id, team2_id, venue, city, country, scheduled_at, started_at, completed_at, status,
            toss_winner_id, toss_decision, result_type, result_margin, winning_team_id, result_summary, created_by)
         VALUES ($1,$2,$3,$4,$5::match_format,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::match_status,
            $17,$18::toss_decision,$19::result_type,$20,$21,$22,$23)
         ON CONFLICT (matches_id) DO NOTHING`,
        [m.id, m.match_date, m.start_time, m.tournament_id, m.format, m.ball_type, m.overs_per_match,
         m.team1_id, m.team2_id, m.venue, m.city, m.country, m.scheduled_at, m.started_at, m.completed_at, m.status,
         m.toss_winner_id, m.toss_decision, m.result_type, m.result_margin, m.winning_team_id, m.result_summary, m.created_by]
      );
    }
    for (const part of allInnings) {
      const i = part.innings;
      await q(
        `INSERT INTO innings (innings_id, match_id, innings_number, batting_team_id, fielding_team_id, status,
            total_runs, total_wickets, total_balls, extras_wides, extras_no_balls, extras_leg_byes, extras_byes,
            extras_penalties, total_extras, target_runs)
         VALUES ($1,$2,$3,$4,$5,$6::innings_status,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (innings_id) DO NOTHING`,
        [i.id, i.match_id, i.innings_number, i.batting_team_id, i.fielding_team_id, i.status,
         i.total_runs, i.total_wickets, i.total_balls, i.extras_wides, i.extras_no_balls, i.extras_leg_byes,
         i.extras_byes, i.extras_penalties, i.total_extras, i.target_runs]
      );
      for (const o of part.overs) {
        await q(
          `INSERT INTO overs (overs_id, innings_id, over_number, bowler_id, cumulative_runs, cumulative_wickets, run_rate, phase)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::phase_enum) ON CONFLICT (overs_id) DO NOTHING`,
          [o.id, o.innings_id, o.over_number, o.bowler_id, o.cumulative_runs, o.cumulative_wickets, o.run_rate, o.phase]
        );
      }
      for (const d of part.deliveries) {
        await q(
          `INSERT INTO deliveries (deliveries_id, innings_id, over_id, over_number, ball_in_over, delivery_sequence,
              bowler_id, batter_id, non_striker_id, delivery_type, runs_batter, runs_extras, runs_total,
              is_dot, is_boundary_four, is_boundary_six, is_wicket, scored_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::delivery_type,$11,$12,$13,$14,$15,$16,$17,$18)
           ON CONFLICT (deliveries_id) DO NOTHING`,
          [d.id, d.innings_id, d.over_id, d.over_number, d.ball_in_over, d.delivery_sequence,
           d.bowler_id, d.batter_id, d.non_striker_id, d.delivery_type, d.runs_batter, d.runs_extras, d.runs_total,
           d.is_dot, d.is_four, d.is_six, d.is_wicket, SCORER]
        );
      }
      for (const dm of part.dismissals) {
        await q(
          `INSERT INTO dismissals (dismissals_id, delivery_id, innings_id, dismissed_batter_id, bowler_id,
              dismissal_type, primary_fielder_id, runs_at_fall, balls_at_fall, over_at_fall, wicket_number)
           VALUES ($1,$2,$3,$4,$5,$6::dismissal_type,$7,$8,$9,$10,$11) ON CONFLICT (dismissals_id) DO NOTHING`,
          [dm.id, dm.delivery_id, dm.innings_id, dm.dismissed_batter_id, dm.bowler_id, dm.dismissal_type,
           dm.primary_fielder_id, dm.runs_at_fall, dm.balls_at_fall, dm.over_at_fall, dm.wicket_number]
        );
      }
      for (const b of part.battingCards) {
        await q(
          `INSERT INTO batting_scorecards (batting_scorecards_id, innings_id, player_id, batting_position,
              runs_scored, balls_faced, fours, sixes, dot_balls_faced, strike_rate, is_dismissed, dismissal_id,
              came_in_at_over, dismissed_at_over)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (batting_scorecards_id) DO NOTHING`,
          [b.id, b.innings_id, b.player_id, b.batting_position, b.runs_scored, b.balls_faced, b.fours, b.sixes,
           b.dot_balls_faced, b.strike_rate, b.is_dismissed, b.dismissal_id, b.came_in_at_over, b.dismissed_at_over]
        );
      }
      for (const f of part.bowlingFigures) {
        await q(
          `INSERT INTO bowling_figures (bowling_figures_id, innings_id, player_id, overs_bowled, balls_bowled,
              runs_conceded, wickets, maidens, wides, no_balls, dot_balls, economy_rate)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (bowling_figures_id) DO NOTHING`,
          [f.id, f.innings_id, f.player_id, f.overs_bowled, f.balls_bowled, f.runs_conceded, f.wickets,
           f.maidens, f.wides, f.no_balls, f.dot_balls, f.economy_rate]
        );
      }
    }
    for (const c of careerRows) {
      await q(
        `INSERT INTO player_career_stats (player_career_stats_id, player_id, format, matches_played, innings_batted,
            total_runs, balls_faced, highest_score, total_fours, total_sixes, centuries, fifties, innings_bowled,
            overs_bowled, runs_conceded, wickets_taken, three_wicket_haul, five_wicket_hauls, updated_at)
         VALUES ($1,$2,$3::match_format,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
         ON CONFLICT (player_career_stats_id) DO NOTHING`,
        [c.id, c.player_id, c.format, c.matches_played, c.innings_batted, c.total_runs, c.balls_faced,
         c.highest_score, c.total_fours, c.total_sixes, c.centuries, c.fifties, c.innings_bowled,
         c.overs_bowled, c.runs_conceded, c.wickets_taken, c.three_wicket_haul, c.five_wicket_hauls]
      );
    }
  });

  const totalDeliveries = allInnings.reduce((n, p) => n + p.deliveries.length, 0);
  logger.info('Seed complete', {
    users: users.length, teams: teams.length, players: players.length, matches: matches.length,
    innings: allInnings.length, deliveries: totalDeliveries, careerRows: careerRows.length,
    m1_scores: `${m1i1.innings.total_runs}/${m1i1.innings.total_wickets} vs ${m1i2.innings.total_runs}/${m1i2.innings.total_wickets}`
  });
}

seed()
  .then(() => process.exit(0))
  .catch((err) => { logger.error('Seed failed', { error: err.message }); process.exit(1); });
