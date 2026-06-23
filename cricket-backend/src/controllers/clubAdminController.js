const { z } = require('zod');
const { AppError } = require('../middlewares/errorHandler');
const clubAdminService = require('../services/clubAdminService');

// Zod Validation Schemas
const DirectPlayerSchema = z.object({
  first_name: z.string().min(1).max(50),
  last_name: z.string().max(50).optional().default(''),
  display_name: z.string().min(1).max(50),
  contact_number: z.string().min(5).max(25), 
  gender: z.enum(['male', 'female']),               
  jersey_number: z.number().int().min(0).max(999).optional().nullable(),   
  date_of_birth: z.string().optional().nullable(),   
  batting_style: z.enum(['right_hand_bat', 'left_hand_bat']),
  bowling_style: z.enum([
    'right_arm_fast', 'right_arm_medium', 'right_arm_spin',
    'left_arm_fast', 'left_arm_medium', 'left_arm_spin'
  ]).optional().nullable(),
  primary_role: z.enum(['batter', 'bowler', 'all_rounder', 'wicket_keeper']),
  nationality: z.string().default('India')
});

// 🔥 STRICT MATCHES TABLE SCHEMA VALIDATION
const CreateMatchSchema = z.object({
  match_type: z.enum(['cross_club', 'local']),
  opponent_club_id: z.string().uuid().optional(),
  match_date: z.string().min(1),
  start_time: z.string().min(1),
  scheduled_at: z.string().datetime(),
  format: z.string().default('T20'),
  ball_type: z.string().default('leather'),
  overs_per_match: z.number().int().min(1).max(100).optional(),
  venue: z.string().min(1),
  pitch_num: z.number().int().optional().nullable(),
  venue_neutral: z.boolean().default(false),
  city: z.string().min(1),
  country: z.string().min(1),
  address: z.string().optional(),
  postcode: z.string().optional(),
  squad_player_ids: z.array(z.string()).default([]),
  team1_id: z.string().uuid().optional(),
  team2_id: z.string().uuid().optional(),
  assigned_scorer_id: z.string().uuid()
});

const TeamSchema = z.object({
  name: z.string().min(1).max(120),
  short_name: z.string().min(1).max(20).optional().nullable(),
  logo_url: z.string().url().optional().or(z.literal('')).nullable(),
  home_ground: z.string().max(120).optional().nullable(),
  country: z.string().max(80).optional().nullable()
});

const TeamPlayerSchema = z.object({
  player_id: z.string().uuid()
});

// HANDLERS
const createMatch = async (req, res, next) => {
  const { query } = require('../../db');
  try {
    const adminClubId = req.user.club_id;
    const adminUserId = req.user.user_id || req.user.id;
    const data = CreateMatchSchema.parse(req.body);

    await query('BEGIN');

    let initialStatus = data.match_type === 'cross_club' ? 'pending_opponent' : 'scheduled';
    
    // 🔥 EXACT MATCHES TABLE INSERTION (Removed the redundant 'teams' table check entirely)
    const notes = JSON.stringify({
      team1_id: data.team1_id || null,
      team2_id: data.team2_id || null,
      squad_player_ids: data.squad_player_ids || []
    });

    const matchSql = `
      INSERT INTO matches (
        host_club_id, opponent_club_id, match_date, start_time, scheduled_at, 
        format, ball_type, overs_per_match, venue, pitch_num, venue_neutral, city, country,address,postcode, status, 
        notes, created_by, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,$17,$18, NOW()) 
      RETURNING matches_id;
    `;
    
    const params = [
      adminClubId, 
      data.match_type === 'cross_club' ? data.opponent_club_id : adminClubId, 
      data.match_date, data.start_time, data.scheduled_at, data.format, data.ball_type, 
      data.overs_per_match , data.venue, data.pitch_num, data.venue_neutral, data.city, data.country,data.address,data.postcode, initialStatus,
      notes, adminUserId
    ];

    const matchRes = await query(matchSql, params);
    const matchId = matchRes.rows[0].matches_id;
    
    // Assign Scorer
    await query(
      'INSERT INTO scorer_assignments (match_id, scorer_id, assigned_by, created_at) VALUES ($1, $2, $3, NOW())', 
      [matchId, data.assigned_scorer_id, adminUserId]
    );

    // 🔥 SEND NOTIFICATION TO SCORER
    await query(
      `INSERT INTO notifications (user_id, match_id, type, title, body, is_read, created_at) 
       VALUES ($1, $2, $3, $4, $5, false, NOW())`,
      [
        data.assigned_scorer_id, 
        matchId, 
        'match_invite', 
        'New Match Assignment', 
        `You have been assigned as the scorer for a match on ${data.match_date} at ${data.venue}.`
      ]
    );

    await query('COMMIT');
    res.status(201).json({ success: true, matchId: matchId });
  } catch (err) { 
    await query('ROLLBACK');
    console.error("ERROR:", err);
    next(err); 
  }
};

