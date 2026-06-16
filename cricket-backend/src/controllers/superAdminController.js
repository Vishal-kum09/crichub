const { query } = require('../../db');

const getClubs = async (req, res, next) => {
  const result = await query('SELECT * FROM club');
  res.json(result.rows);
};

const getClubMembers = async (req, res, next) => {
  const result = await query('SELECT * FROM users WHERE club_id = $1', [req.params.id]);
  res.json(result.rows);
};

const getPendingApprovals = async (req, res, next) => {
  const result = await query('SELECT * FROM club WHERE is_approved = false');
  res.json(result.rows);
};

const approveClub = async (req, res, next) => {
  await query('UPDATE club SET is_approved = true WHERE club_id = $1', [req.params.id]);
  res.json({ success: true });
};

const deleteDataAudit = async (req, res, next) => {
  await query('DELETE FROM matches WHERE match_id = $1', [req.params.match_id]);
  res.json({ success: true });
};

module.exports = { getClubs, getClubMembers, getPendingApprovals, approveClub, deleteDataAudit };