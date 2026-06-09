// Super-admin controllers. No tenant binding (platform-wide). UUID path params
// are validated up front so a malformed id is a clean 404, not a Postgres 500.
const superAdminService = require('../services/superAdminService');
const { AppError } = require('../middlewares/errorHandler');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id) => typeof id === 'string' && UUID_RE.test(id);

const getClubs = async (req, res, next) => {
  try {
    const clubs = await superAdminService.listClubs();
    res.json({ count: clubs.length, clubs });
  } catch (err) { next(err); }
};

const getClubMembers = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Club not found', 404);
    const result = await superAdminService.getClubMembers(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
};

const getPendingApprovals = async (req, res, next) => {
  try {
    const approvals = await superAdminService.listPendingApprovals();
    res.json({ count: approvals.length, approvals });
  } catch (err) { next(err); }
};

const approveClub = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Club not found', 404);
    const result = await superAdminService.approveClub(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
};

const deleteDataAudit = async (req, res, next) => {
  try {
    if (!isUuid(req.params.match_id)) throw new AppError('Match not found', 404);
    const result = await superAdminService.deleteMatchAudit(req.user.user_id, req.params.match_id);
    res.json(result);
  } catch (err) { next(err); }
};

module.exports = {
  getClubs,
  getClubMembers,
  getPendingApprovals,
  approveClub,
  deleteDataAudit
};