const acceptMatchRequest = async (req, res, next) => {
  try {
    const { match_id } = req.params; 
    const {
      assigned_scorer_id,
      squad_player_ids = [],
      team_id,
      captain_id = null,
      wicketkeeper_id = null
    } = req.body;
    const { query } = require('../../db');
    const adminUserId = req.user.user_id || req.user.id;
    
    if (!match_id || match_id === 'undefined') throw new AppError('Match ID missing', 400);
    if (!team_id) throw new AppError('Select your team before accepting this match', 400);
    if (!assigned_scorer_id) throw new AppError('Assign your club scorer before accepting this match', 400);

    await query('BEGIN');

    const teamCheck = await query(
      `SELECT teams_id
         FROM teams
        WHERE teams_id = $1
          AND created_by IN (SELECT user_id FROM users WHERE club_id = $2)
          AND is_active = true`,
      [team_id, req.user.club_id]
    );
    if (teamCheck.rows.length === 0) throw new AppError('Selected team does not belong to your club', 403);

    const scorerCheck = await query(
      `SELECT user_id FROM users
        WHERE user_id = $1 AND club_id = $2 AND account_role = 'Scorer'::account_role`,
      [assigned_scorer_id, req.user.club_id]
    );
    if (scorerCheck.rows.length === 0) throw new AppError('Selected scorer does not belong to your club', 403);

    // Update match status to scheduled
    const matchUpd = await query(
      "UPDATE matches SET status = 'scheduled' WHERE matches_id = $1 AND opponent_club_id = $2 AND status = 'pending_opponent' RETURNING *", 
      [match_id, req.user.club_id]
    );
    
    if (matchUpd.rows.length === 0) throw new AppError('Match not found', 404);

    const selectedPlayerIds = [...new Set(squad_player_ids.filter(Boolean))];
    if (selectedPlayerIds.length > 0) {
      const playerCheck = await query(
        `SELECT players_id FROM players
          WHERE club_id = $1 AND is_active = true AND players_id = ANY($2::uuid[])`,
        [req.user.club_id, selectedPlayerIds]
      );
      if (playerCheck.rows.length !== selectedPlayerIds.length) {
        throw new AppError('One or more selected players do not belong to your club', 403);
      }

      await query(
        `INSERT INTO team_players (team_id, player_id, squad_role, joined_at)
         SELECT $1, incoming.player_id, 'player'::squad_role_enum, CURRENT_DATE
           FROM unnest($2::uuid[]) AS incoming(player_id)
          WHERE NOT EXISTS (
            SELECT 1 FROM team_players tp
             WHERE tp.team_id = $1 AND tp.player_id = incoming.player_id AND tp.left_at IS NULL
          )`,
        [team_id, selectedPlayerIds]
      );
    }

    if (captain_id) {
      await query(
        `UPDATE team_players
            SET squad_role = CASE WHEN player_id = $3 THEN 'captain'::squad_role_enum ELSE 'player'::squad_role_enum END
          WHERE team_id = $1
            AND left_at IS NULL
            AND player_id IN (
              SELECT players_id FROM players WHERE club_id = $2 AND is_active = true
            )`,
        [team_id, req.user.club_id, captain_id]
      );
    }

    let notes = {};
    try {
      notes = matchUpd.rows[0].notes ? JSON.parse(matchUpd.rows[0].notes) : {};
    } catch (_) {
      notes = {};
    }
    notes.team2_id = team_id;
    notes.opponent_squad_player_ids = selectedPlayerIds;
    notes.opponent_captain_id = captain_id;
    notes.opponent_wicketkeeper_id = wicketkeeper_id;

    await query(
      'UPDATE matches SET notes = $1, updated_at = NOW() WHERE matches_id = $2',
      [JSON.stringify(notes), match_id]
    );
    
    // Assign opponent's scorer
    await query(
      'INSERT INTO scorer_assignments (match_id, scorer_id, assigned_by, created_at) VALUES ($1, $2, $3, NOW())', 
      [match_id, assigned_scorer_id, adminUserId]
    );

    // 🔥 SEND NOTIFICATION TO OPPONENT SCORER
    await query(
      `INSERT INTO notifications (user_id, match_id, type, title, body, is_read, created_at) 
       VALUES ($1, $2, $3, $4, $5, false, NOW())`,
      [
        assigned_scorer_id, 
        match_id, 
        'match_invite', 
        'New Match Assignment', 
        `You have been assigned as the scorer for an accepted match on ${matchUpd.rows[0].match_date}.`
      ]
    );
    
    await query('COMMIT');
    res.json({ success: true, message: 'Match accepted' });
  } catch (err) { 
    const { query } = require('../../db');
    await query('ROLLBACK');
    next(err); 
  }
};

