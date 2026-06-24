const DEFAULT_SCORING_RULES = {
  wide_counts_as_ball: false,
  wide_penalty_runs: 1,
  no_ball_counts_as_ball: false,
  no_ball_penalty_runs: 1,
};

const parseMatchNotes = (notes) => {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (_) {
    return {};
  }
};

const getScoringRules = (notes) => {
  const meta = parseMatchNotes(notes);
  const rules = meta.scoring_rules || {};
  return {
    wide_counts_as_ball: rules.wide_counts_as_ball === true,
    wide_penalty_runs: Number.isFinite(Number(rules.wide_penalty_runs))
      ? Math.max(1, Number(rules.wide_penalty_runs))
      : DEFAULT_SCORING_RULES.wide_penalty_runs,
    no_ball_counts_as_ball: rules.no_ball_counts_as_ball === true,
    no_ball_penalty_runs: Number.isFinite(Number(rules.no_ball_penalty_runs))
      ? Math.max(1, Number(rules.no_ball_penalty_runs))
      : DEFAULT_SCORING_RULES.no_ball_penalty_runs,
  };
};

module.exports = {
  DEFAULT_SCORING_RULES,
  parseMatchNotes,
  getScoringRules,
};
