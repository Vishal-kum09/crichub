const { query } = require('../../db'); 

const getUserProfile = async (userId) => {
  const sql = `
    SELECT 
      u.first_name, 
      u.last_name, 
      u.email, 
      u.role, 
      u.phone, 
      c.club_name AS club_name 
    FROM users u
    LEFT JOIN club c ON u.club_id = c.club_id
    WHERE u.user_id = $1
  `;
  const result = await query(sql, [userId]);
  return result.rows[0];
};

const updateUserProfile = async (userId, firstName, lastName, displayName, phone) => {
  const sql = `
    UPDATE users 
    SET 
      first_name = $1, 
      last_name = $2, 
      display_name = $3,
      phone = $4,
      updated_at = now()
    WHERE user_id = $5
    RETURNING first_name, last_name, phone
  `;
  const result = await query(sql, [firstName, lastName, displayName, phone, userId]);
  return result.rows[0];
};

const getPasswordHash = async (userId) => {
  const sql = `SELECT password_hash FROM users WHERE user_id = $1`;
  const result = await query(sql, [userId]);
  return result.rows[0];
};

const updatePassword = async (userId, newHash) => {
  const sql = `UPDATE users SET password_hash = $1, updated_at = now() WHERE user_id = $2`;
  await query(sql, [newHash, userId]);
};

const deleteUserAccount = async (userId) => {
  const sql = `DELETE FROM users WHERE user_id = $1`;
  await query(sql, [userId]);
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getPasswordHash,
  updatePassword,
  deleteUserAccount
};