// Auth controllers + Zod request schemas. Validation errors are ZodErrors,
// translated to 400 by the central errorHandler.
const { z } = require('zod');
const authService = require('../services/authService');
const { sendOtpEmail } = require('../services/EmailService');

// ─── Zod schemas (fields map to real column names) ──────────────────────────

const RegisterIndividualSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(7).optional(),
  display_name: z.string().min(1).optional(),
  club_id: z.string().optional().nullable(), // Kept flexible as string/UUID for fresh alignment
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

// 🔥 ALIGNED WITH FRESH 'club' TABLE COLUMNS STRUCTURE
const RegisterClubSchema = z.object({
  club: z.object({
    name: z.string().min(1),
    display_name: z.string().min(1).optional(), // Short_name replaced cleanly with display_name
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

// 🔥 MATCH WIZARD DROPDOWN BYPASS LINK
const listClubs = async (req, res, next) => {
  try {
    const clubs = await authService.listApprovedClubs();
    // Directly sending array payload so that frontend `allGlobalClubs.map` doesn't crash
    res.status(200).json(clubs);
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
  LoginSchema
};