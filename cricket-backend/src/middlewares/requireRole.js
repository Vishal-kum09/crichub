// requireRole — RBAC gate factory. Usage: requireRole('Scorer', 'Club_Admin').
// Compares req.user.role (the account_role from the JWT) to the allowed list.
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Forbidden: insufficient role',
      required: allowedRoles,
      actual: req.user.role
    });
  }
  return next();
};

module.exports = { requireRole };
