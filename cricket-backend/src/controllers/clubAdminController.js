// Club-admin controllers + Zod request schemas. Field names map to the real
// schema (assigned_role -> users.account_role). req.user.club_id is the only
// tenant key the service trusts — it is never read from the request body.
const { z } = require('zod');
const clubAdminService = require('../services/clubAdminService');
const { AppError } = require('../middlewares/errorHandler');

const uuid = z.string().uuid();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id) => typeof id === 'string' && UUID_RE.test(id);

// ─── Zod schemas ────────────────────────────────────────────────────────────

// assigned_role maps to users.account_role. 'Umpire' is a valid account_role in
// this deployment (added additively alongside the auth schema). assigned_role is
// optional so REJECT need not carry one; it is required on APPROVE in the service.
const ApprovalInputSchema = z.object({
  user_id: uuid,
  action: z.enum(['APPROVE', 'REJECT']),
  assigned_role: z.enum(['Player', 'Scorer', 'Analyst', 'Umpire']).optional()
});

const TournamentInputSchema = z.object({
  tournament_name: z.string().min(3).max(100),
  tournament_type: z.enum(['Knockout', 'League', 'RoundRobin']),
  overs_limit: z.number().int().min(1).max(100),
  max_teams: z.number().int().min(2).max(32),
  // Optional — tournaments.start_date is NOT NULL; defaults to today if absent.
  start_date: z.string().optional(),
  end_date: z.string().optional()
});

const CreateMatchSchema = z
  .object({
    match_type: z.enum(['cross_club', 'local']),
    opponent_club_id: uuid.optional(),
    venue: z.string().min(1),
    scheduled_at: z.string().datetime(),
    total_overs: z.number().int().min(1).max(100),
    // Optional team overrides — the live schema has no club→team link, so the
    // service resolves these from the club when not supplied.
    team1_id: uuid.optional(),
    team2_id: uuid.optional()
  })
  .refine((d) => d.match_type !== 'cross_club' || !!d.opponent_club_id, {
    message: 'opponent_club_id is required for a cross_club match',
    path: ['opponent_club_id']
  });

// ─── handlers ───────────────────────────────────────────────────────────────

const getPendingApprovals = async (req, res, next) => {
  try {
    const approvals = await clubAdminService.listPendingApprovals(req.user);
    res.json({ count: approvals.length, approvals });
  } catch (err) { next(err); }
};

const updateApproval = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('User not found', 404);
    // The path id is the user being approved; merge it into the schema input.
    const data = ApprovalInputSchema.parse({ ...req.body, user_id: req.params.id });
    const result = await clubAdminService.processApproval(req.user, req.params.id, data);
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
};

const createMatch = async (req, res, next) => {
  try {
    const data = CreateMatchSchema.parse(req.body);
    const result = await clubAdminService.createMatch(req.user, data);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

const createTournament = async (req, res, next) => {
  try {
    const data = TournamentInputSchema.parse(req.body);
    const result = await clubAdminService.createTournament(req.user, data);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

const getRosterMatches = async (req, res, next) => {
  try {
    const matches = await clubAdminService.listMatches(req.user);
    res.json({ count: matches.length, matches });
  } catch (err) { next(err); }
};

const getRosterPlayers = async (req, res, next) => {
  try {
    const players = await clubAdminService.listPlayers(req.user);
    res.json({ count: players.length, players });
  } catch (err) { next(err); }
};

const getRosterScorers = async (req, res, next) => {
  try {
    const scorers = await clubAdminService.listScorers(req.user);
    res.json({ count: scorers.length, scorers });
  } catch (err) { next(err); }
};

module.exports = {
  getPendingApprovals,
  updateApproval,
  createMatch,
  createTournament,
  getRosterMatches,
  getRosterPlayers,
  getRosterScorers,
  // exported for testing / reuse
  ApprovalInputSchema,
  TournamentInputSchema,
  CreateMatchSchema
};
