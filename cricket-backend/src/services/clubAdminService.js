// Club-admin service. Composes club-scoped read models and mutations. Tenant
// isolation is enforced here for resource-id routes (approvals): the target
// user's club_id is checked against the JWT club_id before any write, returning
// the exact 403 "Access Denied: Tenant Isolation Mismatch".
const repo = require('../repositories/clubAdminRepository');
const { withTransaction } = require('../../db');
const { AppError } = require('../middlewares/errorHandler');

const TENANT_MISMATCH = 'Access Denied: Tenant Isolation Mismatch';

// assigned_role (account_role) -> legacy platform_role, mirroring authService.
const platformRoleFor = (accountRole) => {
  switch (accountRole) {
    case 'Super_Admin':
    case 'Club_Admin': return 'admin';
    case 'Scorer':     return 'scorer';
    case 'Analyst':    return 'analyst';
    default:           return 'viewer'; // Player, Umpire, Viewer
  }
};

// presentRosterMatch aligned with structural database join formats
const presentRosterMatch = (m) => ({
  id: m.id || m.matches_id,
  opponent: m.opponent || `${m.team1_name} vs ${m.team2_name}`,
  date: m.match_date || m.scheduled_at,
  venue: m.venue || '',
  status: m.status,
  team1_score: m.team1_score || undefined,
  team2_score: m.team2_score || undefined,
  live_score: m.live_score || undefined
});

const presentApproval = (u) => ({
  id: u.user_id,
  name: u.display_name || `${u.first_name} ${u.last_name}`,
  email: u.email,
  phone: u.phone || '',
  role: (u.account_role || 'Viewer').toLowerCase(),
  date: u.created_at
});

const presentMember = (u) => ({
  id: u.id,
  name: u.display_name || `${u.first_name} ${u.last_name}`,
  email: u.email,
  role: u.account_role,
  status: u.is_active ? 'Active' : 'Inactive'
});

// ─── approvals ──────────────────────────────────────────────────────────────

const listPendingApprovals = async (user) => {
  const rows = await repo.findPendingApprovals(user.club_id);
  return rows.map(presentApproval);
};

const processApproval = async (user, targetUserId, input) => {
  const target = await repo.getUserTenant(targetUserId);
  if (!target) throw new AppError('User not found', 404);

  if (target.club_id !== user.club_id) throw new AppError(TENANT_MISMATCH, 403);

  if (input.action === 'APPROVE') {
    if (!input.assigned_role) {
      throw new AppError('assigned_role is required to approve', 400);
    }
    const updated = await repo.approveUser(
      targetUserId, user.club_id, input.assigned_role, platformRoleFor(input.assigned_role)
    );
    return { action: 'APPROVE', user: updated };
  }

  const updated = await repo.rejectUser(targetUserId, user.club_id);
  return { action: 'REJECT', user: updated };
};

// ─── 🔥 MATCH CREATION (RE-ENGINEERED FOR THE INDEPENDENT CLUB MODEL) ───

const createMatch = async (user, input) => {
  // 1. Structural Payload variables extract as per real Supabase types snapshot
  const when = new Date(input.scheduled_at);
  const isCross = input.match_type === 'cross_club';
  
  // 2. Absolute ID Binding Setup according to your rule mapping layout:
  // If Cross-Club: team1 is creator club_id, team2 is opponent club_id
  // If Local: both team1_id and team2_id hold the current admin's own club_id
  const finalTeam1Id = isCross ? user.club_id : input.team1_id;
  const finalTeam2Id = isCross ? input.opponent_club_id : input.team2_id;

  if (!finalTeam1Id || !finalTeam2Id) {
    throw new AppError('Both team1_id and team2_id tracking params are mandatory fields.', 400);
  }

  // Formatting strings context matching real required table columns explicitly
  const matchDateString = input.match_date || when.toISOString().slice(0, 10);
  const startTimeString = input.start_time || when.toISOString().slice(11, 19);

  // 3. Direct risk-free insertion executing query parameters mapping safely
  const match = await repo.insertMatch({
    match_date: matchDateString,
    start_time: startTimeString,
    scheduled_at: input.scheduled_at,
    tournament_id: input.tournament_id || null,
    format: input.format || 'T20',
    ball_type: input.ball_type || 'leather',
    overs_per_match: input.overs_per_match || 20,
    team1_id: finalTeam1Id,
    team2_id: finalTeam2Id,
    venue: input.venue,
    city: input.city ,
    country: input.country ,
    address: input.address,
    postcode: input.postcode,
    status: 'scheduled', // status match column ENUM state
    is_public: input.is_public ?? true,
    notes: input.notes || '', // Holds structural local derby strings or meta context cleanly
    created_by: user.user_id
  });

  return {
    success: true,
    match_id: match.matches_id,
    match_type: input.match_type,
    status: match.status,
    team1_id: match.team1_id,
    team2_id: match.team2_id,
    venue: match.venue,
    scheduled_at: match.scheduled_at
  };
};

// ─── tournament creation ────────────────────────────────────────────────────

