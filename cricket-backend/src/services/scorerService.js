// Scoring engine — the single source of truth for every run, ball and wicket
// mutation. Every mutating path runs inside db.withTransaction() so a delivery
// is either fully recorded or not at all (no partial state). All math is the
// exact specification the scorer console relies on; see ballMath().
const { withTransaction } = require('../../db');
const repo = require('../repositories/scorerRepository');
const logger = require('../../config/logger');
const { AppError } = require('../middlewares/errorHandler');

// ─── Enum mapping ───────────────────────────────────────────────────────────

// Frontend extra_type -> live-schema delivery_type enum.
const DELIVERY_TYPE = {
  None: 'legal',
  NB: 'no_ball',
  WD: 'wide',
  LB: 'leg_bye',
  B: 'bye'
};

// Wizard dismissal_type -> live-schema dismissal_type enum. Bowler-credited
// dismissals are flagged so the bowler's wicket tally only moves when earned.
const DISMISSAL = {
  Bowled:                 { type: 'bowled', creditsBowler: true },
  Caught:                 { type: 'caught', creditsBowler: true },
  LBW:                    { type: 'lbw', creditsBowler: true },
  'Run Out':              { type: 'run_out', creditsBowler: false },
  Stumped:                { type: 'stumped', creditsBowler: true },
  'Hit Wicket':           { type: 'hit_wicket', creditsBowler: true },
  'Obstructing the Field':{ type: 'obstructing_field', creditsBowler: false }
  // 'Retired Hurt' is handled separately — it is not a true dismissal and has
  // no live-schema enum value (no wicket is credited, no dismissal row).
};

const phaseFor = (overNumber, oversPerMatch) => {
  if (overNumber <= 6) return 'powerplay';
  if (oversPerMatch && overNumber > oversPerMatch - 4) return 'death';
  if (!oversPerMatch && overNumber >= 16) return 'death';
  return 'middle';
};

// ─── Core scoring math ──────────────────────────────────────────────────────
// Given the validated ball input, produce every delta the delivery causes.
// Implemented exactly per the scoring spec — do not "simplify" these.
const ballMath = (deliveryType, runsOffBat, extraRuns) => {
  // Defaults describe a standard, legal delivery.
  const m = {
    deliveryType,
    runsBatter: 0,
    runsExtras: 0,
    runsTotal: 0,          // team score delta
    countsOver: false,     // legal ball → advances the over / bowler balls
    batterFaces: false,    // batter's balls_faced increments
    bowlerConceded: 0,     // runs charged to the bowler
    extras: { wides: 0, no_balls: 0, leg_byes: 0, byes: 0, penalties: 0, total: 0 },
    isFour: false,
    isSix: false,
    isDot: false
  };

  switch (deliveryType) {
    case 'legal':
      m.runsBatter = runsOffBat;
      m.runsTotal = runsOffBat;
      m.countsOver = true;
      m.batterFaces = true;
      m.bowlerConceded = runsOffBat;
      m.isFour = runsOffBat === 4;
      m.isSix = runsOffBat === 6;
      m.isDot = runsOffBat === 0;
      break;

    case 'no_ball':
      // team_score += 1 (penalty) + runs_off_bat; over does NOT advance.
      m.runsBatter = runsOffBat;
      m.runsExtras = 1;
      m.runsTotal = 1 + runsOffBat;
      m.countsOver = false;
      m.batterFaces = true;
      m.bowlerConceded = 1 + runsOffBat;
      m.extras.no_balls = 1;       // count of no balls (+1)
      m.extras.total = 1;
      m.isFour = runsOffBat === 4;
      m.isSix = runsOffBat === 6;
      break;

    case 'wide':
      // team_score += 1 (penalty) + extra_runs; batter does NOT face it.
      m.runsExtras = 1 + extraRuns;
      m.runsTotal = 1 + extraRuns;
      m.countsOver = false;
      m.batterFaces = false;
      m.bowlerConceded = 1 + extraRuns;
      m.extras.wides = 1 + extraRuns; // wide runs (1 + extra)
      m.extras.total = 1 + extraRuns;
      break;

    case 'leg_bye':
      m.runsExtras = extraRuns;
      m.runsTotal = extraRuns;
      m.countsOver = true;
      m.batterFaces = true;
      m.bowlerConceded = 0;          // not charged to the bowler
      m.extras.leg_byes = extraRuns;
      m.extras.total = extraRuns;
      m.isDot = extraRuns === 0;
      break;

    case 'bye':
      m.runsExtras = extraRuns;
      m.runsTotal = extraRuns;
      m.countsOver = true;
      m.batterFaces = true;
      m.bowlerConceded = 0;
      m.extras.byes = extraRuns;
      m.extras.total = extraRuns;
      m.isDot = extraRuns === 0;
      break;

    case 'penalty':
      // Penalty runs are awarded to the side; not a faced ball, not charged.
      m.runsExtras = extraRuns;
      m.runsTotal = extraRuns;
      m.extras.penalties = extraRuns;
      m.extras.total = extraRuns;
      break;

    default:
      throw new AppError(`Unsupported delivery type: ${deliveryType}`, 400);
  }
  return m;
};

