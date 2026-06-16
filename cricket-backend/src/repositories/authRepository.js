// Auth data-access — users, clubs, otp_verifications. Real column names.
// Parameterized via the db.js query helper. Write functions used in multi-step
// flows accept an optional `exec` (a (text, params) => Promise runner) so the
// service can pass a transaction client; it defaults to the pooled query helper.
const { query } = require('../../db');

// Full row incl password_hash — only used by login.
const findUserByEmail = async (email) => {
  const result = await query(
    `SELECT user_id, email, first_name, last_name, display_name, password_hash,
            account_role, club_id, is_approved, is_active
     FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
};

const findUserById = async (userId) => {
  const result = await query(
    `SELECT user_id, email, first_name, last_name, display_name,
            account_role, club_id, is_approved, is_active, phone, last_login_at
     FROM users WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
};

const createUser = async (u, exec = query) => {
  const result = await exec(
    `INSERT INTO users
       (email, first_name, last_name, display_name, password_hash, phone,
        club_id, is_approved, account_role, role)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::account_role,$10::platform_role)
     RETURNING user_id, email, first_name, last_name, display_name,
               account_role, club_id, is_approved`,
    [u.email, u.first_name, u.last_name, u.display_name, u.password_hash,
     u.phone || null, u.club_id || null, u.is_approved, u.account_role, u.platform_role]
  );
  return result.rows[0];
};

const createClub = async (c, exec = query) => {
  const result = await exec(
    `INSERT INTO clubs
       (name, home_ground, contact_number, email, country, display_initials,
        owner_name, is_approved)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING clubs_id, name, is_approved, created_at`,
    [c.name, c.home_ground || null, c.contact_number || null, c.email || null,
     c.country || null, c.display_initials || null, c.owner_name || null, c.is_approved]
  );
  return result.rows[0];
};

const updateLastLogin = async (userId) => {
  await query('UPDATE users SET last_login_at = now() WHERE user_id = $1', [userId]);
};

// ─── CLUB ADMIN APPROVAL QUERIES ─────────────────────────────────────────────

// Fetch all users who requested to join a specific club but are not yet approved
const getPendingPlayersByClub = async (clubId) => {
  const result = await query(
    `SELECT user_id, first_name, last_name, email, account_role, display_name, created_at 
     FROM users 
     WHERE club_id = $1 AND is_approved = false AND is_active = true
     ORDER BY created_at DESC`,
    [clubId]
  );
  return result.rows;
};

// Update a specific player's approval status to true under a strict club boundary
const approvePlayerStatus = async (userId, clubId, exec = query) => {
  const result = await exec(
    `UPDATE users 
     SET is_approved = true 
     WHERE user_id = $1 AND club_id = $2
     RETURNING user_id, email, display_name, is_approved`,
    [userId, clubId]
  );
  return result.rows[0] || null;
};

// ─── OTP (REWORKED & FIXED TO ALIGN WITH DYNAMIC EMAIL FLOW) ─────────────────

const createOtp = async (email, code, expiresAt) => { 
  const result = await query(
    `INSERT INTO otp_verifications (email, code, expires_at)
     VALUES ($1,$2,$3)
     RETURNING otp_verifications_id, email, expires_at`,
    [email, code, expiresAt]
  );
  return result.rows[0];
};

const findValidOtp = async (email, code) => { 
  const result = await query(
    `SELECT otp_verifications_id, email, code, expires_at, verified
     FROM otp_verifications
     WHERE email = $1 AND code = $2 AND verified = false
     ORDER BY created_at DESC LIMIT 1`, 
    [email, code]
  );
  return result.rows[0] || null;
};

const markOtpVerified = async (id) => {
  await query('UPDATE otp_verifications SET verified = true WHERE otp_verifications_id = $1', [id]);
};

const findApprovedClubs = async () => {
  const result = await query(
    `SELECT clubs_id AS id, name FROM clubs
      WHERE is_approved = true ORDER BY name ASC`
  );
  return result.rows;
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  createClub,
  updateLastLogin,
  getPendingPlayersByClub,
  approvePlayerStatus,
  createOtp,
  findValidOtp,
  markOtpVerified,
  findApprovedClubs
};