const createTournament = async (user, input) => {
  const hostTeam = await repo.getClubName(user.club_id);
  const clubTeam = await repo.findClubTeam(user.club_id);

  const { tournament, firstParticipant } = await withTransaction(async (client) => {
    const exec = (text, params) => client.query(text, params);
    
    // Fallback format resolver matching overs setup layout
    const determinedFormat = input.overs_limit === 20 ? 'T20' : 'Custom';

    const created = await repo.insertTournament({
      name: input.tournament_name,
      format: input.tournament_type?.toLowerCase() || 'league',
      match_format: determinedFormat,
      no_of_overs_match: input.overs_limit,
      start_date: input.start_date || new Date().toISOString().slice(0, 10),
      end_date: input.end_date || null,
      host_team: hostTeam || 'Host Club',
      created_by: user.user_id
    }, exec);

    let participant = null;
    if (clubTeam) {
      participant = await repo.insertTournamentTeam(created.tournaments_id, clubTeam.teams_id, exec);
    }
    return { tournament: created, firstParticipant: participant };
  });

  return {
    tournament_id: tournament.tournaments_id,
    name: tournament.name,
    format: tournament.format,
    match_format: tournament.match_format,
    overs_limit: tournament.no_of_overs_match,
    max_teams: input.max_teams, 
    start_date: tournament.start_date,
    status: tournament.status,
    first_participant_team_id: firstParticipant ? firstParticipant.team_id : null,
    fixtures_generated: false
  };
};

// ─── roster ─────────────────────────────────────────────────────────────────

const listMatches = async (user) => {
  const rows = await repo.findClubMatches(user.club_id);
  return rows.map(presentRosterMatch);
};

const listPlayers = async (user) => {
  const rows = await repo.findClubMembersByRole(user.club_id, 'Player');
  return rows.map(presentMember);
};

const listScorers = async (user) => {
  const rows = await repo.findClubMembersByRole(user.club_id, 'Scorer');
  return rows.map(presentMember);
};

const listTeams = async (user) => {
  const rows = await repo.findClubTeams(user.club_id);
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    short_name: t.short_name,
    logo_url: t.logo_url || '',
    home_ground: t.home_ground || '',
    country: t.country || '',
    player_count: t.player_count
  }));
};

const createTeam = async (user, input) => {
  const short = input.short_name
    || input.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase();
  const team = await repo.insertTeam({
    name: input.name,
    short_name: short,
    logo_url: input.logo_url,
    home_ground: input.home_ground,
    country: input.country,
    created_by: user.user_id
  });
  return { team_id: team.id, name: team.name, short_name: team.short_name };
};

const updateTeam = async (user, teamId, input) => {
  const existing = await repo.findClubTeamById(user.club_id, teamId);
  if (!existing) throw new AppError('Team not found for your club', 404);
  const short = input.short_name
    || input.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase();
  const team = await repo.updateTeam(teamId, {
    name: input.name,
    short_name: short,
    logo_url: input.logo_url,
    home_ground: input.home_ground,
    country: input.country
  });
  return team;
};

const deleteTeam = async (user, teamId) => {
  const existing = await repo.findClubTeamById(user.club_id, teamId);
  if (!existing) throw new AppError('Team not found for your club', 404);
  await repo.softDeleteTeam(teamId);
  return { success: true };
};

const listTeamPlayers = async (user, teamId) => {
  const existing = await repo.findClubTeamById(user.club_id, teamId);
  if (!existing) throw new AppError('Team not found for your club', 404);
  const rows = await repo.findTeamPlayers(teamId);
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role,
    email: p.email,
    status: 'Active',
    below_18: !!p.below_18
  }));
};

const addTeamPlayer = async (user, teamId, playerId) => {
  const existing = await repo.findClubTeamById(user.club_id, teamId);
  if (!existing) throw new AppError('Team not found for your club', 404);
  const playerOk = await repo.playerBelongsToClub(user.club_id, playerId);
  if (!playerOk) throw new AppError('Player not found in your club', 400);
  await repo.addTeamPlayer(teamId, playerId);
  return { success: true };
};

const removeTeamPlayer = async (user, teamId, playerId) => {
  const existing = await repo.findClubTeamById(user.club_id, teamId);
  if (!existing) throw new AppError('Team not found for your club', 404);
  await repo.removeTeamPlayer(teamId, playerId);
  return { success: true };
};

const assignScorer = async (user, input) => {
  const ownsMatch = await repo.matchBelongsToClub(input.match_id, user.club_id);
  if (!ownsMatch) throw new AppError('Match not found for your club', 404);

  const scorerOk = await repo.scorerBelongsToClub(input.scorer_id, user.club_id);
  if (!scorerOk) throw new AppError('Scorer not found in your club', 400);

  const assignment = await repo.insertScorerAssignment({
    match_id: input.match_id,
    scorer_id: input.scorer_id,
    assigned_by: user.user_id
  });
  return {
    assignment_id: assignment.scorer_assignments_id,
    match_id: assignment.match_id,
    scorer_id: assignment.scorer_id
  };
};

module.exports = {
  listPendingApprovals,
  processApproval,
  createMatch,
  createTournament,
  listMatches,
  listPlayers,
  listScorers,
  listTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  listTeamPlayers,
  addTeamPlayer,
  removeTeamPlayer,
  assignScorer,
  TENANT_MISMATCH,
  platformRoleFor
};
