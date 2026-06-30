import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Save, ArrowLeft, Undo, Redo, MoreHorizontal, RotateCcw, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from '../../lib/toast';
import WagonWheel from '../../app/components/WagonWheel';
import {
  ViewerCommentaryPanel,
  ViewerRecentDeliveries,
  ViewerScorecardPanel,
  fetchViewerScorecard,
} from '../components/match/MatchViewerPanels';
import type { ViewerScorecard } from '../components/match/matchViewHelpers';

// sessionStorage key for crash-recovery of an in-progress scoring session.
const SCORER_SESSION_KEY = 'scorer_session';

import {
  recordBall as apiRecordBall,
  wicketWizard as apiWicketWizard,
  undoBall as apiUndoBall,
  startSecondInnings as apiStartSecondInnings,
  getLiveSession,
  setLiveSession,
  getLiveMatchState,
  getMatchPreview,
  toExtraType,
  type InningsState,
  type LiveSession,
  type DismissalType,
  type ChaseInfo,
  type InningsBreakInfo,
  type MatchResultInfo,
  type MatchPreview as ApiMatchPreview,
  type ScoringRules,
} from '../../lib/scorerApi';

type MatchPreview = ApiMatchPreview & {
  teams?: {
    team1: { name: string };
    team2: { name: string };
  };
};

type LiveMatchState = Awaited<ReturnType<typeof getLiveMatchState>> & {
  batting_order?: any[];
  recent_deliveries?: any[];
};

const useTypeSafeMatchPreview = (matchId: string): [MatchPreview | null, boolean] => {
  const [preview, setPreview] = useState<MatchPreview | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (matchId) getMatchPreview(matchId).then(p => { setPreview(p as MatchPreview); setLoading(false); }).catch(() => setLoading(false)); }, [matchId]);
  return [preview, loading];
};

interface ScorerConsoleProps {
  matchId?: string;
  onNavigate: (path: string) => void;
}

interface BallEvent {
  over: number;
  ball: number;
  runs: number;
  batsmanRuns: number;
  extraRuns: number;
  extraType?: 'wide' | 'no-ball' | 'bye' | 'leg-bye' | 'penalty';
  wicket?: boolean;
  dismissalType?: string;
  outBatsman?: string;
  fielder?: string;
  batsman: string;
  nonStriker: string;
  bowler: string;
  commentary: string;
  timestamp: Date;
}

interface Batsman {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal?: string;
}

interface Bowler {
  name: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  maidens: number;
}

