// requireApproved — block users whose account is pending approval.
// Assumes authenticate has already attached req.user.
const requireApproved = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.is_approved === false) {
    return res.status(403).json({ error: 'Account pending approval', redirect: 'viewer' });
  }
  return next();
};

module.exports = { requireApproved };
