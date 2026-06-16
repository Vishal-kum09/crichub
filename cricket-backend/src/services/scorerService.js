// Scoring engine — the single source of truth for every run, ball and wicket
// mutation. Every mutating path runs inside db.withTransaction() so a delivery
// is either fully recorded or not at all (no partial state). All math is the
// exact specification the scorer console relies on; see ballMath().
const { withTransaction } = require('../../db');
const repo = require('../repositories/scorerRepository');
const logger = require('../../config/logger');
const { AppError } = require('../middlewares/errorHandler');

// ─── Enum mapping ───────────────────────────────────────────────────────────

const DELIVERY_TYPE = {
  None: 'legal',
  NB: 'no_ball',
  WD: 'wide',
  LB: 'leg_bye',
  B: 'bye'
};

const DISMISSAL = {
  Bowled:                 { type: 'bowled', creditsBowler: true },
  Caught:                 { type: 'caught', creditsBowler: true },
  LBW:                    { type: 'lbw', creditsBowler: true },
  'Run Out':              { type: 'run_out', creditsBowler: false },
  Stumped:                { type: 'stumped', creditsBowler: true },
  'Hit Wicket':           { type: 'hit_wicket', creditsBowler: true },
  'Obstructing the Field':{ type: 'obstructing_field', creditsBowler: false }
};

const phaseFor = (overNumber, oversPerMatch) => {
  if (overNumber <= 6) return 'powerplay';
  if (oversPerMatch && overNumber > oversPerMatch - 4) return 'death';
  if (!oversPerMatch && overNumber >= 16) return 'death';
  return 'middle';
};