export function ScorerConsole({ matchId, onNavigate }: ScorerConsoleProps) {
  // 🔥 FETCH SESSION FIRST: We must get this first so we can inject the real names
  const [session, setSessionState] = useState<LiveSession | null>(() => getLiveSession());
  const isConnected = Boolean(session && matchId);

  // Match state
  const [isLive, setIsLive] = useState(false);
  const [activeTab, setActiveTab] = useState<'scoring' | 'scorecard' | 'commentary'>('scoring');

  // 🔥 AI Commentary handled by ViewerCommentaryPanel
  const [viewerScorecard, setViewerScorecard] = useState<ViewerScorecard | null>(null);
  const [scorecardRefreshKey, setScorecardRefreshKey] = useState(0);
  const [matchTotalOvers, setMatchTotalOvers] = useState<number | null>(null);

  // Score state
  const [score, setScore] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [overs, setOvers] = useState(0);
  const [balls, setBalls] = useState(0);
  const [inningsNumber, setInningsNumber] = useState(1);
  const [chaseInfo, setChaseInfo] = useState<ChaseInfo | null>(null);
  const [inningsBreak, setInningsBreak] = useState<InningsBreakInfo | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResultInfo | null>(null);
  const [showMatchCompleteDialog, setShowMatchCompleteDialog] = useState(false);
  const [showSecondInningsDialog, setShowSecondInningsDialog] = useState(false);

  // Commentary state
  const [commentaryInnings, setCommentaryInnings] = useState<1 | 2>(1);
  const [commentarySort, setCommentarySort] = useState<'asc' | 'desc'>('desc');

  // Current ball state
  const [currentRuns, setCurrentRuns] = useState(0);
  const [currentExtras, setCurrentExtras] = useState(0);
  const [currentExtraType, setCurrentExtraType] = useState<string | null>(null);
  const [isWicket, setIsWicket] = useState(false);
  const [shotPoint, setShotPoint] = useState<any>(null);
  const [batsmanHand, setBatsmanHand] = useState<'right' | 'left'>('right');
  const [bowlingSide, setBowlingSide] = useState<'Over' | 'Around' | 'Across'>('Over');
  const [eventText, setEventText] = useState('');

  // 🔥 REAL PLAYERS STATE: Replaced mock data with session variables
  const [striker, setStriker] = useState(
    session?.playerNames?.[session?.strikerId || ''] || 'Striker 1'
  );
  const [nonStriker, setNonStriker] = useState(
    session?.playerNames?.[session?.nonStrikerId || ''] || 'Non-Striker'
  );
  const [currentBowler, setCurrentBowler] = useState(
    session?.playerNames?.[session?.bowlerId || ''] || 'Opening Bowler'
  );
  const [previousBowler, setPreviousBowler] = useState<string | null>(null);

  // Ball history
  const [ballHistory, setBallHistory] = useState<BallEvent[]>([]);
  const [undoStack, setUndoStack] = useState<BallEvent[]>([]);

  // Batsmen data - Initialized with real identities
  const [batsmen, setBatsmen] = useState<Batsman[]>([
    { 
      name: session?.playerNames?.[session?.strikerId || ''] || 'Striker 1', 
      runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false 
    },
    { 
      name: session?.playerNames?.[session?.nonStrikerId || ''] || 'Non-Striker', 
      runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false 
    },
  ]);
  const [battingRoster, setBattingRoster] = useState<string[]>(session?.battingRoster || []);
  const [fieldingRoster, setFieldingRoster] = useState<string[]>(session?.fieldingRoster || []);
  const [selectedNextBowler, setSelectedNextBowler] = useState('');
  
  // Bowlers data - Initialized with real identities
  const [bowlers, setBowlers] = useState<Bowler[]>([
    { 
      name: session?.playerNames?.[session?.bowlerId || ''] || 'Opening Bowler', 
      overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0 
    },
  ]);

  // Extras breakdown
  const [extras, setExtras] = useState({
    wides: 0,
    noBalls: 0,
    byes: 0,
    legByes: 0,
    penalties: 0,
  });

  const [scoringRules, setScoringRules] = useState<ScoringRules>({
    wide_counts_as_ball: false,
    wide_penalty_runs: 1,
    no_ball_counts_as_ball: false,
    no_ball_penalty_runs: 1,
  });

  // Dialog states
  const [showWicketDialog, setShowWicketDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [teamNames, setTeamNames] = useState<MatchPreview['teams'] | null>(null);
  const [showBowlerChangeDialog, setShowBowlerChangeDialog] = useState(false);

  // Wicket dialog state
  const [selectedDismissal, setSelectedDismissal] = useState('');
  const [selectedFielder, setSelectedFielder] = useState('');
  const [selectedOutBatsman, setSelectedOutBatsman] = useState(striker);
  const [nextBatsman, setNextBatsman] = useState('');

  // Second innings state
  const [secondInningsStriker, setSecondInningsStriker] = useState('');
  const [secondInningsNonStriker, setSecondInningsNonStriker] = useState('');
  const [secondInningsBowler, setSecondInningsBowler] = useState('');
  const [secondInningsBattingPool, setSecondInningsBattingPool] = useState<string[]>([]);
  const [secondInningsBowlingPool, setSecondInningsBowlingPool] = useState<string[]>([]);

  const totalExtras = extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penalties;
  const yetToBat = battingRoster.filter(
    name => !batsmen.some(b => b.name === name)
      && name !== striker
      && name !== nonStriker
      && name !== nextBatsman
  );

  const clearSession = () => sessionStorage.removeItem(SCORER_SESSION_KEY);

  const refreshViewerScorecard = () => {
    if (!matchId) return;
    fetchViewerScorecard(matchId)
      .then((data) => {
        setViewerScorecard(data);
        setScorecardRefreshKey((k) => k + 1);
      })
      .catch(() => setViewerScorecard(null));
  };

  const prepareSecondInningsDialog = async () => {
    if (!matchId) return;
    try {
      const liveState = await getLiveMatchState(matchId);
      if (liveState.battingRoster?.length) {
        setSecondInningsBattingPool(liveState.battingRoster);
        setSecondInningsBowlingPool(liveState.fieldingRoster || []);
      }
      if (liveState.playerIdMap) {
        setSessionState((prev) => {
          const next = prev
            ? {
                ...prev,
                playerIdMap: { ...prev.playerIdMap, ...liveState.playerIdMap },
                playerNames: { ...(prev.playerNames || {}), ...(liveState.playerNames || {}) },
              }
            : prev;
          if (next) setLiveSession(next);
          return next;
        });
      }
      if (liveState.innings_break) {
        setInningsBreak(liveState.innings_break);
      }
    } catch {
      /* pools may already be set from applyLifecycle */
    }
    setShowSecondInningsDialog(true);
  };

  useEffect(() => {
    refreshViewerScorecard();
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;
    getMatchPreview(matchId)
      .then((preview: ApiMatchPreview) => {
        if (preview.scoring_rules) {
          setScoringRules(preview.scoring_rules);
        }
        if (preview.teams) {
          setTeamNames(preview.teams);
        }
        if (preview.total_overs) {
          setMatchTotalOvers(preview.total_overs);
        }
      })
      .catch(() => {});
  }, [matchId]);

  const syncFromInnings = (innings: InningsState) => {
    setScore(innings.total_runs);
    setWickets(innings.total_wickets);
    setOvers(innings.overs_completed);
    setBalls(innings.balls_this_over);
    setInningsNumber(Number(innings.innings_number || 1));
    setExtras({
      wides: innings.extras.wides,
      noBalls: innings.extras.no_balls,
      byes: innings.extras.byes,
      legByes: innings.extras.leg_byes,
      penalties: innings.extras.penalties,
    });
  };

  const applyLifecycle = (payload: {
    innings?: InningsState;
    innings_break?: InningsBreakInfo | null;
    chase?: ChaseInfo | null;
    match_complete?: boolean;
    result?: MatchResultInfo | null;
    battingRoster?: string[];
    fieldingRoster?: string[];
  }) => {
    if (payload.innings) syncFromInnings(payload.innings);
    setChaseInfo(payload.chase || null);
    if (payload.innings_break) {
      setInningsBreak(payload.innings_break);
      const chaseBatters = payload.battingRoster?.length ? payload.battingRoster : fieldingRoster;
      const chaseBowlers = payload.fieldingRoster?.length ? payload.fieldingRoster : battingRoster;
      setSecondInningsBattingPool([...chaseBatters]);
      setSecondInningsBowlingPool([...chaseBowlers]);
      setIsLive(false);
      if (matchId) {
        getLiveMatchState(matchId)
          .then((liveState) => {
            if (liveState.battingRoster?.length) {
              setSecondInningsBattingPool(liveState.battingRoster);
              setSecondInningsBowlingPool(liveState.fieldingRoster || []);
            }
            if (liveState.playerIdMap) {
              setSessionState((prev) =>
                prev
                  ? {
                      ...prev,
                      playerIdMap: { ...prev.playerIdMap, ...liveState.playerIdMap },
                      playerNames: { ...(prev.playerNames || {}), ...(liveState.playerNames || {}) },
                    }
                  : prev
              );
            }
          })
          .catch(() => {});
      }
    }
    if (payload.match_complete) {
      setMatchResult(payload.result || { resultSummary: 'Match completed' });
      setShowMatchCompleteDialog(true);
      setIsLive(false);
      clearSession();
    }
    refreshViewerScorecard();
  };

  const nameForPlayer = (playerId?: string, names?: { [key: string]: string }) =>
    (playerId && (names?.[playerId] || session?.playerNames?.[playerId])) || 'Unknown Player';

  const hydrateFromLiveState = (liveState: LiveMatchState) => {
    if (!liveState?.ok || !liveState.innings || !matchId) return;

    const playerNames = liveState.playerNames || {};
    const nextSession: LiveSession = {
      matchId,
      inningsId: liveState.innings.innings_id,
      strikerId: liveState.striker?.player_id,
      nonStrikerId: liveState.non_striker?.player_id,
      bowlerId: liveState.bowler?.player_id,
      playerNames,
      battingRoster: liveState.battingRoster || [],
      fieldingRoster: liveState.fieldingRoster || [],
      playerIdMap: liveState.playerIdMap || {},
    };

    setLiveSession(nextSession);
    setSessionState(nextSession);
    syncFromInnings(liveState.innings);
    applyLifecycle(liveState);

    const strikerName = nameForPlayer(liveState.striker?.player_id, playerNames);
    const nonStrikerName = nameForPlayer(liveState.non_striker?.player_id, playerNames);
    const bowlerName = nameForPlayer(liveState.bowler?.player_id, playerNames);

    setStriker(strikerName);
    setNonStriker(nonStrikerName);
    setCurrentBowler(bowlerName);
    setSelectedOutBatsman(strikerName);
    setBattingRoster(liveState.battingRoster || []);
    setFieldingRoster(liveState.fieldingRoster || []);

    if (liveState.innings_break) {
      setSecondInningsBattingPool(liveState.battingRoster || []);
      setSecondInningsBowlingPool(liveState.fieldingRoster || []);
      setIsLive(false);
    }

    if (liveState.chase) {
      setChaseInfo(liveState.chase);
    }

    setBatsmen([
      {
        name: strikerName,
        runs: liveState.striker?.runs ?? 0,
        balls: liveState.striker?.balls_faced ?? 0,
        fours: liveState.striker?.fours ?? 0,
        sixes: liveState.striker?.sixes ?? 0,
        isOut: liveState.striker?.is_dismissed ?? false,
      },
      {
        name: nonStrikerName,
        runs: liveState.non_striker?.runs ?? 0,
        balls: liveState.non_striker?.balls_faced ?? 0,
        fours: liveState.non_striker?.fours ?? 0,
        sixes: liveState.non_striker?.sixes ?? 0,
        isOut: liveState.non_striker?.is_dismissed ?? false,
      },
    ...(liveState.batting_order || [])
      .filter(
        (p) =>
          p.player_id !== liveState.striker?.player_id &&
          p.player_id !== liveState.non_striker?.player_id
      )
      .map((p: any) => ({ ...p, name: playerNames[p.player_id] || 'Unknown', isOut: p.is_dismissed }))
    ].filter((b) => b.name !== 'Unknown Player'));

    
    if (liveState.bowler) {
      const bowlerBalls = liveState.bowler.balls_bowled ?? 0;
      setBowlers([{
        name: bowlerName,
        overs: Math.floor(bowlerBalls / 6),
        balls: bowlerBalls,
        runs: liveState.bowler.runs_conceded ?? 0,
        wickets: liveState.bowler.wickets ?? 0,
        maidens: liveState.bowler.maidens ?? 0,
      }]);
    }

    if (liveState.recent_deliveries) {
      setBallHistory(
        liveState.recent_deliveries.map((d: any) => ({
          over: d.over_number,
          ball: d.ball_number,
          runs: d.runs_scored,
          batsmanRuns: d.runs_off_bat,
          extraRuns: d.extras_awarded,
          extraType: d.extra_type?.toLowerCase().replace('_', '-') as any,
          wicket: d.is_wicket,
          dismissalType: d.wicket?.dismissal_type,
          outBatsman: playerNames[d.wicket?.dismissed_player_id || ''] || undefined,
          fielder: playerNames[d.wicket?.fielder_id || ''] || undefined,
          batsman: playerNames[d.striker_id] || 'Unknown',
          nonStriker: playerNames[d.non_striker_id] || 'Unknown',
          bowler: playerNames[d.bowler_id] || 'Unknown',
          commentary: '', // Commentary is not part of this state
          timestamp: new Date(d.created_at),
        }))
      );
    }
    saveSession(liveState.innings);
  };

  const startSecondInnings = async () => {
    if (!matchId) return;
    if (!secondInningsStriker || !secondInningsNonStriker || !secondInningsBowler) {
      toast.error('Please select opening striker, non-striker, and bowler.');
      return;
    }
    const strikerId = session?.playerIdMap?.[secondInningsStriker];
    const nonStrikerId = session?.playerIdMap?.[secondInningsNonStriker];
    const bowlerId = session?.playerIdMap?.[secondInningsBowler];
    if (!strikerId || !nonStrikerId || !bowlerId) {
      toast.error('Could not resolve selected players. Re-open the match from assigned matches.');
      return;
    }
    try {
      const liveState = await apiStartSecondInnings(matchId, {
        striker_id: strikerId,
        non_striker_id: nonStrikerId,
        bowler_id: bowlerId,
      });
      setScore(0);
      setWickets(0);
      setOvers(0);
      setBalls(0);
      setBallHistory([]);
      setUndoStack([]);
      setBatsmen([]);
      setBowlers([]);
      setInningsBreak(null);
      setShowSecondInningsDialog(false);
      setSecondInningsStriker('');
      setSecondInningsNonStriker('');
      setSecondInningsBowler('');
      hydrateFromLiveState(liveState);
      setInningsNumber(2);
      setChaseInfo(liveState.chase || null);
      setIsLive(true);
      refreshViewerScorecard();
      toast.success('Second innings started');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to start second innings');
    }
  };

  const pendingDeliveries = useRef<any[]>([]);
  const connLostToast = useRef<string | number | null>(null);

  const saveSession = (innings: InningsState) => {
    if (!matchId) return;
    sessionStorage.setItem(SCORER_SESSION_KEY, JSON.stringify({
      matchId,
      inningsId: innings.innings_id,
      score: innings.total_runs,
      wickets: innings.total_wickets,
      overs: innings.overs_completed,
      balls: innings.balls_this_over,
      extras: {
        wides: innings.extras.wides,
        noBalls: innings.extras.no_balls,
        byes: innings.extras.byes,
        legByes: innings.extras.leg_byes,
        penalties: innings.extras.penalties,
      },
      savedAt: Date.now(),
    }));
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SCORER_SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.matchId === matchId) {
          setScore(saved.score ?? 0);
          setWickets(saved.wickets ?? 0);
          setOvers(saved.overs ?? 0);
          setBalls(saved.balls ?? 0);
          if (saved.extras) setExtras(saved.extras);
          toast.info('Recovered in-progress scoring session');
        }
      }
    } catch { /* ignore corrupt session blob */ }
    return () => { clearSession(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!matchId || session?.inningsId) return;

    let cancelled = false;
    getLiveMatchState(matchId)
      .then((liveState: any) => {
        if (cancelled) return;
        hydrateFromLiveState(liveState);
        toast.success('Live scoring state restored');
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.error || 'Failed to resume live scoring state');
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, session?.inningsId]);

  const flushPendingDeliveries = async () => {
    if (!isConnected || !session || pendingDeliveries.current.length === 0) return;
    const queue = [...pendingDeliveries.current];
    pendingDeliveries.current = [];
    for (const payload of queue) {
      try {
        const res = await apiRecordBall(matchId!, payload);
        syncFromInnings(res.innings);
        saveSession(res.innings);
      } catch (err: any) {
        if (!err?.response) { pendingDeliveries.current.push(payload); }
      }
    }
    if (pendingDeliveries.current.length === 0 && connLostToast.current != null) {
      toast.dismiss(connLostToast.current);
      connLostToast.current = null;
      toast.success('Reconnected — queued deliveries synced');
    }
  };

  const runRate = overs + balls / 6 > 0 ? (score / (overs + balls / 6)).toFixed(2) : '0.00';
  const startButtonLabel = inningsBreak ? 'Start 2nd Innings' : isLive ? 'Pause' : 'Start';

  useEffect(() => {
    if (selectedOutBatsman !== striker && selectedOutBatsman !== nonStriker) {
      setSelectedOutBatsman(striker);
    }
  }, [striker, nonStriker, selectedOutBatsman]);

  const handleRunClick = (runs: number) => {
    if (!isLive) return;
    setCurrentRuns(runs);
  };

  const handleExtraClick = (extraType: string) => {
    if (!isLive) return;
    setCurrentExtraType(currentExtraType === extraType ? null : extraType);

    if (extraType === 'wide') {
      setCurrentExtras(scoringRules.wide_penalty_runs);
    } else if (extraType === 'no-ball') {
      setCurrentExtras(scoringRules.no_ball_penalty_runs);
    } else {
      setCurrentExtras(0);
    }
  };

  const recordBall = (wicketOverride?: {
    isWicket: boolean;
    dismissal: string;
    fielder: string;
    outBatsman: string;
    nextBatsman: string;
  }) => {
    if (!isLive) return;
    const wicketSelected = wicketOverride?.isWicket ?? isWicket;
    const dismissalForBall = wicketOverride?.dismissal ?? selectedDismissal;
    const fielderForBall = wicketOverride?.fielder ?? selectedFielder;
    const outBatsmanForBall = wicketOverride?.outBatsman ?? selectedOutBatsman;
    const nextBatsmanForBall = wicketOverride?.nextBatsman ?? nextBatsman;

    if (wicketSelected && (!dismissalForBall || !nextBatsmanForBall)) {
      toast.error('Select dismissal type and next batsman before recording the wicket');
      setShowWicketDialog(true);
      return;
    }

    const runsFromBat = (currentExtraType === 'bye' || currentExtraType === 'leg-bye' || currentExtraType === 'wide') ? 0 : currentRuns;
    let totalRuns = runsFromBat + currentExtras;

    const isLegalDelivery = currentExtraType !== 'wide' && currentExtraType !== 'no-ball';
    const dismissedBatsman = outBatsmanForBall || striker;
    
    const ballEvent: BallEvent = {
      over: overs,
      ball: balls,
      runs: totalRuns,
      batsmanRuns: runsFromBat,
      extraRuns: currentExtras,
      extraType: currentExtraType as any,
      wicket: wicketSelected,
      dismissalType: wicketSelected ? dismissalForBall : undefined,
      outBatsman: wicketSelected ? dismissedBatsman : undefined,
      fielder: wicketSelected ? fielderForBall : undefined,
      batsman: striker,
      nonStriker: nonStriker,
      bowler: currentBowler,
      commentary: generateCommentary(currentRuns, currentExtras, currentExtraType, wicketSelected, {
        dismissal: dismissalForBall,
        fielder: fielderForBall,
        outBatsman: dismissedBatsman,
      }),
      timestamp: new Date(),
    };

    setScore(score + totalRuns);
    if (wicketSelected) setWickets(wickets + 1);
    updateBatsmanStats(striker, runsFromBat, isLegalDelivery);
    updateBowlerStats(currentBowler, totalRuns, wicketSelected, isLegalDelivery);

    if (currentExtraType) {
      updateExtras(currentExtraType, currentExtras + currentRuns);
    }

    setBallHistory([ballEvent, ...ballHistory]);
    setUndoStack([]);

    advanceCreaseAfterDelivery(isLegalDelivery, currentRuns, wicketSelected, dismissedBatsman, nextBatsmanForBall, {
      dismissal: dismissalForBall,
      fielder: fielderForBall,
    });

    if (isConnected && session) {
      const extraType = toExtraType(currentExtraType);
      const runsOffBat = extraType === 'NB' || extraType === 'None' ? currentRuns : 0;
      const extraRuns =
        extraType === 'WD' ? Math.max(0, currentExtras - scoringRules.wide_penalty_runs)
        : extraType === 'B' || extraType === 'LB' ? currentRuns
        : 0;
      const payload = {
        innings_id: session.inningsId,
        runs_off_bat: runsOffBat,
        extra_type: extraType,
        extra_runs: extraRuns,
        is_wicket: wicketSelected,
        events: eventText || null,
        striker_id: session.playerIdMap?.[striker] || session.strikerId,
        non_striker_id: session.playerIdMap?.[nonStriker] || session.nonStrikerId,
        bowler_id: session.playerIdMap?.[currentBowler] || session.bowlerId,
        wagon_x: shotPoint?.x || null,
        wagon_y: shotPoint?.y || null,
        field_area: shotPoint?.fieldArea || null,
        batsman_hand: batsmanHand,
        bowling_side: bowlingSide,
        shot_angle: shotPoint?.angleDeg || null,
        pitch_distance: shotPoint?.distanceFromPitch || null
      };
      const wicketPayload = wicketSelected ? {
        innings_id: session.inningsId,
        dismissed_player_id:
          dismissedBatsman === striker
            ? session.strikerId!
            : session.nonStrikerId!,
        dismissal_type: dismissalForBall as DismissalType,
        fielder_id: fielderForBall ? (session.playerIdMap?.[fielderForBall] || fielderForBall) : undefined,
        incoming_batsman_id: session.playerIdMap?.[nextBatsmanForBall] || nextBatsmanForBall,
      } : null;
      apiRecordBall(matchId!, payload)
        .then(async (res) => {
          if (wicketPayload) {
            const wicketRes = await apiWicketWizard(matchId!, wicketPayload);
            syncFromInnings(wicketRes.innings);
            applyLifecycle(wicketRes);
            saveSession(wicketRes.innings);
            if (session) {
              const incomingId = wicketPayload.incoming_batsman_id;
              if (dismissedBatsman === striker) session.strikerId = incomingId;
              else session.nonStrikerId = incomingId;
            }
            if (wicketRes.innings_complete && wicketRes.match_complete) {
              clearSession();
              toast.success('All out - match complete');
            }
          } else {
            syncFromInnings(res.innings);
            applyLifecycle(res);
            saveSession(res.innings);
          }
          void flushPendingDeliveries();
          if (res.innings_complete && res.match_complete) {
            clearSession();
            toast.success(res.match_complete ? 'Match complete' : 'Innings complete');
          }
        })
        .catch((err) => {
          if (!err?.response) {
            pendingDeliveries.current.push(payload);
            if (connLostToast.current == null) {
              connLostToast.current = toast.persist('Connection lost — deliveries queued locally');
            }
          } else {
            toast.error(err?.response?.data?.error || 'Failed to record ball');
          }
        });
    }

    resetCurrentBall();
    toast.success('Ball recorded');
  };

  const generateCommentary = (
    runs: number,
    extraRuns: number,
    extraType: string | null,
    wicket: boolean,
    wicketDetails?: { dismissal: string; fielder: string; outBatsman: string }
  ): string => {
    if (wicket) {
      const dismissal = wicketDetails?.fielder ? `${wicketDetails.dismissal} by ${wicketDetails.fielder}` : wicketDetails?.dismissal;
      return `${wicketDetails?.outBatsman || striker} is OUT${dismissal ? ` - ${dismissal}` : ''}!`;
    }
    if (runs === 6) return `SIX! ${striker} smashes it for maximum!`;
    if (runs === 4) return `FOUR! Beautiful shot by ${striker}`;
    if (extraType === 'wide') return `Wide ball, ${extraRuns + runs} runs`;
    if (extraType === 'no-ball') return `No ball called, ${extraRuns + runs} runs`;
    if (runs === 0) return 'Dot ball';
    return `${runs} run${runs > 1 ? 's' : ''} scored`;
  };

  const updateBatsmanStats = (batsmanName: string, runs: number, countBall: boolean) => {
    setBatsmen(prev => prev.map(b => {
      if (b.name === batsmanName) {
        return {
          ...b,
          runs: b.runs + runs,
          balls: b.balls + (countBall ? 1 : 0),
          fours: b.fours + (runs === 4 ? 1 : 0),
          sixes: b.sixes + (runs === 6 ? 1 : 0),
        };
      }
      return b;
    }));
  };

  const advanceCreaseAfterDelivery = (
    isLegal: boolean,
    runs: number,
    wicket: boolean,
    dismissedBatsman?: string,
    incomingBatsman?: string,
    wicketDetails?: { dismissal: string; fielder: string }
  ) => {
    let nextStriker = striker;
    let nextNonStriker = nonStriker;

    if (wicket && incomingBatsman) {
      const dismissalText = wicketDetails?.fielder
        ? `${wicketDetails.dismissal} by ${wicketDetails.fielder}`
        : wicketDetails?.dismissal || selectedDismissal;

      setBatsmen(prev => {
        const withDismissal = prev.map(b =>
          b.name === dismissedBatsman
            ? { ...b, isOut: true, dismissal: dismissalText }
            : b
        );
        return withDismissal.some(b => b.name === incomingBatsman)
          ? withDismissal
          : [...withDismissal, { name: incomingBatsman, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false }];
      });

      if (dismissedBatsman === striker) nextStriker = incomingBatsman;
      if (dismissedBatsman === nonStriker) nextNonStriker = incomingBatsman;
    }

    if (isLegal) {
      if (balls === 5) {
        setOvers(overs + 1);
        setBalls(0);
        setShowBowlerChangeDialog(true);
        [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
      } else {
        setBalls(balls + 1);
        if (!wicket && runs % 2 !== 0) {
          [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
        }
      }
    } else if (!wicket && runs % 2 !== 0 && currentExtraType === 'no-ball') {
      [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
    }

    setStriker(nextStriker);
    setNonStriker(nextNonStriker);
  };

  const updateBowlerStats = (bowlerName: string, runs: number, wicket: boolean, isLegal: boolean) => {
    setBowlers(prev => {
      const existing = prev.find(b => b.name === bowlerName);
      if (existing) {
        return prev.map(b => {
          if (b.name === bowlerName) {
            const newBalls = b.balls + (isLegal ? 1 : 0);
            return {
              ...b,
              balls: newBalls,
              overs: Math.floor(newBalls / 6),
              runs: b.runs + runs,
              wickets: b.wickets + (wicket ? 1 : 0),
            };
          }
          return b;
        });
      } else {
        return [...prev, {
          name: bowlerName,
          overs: 0,
          balls: isLegal ? 1 : 0,
          runs,
          wickets: wicket ? 1 : 0,
          maidens: 0,
        }];
      }
    });
  };

  const updateExtras = (type: string, amount: number) => {
    setExtras(prev => ({
      ...prev,
      wides: type === 'wide' ? prev.wides + amount : prev.wides,
      noBalls: type === 'no-ball' ? prev.noBalls + amount : prev.noBalls,
      byes: type === 'bye' ? prev.byes + amount : prev.byes,
      legByes: type === 'leg-bye' ? prev.legByes + amount : prev.legByes,
      penalties: type === 'penalty' ? prev.penalties + amount : prev.penalties,
    }));
  };

  const swapStrike = () => {
    const temp = striker;
    setStriker(nonStriker);
    setNonStriker(temp);
  };

  const resetCurrentBall = () => {
    setCurrentRuns(0);
    setCurrentExtras(0);
    setCurrentExtraType(null);
    setIsWicket(false);
    setSelectedDismissal('');
    setSelectedFielder('');
    setSelectedOutBatsman(striker);
    setNextBatsman('');
    setShotPoint(null); // 🔥 Shot clear
    setEventText('');
  };

  const undoLastBall = () => {
    if (ballHistory.length === 0) return;
    const lastBall = ballHistory[0];
    setUndoStack([lastBall, ...undoStack]);
    setBallHistory(ballHistory.slice(1));
    setScore(score - lastBall.runs);

    if (balls === 0) {
      setOvers(Math.max(0, overs - 1));
      setBalls(5);
    } else {
      setBalls(balls - 1);
    }

    if (isConnected && session) {
      apiUndoBall(matchId!, session.inningsId)
        .then((res) => syncFromInnings(res.innings))
        .catch((err) => toast.error(err?.response?.data?.error || 'Failed to undo'));
    }
    toast.success('Ball undone');
  };

  const redoLastBall = () => {
    if (undoStack.length === 0) return;
    const ballToRedo = undoStack[0];
    setBallHistory([ballToRedo, ...ballHistory]);
    setUndoStack(undoStack.slice(1));
    setScore(score + ballToRedo.runs);

    if (balls === 5) {
      setOvers(overs + 1);
      setBalls(0);
    } else {
      setBalls(balls + 1);
    }
    toast.success('Ball redone');
  };

  const handleReset = () => {
    setScore(0);
    setWickets(0);
    setOvers(0);
    setBalls(0);
    setBallHistory([]);
    setUndoStack([]);
    setExtras({ wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0 });
    setBatsmen(prev => prev.map(b => ({ ...b, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false })));
    setBowlers(prev => prev.map(b => ({ ...b, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0 })));
    setIsLive(false);
    setShowResetDialog(false);
    toast.success('Match reset');
  };

  const tabs = [
    { id: 'scoring', label: 'Scoring' },
    { id: 'scorecard', label: 'Scorecard' },
    { id: 'commentary', label: 'Commentary' },
  ] as const;

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 shrink-0 mb-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('/matches')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="truncate">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-[#1a1a1a] truncate">
                {teamNames ? `${teamNames.team1.name} vs ${teamNames.team2.name}` : 'Scorer Console'}
              </h1>
              {isLive && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>LIVE
                </span>
              )}
            </div>
            <p className="text-sm text-[#666666]">Innings {inningsNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (inningsBreak) {
                void prepareSecondInningsDialog();
                return;
              }
              setIsLive(!isLive);
            }}
            className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-2 transition-colors ${
              isLive
                ? 'bg-[#e60023] text-white hover:bg-[#cc001e]'
                : 'bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]'
            }`}
          >
            {isLive && !inningsBreak ? <Pause size={18} /> : <Play size={18} />}
            {startButtonLabel}
          </button>
          <button
            onClick={() => toast.success('Match saved')}
            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
          >
            <Save size={18} />
            Save
          </button>
          <button
            onClick={() => setShowResetDialog(true)}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1 text-xs"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {inningsBreak && (
        <div className="mx-4 mb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg shrink-0">
          <div className="space-y-1">
            <span className="text-sm font-semibold text-amber-900">First innings complete — locked score</span>
            <p className="text-sm font-black text-amber-950 tabular-nums">
              {inningsBreak.first_innings_score}
              {inningsBreak.first_innings_overs ? ` (${inningsBreak.first_innings_overs} Ov)` : ''}
              {inningsBreak.first_innings_extras != null ? ` · Extras ${inningsBreak.first_innings_extras}` : ''}
            </p>
            <p className="text-xs text-amber-800">
              Target {inningsBreak.target}
              {inningsBreak.balls_in_match ? ` · ${inningsBreak.balls_in_match} balls in match` : ''}
              {inningsBreak.required_run_rate != null ? ` · Initial RR ${inningsBreak.required_run_rate}` : ''}
            </p>
          </div>
          <button
            onClick={() => { void prepareSecondInningsDialog(); }}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 whitespace-nowrap"
          >
            Start 2nd Innings
          </button>
        </div>
      )}

      {inningsNumber === 2 && chaseInfo && !inningsBreak && (
        <div className="mx-4 mb-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-white shadow-md shrink-0">
          <p className="text-[11px] font-black uppercase tracking-widest opacity-90">Chase Target</p>
          <p className="text-lg md:text-xl font-black tabular-nums">
            Need {chaseInfo.runs_required} runs from {chaseInfo.balls_remaining ?? '-'} balls
            {chaseInfo.required_run_rate != null ? (
              <span className="text-sm font-bold ml-2 opacity-95">· Req RR {chaseInfo.required_run_rate}</span>
            ) : null}
          </p>
          <p className="text-xs font-semibold opacity-90 mt-0.5">Target {chaseInfo.target}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start px-4 pb-2 border-b border-gray-200 shrink-0">
        {/* Left Column: Scorecard */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-2xl shadow-xl p-4 text-white">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Score</p>
              <p className="text-4xl font-bold tabular-nums">
                {score}<span className="text-2xl text-gray-400">/{wickets}</span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Overs</p>
              <p className="text-4xl font-bold tabular-nums">
                {overs}<span className="text-2xl text-gray-400">.{balls}</span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Run Rate</p>
              <p className="text-4xl font-bold tabular-nums">
                {runRate}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-5 gap-2 text-center">
              <div><p className="text-[10px] text-gray-400">Wides</p><p className="text-xl font-semibold tabular-nums">{extras.wides}</p></div>
              <div><p className="text-[10px] text-gray-400">No Balls</p><p className="text-xl font-semibold tabular-nums">{extras.noBalls}</p></div>
              <div><p className="text-[10px] text-gray-400">Byes</p><p className="text-xl font-semibold tabular-nums">{extras.byes}</p></div>
              <div><p className="text-[10px] text-gray-400">Leg Byes</p><p className="text-xl font-semibold tabular-nums">{extras.legByes}</p></div>
              <div><p className="text-[10px] text-gray-400">Penalties</p><p className="text-xl font-semibold tabular-nums">{extras.penalties}</p></div>
            </div>
            
          </div>
        </div>

        {/* Column 2: Batsmen */}
        <div className="bg-white rounded-lg shadow-sm p-2 border border-gray-200 flex flex-col justify-between">
          <div>
            <p className="text-[11px] text-gray-500 mb-1 uppercase tracking-wide font-bold px-1">Batsman  </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between p-1.5 bg-green-50 rounded-md border border-green-200">
                <div>
                  <span className="font-bold text-sm text-gray-900">{striker}*</span>
                  <p className="text-[10px] text-gray-500 font-semibold">On Strike</p>  
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {batsmen.find(b => b.name === striker)?.runs || 0} ({batsmen.find(b => b.name === striker)?.balls || 0})
                </span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded-md">
                <div>
                  <span className="font-bold text-sm text-gray-900">{nonStriker}</span>
                  <p className="text-[10px] text-gray-500 font-semibold">Non-Striker</p>
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {batsmen.find(b => b.name === nonStriker)?.runs || 0} ({batsmen.find(b => b.name === nonStriker)?.balls || 0})
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={swapStrike}
            disabled={!isLive}
            className="w-full mt-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-bold"
          >
            Change Strike
          </button>
        </div>

        {/* Column 3: Bowler */}
        <div className="bg-white rounded-lg shadow-sm p-2 border border-gray-200 flex flex-col justify-between">
          <div>
            <p className="text-[11px] text-gray-500 mb-1 uppercase tracking-wide font-bold px-1">Current Bowler</p>
            <div className="flex items-center justify-between p-1.5 bg-blue-50 rounded-md border border-blue-200">
              <div>
                <span className="font-semibold text-sm text-[#1a1a1a]">{currentBowler}</span>
                <p className="text-xs text-[#666666]">Bowling</p>
              </div>
              <span className="text-base font-bold tabular-nums">
                {(bowlers.find(b => b.name === currentBowler)?.overs || 0)}.{Math.abs(bowlers.find(b => b.name === currentBowler)?.balls ?? 0) % 6}-
                {bowlers.find(b => b.name === currentBowler)?.runs || 0}-
                {bowlers.find(b => b.name === currentBowler)?.wickets || 0}
              </span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-[11px] text-gray-500 mb-1 uppercase tracking-wide font-bold px-1">Previous Bowler</p>
            {previousBowler ? (
              <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded-md">
                <div>
                  <span className="font-semibold text-sm text-[#1a1a1a]">{previousBowler}</span>
                  <p className="text-xs text-[#666666]">Last Over</p>
                </div>
                <span className="text-base font-bold tabular-nums text-gray-500">
                  {(bowlers.find(b => b.name === previousBowler)?.overs || 0)}.{Math.abs(bowlers.find(b => b.name === previousBowler)?.balls ?? 0) % 6}-
                  {bowlers.find(b => b.name === previousBowler)?.runs || 0}-
                  {bowlers.find(b => b.name === previousBowler)?.wickets || 0}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[46px] p-2 bg-gray-50 rounded-md border border-dashed border-gray-200">
                <span className="text-xs font-medium text-gray-400">No previous bowler</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-4 shrink-0 -mt-2">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 relative transition-colors font-medium ${
                activeTab === tab.id ? 'text-[#e60023]' : 'text-[#666666] hover:text-[#1a1a1a]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e60023]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 p-4">
        {activeTab === 'scoring' && (
        <div className="grid grid-cols-12 gap-6 h-full">
          <div className="col-span-7 flex flex-col gap-4 overflow-y-auto pr-2">
            <div className="bg-white rounded-lg shadow-sm p-2 border border-gray-200 shrink-0">
              <div className="flex justify-around items-center text-xs font-bold text-gray-500 mb-2 border-b border-gray-100 pb-1.5">
                <span>Current ball: <span className="text-gray-900">{overs}.{balls}</span></span>
                <span>Runs: <span className="text-purple-600">{currentRuns}</span></span>
                <span>Extras: <span className="text-orange-600">{currentExtras}</span></span>
                <span>Total: <span className="text-green-600">{currentRuns + currentExtras}</span></span>
              </div>
               

              <div className="space-y-4">
                <p className="text-sm text-[#666666] mb-3">Scoring Buttons</p>
                <div className="grid grid-cols-9 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((runs) => (
                    <button
                      key={runs}
                      onClick={() => handleRunClick(runs)}
                      disabled={!isLive}
                      className={`w-12 h-12 flex items-center justify-center rounded-lg font-bold text-lg transition-all ${
                        currentRuns === runs
                          ? 'bg-[#e60023] text-white scale-105 shadow-lg'
                          : runs === 4 || runs === 6
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-[#f0f0f0] text-[#1a1a1a] hover:bg-[#e0e0e0]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {runs}
                    </button>
                  ))}
                 
                </div>
              </div>

              <div>
                
                <div className="grid grid-cols-7 gap-y-3 mt-4">
                  {[
                    { type: 'wide', label: 'Wide', color: 'yellow' },
                    { type: 'no-ball', label: 'No Ball', color: 'orange' },
                    { type: 'bye', label: 'Bye', color: 'blue' },
                    { type: 'leg-bye', label: 'Leg Bye', color: 'purple' },
                  ].map(({ type, label, color }) => (
                    <button
                      key={type}
                      onClick={() => handleExtraClick(type)}
                      disabled={!isLive}
                      className={`p-2.5 rounded-xl font-medium transition-all text-xs ${
                        currentExtraType === type
                          ? `bg-${color}-600 text-white scale-105 shadow-lg`
                          : `bg-${color}-100 text-${color}-900 hover:bg-${color}-200`
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    key="penalty"
                    onClick={() => handleExtraClick('penalty')}
                    disabled={!isLive}
                    className={`p-2.5 rounded-xl font-medium transition-all text-xs ${
                      currentExtraType === 'penalty'
                        ? `bg-red-600 text-white scale-105 shadow-lg`
                        : `bg-red-100 text-red-900 hover:bg-red-200`
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Penalty
                  </button>
                  <button
                    onClick={undoLastBall}
                    disabled={!isLive || ballHistory.length === 0}
                    className="p-2.5 rounded-xl font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 text-xs"
                  >
                    <Undo size={16} /> Undo
                  </button>
                  <button
                    onClick={resetCurrentBall}
                    disabled={!isLive}
                    className="p-2.5 rounded-xl font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 text-xs"
                  >
                    <Trash2 size={14}/> Clear
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setSelectedOutBatsman(selectedOutBatsman || striker);
                    setShowWicketDialog(true);
                  }}
                  disabled={!isLive}
                  className="flex-1 p-3 bg-red-100 text-red-800 rounded-xl font-semibold text-base hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isWicket ? '✓ WICKET SELECTED' : 'WICKET'}
                </button>
                <button
                  onClick={() => recordBall()}
                  disabled={!isLive}
                  className="flex-1 p-3 bg-green-600 text-white rounded-xl font-bold text-base hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  ✓ RECORD BALL
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200 shrink-0">
              <ViewerRecentDeliveries scorecard={viewerScorecard} compact />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200 shrink-0">
              <label htmlFor="event-logger" className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Log Special Event (for next delivery)
              </label>
              <div className="mt-2 flex rounded-md shadow-sm">
                <input
                  type="text"
                  id="event-logger"
                  name="event"
                  className="flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  placeholder="e.g., Catch drop, Run-out miss"
                  value={eventText}
                  onChange={(e) => setEventText(e.target.value)}
                  disabled={!isLive}
                />
                <button
                  type="button"
                  disabled={!isLive}
                  className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Log
                </button>
              </div>
            </div>
</div>
          {/* RIGHT COLUMN: WAGON WHEEL & ACTIONS */}
          <div className="col-span-5 flex flex-col gap-0 min-h-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 min-h-0 flex flex-col">
              <div className="bg-[#fbfdfb] border border-[#d9e4d5] rounded-xl overflow-hidden relative flex-1 min-h-0 w-full h-full p-2 flex items-center justify-center">
                <WagonWheel
                  className="compact"
                  batsmanHand={batsmanHand}
                  selectedShots={shotPoint ? [shotPoint] : [] as any}
                  onPointSelect={(point: any) => setShotPoint(point)}
                  stadiumEnd="Pavilion End"
                  savePoint={async () => {}}
                />
                <div className="absolute top-2 left-2 z-10 flex bg-gray-100/80 backdrop-blur-sm p-1 rounded-lg shrink-0">
                  <button
                    onClick={() => setBowlingSide('Over')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${bowlingSide === 'Over' ? 'bg-white shadow-sm text-[#1a1a1a]' : 'text-gray-500 hover:text-[#1a1a1a]'}`}
                  >
                    Over
                  </button>
                  <button
                    onClick={() => setBowlingSide('Around')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${bowlingSide === 'Around' ? 'bg-white shadow-sm text-[#1a1a1a]' : 'text-gray-500 hover:text-[#1a1a1a]'}`}
                  >
                    Around
                  </button>
                  <button
                    onClick={() => setBowlingSide('Across')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${bowlingSide === 'Across' ? 'bg-white shadow-sm text-[#1a1a1a]' : 'text-gray-500 hover:text-[#1a1a1a]'}`}
                  >
                    Across
                  </button>
                </div>
                <div className="absolute top-2 right-2 z-10 flex bg-gray-100/80 backdrop-blur-sm p-1 rounded-lg shrink-0">
                  <button 
                    onClick={() => setBatsmanHand('right')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${batsmanHand === 'right' ? 'bg-white shadow-sm text-[#1a1a1a]' : 'text-gray-500 hover:text-[#1a1a1a]'}`}
                  >
                    RHB
                  </button>
                  <button 
                    onClick={() => setBatsmanHand('left')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${batsmanHand === 'left' ? 'bg-white shadow-sm text-[#1a1a1a]' : 'text-gray-500 hover:text-[#1a1a1a]'}`}
                  >
                    LHB
                  </button>
                </div>
                {shotPoint && (
                  <div className="absolute bottom-3 bg-[#315c2b] text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md">
                    {shotPoint.fieldArea} ({shotPoint.x}, {shotPoint.y})
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scorecard' && matchId && (
        <ViewerScorecardPanel matchId={matchId} refreshKey={scorecardRefreshKey} />
      )}

      {activeTab === 'commentary' && matchId && (
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between shrink-0 mb-2 p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
            <div className="flex gap-1 p-1 bg-gray-200 dark:bg-gray-800 rounded-md">
              <button
                onClick={() => setCommentaryInnings(1)}
                className={`px-3 py-1 text-xs font-bold rounded ${commentaryInnings === 1 ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
              >
                1st Innings
              </button>
              <button
                onClick={() => setCommentaryInnings(2)}
                disabled={inningsNumber < 2 && ballHistory.every(b => b.over < (matchTotalOvers || 20))}
                className={`px-3 py-1 text-xs font-bold rounded disabled:opacity-50 ${commentaryInnings === 2 ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
              >
                2nd Innings
              </button>
            </div>
            <div className="flex gap-1 p-1 bg-gray-200 dark:bg-gray-800 rounded-md">
              <button
                onClick={() => setCommentarySort('desc')}
                className={`px-3 py-1 text-xs font-bold rounded ${commentarySort === 'desc' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
              >
                Recent First
              </button>
              <button
                onClick={() => setCommentarySort('asc')}
                className={`px-3 py-1 text-xs font-bold rounded ${commentarySort === 'asc' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
              >
                Oldest First
              </button>
            </div>
          </div>
          <ViewerCommentaryPanel matchId={matchId} enabled={activeTab === 'commentary'} innings={commentaryInnings} sort={commentarySort} />
        </div>
      )}
      </div>

      {/* Dialogs */}
      {showSecondInningsDialog && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowSecondInningsDialog(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-2">Start Second Innings</h3>
            {inningsBreak && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">First innings (locked)</p>
                <p className="text-lg font-black text-amber-950 tabular-nums">
                  {inningsBreak.first_innings_score}
                  {inningsBreak.first_innings_overs ? ` (${inningsBreak.first_innings_overs} Ov)` : ''}
                </p>
                <p className="text-xs text-amber-800">
                  Chasing {inningsBreak.target} from {inningsBreak.balls_in_match ?? (matchTotalOvers ? matchTotalOvers * 6 : '-')} balls
                  {inningsBreak.required_run_rate != null ? ` · Req RR ${inningsBreak.required_run_rate}` : ''}
                </p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Striker (chasing team)</label>
                <select
                  value={secondInningsStriker}
                  onChange={(e) => setSecondInningsStriker(e.target.value)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                >
                  <option value="">Select opening striker</option>
                  {secondInningsBattingPool.filter(p => p !== secondInningsNonStriker).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Non-Striker (chasing team)</label>
                <select
                  value={secondInningsNonStriker}
                  onChange={(e) => setSecondInningsNonStriker(e.target.value)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                >
                  <option value="">Select opening non-striker</option>
                  {secondInningsBattingPool.filter(p => p !== secondInningsStriker).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Opening Bowler (team that batted first)</label>
                <select
                  value={secondInningsBowler}
                  onChange={(e) => setSecondInningsBowler(e.target.value)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                >
                  <option value="">Select opening bowler</option>
                  {secondInningsBowlingPool.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => startSecondInnings()} className="flex-1 p-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all">
                  Start Innings
                </button>
                <button onClick={() => setShowSecondInningsDialog(false)} className="flex-1 p-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showMatchCompleteDialog && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6">
            <h3 className="text-xl font-semibold mb-3">Match Completed</h3>
            <p className="text-sm text-[#666666] mb-6">
              {matchResult?.resultSummary || 'The match has been completed and saved.'}
            </p>
            <button
              onClick={() => {
                setShowMatchCompleteDialog(false);
                toast.success('Match submitted');
                onNavigate('/scorer-dashboard');
              }}
              className="w-full p-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
            >
              Submit Match
            </button>
          </div>
        </>
      )}

      {showWicketDialog && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowWicketDialog(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="text-red-600" size={24} />
              <h3 className="text-xl font-semibold">Record Wicket</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Batsman Out</label>
                <select
                  value={selectedOutBatsman}
                  onChange={(e) => setSelectedOutBatsman(e.target.value)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                >
                  <option value={striker}>{striker}</option>
                  <option value={nonStriker}>{nonStriker}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Dismissal Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Bowled', 'LBW', 'Caught', 'Run Out', 'Stumped', 'Hit Wicket', 'Retired Hurt', 'Obstructing the Field'].map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedDismissal(type)}
                      className={`p-3 rounded-lg font-medium transition-all ${
                        selectedDismissal === type
                          ? 'bg-red-600 text-white'
                          : 'bg-red-100 text-red-900 hover:bg-red-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              {(selectedDismissal === 'Caught' || selectedDismissal === 'Run Out' || selectedDismissal === 'Stumped') && (
                <div>
                  <label className="block text-sm font-medium mb-2">Fielder</label>
                  <select
                    value={selectedFielder}
                    onChange={(e) => setSelectedFielder(e.target.value)}
                    className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                  >
                    <option value="">Select Fielder (Optional)</option>
                    {fieldingRoster.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Next Batsman</label>
                <select
                  value={nextBatsman}
                  onChange={(e) => setNextBatsman(e.target.value)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                >
                  <option value="">Select next batsman</option>
                  {battingRoster
                    .filter(name => name !== striker && name !== nonStriker && !batsmen.some(b => b.name === name && b.isOut)) 
                    .map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    if (!selectedDismissal) { toast.error('Please select a dismissal type'); return; }
                    if (!nextBatsman) { toast.error('Please select the next batsman'); return; }
                    setShowWicketDialog(false);
                    setIsWicket(true); 
                  }}
                  className="flex-1 p-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
                >
                  Save Wicket Details
                </button>
                <button
                  onClick={() => setShowWicketDialog(false)}
                  className="flex-1 p-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showResetDialog && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowResetDialog(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="text-orange-600" size={24} />
              <h3 className="text-xl font-semibold">Reset Match?</h3>
            </div>
            <p className="text-[#666666] mb-6">
              This will clear all scoring data and reset the match to the beginning. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 p-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
              >
                Yes, Reset
              </button>
              <button
                onClick={() => setShowResetDialog(false)}
                className="flex-1 p-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {showBowlerChangeDialog && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6">
            <h3 className="text-xl font-semibold mb-4">End of Over - Change Bowler</h3>
            <p className="text-sm text-[#666666] mb-4">Select the bowler for the next over</p>
            <select
              className="w-full p-3 border border-[#e0e0e0] rounded-lg mb-4 bg-white"
              value={selectedNextBowler}
              onChange={(e) => setSelectedNextBowler(e.target.value)}
            >
              <option value="">Select next bowler</option>
              {fieldingRoster
                .filter(name => name !== currentBowler)
                .map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
            </select>
            <button
              onClick={() => {
                if (!selectedNextBowler) { toast.error('Please select the next bowler'); return; }
                setPreviousBowler(currentBowler);
                setCurrentBowler(selectedNextBowler);
                if (session) {
                  const newBowlerId = session.playerIdMap?.[selectedNextBowler] || selectedNextBowler;
                  session.bowlerId = newBowlerId; 
                }
                setBowlers(prev => {
                  if (!prev.find(b => b.name === selectedNextBowler)) {
                    return [...prev, { name: selectedNextBowler, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0 }];
                  }
                  return prev;
                });
                setShowBowlerChangeDialog(false);
                setSelectedNextBowler('');
                toast.success('Bowler changed');
              }}
              className="w-full p-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              Continue
            </button>
          </div>
        </>
      )}
    </div>
  );
}