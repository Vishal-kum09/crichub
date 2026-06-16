// Scorer controllers + Zod request schemas. The schemas validate the exact
// payloads the Scorer Console sends; Zod validation failures surface as 400 via
// the central errorHandler. All ids are UUIDs in the live schema.
const { z } = require('zod');
const scorerService = require('../services/scorerService');
const { AppError } = require('../middlewares/errorHandler');

const uuid = z.string().uuid();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id) => typeof id === 'string' && UUID_RE.test(id);

// ─── Zod schemas ────────────────────────────────────────────────────────────

// Every ball the console records. The optional striker/non_striker/bowler ids
// let the console drive the crease directly; when omitted the engine resolves
// them from server-side state.
const BallInputSchema = z.object({
  innings_id: uuid,
  runs_off_bat: z.number().int().min(0).max(6),
  extra_type: z.enum(['None', 'NB', 'WD', 'LB', 'B']),
  extra_runs: z.number().int().min(0).max(5),
  is_wicket: z.boolean(),
  striker_id: uuid.optional(),
  non_striker_id: uuid.optional(),
  bowler_id: uuid.optional()
});

const WicketWizardSchema = z.object({
  dismissed_player_id: uuid,
  dismissal_type: z.enum([
    'Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped',
    'Hit Wicket', 'Retired Hurt', 'Obstructing the Field'
  ]),
  fielder_id: uuid.optional(),
  incoming_batsman_id: uuid,
  innings_id: uuid.optional()
});

// 🔥 DYNAMICALLY EXTENDED TO SUPPORT METADATA FOR LOCAL MATCH IDENTITIES
const InitializeSchema = z.object({
  batting_team_id: uuid,
  fielding_team_id: uuid,
  innings_number: z.number().int().min(1).max(4).default(1),
  target_runs: z.number().int().min(0).optional(),
  striker_id: uuid.optional(),
  non_striker_id: uuid.optional(),
  bowler_id: uuid.optional(),
  
  // Scorer Console custom labels pass-through for internal club teams
  metadata: z.object({
    is_local_derby: z.boolean().default(false),
    batting_team_label: z.string().optional(),
    fielding_team_label: z.string().optional()
  }).optional()
});

const UndoSchema = z.object({ innings_id: uuid.optional() }).default({});

// ─── handlers ───────────────────────────────────────────────────────────────

const initialize = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Match not found', 404);
    const data = InitializeSchema.parse(req.body);
    const result = await scorerService.initialize(req.params.id, data);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

const recordBall = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Match not found', 404);
    const data = BallInputSchema.parse(req.body);
    // scored_by is taken from the authenticated scorer, never the client.
    const result = await scorerService.recordBall(req.params.id, {
      ...data,
      scored_by: req.user.user_id
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
};

const wicketWizard = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Match not found', 404);
    const data = WicketWizardSchema.parse(req.body);
    const result = await scorerService.wicketWizard(req.params.id, data);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

const undo = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Match not found', 404);
    const data = UndoSchema.parse(req.body || {});
    const result = await scorerService.undo(req.params.id, data);
    res.status(200).json(result);
  } catch (err) { next(err); }
};

const assignedMatches = async (req, res, next) => {
  try {
    const matches = await scorerService.getAssignedMatches(req.user.user_id);
    res.status(200).json({ count: matches.length, matches });
  } catch (err) { next(err); }
};

const completedMatches = async (req, res, next) => {
  try {
    const matches = await scorerService.getCompletedMatches(req.user.user_id);
    res.status(200).json({ count: matches.length, matches });
  } catch (err) { next(err); }
};

const matchPreview = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Match not found', 404);
    const preview = await scorerService.getMatchPreview(req.user.user_id, req.params.id);
    res.status(200).json(preview);
  } catch (err) { next(err); }
};

const getLiveState = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Match not found', 404);
    
    // Call the service method to get the fully calculated scorecard
    const liveState = await scorerService.getLiveMatchState(req.params.id);
    
    res.status(200).json(liveState);
  } catch (err) { 
    next(err); 
  }
};

module.exports = {
  initialize,
  getLiveState,
  recordBall,
  wicketWizard,
  undo,
  assignedMatches,
  completedMatches,
  matchPreview,
  BallInputSchema,
  WicketWizardSchema,
  InitializeSchema
};