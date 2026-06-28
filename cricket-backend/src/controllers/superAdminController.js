// Super-admin controller — delegates to the service layer for all business
// logic. Every handler wraps in try/catch forwarding to the central errorHandler.
const service = require('../services/superAdminService');

// GET /api/super-admin/clubs/:id — single club detail
const getClub = async (req, res, next) => {
  try {
    const club = await service.getClub(req.params.id);
    if (!club) return res.status(404).json({ error: 'Club not found' });
    res.json(club);
  } catch (err) { next(err); }
};

// GET /api/super-admin/clubs — full club directory with member/match counts
const getClubs = async (req, res, next) => {
  try {
    const clubs = await service.getAllClubs();
    res.json(clubs);
  } catch (err) { next(err); }
};

// GET /api/super-admin/clubs/:id/members — drill-down into a club's users
const getClubMembers = async (req, res, next) => {
  try {
    const members = await service.getClubMembers(req.params.id);
    res.json(members);
  } catch (err) { next(err); }
};

// GET /api/super-admin/approvals/pending — unapproved clubs with admin contact
const getPendingApprovals = async (req, res, next) => {
  try {
    const pending = await service.getPendingClubs();
    res.json(pending);
  } catch (err) { next(err); }
};

// PUT /api/super-admin/clubs/:id/approve — approve club + activate its admins
const approveClub = async (req, res, next) => {
  try {
    const result = await service.approveClub(req.params.id);
    if (!result) return res.status(404).json({ error: 'Club not found' });
    res.json({ success: true, club: result });
  } catch (err) { next(err); }
};

// DELETE /api/super-admin/clubs/:id/remove — delete any approved club
const deleteClub = async (req, res, next) => {
  try {
    const result = await service.deleteClub(req.params.id);
    res.json({ success: true, message: result ? `Club "${result.name}" deleted` : 'Club deleted' });
  } catch (err) { next(err); }
};

// DELETE /api/super-admin/clubs/:id — reject (delete) a pending club registration
const rejectClub = async (req, res, next) => {
  try {
    const result = await service.rejectClub(req.params.id);
    if (!result) return res.status(404).json({ error: 'Pending club not found or already approved' });
    res.json({ success: true, message: `Club "${result.name}" rejected and removed` });
  } catch (err) { next(err); }
};

// DELETE /api/super-admin/data-audit/:match_id — hard-delete a match + all children
const deleteDataAudit = async (req, res, next) => {
  try {
    const counts = await service.deleteMatchAudit(req.params.match_id);
    res.json({ success: true, deleted: counts });
  } catch (err) {
    if (err.message === 'MATCH_NOT_FOUND') {
      return res.status(404).json({ error: 'Match not found' });
    }
    next(err);
  }
};

// GET /api/super-admin/stats — platform-wide aggregate statistics
const getPlatformStats = async (req, res, next) => {
  try {
    const stats = await service.getPlatformStats();
    res.json(stats);
  } catch (err) { next(err); }
};

module.exports = {
  getClubs,
  getClub,
  getClubMembers,
  getPendingApprovals,
  approveClub,
  rejectClub,
  deleteClub,
  deleteDataAudit,
  getPlatformStats,
};