const getPendingApprovals = async (req, res, next) => {
  try {
    const approvals = await clubAdminService.listPendingApprovals(req.user);
    res.json({ count: approvals.length, approvals });
  } catch (err) { next(err); }
};

const updateApproval = async (req, res, next) => {
  try {
    const result = await clubAdminService.processApproval(req.user, req.params.id, req.body);
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
};

const getIncomingMatchRequests = async (req, res, next) => {
  try {
    const { query } = require('../../db');
    const result = await query(
      'SELECT m.*, c.club_name AS host_club_name FROM matches m JOIN club c ON m.host_club_id = c.club_id WHERE m.opponent_club_id = $1 AND m.status = $2', 
      [req.user.club_id, 'pending_opponent']
    );
    res.json(result.rows || []);
  } catch (err) { next(err); }
};

const rejectMatchRequest = async (req, res, next) => {
  try {
    const { query } = require('../../db');
    await query("UPDATE matches SET status = 'rejected' WHERE matches_id = $1 AND opponent_club_id = $2", [req.params.match_id, req.user.club_id]);
    res.json({ success: true });
  } catch (err) { next(err); }
};

const createTournament = async (req, res, next) => {
  try {
    const result = await clubAdminService.createTournament(req.user, req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

const getRosterMatches = async (req, res, next) => {
  try {
    const result = await clubAdminService.listMatches(req.user);
    res.json({ count: result.length, matches: result });
  } catch (err) { next(err); }
};

const getRosterPlayers = async (req, res, next) => {
  try {
    const { query } = require('../../db');
    const result = await query(
      `SELECT players_id, full_name, primary_role, contact_number,
              CASE
                WHEN date_of_birth IS NULL THEN false
                ELSE date_of_birth > (CURRENT_DATE - INTERVAL '18 years')
              END AS below_18
         FROM players
        WHERE club_id = $1
        ORDER BY created_at DESC`,
      [req.user.club_id]
    );
    res.json({ count: result.rows.length, players: result.rows.map(r => ({ id: r.players_id, name: r.full_name, role: r.primary_role, email: r.contact_number, status: 'Active', below_18: !!r.below_18 })) });
  } catch (err) { next(err); }
};

const getRosterScorers = async (req, res, next) => {
  try {
    const scorers = await clubAdminService.listScorers(req.user);
    res.json({ count: scorers.length, scorers });
  } catch (err) { next(err); }
};

const getTeams = async (req, res, next) => {
  try {
    const teams = await clubAdminService.listTeams(req.user);
    res.json({ count: teams.length, teams });
  } catch (err) { next(err); }
};

const createTeam = async (req, res, next) => {
  try {
    const data = TeamSchema.parse(req.body);
    const result = await clubAdminService.createTeam(req.user, data);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

const updateTeam = async (req, res, next) => {
  try {
    const data = TeamSchema.parse(req.body);
    const team = await clubAdminService.updateTeam(req.user, req.params.team_id, data);
    res.json({ success: true, team });
  } catch (err) { next(err); }
};

const deleteTeam = async (req, res, next) => {
  try {
    const result = await clubAdminService.deleteTeam(req.user, req.params.team_id);
    res.json(result);
  } catch (err) { next(err); }
};

const getTeamPlayers = async (req, res, next) => {
  try {
    const players = await clubAdminService.listTeamPlayers(req.user, req.params.team_id);
    res.json({ count: players.length, players });
  } catch (err) { next(err); }
};

const addTeamPlayer = async (req, res, next) => {
  try {
    const data = TeamPlayerSchema.parse(req.body);
    const result = await clubAdminService.addTeamPlayer(req.user, req.params.team_id, data.player_id);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

const removeTeamPlayer = async (req, res, next) => {
  try {
    const result = await clubAdminService.removeTeamPlayer(req.user, req.params.team_id, req.params.player_id);
    res.json(result);
  } catch (err) { next(err); }
};

const assignScorer = async (req, res, next) => {
  try {
    const result = await clubAdminService.assignScorer(req.user, req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

const directRegisterPlayer = async (req, res, next) => {
  try {
    const data = DirectPlayerSchema.parse(req.body);
    const { query } = require('../../db');
    const sql = `INSERT INTO players (club_id, full_name, display_name, contact_number, gender, jersey_number, date_of_birth, batting_style, bowling_style, primary_role, nationality, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) RETURNING *;`;
    const params = [req.user.club_id, `${data.first_name} ${data.last_name || ''}`.trim(), data.display_name, data.contact_number, data.gender, data.jersey_number || null, data.date_of_birth || null, data.batting_style, data.bowling_style || null, data.primary_role, data.nationality];
    const result = await query(sql, params);
    res.status(201).json({ success: true, player: result.rows[0] });
  } catch (err) { next(err); }
};

const updatePlayerDirect = async (req, res, next) => {
  try {
    const { query } = require('../../db');
    const result = await query('UPDATE players SET full_name = $1, primary_role = $2 WHERE players_id = $3 AND club_id = $4 RETURNING *', [req.body.full_name, req.body.primary_role, req.params.id, req.user.club_id]);
    if (result.rows.length === 0) throw new AppError('Player not found', 404);
    res.json({ success: true, player: result.rows[0] });
  } catch (err) { next(err); }
};

const deletePlayerDirect = async (req, res, next) => {
  try {
    const { query } = require('../../db');
    const result = await query('DELETE FROM players WHERE players_id = $1 AND club_id = $2 RETURNING *', [req.params.id, req.user.club_id]);
    if (result.rows.length === 0) throw new AppError('Player not found', 404);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
};

module.exports = {
  getPendingApprovals, updateApproval, createMatch, createTournament,
  getRosterMatches, getRosterPlayers, getRosterScorers, getTeams,
  createTeam, updateTeam, deleteTeam, getTeamPlayers, addTeamPlayer, removeTeamPlayer,
  assignScorer, directRegisterPlayer, updatePlayerDirect,
  deletePlayerDirect, getIncomingMatchRequests, acceptMatchRequest, rejectMatchRequest
};
