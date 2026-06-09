// authenticate — verify JWT signature, attach decoded payload to req.user.
// Decoded payload shape: { user_id, role, club_id, is_approved }.
const authService = require('../services/authService');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (!token || scheme !== 'Bearer') {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = authService.verifyToken(token);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };
