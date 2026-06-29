// Scorer controllers + Zod request schemas. The schemas validate the exact
// payloads the Scorer Console sends; Zod validation failures surface as 400 via
// the central errorHandler. All ids are UUIDs in the live schema.
const { z } = require('zod');
const scorerService = require('../services/scorerService');
const commentaryService = require('../services/commentaryService');
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
  bowler_id: uuid.optional(),
  wagon_x: z.number().nullable().optional(),
  wagon_y: z.number().nullable().optional(),
  field_area: z.string().nullable().optional(),
  shot_angle: z.number().nullable().optional(),
  batsman_hand: z.enum(['right', 'left']).optional(),
  pitch_distance: z.number().nullable().optional()
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

const StartSecondInningsSchema = z.object({
  striker_id: uuid.optional(),
  non_striker_id: uuid.optional(),
  bowler_id: uuid.optional()
}).default({});

const UndoSchema = z.object({ innings_id: uuid.optional() }).default({});

// 🎙️ AI Audio Commentary Schemas
const VoicePreviewSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  voice: z.string().optional(),
  language: z.string().optional(),
  character_key: z.string().optional(),
  tone: z.string().optional(),
  speaking_rate: z.number().min(0.5).max(1.5).optional(),
  character_prompt: z.string().nullable().optional()
});


// ─── handlers ───────────────────────────────────────────────────────────────

const initialize = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Match not found', 404);
    const data = InitializeSchema.parse(req.body);
    const result = await scorerService.initialize(req.params.id, data);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

const startSecondInnings = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) throw new AppError('Match not found', 404);
    const data = StartSecondInningsSchema.parse(req.body || {});
    const result = await scorerService.startSecondInnings(req.params.id, data);
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



// Function 1: Get Audio Settings handler
const getAudioSettings = async (req, res) => {
  try {
    const matchId = req.params.id; 
    const settings = await scorerService.getMatchAudioSettings(matchId);
    res.status(200).json({ success: true, settings: settings || null });
  } catch (error) {
    console.error("Error getting audio settings:", error);
    res.status(500).json({ success: false, error: 'Failed to fetch audio settings' });
  }
};

// Function 2: Save Audio Settings handler
const saveAudioSettings = async (req, res) => {
  try {
    const matchId = req.params.id;
    const settingsData = req.body;
    const updatedSettings = await scorerService.saveMatchAudioSettings(matchId, settingsData);
    res.status(200).json({ success: true, settings: updatedSettings });
  } catch (error) {
    console.error("Error saving audio settings:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

const previewVoice = async (req, res, next) => {
  try {
    // Validate incoming settings against the Zod schema
    const settings = VoicePreviewSchema.parse(req.body);
    
    // Call the service function to generate the preview
    const previewData = await commentaryService.generateVoicePreview(settings);
    
    res.json(previewData);
  } catch (error) {
    next(error); // Pass error to the central handler
  }
};

module.exports = {
  getAudioSettings,
  saveAudioSettings,
  initialize,
  startSecondInnings,
  getLiveState,
  recordBall,
  wicketWizard,
  undo,
  assignedMatches,
  completedMatches,
  matchPreview,
  BallInputSchema,
  WicketWizardSchema,
  InitializeSchema,
  StartSecondInningsSchema,
  previewVoice,
  VoicePreviewSchema
};
