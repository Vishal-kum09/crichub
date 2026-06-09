// Auth controllers + Zod request schemas. Validation errors are ZodErrors,
// translated to 400 by the central errorHandler.
const { z } = require('zod');
const authService = require('../services/authService');

// ─── Zod schemas (fields map to real column names) ──────────────────────────
const RegisterIndividualSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(7).optional(),
  display_name: z.string().min(1).optional()
});

const RegisterClubSchema = z.object({
  club: z.object({
    name: z.string().min(1),
    home_ground: z.string().optional(),
    contact_number: z.string().optional(),
    email: z.string().email().optional(),
    country: z.string().optional(),
    display_initials: z.string().optional(),
    owner_name: z.string().optional()
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

const SendOtpSchema = z.object({ phone: z.string().min(7) });
const VerifyOtpSchema = z.object({ phone: z.string().min(7), code: z.string().length(6) });

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
    const { phone } = SendOtpSchema.parse(req.body);
    const result = await authService.sendOtp(phone);
    res.status(200).json(result);
  } catch (err) { next(err); }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { phone, code } = VerifyOtpSchema.parse(req.body);
    const result = await authService.verifyOtp(phone, code);
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

module.exports = {
  register,
  registerClub,
  sendOtp,
  verifyOtp,
  login,
  me,
  // exported for testing / reuse
  RegisterIndividualSchema,
  RegisterClubSchema,
  LoginSchema
};
