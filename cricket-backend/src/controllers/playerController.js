// Player controller — the authenticated player's own performance view.
const playerService = require('../services/playerService');

const getMyPerformances = async (req, res, next) => {
  try {
    // Bound to the signed-in user; the service resolves the player row from this
    // identity (D-010 fallback) and never trusts a client-supplied id.
    const result = await playerService.getMyPerformances(req.user.user_id);
    res.json(result);
  } catch (err) { next(err); }
};

module.exports = { getMyPerformances };
