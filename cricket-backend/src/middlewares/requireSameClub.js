// requireSameClub — tenant isolation. Ensures req.user.club_id matches the
// target resource's club_id, else 403 "Access Denied: Tenant Isolation Mismatch".
//
// The target club_id is resolved from (in order): a custom extractor, then
// req.params.club_id / req.params.clubId, then req.body.club_id.
// Super_Admin bypasses tenant isolation (cross-club operations).
const requireSameClub = (extractor) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role === 'Super_Admin') return next();

  const targetClubId = typeof extractor === 'function'
    ? extractor(req)
    : (req.params.club_id || req.params.clubId || req.body.club_id);

  if (!targetClubId || req.user.club_id !== targetClubId) {
    return res.status(403).json({ error: 'Access Denied: Tenant Isolation Mismatch' });
  }

  return next();
};

module.exports = { requireSameClub };
