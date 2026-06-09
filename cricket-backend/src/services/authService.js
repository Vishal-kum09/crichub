// Auth service — bcrypt hashing, JWT sign/verify, registration + login + OTP.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const repo = require('../repositories/authRepository');
const { withTransaction } = require('../../db');
const logger = require('../../config/logger');
const { AppError } = require('../middlewares/errorHandler');

const SALT_ROUNDS = 12;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const JWT_SECRET = process.env.JWT_SECRET;

// Map the 6-value account_role onto the existing 4-value platform_role so the
// legacy RBAC column stays meaningful. account_role is the source of truth.
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

// JWT domain payload is EXACTLY { user_id, role, club_id, is_approved }.
// iat/exp are standard JWT envelope claims (added by expiresIn) and sit outside
// the domain payload — they are not extra domain fields.
const signToken = (user) =>
  jwt.sign(
    {
      user_id: user.user_id,
      role: user.account_role,
      club_id: user.club_id || null,
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

// Individual signup: no club affiliation → role Viewer, is_approved false.
const registerIndividual = async (data) => {
  const password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const user = await repo.createUser({
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name,
    display_name: data.display_name || `${data.first_name} ${data.last_name}`,
    password_hash,
    phone: data.phone,
    club_id: null,
    is_approved: false,
    account_role: 'Viewer',
    platform_role: 'viewer'
  });
  return toPublicUser(user);
};

// Club registration: club goes in unapproved, admin user goes in unapproved.
// Both inserts run in a single transaction so a failed admin insert can never
// leave an orphaned club row behind.
const registerClub = async (data) => {
  const password_hash = await bcrypt.hash(data.admin.password, SALT_ROUNDS);
  const { club, user } = await withTransaction(async (client) => {
    const exec = (text, params) => client.query(text, params);
    const createdClub = await repo.createClub({ ...data.club, is_approved: false }, exec);
    const createdUser = await repo.createUser({
      email: data.admin.email,
      first_name: data.admin.first_name,
      last_name: data.admin.last_name,
      display_name: data.admin.display_name || `${data.admin.first_name} ${data.admin.last_name}`,
      password_hash,
      phone: data.admin.phone,
      club_id: createdClub.clubs_id,
      is_approved: false,
      account_role: 'Club_Admin',
      platform_role: platformRoleFor('Club_Admin')
    }, exec);
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
  // Includes exactly the 4 JWT fields plus profile context.
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

// OTP: generate 6-digit code, store with 10-min expiry, LOG (no real SMS).
const sendOtp = async (phone) => {
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  await repo.createOtp(phone, code, expiresAt);
  logger.info('OTP generated (SMS not sent — dev mode)', { phone, code, expires_at: expiresAt });
  return { sent: true, expires_at: expiresAt };
};

const verifyOtp = async (phone, code) => {
  const otp = await repo.findValidOtp(phone, code);
  if (!otp) throw new AppError('Invalid or expired OTP', 400);
  await repo.markOtpVerified(otp.otp_verifications_id);
  return { verified: true };
};

module.exports = {
  signToken,
  verifyToken,
  registerIndividual,
  registerClub,
  login,
  getMe,
  sendOtp,
  verifyOtp
};
