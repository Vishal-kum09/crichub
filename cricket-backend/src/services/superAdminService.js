// Super-admin service — platform-wide clubs/members/approvals plus the
// irreversible data-audit match delete. The delete runs in a single
// withTransaction() and is logged to Winston with the admin and match ids.
const { withTransaction } = require('../../db');
const repo = require('../repositories/superAdminRepository');
const logger = require('../../config/logger');
const { AppError } = require('../middlewares/errorHandler');

// ─── presenters (shapes match SuperAdmin.tsx panels) ────────────────────────

const presentClub = (c) => ({
  id: c.id,
  name: c.name,
  location: c.country || c.home_ground || '',
  members: c.members,
  matches: c.matches,
  status: c.is_approved ? 'Active' : 'Pending',
  registeredDate: c.created_at
});

const presentMember = (u) => ({
  id: u.id,
  name: u.display_name || `${u.first_name} ${u.last_name}`,
  role: u.account_role,
  email: u.email,
  status: u.is_active ? 'Active' : 'Inactive'
});

const presentPendingClub = (c) => ({
  id: c.id,
  type: 'Club',
  name: c.name,
  admin: c.admin_name || c.owner_name || '',
  email: c.admin_email || c.email || '',
  location: c.country || '',
  date: c.created_at
});

// ─── reads ──────────────────────────────────────────────────────────────────

const listClubs = async () => (await repo.findAllClubs()).map(presentClub);

const getClubMembers = async (clubId) => {
  const club = await repo.getClub(clubId);
  if (!club) throw new AppError('Club not found', 404);
  const members = await repo.findClubMembers(clubId);
  return {
    club_id: club.clubs_id,
    club_name: club.name,
    count: members.length,
    members: members.map(presentMember)
  };
};

const listPendingApprovals = async () =>
  (await repo.findPendingClubs()).map(presentPendingClub);

// ─── club approval ──────────────────────────────────────────────────────────

const approveClub = async (clubId) => {
  // Both updates (club + its admins) commit atomically.
  const club = await withTransaction((client) =>
    repo.approveClub(clubId, (text, params) => client.query(text, params))
  );
  if (!club) throw new AppError('Club not found', 404);
  return { ok: true, club_id: club.clubs_id, name: club.name, is_approved: club.is_approved };
};

// ─── data-audit hard delete ─────────────────────────────────────────────────

const deleteMatchAudit = async (adminUserId, matchId) => {
  const exists = await repo.getMatch(matchId);
  if (!exists) throw new AppError('Match not found', 404);

  const counts = await withTransaction((client) => repo.deleteMatchCascade(client, matchId));

  // Irreversible — record who deleted what, after the transaction committed.
  logger.warn('SUPER_ADMIN_DATA_AUDIT', {
    context: 'SUPER_ADMIN_DATA_AUDIT',
    action: 'MATCH_HARD_DELETE',
    admin_user_id: adminUserId,
    match_id: matchId,
    deleted_counts: counts,
    database_transaction_status: 'COMMITTED'
  });

  return {
    ok: true,
    match_id: matchId,
    deleted: counts,
    innings_deleted: counts.innings,
    deliveries_deleted: counts.deliveries
  };
};

module.exports = {
  listClubs,
  getClubMembers,
  listPendingApprovals,
  approveClub,
  deleteMatchAudit
};
