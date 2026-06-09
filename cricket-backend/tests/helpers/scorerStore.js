// In-memory stand-in for scorerRepository used by scorer.test.js. It is a DUMB
// store: it persists exactly the deltas the real ScoringEngine service hands it
// (runs, balls, extras, etc.) and performs no scoring math itself. That way the
// test exercises the REAL service logic (ballMath, over/innings completion,
// undo reversal) against a deterministic store instead of a live database.
// Fixed UUIDs so they pass the controller/Zod uuid validation.
const MATCH_ID = '00000000-0000-4000-8000-0000000000a1';
const INNINGS_ID = '00000000-0000-4000-8000-0000000000b1';

let state;

const reset = () => {
  state = {
    innings: {
      innings_id: INNINGS_ID,
      match_id: MATCH_ID,
      status: 'in_progress',
      total_runs: 0,
      total_wickets: 0,
      total_balls: 0,
      extras_wides: 0,
      extras_no_balls: 0,
      extras_leg_byes: 0,
      extras_byes: 0,
      extras_penalties: 0,
      total_extras: 0
    },
    deliveries: [],
    overs: {},
    batting: {},
    bowling: {}
  };
};
reset();

const lockInnings = async () => ({ ...state.innings });
const getInnings = async () => ({ ...state.innings });
const getMatch = async () => ({ matches_id: MATCH_ID, status: 'live', overs_per_match: 20 });

const applyInningsDelta = async (_c, _id, d) => {
  const i = state.innings;
  i.total_runs += d.runs || 0;
  i.total_wickets += d.wickets || 0;
  i.total_balls += d.balls || 0;
  i.extras_wides += d.wides || 0;
  i.extras_no_balls += d.no_balls || 0;
  i.extras_leg_byes += d.leg_byes || 0;
  i.extras_byes += d.byes || 0;
  i.extras_penalties += d.penalties || 0;
  i.total_extras += d.total_extras || 0;
  return { ...i };
};

const setInningsStatus = async (_c, _id, status) => {
  state.innings.status = status;
  return { ...state.innings };
};

const getOrCreateOver = async (_c, p) => {
  if (!state.overs[p.overNumber]) {
    state.overs[p.overNumber] = { overs_id: `over-${p.overNumber}`, over_number: p.overNumber };
  }
  return state.overs[p.overNumber];
};
const updateOverAggregates = async () => {};
const deleteOverIfEmpty = async () => {};

const nextDeliverySequence = async () => state.deliveries.filter((d) => !d.deleted).length + 1;

const insertDelivery = async (_c, p) => {
  const row = {
    deliveries_id: `del-${state.deliveries.length + 1}`,
    over_id: p.overId,
    over_number: p.overNumber,
    ball_in_over: p.ballInOver,
    delivery_sequence: p.deliverySequence,
    bowler_id: p.bowlerId,
    batter_id: p.batterId,
    non_striker_id: p.nonStrikerId,
    delivery_type: p.deliveryType,
    runs_batter: p.runsBatter,
    runs_extras: p.runsExtras,
    runs_total: p.runsTotal,
    is_boundary_four: p.isFour,
    is_boundary_six: p.isSix,
    is_wicket: p.isWicket,
    deleted: false
  };
  state.deliveries.push(row);
  return row;
};

const getLastDelivery = async () => {
  for (let i = state.deliveries.length - 1; i >= 0; i--) {
    if (!state.deliveries[i].deleted) return { ...state.deliveries[i] };
  }
  return null;
};
const deleteDelivery = async (_c, id) => {
  const row = state.deliveries.find((d) => d.deliveries_id === id);
  if (row) row.deleted = true;
};

const insertExtra = async () => {};
const deleteExtrasForDelivery = async () => {};

const ensureBattingCard = async (_c, _id, playerId) => {
  if (!state.batting[playerId]) {
    state.batting[playerId] = {
      player_id: playerId, runs_scored: 0, balls_faced: 0, fours: 0, sixes: 0,
      dot_balls_faced: 0, is_dismissed: false
    };
  }
  return state.batting[playerId];
};
const getBattingCard = async (_c, _id, playerId) => state.batting[playerId] || null;
const getActiveBatters = async () =>
  Object.values(state.batting).filter((b) => !b.is_dismissed);
const bumpBattingCard = async (_c, _id, playerId, d) => {
  const b = state.batting[playerId];
  if (!b) return;
  b.runs_scored += d.runs || 0;
  b.balls_faced += d.balls || 0;
  b.fours += d.fours || 0;
  b.sixes += d.sixes || 0;
  b.dot_balls_faced += d.dots || 0;
};
const setBattingDismissed = async () => {};

const ensureBowlingFigure = async (_c, _id, playerId) => {
  if (!state.bowling[playerId]) {
    state.bowling[playerId] = {
      player_id: playerId, balls_bowled: 0, runs_conceded: 0, wickets: 0,
      wides: 0, no_balls: 0, dot_balls: 0
    };
  }
  return state.bowling[playerId];
};
const getBowlingFigure = async (_c, _id, playerId) => state.bowling[playerId] || null;
const bumpBowlingFigure = async (_c, _id, playerId, d) => {
  const b = state.bowling[playerId];
  if (!b) return;
  b.balls_bowled += d.balls || 0;
  b.runs_conceded += d.runs || 0;
  b.wickets += d.wickets || 0;
  b.wides += d.wides || 0;
  b.no_balls += d.no_balls || 0;
  b.dot_balls += d.dots || 0;
};

const getDismissalForDelivery = async () => null;
const deleteDismissalForDelivery = async () => {};
const insertDismissal = async () => ({ dismissals_id: 'dis-1' });

module.exports = {
  __reset: reset,
  __state: () => state,
  __ids: { MATCH_ID, INNINGS_ID },
  lockInnings,
  getInnings,
  getMatch,
  applyInningsDelta,
  setInningsStatus,
  getOrCreateOver,
  updateOverAggregates,
  deleteOverIfEmpty,
  nextDeliverySequence,
  insertDelivery,
  getLastDelivery,
  deleteDelivery,
  insertExtra,
  deleteExtrasForDelivery,
  ensureBattingCard,
  getBattingCard,
  getActiveBatters,
  bumpBattingCard,
  setBattingDismissed,
  ensureBowlingFigure,
  getBowlingFigure,
  bumpBowlingFigure,
  getDismissalForDelivery,
  deleteDismissalForDelivery,
  insertDismissal,
  // createInnings/findAssignedMatches unused by these tests
  createInnings: async () => ({ ...state.innings }),
  findAssignedMatches: async () => []
};
