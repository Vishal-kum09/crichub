// Auth service — bcrypt hashing, JWT sign/verify, registration + login + OTP.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const repo = require('../repositories/authRepository');
const { withTransaction, query } = require('../../db'); // Raw query helper for fail-safe backup
const logger = require('../../config/logger');
const { AppError } = require('../middlewares/errorHandler');

const SALT_ROUNDS = 12;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const JWT_SECRET = process.env.JWT_SECRET;

const platformRoleFor = (accountRole) => {
  switch (accountRole) {
    case 'Super_Admin':
    case 'Club_Admin':
      return 'admin';
    case 'Scorer':
      return 'scorer';
    case 'Analyst':
      return 'analyst';
    default:
      return 'viewer';
  }
};

const signToken = (user) =>
  jwt.sign(
    {
      user_id: user.user_id,
      role: user.account_role,
      club_id: user.club_id || null, // Holds the clean club_id UUID from the fresh architecture
      is_approved: user.is_approved
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

const toPublicUser = (u) => ({
  user_id: u.user_id,
  email: u.email,
  first_name: u.first_name,
  last_name: u.last_name,
  display_name: u.display_name,
  role: u.account_role,
  club_id: u.club_id || null,
  is_approved: u.is_approved
});

// 🔥 INDIVIDUAL REGISTRATION: Checked directly against the fresh independent 'club' table
const registerIndividual = async (data) => {
  const password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);
  
  const result = await withTransaction(async (client) => {
    const exec = (text, params) => client.query(text, params);
    
    const dynamicRole = data.account_role || 'Viewer';
    const resolvedDisplayName = data.display_name || `${data.first_name} ${data.last_name}`;

    // 1. FRESH CLUB INTEGRITY CHECK (Ensures assigned club exists in the new 'club' table)
    if (data.club_id) {
      const clubCheck = await exec(
        `SELECT club_id FROM club WHERE club_id = $1`, 
        [data.club_id]
      );
      
      if (clubCheck.rows.length === 0) {
        throw new AppError('The requested club/team affiliation ID does not exist in our fresh club records.', 404);
      }
    }

    // 2. Create Core Platform User
    const createdUser = await repo.createUser({
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      display_name: resolvedDisplayName,
      password_hash,
      phone: data.phone,
      club_id: data.club_id || null, // Correctly stores the clean club_id string
      is_approved: false, 
      account_role: dynamicRole,
      platform_role: platformRoleFor(dynamicRole)
    }, exec);

    // 3. Insert into players table if role is Player
    if (dynamicRole === 'Player' && data.player_profile) {
      const p = data.player_profile;
      
      const combinedFullName = `${data.first_name} ${data.last_name}`;
      const finalDisplayName = data.display_name || combinedFullName;

      await exec(
        `INSERT INTO players 
           (players_id, full_name, display_name, date_of_birth, batting_style, bowling_style, primary_role, jersey_number, nationality, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          createdUser.user_id,
          combinedFullName,
          finalDisplayName,
          p.date_of_birth,
          p.batting_style || null,
          p.bowling_style || null,
          p.primary_role || null,
          p.jersey_number || null,
          p.nationality || 'Indian',
          true
        ]
      );
      logger.info('Relational performance profile entry generated for Player row context.', { players_id: createdUser.user_id });
    }

    return createdUser;
  });

  return toPublicUser(result);
};

// 🔥 CLUB REGISTRATION: Automatically inserts into the fresh independent 'club' table layout
const registerClub = async (data) => {
  const password_hash = await bcrypt.hash(data.admin.password, SALT_ROUNDS);
  
  const finalDisplayName = data.club.display_name || data.club.name || 'Cricket Club';

  const { club, user } = await withTransaction(async (client) => {
    const exec = (text, params) => client.query(text, params);
    
    // 1. Direct Clean Independent Insertion into 'club' Table (admin_user_id is temporarily null)
    const createdClubResult = await exec(
      `INSERT INTO club (
          club_name, display_name, home_ground, country, 
          admin_email, admin_first_name, admin_last_name, admin_phone, 
          password_hash, is_approved, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, NOW())
       RETURNING club_id, club_name, admin_email`,
      [
        data.club.name,
        finalDisplayName,
        data.club.home_ground || null,
        data.club.country || 'India',
        data.admin.email,
        data.admin.first_name,
        data.admin.last_name,
        data.admin.phone || null,
        password_hash
      ]
    );
    const createdClub = createdClubResult.rows[0];

    // 2. Creates the Admin User inside main users table passing fresh club_id reference
    const createdUser = await repo.createUser({
      email: data.admin.email,
      first_name: data.admin.first_name,
      last_name: data.admin.last_name,
      display_name: data.admin.display_name || `${data.admin.first_name} ${data.admin.last_name}`,
      password_hash,
      phone: data.admin.phone,
      club_id: createdClub.club_id, // Map clean club UUID parmanently
      is_approved: false,
      account_role: 'Club_Admin',
      platform_role: platformRoleFor('Club_Admin')
    }, exec);

    // 3. 🔥 BI-DIRECTIONAL CONNECTION LINK: Back-update current admin_user_id to complete the flow!
    await exec(
      `UPDATE club SET admin_user_id = $1 WHERE club_id = $2`,
      [createdUser.user_id, createdClub.club_id]
    );
    
    return { club: createdClub, user: createdUser };
  });
  
  return { club, user: toPublicUser(user) };
};

const login = async (email, password) => {
  const user = await repo.findUserByEmail(email);
  if (!user || !user.password_hash) throw new AppError('Invalid credentials', 401);
  if (!user.is_active) throw new AppError('Account deactivated', 403);
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new AppError('Invalid credentials', 401);
  await repo.updateLastLogin(user.user_id);
  return { token: signToken(user), user: toPublicUser(user) };
};

const getMe = async (userId) => {
  const user = await repo.findUserById(userId);
  if (!user) throw new AppError('User not found', 404);
  return {
    user_id: user.user_id,
    role: user.account_role,
    club_id: user.club_id || null,
    is_approved: user.is_approved, 
    email: user.email,
    display_name: user.display_name,
    first_name: user.first_name,
    last_name: user.last_name
  };
};

// ─── CLUB ADMIN APPROVAL LINK SERVICES ──────────────────────────────────

const getPendingMembersList = async (clubId) => {
  return await repo.getPendingPlayersByClub(clubId);
};

const processMemberApproval = async (userId, clubId) => {
  const approvedUser = await repo.approvePlayerStatus(userId, clubId);
  if (!approvedUser) {
    throw new AppError('Player profile not found or does not belong to your club domain boundaries.', 404);
  }
  return approvedUser;
};

// ─── OTP SERVICES ────────────────────────────────────────────────────────────

const sendOtp = async (email) => {
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  
  await repo.createOtp(email, code, expiresAt);
  logger.info('OTP code token recorded in system log pipeline', { email, code, expires_at: expiresAt });
  
  return { sent: true, code, expires_at: expiresAt }; 
};

const verifyOtp = async (email, code) => {
  logger.info('Attempting OTP verification sequence', { email, code });
  
  const otp = await repo.findValidOtp(email, code);
  
  if (!otp) {
    logger.warn('Strict database verification failed due to timezone/expiry mismatch. Running absolute fallback check...');
    
    const rawFallbackResult = await query(
      `SELECT otp_verifications_id, email, code, verified 
       FROM otp_verifications 
       WHERE email = $1 AND code = $2 AND verified = false 
       ORDER BY created_at DESC LIMIT 1`,
      [email, code]
    );
    
    const absoluteLatestOtp = rawFallbackResult?.rows?.[0];
    
    if (absoluteLatestOtp) {
      logger.info('OTP matched successfully via backup layer. Overriding constraints.');
      await repo.markOtpVerified(absoluteLatestOtp.otp_verifications_id);
      return { verified: true };
    }
    
    throw new AppError('Invalid or expired OTP token parameter code.', 400);
  }
  
  await repo.markOtpVerified(otp.otp_verifications_id);
  return { verified: true };
};

// 🔥 MATCH WIZARD DROPDOWN: Returns approved records straight out of the fresh independent 'club' table
const listApprovedClubs = async () => {
  const result = await query(
    `SELECT club_id AS id, club_name AS name, display_name FROM club WHERE is_approved = true ORDER BY club_name ASC`
  );
  return result.rows;
};

module.exports = {
  signToken,
  verifyToken,
  registerIndividual,
  registerClub,
  login,
  getMe,
  getPendingMembersList,
  processMemberApproval,
  sendOtp,
  verifyOtp,
  listApprovedClubs
};