// ─── Core scoring math ──────────────────────────────────────────────────────
const ballMath = (deliveryType, runsOffBat, extraRuns) => {
  const m = {
    deliveryType,
    runsBatter: 0,
    runsExtras: 0,
    runsTotal: 0,
    countsOver: false,
    batterFaces: false,
    bowlerConceded: 0,
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
      m.runsBatter = runsOffBat;
      m.runsExtras = 1;
      m.runsTotal = 1 + runsOffBat;
      m.countsOver = false;
      m.batterFaces = true;
      m.bowlerConceded = 1 + runsOffBat;
      m.extras.no_balls = 1;
      m.extras.total = 1;
      m.isFour = runsOffBat === 4;
      m.isSix = runsOffBat === 6;
      break;

    case 'wide':
      m.runsExtras = 1 + extraRuns;
      m.runsTotal = 1 + extraRuns;
      m.countsOver = false;
      m.batterFaces = false;
      m.bowlerConceded = 1 + extraRuns;
      m.extras.wides = 1 + extraRuns;
      m.extras.total = 1 + extraRuns;
      break;

    case 'leg_bye':
      m.runsExtras = extraRuns;
      m.runsTotal = extraRuns;
      m.countsOver = true;
      m.batterFaces = true;
      m.bowlerConceded = 0;
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

const runsRan = (delivery) =>
  (delivery.delivery_type === 'legal' || delivery.delivery_type === 'no_ball')
    ? delivery.runs_batter
    : delivery.runs_extras;

// ─── Crease resolution ──────────────────────────────────────────────────────
const resolveCrease = async (db, inningsId, overrides = {}) => {
  const last = await repo.getLastDelivery(db, inningsId);
  const active = await repo.getActiveBatters(db, inningsId);

  let strikerId, nonStrikerId, bowlerId;

  if (!last) {
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

const presentBatter = (card) => {
  if (!card) return null;
  
  // Extract the values safely from whatever the database returned
  const runsValue = Number(card.runs ?? card.runs_scored ?? card.runsScored ?? 0);
  const ballsValue = Number(card.balls ?? card.balls_faced ?? card.ballsFaced ?? 0);

  return {
    player_id: card.player_id ?? card.playerId,
    player_name: card.player_name ?? card.playerName, // just in case
    
    // Provide ALL naming variations so the frontend never gets undefined
    runs: runsValue,
    runs_scored: runsValue,
    runsScored: runsValue,
    
    balls: ballsValue,
    balls_faced: ballsValue,
    ballsFaced: ballsValue,
    
    fours: Number(card.fours ?? 0),
    sixes: Number(card.sixes ?? 0),
    is_dismissed: !!(card.is_dismissed ?? card.isDismissed)
  };
};

const presentBowler = (fig) =>
  fig && {
    player_id: fig.player_id,
    balls_bowled: fig.balls_bowled,
    overs: `${Math.floor(fig.balls_bowled / 6)}.${fig.balls_bowled % 6}`,
    runs_conceded: fig.runs_conceded,
    wickets: fig.wickets
  };

// ─── 🔥 INITIALIZE (UPGRADED WITH TEAMS RESOLUTION BRIDGE) ───────────────────
const initialize = async (matchId, input) => {
  return withTransaction(async (client) => {
    const match = await repo.getMatch(client, matchId);
    if (!match) throw new AppError('Match not found', 404);

    // 1. Process local derby metadata and save UI configs to notes
    let combinedNotes = match.notes || '';
    if (input.metadata) {
      if (input.metadata.is_local_derby) {
        combinedNotes = `[Active Derby Run] Batting label: ${input.metadata.batting_team_label || 'A'}. ${combinedNotes}`;
      }
      // Stringify UI Engine configs so Scorer Console can read them later
      combinedNotes = `${combinedNotes} | Configs: WW=${input.metadata.wagon_wheel_enabled ? '1' : '0'}, Comm=${input.metadata.commentary_type}, NameFmt=${input.metadata.name_display_format}`;
      
      await client.query(`UPDATE matches SET notes = $1 WHERE matches_id = $2`, [combinedNotes, matchId]);
    }

    // 2. Resolve or Create the Teams entries to satisfy the Foreign Key constraint
    const resolveTeamId = async (clubId, teamLabel) => {
      // Look for a team created by ANY user belonging to this club
      let tRes = await client.query(
        `SELECT teams_id FROM teams WHERE created_by IN (SELECT user_id FROM users WHERE club_id = $1) LIMIT 1`, 
        [clubId]
      );
      
      if (tRes.rows.length === 0) {
        // Find a user from this club to attach as the "creator" of the team
        let userRes = await client.query(`SELECT user_id FROM users WHERE club_id = $1 LIMIT 1`, [clubId]);
        const creatorId = userRes.rows.length > 0 ? userRes.rows[0].user_id : '00000000-0000-0000-0000-000000000000';
        
        // Insert without using the non-existent club_id column
        tRes = await client.query(
          `INSERT INTO teams (name, short_name, created_by, is_active, created_at) 
             VALUES ($1, $2, $3, true, NOW()) RETURNING teams_id`,
          [teamLabel, teamLabel.substring(0, 3).toUpperCase(), creatorId]
        );
      }
      return tRes.rows[0].teams_id;
    };

    const finalBattingTeamId = await resolveTeamId(input.batting_team_id, input.metadata?.batting_team_label || 'Batting Team');
    const finalFieldingTeamId = await resolveTeamId(input.fielding_team_id, input.metadata?.fielding_team_label || 'Fielding Team');

    // 3. Update Match with Toss Info (using the resolved team IDs)
    const finalTossWinnerId = input.toss_winner === input.batting_team_id ? finalBattingTeamId : finalFieldingTeamId;
    await client.query(
      `UPDATE matches SET toss_winner_id = $1, toss_decision = $2, status = 'live', started_at = COALESCE(started_at, now()), updated_at = now() WHERE matches_id = $3`, 
      [finalTossWinnerId, input.toss_decision, matchId]
    );

    // 4. Create the Innings using the valid teams_id
    const innings = await repo.createInnings(client, {
      matchId,
      inningsNumber: input.innings_number,
      battingTeamId: finalBattingTeamId,
      fieldingTeamId: finalFieldingTeamId,
      targetRuns: input.target_runs
    });

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
      playerNames: {
         [input.striker_id]: striker ? await repo.getPlayerName(client, input.striker_id) : null,
         [input.non_striker_id]: nonStriker ? await repo.getPlayerName(client, input.non_striker_id) : null,
         [input.bowler_id]: bowler ? await repo.getPlayerName(client, input.bowler_id) : null
      },
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

    const legalBefore = innings.total_balls;
    const overNumber = Math.floor(legalBefore / 6) + 1;
    const ballInOver = (legalBefore % 6) + 1;

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
      deliveryType: deliveryType,
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

    const updatedInnings = await repo.applyInningsDelta(client, input.innings_id, {
      runs: m.runsTotal,
      wickets: 0,
      balls: m.countsOver ? 1 : 0,
      wides: m.extras.wides,
      no_balls: m.extras.no_balls,
      leg_byes: m.extras.leg_byes,
      byes: m.extras.byes,
      penalties: m.extras.penalties,
      total_extras: m.extras.total
    });

    await repo.bumpBattingCard(client, input.innings_id, crease.strikerId, {
      runs: m.runsBatter,
      balls: m.batterFaces ? 1 : 0,
      fours: m.isFour ? 1 : 0,
      sixes: m.isSix ? 1 : 0,
      dots: deliveryType === 'legal' && input.runs_off_bat === 0 ? 1 : 0
    });

    await repo.bumpBowlingFigure(client, input.innings_id, crease.bowlerId, {
      balls: m.countsOver ? 1 : 0,
      runs: m.bowlerConceded,
      wides: m.extras.wides,
      no_balls: m.extras.no_balls,
      dots: m.isDot ? 1 : 0,
      fours: m.isFour ? 1 : 0,
      sixes: m.isSix ? 1 : 0
    });

    await repo.bumpBatterOverStats(client, input.innings_id, crease.strikerId, overNumber, {
      runs: m.runsBatter,
      balls: m.batterFaces ? 1 : 0,
      fours: m.isFour ? 1 : 0,
      sixes: m.isSix ? 1 : 0
    });

    await repo.bumpBowlerOverStats(client, input.innings_id, crease.bowlerId, overNumber, {
      runs: m.bowlerConceded,
      wides: m.extras.wides,
      no_balls: m.extras.no_balls,
      fours: m.isFour ? 1 : 0,
      sixes: m.isSix ? 1 : 0,
      dots: m.isDot ? 1 : 0
    });

    await repo.bumpBowlingSpell(client, input.innings_id, crease.bowlerId, overNumber, {
      runs: m.bowlerConceded,
      balls: m.countsOver ? 1 : 0
    });

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

    const overCompleted = m.countsOver && updatedInnings.total_balls % 6 === 0;
    const oversCompleted = Math.floor(updatedInnings.total_balls / 6);

    if (overCompleted) {
      await repo.checkAndMarkMaidenOver(client, input.innings_id, crease.bowlerId, overNumber);
    }

    let inningsComplete = false;
    let finalInnings = updatedInnings;
    if (
      updatedInnings.total_wickets >= 10 ||
      (oversPerMatch && oversCompleted >= oversPerMatch)
    ) {
      finalInnings = await repo.setInningsStatus(client, input.innings_id, 'completed');
      await repo.setMatchStatus(client, innings.match_id, 'completed');
      inningsComplete = true;
    }

    // Fetch the updated records cleanly inside the transaction
    const strikerCard = await repo.getBattingCard(client, input.innings_id, crease.strikerId);
    const nonStrikerCard = crease.nonStrikerId
      ? await repo.getBattingCard(client, input.innings_id, crease.nonStrikerId)
      : null;
    const bowlerFig = await repo.getBowlingFigure(client, input.innings_id, crease.bowlerId);

    // =================================================================
    // 🏏 TRANSLATE DATABASE NAMES TO MATCH FRONTEND BatterState INTERFACE
    // =================================================================
    const strikerState = strikerCard ? presentBatter(strikerCard) : null;

    const nonStrikerState = nonStrikerCard ? presentBatter(nonStrikerCard) : null;

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
        striker: strikerState,          // <-- Fixed to use the newly mapped state
        non_striker: nonStrikerState,   // <-- Fixed to use the newly mapped state
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
        await repo.bumpBowlerOverStats(client, innings.innings_id, last.bowler_id, last.over_number, { wickets: 1 });
        await repo.bumpBowlingSpell(client, innings.innings_id, last.bowler_id, last.over_number, { wickets: 1 });
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

    const dismissedCard = await repo.getBattingCard(
      client, innings.innings_id, input.dismissed_player_id
    );
    await repo.ensureBattingCard(client, innings.innings_id, input.incoming_batsman_id, {
      position: dismissedCard ? dismissedCard.batting_position : undefined,
      cameInAtOver: overAtFall
    });

    let inningsComplete = false;
    if (!retiredHurt && updatedInnings.total_wickets >= 10) {
      updatedInnings = await repo.setInningsStatus(client, innings.innings_id, 'completed');
      await repo.setMatchStatus(client, innings.match_id, 'completed');
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
const undo = async (matchId, input) => {
  return withTransaction(async (client) => {
    const innings = await resolveActiveInnings(client, matchId, input.innings_id);
    const last = await repo.getLastDelivery(client, innings.innings_id);
    if (!last) throw new AppError('Nothing to undo', 400);

    const m = ballMath(last.delivery_type, last.runs_batter, last.runs_extras);
    const dismissal = await repo.getDismissalForDelivery(client, last.deliveries_id);

    let wicketDelta = 0;
    if (dismissal) {
      wicketDelta = 1;
      await repo.setBattingDismissed(client, innings.innings_id, dismissal.dismissed_batter_id, {
        isDismissed: false,
        dismissalId: null,
        dismissedAtOver: null
      });
      if (dismissal.bowler_id) {
        await repo.bumpBowlingFigure(client, innings.innings_id, dismissal.bowler_id, { wickets: -1 });
        await repo.bumpBowlerOverStats(client, innings.innings_id, dismissal.bowler_id, last.over_number, { wickets: -1 });
        await repo.bumpBowlingSpell(client, innings.innings_id, dismissal.bowler_id, last.over_number, { wickets: -1 });
      }
    }
    await repo.checkAndUnmarkMaidenOver(client, innings.innings_id, last.bowler_id, last.over_number);

    await repo.bumpBattingCard(client, innings.innings_id, last.batter_id, {
      runs: -last.runs_batter,
      balls: m.batterFaces ? -1 : 0,
      fours: last.is_boundary_four ? -1 : 0,
      sixes: last.is_boundary_six ? -1 : 0,
      dots: last.delivery_type === 'legal' && last.runs_batter === 0 ? -1 : 0
    });

    await repo.bumpBatterOverStats(client, innings.innings_id, last.batter_id, last.over_number, {
      runs: -last.runs_batter,
      balls: m.batterFaces ? -1 : 0,
      fours: last.is_boundary_four ? -1 : 0,
      sixes: last.is_boundary_six ? -1 : 0
    });

    await repo.bumpBowlingFigure(client, innings.innings_id, last.bowler_id, {
      balls: m.countsOver ? -1 : 0,
      runs: -m.bowlerConceded,
      wides: -m.extras.wides,
      no_balls: -m.extras.no_balls,
      dots: m.isDot ? -1 : 0,
      fours: last.is_boundary_four ? -1 : 0,
      sixes: last.is_boundary_six ? -1 : 0
    });

    await repo.bumpBowlerOverStats(client, innings.innings_id, last.bowler_id, last.over_number, {
      runs: -m.bowlerConceded,
      fours: last.is_boundary_four ? -1 : 0,
      sixes: last.is_boundary_six ? -1 : 0,
      dots: m.isDot ? -1 : 0,
      wides: -m.extras.wides,
      no_balls: -m.extras.no_balls
    });

    await repo.bumpBowlingSpell(client, innings.innings_id, last.bowler_id, last.over_number, {
      runs: -m.bowlerConceded,
      balls: m.countsOver ? -1 : 0
    });

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

    await repo.deleteExtrasForDelivery(client, last.deliveries_id);
    if (dismissal) await repo.deleteDismissalForDelivery(client, last.deliveries_id);
    await repo.deleteDelivery(client, last.deliveries_id);
    await repo.deleteOverIfEmpty(client, last.over_id);
    await repo.deleteEmptyOverStatsAndSpells(client, innings.innings_id, last.over_number);

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

const presentAssignedMatch = (r) => ({
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
  live_score: r.live_score || undefined,
  accepted: r.accepted_at != null,
  assigned_at: r.assigned_at
});

// ─── 🔥 PREVIEW ROSTER SEGREGATION ENGINE ─────────────────────────────────────────
const getAssignedMatches = async (scorerId) => {
  const rows = await repo.findAssignedMatches(scorerId);
  return rows.map(presentAssignedMatch);
};

const getCompletedMatches = async (scorerId) => {
  const rows = await repo.findCompletedMatchesForScorer(scorerId);
  return rows.map((r) => ({
    id: r.id,
    team1_name: r.team1_name,
    team2_name: r.team2_name,
    team1_short_name: r.team1_short_name,
    team2_short_name: r.team2_short_name,
    format: r.format,
    venue: r.venue || '',
    date: r.match_date || r.scheduled_at,
    status: 'Completed',
    result_summary: r.result_summary || undefined,
    team1_score: r.team1_score || undefined,
    team2_score: r.team2_score || undefined
  }));
};

const getMatchPreview = async (scorerId, matchId) => {
  const assigned = await repo.scorerHasAssignment(scorerId, matchId);
  if (!assigned) throw new AppError('You are not assigned to this match', 403);

  const match = await repo.getMatchPreviewRow(matchId);
  if (!match) throw new AppError('Match not found', 404);

  let team1Roster = await repo.findTeamRoster(match.team1_id);
  let team2Roster = await repo.findTeamRoster(match.team2_id);

  if (match.team1_id === match.team2_id) {
    const rawPool = [...team1Roster];
    team1Roster = rawPool.filter((_, idx) => idx % 2 === 0);
    team2Roster = rawPool.filter((_, idx) => idx % 2 !== 0);
  }

  return {
    match_id: match.matches_id,
    team1_id: match.team1_id,
    team2_id: match.team2_id,
    team1_name: match.team1_id === match.team2_id ? `${match.team1_name} (A)` : match.team1_name,
    team2_name: match.team1_id === match.team2_id ? `${match.team2_name} (B)` : match.team2_name,
    venue: match.venue || '',
    ground: match.city || match.venue || '',
    country: match.country || '',
    format: match.format,
    total_overs: match.overs_per_match,
    overs_per_bowler: match.overs_per_match ? Math.floor(match.overs_per_match / 5) : 4,
    status: match.status,
    team1_roster: team1Roster,
    team2_roster: team2Roster
  };
};

const getLiveMatchState = async (matchId) => {
  // 1. Fetch the active match and innings state from your database/repository
  // (Look at how you fetch these at the top of your recordBall function!)
  const activeInnings = await scorerRepository.getCurrentInnings(matchId);
  
  if (!activeInnings) {
    return { ok: false, message: "No active innings found for this match." };
  }

  // 2. Fetch the active players using the IDs stored in the innings state
  const strikerCard = await scorerRepository.getBatterCard(activeInnings.innings_id, activeInnings.striker_id);
  const nonStrikerCard = await scorerRepository.getBatterCard(activeInnings.innings_id, activeInnings.non_striker_id);
  const bowlerFig = await scorerRepository.getBowlerFigures(activeInnings.innings_id, activeInnings.bowler_id);

  // 3. Format and return the data using your updated presentBatter function!
  return {
    ok: true,
    match_id: matchId,
    innings: presentInningsState(activeInnings),
    striker: presentBatter(strikerCard),
    non_striker: presentBatter(nonStrikerCard),
    bowler: presentBowler(bowlerFig)
  };
};

module.exports = {
  initialize,
  recordBall,
  wicketWizard,
  undo,
  getAssignedMatches,
  getCompletedMatches,
  getMatchPreview,
  ballMath,
  DELIVERY_TYPE,
  DISMISSAL,
  getLiveMatchState
};