// How many runs the batters physically ran (drives manual-strike rotation).
const runsRan = (delivery) =>
  (delivery.delivery_type === 'legal' || delivery.delivery_type === 'no_ball')
    ? delivery.runs_batter
    : delivery.runs_extras;

// ─── Crease resolution ──────────────────────────────────────────────────────
// The ball payload carries only the innings + outcome, so the engine works out
// who is on strike, who is at the other end and who is bowling from server-side
// state: the last live delivery plus the not-out batting cards. Explicit ids in
// the input always win (the console can drive these directly).
const resolveCrease = async (db, inningsId, overrides = {}) => {
  const last = await repo.getLastDelivery(db, inningsId);
  const active = await repo.getActiveBatters(db, inningsId);

  let strikerId, nonStrikerId, bowlerId;

  if (!last) {
    // Opening state: batting positions 1 & 2, the single seeded bowler.
    strikerId = active[0] ? active[0].player_id : null;
    nonStrikerId = active[1] ? active[1].player_id : null;
    const bf = await db.query(
      `SELECT player_id FROM bowling_figures WHERE innings_id = $1
        ORDER BY balls_bowled DESC LIMIT 1`,
      [inningsId]
    );
    bowlerId = bf.rows[0] ? bf.rows[0].player_id : null;
  } else {
    const swap = runsRan(last) % 2 === 1;
    strikerId = swap ? last.non_striker_id : last.batter_id;
    nonStrikerId = swap ? last.batter_id : last.non_striker_id;
    bowlerId = last.bowler_id;

    // If a batter from the last ball has since been dismissed, the freshly
    // seated batter takes that end.
    const activeIds = new Set(active.map((a) => a.player_id));
    const incoming = active.find(
      (a) => a.player_id !== last.batter_id && a.player_id !== last.non_striker_id
    );
    if (incoming) {
      if (!activeIds.has(strikerId)) strikerId = incoming.player_id;
      else if (!activeIds.has(nonStrikerId)) nonStrikerId = incoming.player_id;
    }
  }

  return {
    strikerId: overrides.strikerId || strikerId,
    nonStrikerId: overrides.nonStrikerId || nonStrikerId,
    bowlerId: overrides.bowlerId || bowlerId
  };
};

// ─── Response assembly ──────────────────────────────────────────────────────

