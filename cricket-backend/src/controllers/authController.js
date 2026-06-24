// Auth controllers + Zod request schemas. Validation errors are ZodErrors,
// translated to 400 by the central errorHandler.
const { z } = require('zod');
const bcrypt = require('bcrypt'); // 🔥 Moved here
const authService = require('../services/authService');
const { sendOtpEmail } = require('../services/EmailService');

// 🔥 DATABASE IMPORT ADDED (Path check kar lena agar 'db' ki jagah 'database' ho)
const {  query } = require('../../db'); // Raw query helper for fail-safe backup

// ─── Zod schemas (fields map to real column names) ──────────────────────────

const RegisterIndividualSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(7).optional(),
  display_name: z.string().min(1).optional(),
  club_id: z.string().optional().nullable(),
  account_role: z.string().optional(),
  
  player_profile: z.object({
    date_of_birth: z.string().min(1), 
    batting_style: z.enum(['right_hand', 'left_hand']), 
    bowling_style: z.enum([
      'right_arm_fast', 'left_arm_fast', 
      'right_arm_off_spin', 'left_arm_off_spin', 
      'right_arm_leg_spin', 'left_arm_unorthodox_spin_chinaman'
    ]).optional().or(z.literal('')), 
    primary_role: z.enum(['batter', 'bowler', 'all_rounder', 'wicket_keeper']),
    jersey_number: z.number().optional().or(z.string().transform(v => v ? Number(v) : undefined)), 
    nationality: z.string().default('Indian')
  }).optional()
});

const RegisterClubSchema = z.object({
  club: z.object({
    name: z.string().min(1),
    display_name: z.string().min(1).optional(),
    home_ground: z.string().optional(),
    country: z.string().optional()
  }),
  admin: z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().min(7).optional(),
    display_name: z.string().min(1).optional()
  })
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const SendOtpSchema = z.object({ email: z.string().email() });
const VerifyOtpSchema = z.object({ email: z.string().email(), code: z.string().length(6) });

// ─── handlers ───────────────────────────────────────────────────────────────

const register = async (req, res, next) => {
  try {
    const data = RegisterIndividualSchema.parse(req.body);
    const user = await authService.registerIndividual(data);
    res.status(201).json({ message: 'Registration successful — pending approval', user });
  } catch (err) { next(err); }
};

const registerClub = async (req, res, next) => {
  try {
    const data = RegisterClubSchema.parse(req.body);
    const result = await authService.registerClub(data);
    res.status(201).json({
      message: 'Club registration submitted — pending Super Admin approval',
      ...result
    });
  } catch (err) { next(err); }
};

const sendOtp = async (req, res, next) => {
  try {
    const { email } = SendOtpSchema.parse(req.body);
    const result = await authService.sendOtp(email);
    const extractedCode = result?.code || result?.otp || (result?.data && result?.data?.code);
    
    if (extractedCode) {
      await sendOtpEmail(email, extractedCode.toString());
    } else {
      const emergencyOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await sendOtpEmail(email, emergencyOtp);
    }
    
    res.status(200).json({
      success: true,
      message: 'Verification token successfully dispatched to your email address!'
    });
  } catch (err) { next(err); }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, code } = VerifyOtpSchema.parse(req.body);
    const result = await authService.verifyOtp(email, code);
    res.status(200).json(result);
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (err) { next(err); }
};

const me = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.user_id);
    res.status(200).json(user);
  } catch (err) { next(err); }
};

const listClubs = async (req, res, next) => {
  try {
    const clubs = await authService.listApprovedClubs();
    res.status(200).json({ clubs });
  } catch (err) { next(err); }
};

// ─── NEW CLUB ADMIN APPROVAL HANDLERS ───────────────────────────────────────

const getPendingClubMembers = async (req, res, next) => {
  try {
    const adminClubId = req.user?.club_id; 
    
    if (!adminClubId) {
      return res.status(403).json({ error: 'Access denied. You are not associated with any club admin profile.' });
    }

    const pendingMembers = await authService.getPendingMembersList(adminClubId);
    res.status(200).json({ 
      success: true, 
      count: pendingMembers.length, 
      data: pendingMembers 
    });
  } catch (err) { next(err); }
};

const approveClubMember = async (req, res, next) => {
  try {
    const adminClubId = req.user?.club_id;
    const { player_user_id } = req.body; 

    if (!adminClubId) {
      return res.status(403).json({ error: 'Unauthorized operational context.' });
    }

    if (!player_user_id) {
      return res.status(400).json({ error: 'player_user_id parameter is required.' });
    }

    const result = await authService.processMemberApproval(player_user_id, adminClubId);
    res.status(200).json({ 
      success: true, 
      message: 'Player account successfully approved!', 
      data: result 
    });
  } catch (err) { next(err); }
};

// ─── FORGOT PASSWORD HANDLERS ─────────────────────────────────────────────

// 1. Send OTP for Password Reset
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    // Check if user exists in the main users table
    const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User with this email does not exist' });
    }

    // Generate 6-digit OTP and Expiry (10 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

    // Insert new OTP record
    await query(
      `INSERT INTO otp_verifications (email, code, expires_at, verified, created_at) 
       VALUES ($1, $2, $3, false, NOW())`,
      [email, otp, expiresAt]
    );

    // 🔥 USING YOUR EXISTING EMAIL SERVICE INSTEAD OF RAW TRANSPORTER
    await sendOtpEmail(email, otp.toString());

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// 2. Verify OTP
const verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const otpResult = await query(
      `SELECT * FROM otp_verifications 
       WHERE email = $1 AND code = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    const otpRecord = otpResult.rows[0];

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    await query(
      'UPDATE otp_verifications SET verified = true WHERE otp_verifications_id = $1',
      [otpRecord.otp_verifications_id]
    );

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

// 3. Reset Password
const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const verificationCheck = await query(
      `SELECT * FROM otp_verifications 
       WHERE email = $1 AND verified = true 
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (verificationCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Email not verified. Please verify OTP first.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await query(
  'UPDATE users SET password_hash = $1 WHERE email = $2',
  [hashedPassword, email]
);

    await query('DELETE FROM otp_verifications WHERE email = $1', [email]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// 🎙️ Get Realtime Gateway Token for Live Commentary
const getRealtimeToken = async (req, res, next) => {
  try {
    const token = process.env.REALTIME_CLIENT_TOKEN;
    const realtimeUrl = process.env.REALTIME_GATEWAY_URL;
    
    if (!token || !realtimeUrl) {
      return res.status(200).json({
        success: true,
        enabled: false,
        token: null,
        realtime_url: null
      });
    }

    res.status(200).json({ 
      success: true, 
      enabled: true,
      token,
      realtime_url: realtimeUrl
    });
  } catch (err) { 
    next(err); 
  }
};

module.exports = {
  register,
  registerClub,
  sendOtp,
  verifyOtp,
  login,
  me,
  listClubs,
  getPendingClubMembers,
  approveClubMember,
  RegisterIndividualSchema,
  RegisterClubSchema,
  LoginSchema,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getRealtimeToken
};
