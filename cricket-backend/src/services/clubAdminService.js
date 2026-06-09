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

// match_format enum is derived from the over count the form supplies.
const matchFormatForOvers = (overs) => {
  if (overs === 20) return 'T20';
  if (overs === 50) return 'ODI';
  return 'Custom';
};

// tournament_type (form) -> tournament_format enum.
const TOURNAMENT_FORMAT = {
  Knockout: 'knockout',
  League: 'league',
  RoundRobin: 'group_and_knockout'
};

// ─── presenters (shapes match ClubAdmin.tsx panels) ─────────────────────────

const presentApproval = (u) => ({
  id: u.user_id,
  name: u.display_name || `${u.first_name} ${u.last_name}`,
  email: u.email,
  phone: u.phone || '',
  role: (u.account_role || 'Viewer').toLowerCase(),
  date: u.created_at
});

const presentRosterMatch = (m) => ({
  id: m.id,
  opponent: `${m.team1_short || m.team1_name} vs ${m.team2_short || m.team2_name}`,
  date: m.match_date || m.scheduled_at,
  venue: m.venue || '',
  status: m.status
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

  // Hard tenant block — a club admin may only touch their own club's users.
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

// ─── match creation ─────────────────────────────────────────────────────────

const createMatch = async (user, input) => {
  // Resolve the two teams. The schema has no club→team link, so team1 is the
  // admin club's team and team2 is the opponent club's (cross_club) or a second
  // club team (local). Explicit ids in the payload always win.
  let team1 = input.team1_id || (await repo.findClubTeam(user.club_id))?.teams_id;
  if (!team1) {
    throw new AppError('No team found for your club — create a team or pass team1_id', 400);
  }

  let team2 = input.team2_id;
  if (!team2) {
    if (input.match_type === 'cross_club') {
      team2 = (await repo.findClubTeam(input.opponent_club_id))?.teams_id;
      if (!team2) throw new AppError('Opponent club has no team — pass team2_id', 400);
    } else {
      team2 = (await repo.findClubTeam(user.club_id, team1))?.teams_id;
      if (!team2) throw new AppError('Need a second team for a local match — pass team2_id', 400);
    }
  }
  if (input.team1_id && (await repo.teamExists(team1)) == null) {
    throw new AppError('team1_id does not exist', 400);
  }

  const when = new Date(input.scheduled_at);
  const isCross = input.match_type === 'cross_club';

  // The creating club is recorded via created_by → users.club_id; the opponent
  // club + confirmation state live in notes (no match columns exist for them).
  const notes = JSON.stringify({
    match_type: input.match_type,
    creating_club_id: user.club_id,
    opponent_club_id: isCross ? input.opponent_club_id : null,
    confirmation: isCross ? 'pending' : 'confirmed'
  });

  const match = await repo.insertMatch({
    match_date: when.toISOString().slice(0, 10),
    start_time: when.toISOString().slice(11, 19),
    format: matchFormatForOvers(input.total_overs),
    ball_type: 'leather',
    overs_per_match: input.total_overs,
    team1_id: team1,
    team2_id: team2,
    venue: input.venue,
    scheduled_at: input.scheduled_at,
    // No 'pending' match_status exists; cross_club stays 'scheduled' but is kept
    // private and flagged pending in notes until the opponent confirms.
    status: 'scheduled',
    is_public: !isCross,
    notes,
    created_by: user.user_id
  });

  return {
    match_id: match.matches_id,
    status: match.status,
    match_type: input.match_type,
    confirmation: isCross ? 'pending' : 'confirmed',
    team1_id: match.team1_id,
    team2_id: match.team2_id,
    opponent_club_id: isCross ? input.opponent_club_id : null,
    scheduled_at: match.scheduled_at,
    venue: match.venue
  };
};

// ─── tournament creation ────────────────────────────────────────────────────

const createTournament = async (user, input) => {
  // Reads can run outside the transaction; the two writes (tournament + first
  // participant) are wrapped together so a failed participant insert cannot
  // leave a half-created tournament.
  const hostTeam = await repo.getClubName(user.club_id);
  const clubTeam = await repo.findClubTeam(user.club_id);

  const { tournament, firstParticipant } = await withTransaction(async (client) => {
    const exec = (text, params) => client.query(text, params);
    const created = await repo.insertTournament({
      name: input.tournament_name,
      format: TOURNAMENT_FORMAT[input.tournament_type] || 'league',
      match_format: matchFormatForOvers(input.overs_limit),
      no_of_overs_match: input.overs_limit,
      start_date: input.start_date || new Date().toISOString().slice(0, 10),
      end_date: input.end_date || null,
      host_team: hostTeam,
      created_by: user.user_id
    }, exec);

    // Seat the creating club as the first participant when a team is resolvable.
    // Fixtures are intentionally NOT auto-generated — the frontend schedules them.
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
    max_teams: input.max_teams, // echoed back; no schema column persists it
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

module.exports = {
  listPendingApprovals,
  processApproval,
  createMatch,
  createTournament,
  listMatches,
  listPlayers,
  listScorers,
  TENANT_MISMATCH,
  platformRoleFor
};