const presentInningsState = (inn) => ({
  innings_id: inn.innings_id,
  match_id: inn.match_id,
  status: inn.status,
  total_runs: inn.total_runs,
  total_wickets: inn.total_wickets,
  total_balls: inn.total_balls,
  overs_completed: Math.floor(inn.total_balls / 6),
  balls_this_over: inn.total_balls % 6,
  overs_display: `${Math.floor(inn.total_balls / 6)}.${inn.total_balls % 6}`,
  extras: {
    wides: inn.extras_wides,
    no_balls: inn.extras_no_balls,
    leg_byes: inn.extras_leg_byes,
    byes: inn.extras_byes,
    penalties: inn.extras_penalties,
    total: inn.total_extras
  }
});

const presentBatter = (card) =>
  card && {
    player_id: card.player_id,
    runs: card.runs_scored,
    balls_faced: card.balls_faced,
    fours: card.fours,
    sixes: card.sixes,
    is_dismissed: card.is_dismissed
  };

const presentBowler = (fig) =>
  fig && {
    player_id: fig.player_id,
    balls_bowled: fig.balls_bowled,
    overs: `${Math.floor(fig.balls_bowled / 6)}.${fig.balls_bowled % 6}`,
    runs_conceded: fig.runs_conceded,
    wickets: fig.wickets
  };

// ─── initialize ─────────────────────────────────────────────────────────────
// Open a new innings for a match and seat the opening pair + bowler. Returns
// the innings id the console then sends with every ball.
const initialize = async (matchId, input) => {
  return withTransaction(async (client) => {
    const match = await repo.getMatch(client, matchId);
    if (!match) throw new AppError('Match not found', 404);

    const innings = await repo.createInnings(client, {
      matchId,
      inningsNumber: input.innings_number,
      battingTeamId: input.batting_team_id,
      fieldingTeamId: input.fielding_team_id,
      targetRuns: input.target_runs
    });

    await repo.setMatchStatus(client, matchId, 'live');

    let striker = null;
    let nonStriker = null;
    let bowler = null;
    if (input.striker_id) {
      striker = await repo.ensureBattingCard(client, innings.innings_id, input.striker_id, {
        position: 1, cameInAtOver: 0
      });
    }
    if (input.non_striker_id) {
      nonStriker = await repo.ensureBattingCard(client, innings.innings_id, input.non_striker_id, {
        position: 2, cameInAtOver: 0
      });
    }
    if (input.bowler_id) {
      bowler = await repo.ensureBowlingFigure(client, innings.innings_id, input.bowler_id);
    }

    return {
      innings: presentInningsState(innings),
      overs_per_match: match.overs_per_match,
      striker: presentBatter(striker),
      non_striker: presentBatter(nonStriker),
      bowler: presentBowler(bowler)
    };
  });
};

// ─── recordBall ─────────────────────────────────────────────────────────────
const recordBall = async (matchId, input) => {
  const deliveryType = DELIVERY_TYPE[input.extra_type];
  if (!deliveryType) throw new AppError(`Invalid extra_type: ${input.extra_type}`, 400);

  const result = await withTransaction(async (client) => {
    const innings = await repo.lockInnings(client, input.innings_id);
    if (!innings) throw new AppError('Innings not found', 404);
    if (matchId && innings.match_id !== matchId) {
      throw new AppError('Innings does not belong to this match', 400);
    }
    if (innings.status !== 'in_progress') {
      throw new AppError('Innings is not in progress', 409);
    }

    const match = await repo.getMatch(client, innings.match_id);
    const oversPerMatch = match ? match.overs_per_match : null;

    const crease = await resolveCrease(client, input.innings_id, {
      strikerId: input.striker_id,
      nonStrikerId: input.non_striker_id,
      bowlerId: input.bowler_id
    });
    if (!crease.strikerId || !crease.bowlerId) {
      throw new AppError(
        'Cannot resolve striker/bowler — provide striker_id and bowler_id or initialize the innings first',
        400
      );
    }

    const m = ballMath(deliveryType, input.runs_off_bat, input.extra_runs);

    // Ball coordinates are derived from legal balls already bowled.
    const legalBefore = innings.total_balls;
    const overNumber = Math.floor(legalBefore / 6) + 1;
    const ballInOver = (legalBefore % 6) + 1;

    // Ensure the participants have rows, then locate/create the over.
    await repo.ensureBattingCard(client, input.innings_id, crease.strikerId, {
      cameInAtOver: overNumber - 1
    });
    if (crease.nonStrikerId) {
      await repo.ensureBattingCard(client, input.innings_id, crease.nonStrikerId, {
        cameInAtOver: overNumber - 1
      });
    }
    await repo.ensureBowlingFigure(client, input.innings_id, crease.bowlerId);

    const over = await repo.getOrCreateOver(client, {
      inningsId: input.innings_id,
      overNumber,
      bowlerId: crease.bowlerId,
      cumulativeRuns: innings.total_runs,
      cumulativeWickets: innings.total_wickets,
      runRate: 0,
      phase: phaseFor(overNumber, oversPerMatch)
    });

    const sequence = await repo.nextDeliverySequence(client, input.innings_id);
    const delivery = await repo.insertDelivery(client, {
      inningsId: input.innings_id,
      overId: over.overs_id,
      overNumber,
      ballInOver,
      deliverySequence: sequence,
      bowlerId: crease.bowlerId,
      batterId: crease.strikerId,
      nonStrikerId: crease.nonStrikerId,
      deliveryType,
      runsBatter: m.runsBatter,
      runsExtras: m.runsExtras,
      runsTotal: m.runsTotal,
      isDot: m.isDot,
      isFour: m.isFour,
      isSix: m.isSix,
      isWicket: !!input.is_wicket,
      scoredBy: input.scored_by
    });

    if (deliveryType !== 'legal') {
      await repo.insertExtra(client, {
        inningsId: input.innings_id,
        deliveryId: delivery.deliveries_id,
        extraType: deliveryType,
        runs: m.runsExtras
      });
    }

    // Innings totals.
    const updatedInnings = await repo.applyInningsDelta(client, input.innings_id, {
      runs: m.runsTotal,
      wickets: 0, // wickets are applied by the wicket wizard
      balls: m.countsOver ? 1 : 0,
      wides: m.extras.wides,
      no_balls: m.extras.no_balls,
      leg_byes: m.extras.leg_byes,
      byes: m.extras.byes,
      penalties: m.extras.penalties,
      total_extras: m.extras.total
    });

    // Batter tally.
    await repo.bumpBattingCard(client, input.innings_id, crease.strikerId, {
      runs: m.runsBatter,
      balls: m.batterFaces ? 1 : 0,
      fours: m.isFour ? 1 : 0,
      sixes: m.isSix ? 1 : 0,
      dots: deliveryType === 'legal' && input.runs_off_bat === 0 ? 1 : 0
    });

    // Bowler tally.
    await repo.bumpBowlingFigure(client, input.innings_id, crease.bowlerId, {
      balls: m.countsOver ? 1 : 0,
      runs: m.bowlerConceded,
      wides: m.extras.wides,
      no_balls: m.extras.no_balls,
      dots: m.isDot ? 1 : 0,
      fours: m.isFour ? 1 : 0,
      sixes: m.isSix ? 1 : 0
    });

    // Over tally + cumulative snapshot.
    const runRate =
      updatedInnings.total_balls > 0
        ? Number(((updatedInnings.total_runs * 6) / updatedInnings.total_balls).toFixed(2))
        : 0;
    await repo.updateOverAggregates(client, over.overs_id, {
      runs: m.runsTotal,
      legal_balls: m.countsOver ? 1 : 0,
      wides: m.extras.wides,
      no_balls: m.extras.no_balls,
      fours: m.isFour ? 1 : 0,
      sixes: m.isSix ? 1 : 0,
      dot_balls: m.isDot ? 1 : 0,
      cumulativeRuns: updatedInnings.total_runs,
      cumulativeWickets: updatedInnings.total_wickets,
      runRate
    });

    // Over / innings completion.
    const overCompleted = m.countsOver && updatedInnings.total_balls % 6 === 0;
    const oversCompleted = Math.floor(updatedInnings.total_balls / 6);
    let inningsComplete = false;
    let finalInnings = updatedInnings;
    if (
      updatedInnings.total_wickets >= 10 ||
      (oversPerMatch && oversCompleted >= oversPerMatch)
    ) {
      finalInnings = await repo.setInningsStatus(client, input.innings_id, 'completed');
      inningsComplete = true;
    }

    // Sequential reads — they share the one transaction client, which cannot
    // run queries concurrently.
    const strikerCard = await repo.getBattingCard(client, input.innings_id, crease.strikerId);
    const nonStrikerCard = crease.nonStrikerId
      ? await repo.getBattingCard(client, input.innings_id, crease.nonStrikerId)
      : null;
    const bowlerFig = await repo.getBowlingFigure(client, input.innings_id, crease.bowlerId);

    return {
      response: {
        ok: true,
        delivery: {
          id: delivery.deliveries_id,
          over_number: overNumber,
          ball_in_over: ballInOver,
          delivery_sequence: sequence,
          delivery_type: deliveryType,
          runs_batter: m.runsBatter,
          runs_extras: m.runsExtras,
          runs_total: m.runsTotal,
          is_wicket: !!input.is_wicket
        },
        innings: presentInningsState(finalInnings),
        striker: presentBatter(strikerCard),
        non_striker: presentBatter(nonStrikerCard),
        bowler: presentBowler(bowlerFig),
        over_completed: overCompleted,
        innings_complete: inningsComplete
      },
      log: {
        match_id: innings.match_id,
        over_number: overNumber,
        ball_in_over: ballInOver,
        runs_added: m.runsTotal,
        extra_recorded: input.extra_type
      }
    };
  });

  // Logged only after the transaction has COMMITTED.
  logger.info('SCORING_CONSOLE_MUTATION', {
    context: 'SCORING_CONSOLE_MUTATION',
    match_id: result.log.match_id,
    action: 'DELIVERY_RECORDED',
    metrics: {
      ball_vector: `Over ${result.log.over_number}, Ball ${result.log.ball_in_over}`,
      runs_added: result.log.runs_added,
      extra_recorded: result.log.extra_recorded
    },
    database_transaction_status: 'COMMITTED'
  });

  return result.response;
};

// Resolve the active in-progress innings of a match (used by wizard/undo which
// only receive the match id in the path).
const resolveActiveInnings = async (client, matchId, inningsId) => {
  if (inningsId) {
    const inn = await repo.lockInnings(client, inningsId);
    if (!inn) throw new AppError('Innings not found', 404);
    return inn;
  }
  const r = await client.query(
    `SELECT innings_id FROM innings
      WHERE match_id = $1 AND status = 'in_progress'
      ORDER BY innings_number DESC LIMIT 1`,
    [matchId]
  );
  if (!r.rows[0]) throw new AppError('No in-progress innings for this match', 404);
  return repo.lockInnings(client, r.rows[0].innings_id);
};

// ─── wicketWizard ───────────────────────────────────────────────────────────
const wicketWizard = async (matchId, input) => {
  return withTransaction(async (client) => {
    const innings = await resolveActiveInnings(client, matchId, input.innings_id);

    const last = await repo.getLastDelivery(client, innings.innings_id);
    if (!last) throw new AppError('No delivery to attach the dismissal to', 400);

    const overAtFall = Number((last.over_number - 1 + last.ball_in_over / 10).toFixed(1));
    const retiredHurt = input.dismissal_type === 'Retired Hurt';

    let dismissal = null;
    let updatedInnings = innings;

    if (retiredHurt) {
      // Not a true dismissal: the batter leaves the crease, no wicket credited.
      await repo.setBattingDismissed(client, innings.innings_id, input.dismissed_player_id, {
        isDismissed: true,
        dismissedAtOver: overAtFall
      });
    } else {
      const mapped = DISMISSAL[input.dismissal_type];
      if (!mapped) throw new AppError(`Invalid dismissal_type: ${input.dismissal_type}`, 400);

      const wicketNumber = innings.total_wickets + 1;
      dismissal = await repo.insertDismissal(client, {
        deliveryId: last.deliveries_id,
        inningsId: innings.innings_id,
        dismissedBatterId: input.dismissed_player_id,
        bowlerId: mapped.creditsBowler ? last.bowler_id : null,
        dismissalType: mapped.type,
        fielderId: input.fielder_id,
        runsAtFall: innings.total_runs,
        ballsAtFall: innings.total_balls,
        overAtFall,
        wicketNumber
      });

      // Flag the delivery + dismissed batter, credit the bowler, bump the over.
      await client.query(
        `UPDATE deliveries SET is_wicket = true WHERE deliveries_id = $1`,
        [last.deliveries_id]
      );
      await repo.setBattingDismissed(client, innings.innings_id, input.dismissed_player_id, {
        isDismissed: true,
        dismissalId: dismissal.dismissals_id,
        dismissedAtOver: overAtFall
      });
      if (mapped.creditsBowler) {
        await repo.bumpBowlingFigure(client, innings.innings_id, last.bowler_id, { wickets: 1 });
      }
      await repo.updateOverAggregates(client, last.over_id, {
        wickets: 1,
        cumulativeRuns: innings.total_runs,
        cumulativeWickets: innings.total_wickets + 1,
        runRate:
          innings.total_balls > 0
            ? Number(((innings.total_runs * 6) / innings.total_balls).toFixed(2))
            : 0
      });
      updatedInnings = await repo.applyInningsDelta(client, innings.innings_id, { wickets: 1 });
    }

    // Seat the incoming batsman at the dismissed batter's position.
    const dismissedCard = await repo.getBattingCard(
      client, innings.innings_id, input.dismissed_player_id
    );
    await repo.ensureBattingCard(client, innings.innings_id, input.incoming_batsman_id, {
      position: dismissedCard ? dismissedCard.batting_position : undefined,
      cameInAtOver: overAtFall
    });

    // Innings completion on the 10th wicket.
    let inningsComplete = false;
    if (!retiredHurt && updatedInnings.total_wickets >= 10) {
      updatedInnings = await repo.setInningsStatus(client, innings.innings_id, 'completed');
      inningsComplete = true;
    }

    const partnership = await repo.getActiveBatters(client, innings.innings_id);
    return {
      ok: true,
      dismissal: dismissal && {
        id: dismissal.dismissals_id,
        type: dismissal.dismissal_type,
        wicket_number: dismissal.wicket_number,
        dismissed_player_id: dismissal.dismissed_batter_id
      },
      retired_hurt: retiredHurt,
      innings: presentInningsState(updatedInnings),
      partnership: partnership.map(presentBatter),
      innings_complete: inningsComplete
    };
  });
};

// ─── undo ───────────────────────────────────────────────────────────────────
// Reverse every mutation the last live delivery caused, then delete the row —
// all in one transaction. Reversal is derived from the stored delivery record.
const undo = async (matchId, input) => {
  return withTransaction(async (client) => {
    const innings = await resolveActiveInnings(client, matchId, input.innings_id);
    const last = await repo.getLastDelivery(client, innings.innings_id);
    if (!last) throw new AppError('Nothing to undo', 400);

    const m = ballMath(last.delivery_type, last.runs_batter, last.runs_extras);
    const dismissal = await repo.getDismissalForDelivery(client, last.deliveries_id);

    // Reverse the bowler's wicket credit (if any) and the dismissed batter flag.
    let wicketDelta = 0;
    if (dismissal) {
      wicketDelta = 1;
      await repo.setBattingDismissed(client, innings.innings_id, dismissal.dismissed_batter_id, {
        isDismissed: false,
        dismissalId: null,
        dismissedAtOver: null
      });
      if (dismissal.bowler_id) {
        await repo.bumpBowlingFigure(client, innings.innings_id, dismissal.bowler_id, {
          wickets: -1
        });
      }
    }

    // Reverse the batter tally.
    await repo.bumpBattingCard(client, innings.innings_id, last.batter_id, {
      runs: -last.runs_batter,
      balls: m.batterFaces ? -1 : 0,
      fours: last.is_boundary_four ? -1 : 0,
      sixes: last.is_boundary_six ? -1 : 0,
      dots: last.delivery_type === 'legal' && last.runs_batter === 0 ? -1 : 0
    });

    // Reverse the bowler tally.
    await repo.bumpBowlingFigure(client, innings.innings_id, last.bowler_id, {
      balls: m.countsOver ? -1 : 0,
      runs: -m.bowlerConceded,
      wides: -m.extras.wides,
      no_balls: -m.extras.no_balls,
      dots: m.isDot ? -1 : 0,
      fours: last.is_boundary_four ? -1 : 0,
      sixes: last.is_boundary_six ? -1 : 0
    });

    // Reverse the over tally; drop the over row if it ends up empty.
    await repo.updateOverAggregates(client, last.over_id, {
      runs: -last.runs_total,
      wickets: -wicketDelta,
      legal_balls: m.countsOver ? -1 : 0,
      wides: -m.extras.wides,
      no_balls: -m.extras.no_balls,
      fours: last.is_boundary_four ? -1 : 0,
      sixes: last.is_boundary_six ? -1 : 0,
      dot_balls: m.isDot ? -1 : 0,
      cumulativeRuns: Math.max(0, innings.total_runs - last.runs_total),
      cumulativeWickets: Math.max(0, innings.total_wickets - wicketDelta),
      runRate: 0
    });

    // Delete child rows, then the delivery itself.
    await repo.deleteExtrasForDelivery(client, last.deliveries_id);
    if (dismissal) await repo.deleteDismissalForDelivery(client, last.deliveries_id);
    await repo.deleteDelivery(client, last.deliveries_id);
    await repo.deleteOverIfEmpty(client, last.over_id);

    // Finally reverse the innings totals (restores the pre-delivery snapshot).
    const restored = await repo.applyInningsDelta(client, innings.innings_id, {
      runs: -last.runs_total,
      wickets: -wicketDelta,
      balls: m.countsOver ? -1 : 0,
      wides: -m.extras.wides,
      no_balls: -m.extras.no_balls,
      leg_byes: -m.extras.leg_byes,
      byes: -m.extras.byes,
      penalties: -m.extras.penalties,
      total_extras: -m.extras.total
    });

    // If the innings had been auto-completed, scoring it back re-opens it.
    let reopened = restored;
    if (restored.status === 'completed') {
      reopened = await repo.setInningsStatus(client, innings.innings_id, 'in_progress');
    }

    return {
      ok: true,
      undone_delivery_id: last.deliveries_id,
      innings: presentInningsState(reopened)
    };
  });
};

// ─── assigned matches ───────────────────────────────────────────────────────
const getAssignedMatches = async (scorerId) => {
  const rows = await repo.findAssignedMatches(scorerId);
  return rows.map((r) => ({
    id: r.id,
    match_date: r.match_date,
    start_time: r.start_time,
    scheduled_at: r.scheduled_at,
    status: r.status,
    format: r.format,
    overs_per_match: r.overs_per_match,
    venue: r.venue || '',
    team1_name: r.team1_name,
    team1_short_name: r.team1_short_name,
    team2_name: r.team2_name,
    team2_short_name: r.team2_short_name,
    accepted: r.accepted_at != null,
    assigned_at: r.assigned_at
  }));
};

module.exports = {
  initialize,
  recordBall,
  wicketWizard,
  undo,
  getAssignedMatches,
  // exported for unit testing
  ballMath,
  DELIVERY_TYPE,
  DISMISSAL
};
