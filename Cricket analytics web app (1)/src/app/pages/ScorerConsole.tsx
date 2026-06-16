import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Save, ArrowLeft, Undo, Redo, MoreHorizontal, RotateCcw, AlertCircle } from 'lucide-react';
import { toast } from '../../lib/toast';
import WagonWheel from '../../app/components/WagonWheel';

// sessionStorage key for crash-recovery of an in-progress scoring session.
const SCORER_SESSION_KEY = 'scorer_session';
import {
  recordBall as apiRecordBall,
  wicketWizard as apiWicketWizard,
  undoBall as apiUndoBall,
  getLiveSession,
  setLiveSession,
  getLiveMatchState,
  toExtraType,
  type InningsState,
  type LiveSession,
  type DismissalType,
} from '../../lib/scorerApi';

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

  // Score state
  const [score, setScore] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [overs, setOvers] = useState(0);
  const [balls, setBalls] = useState(0);

  // Current ball state
  const [currentRuns, setCurrentRuns] = useState(0);
  const [currentExtras, setCurrentExtras] = useState(0);
  const [currentExtraType, setCurrentExtraType] = useState<string | null>(null);
  const [isWicket, setIsWicket] = useState(false);
  const [shotPoint, setShotPoint] = useState<any>(null);
  const [batsmanHand, setBatsmanHand] = useState<'right' | 'left'>('right');

  
  // 🔥 REAL PLAYERS STATE: Replaced mock data with session variables
  // Around line 60 in ScorerConsole.tsx
// Assuming you update your scorerApi/session structure to include these names
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
    },]);
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

  // Dialog states
  const [showOthersDialog, setShowOthersDialog] = useState(false);
  const [showWicketDialog, setShowWicketDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showBowlerChangeDialog, setShowBowlerChangeDialog] = useState(false);

  // Wicket dialog state
  const [selectedDismissal, setSelectedDismissal] = useState('');
  const [selectedFielder, setSelectedFielder] = useState('');
  const [selectedOutBatsman, setSelectedOutBatsman] = useState(striker);
  const [nextBatsman, setNextBatsman] = useState('');

  const totalExtras = extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penalties;
  const yetToBat = battingRoster.filter(
    name => !batsmen.some(b => b.name === name)
      && name !== striker
      && name !== nonStriker
      && name !== nextBatsman
  );

  const syncFromInnings = (innings: InningsState) => {
    setScore(innings.total_runs);
    setWickets(innings.total_wickets);
    setOvers(innings.overs_completed);
    setBalls(innings.balls_this_over);
    setExtras({
      wides: innings.extras.wides,
      noBalls: innings.extras.no_balls,
      byes: innings.extras.byes,
      legByes: innings.extras.leg_byes,
      penalties: innings.extras.penalties,
    });
  };

  const nameForPlayer = (playerId?: string, names?: { [key: string]: string }) =>
    (playerId && (names?.[playerId] || session?.playerNames?.[playerId])) || 'Unknown Player';

  const hydrateFromLiveState = (liveState: Awaited<ReturnType<typeof getLiveMatchState>>) => {
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

    const strikerName = nameForPlayer(liveState.striker?.player_id, playerNames);
    const nonStrikerName = nameForPlayer(liveState.non_striker?.player_id, playerNames);
    const bowlerName = nameForPlayer(liveState.bowler?.player_id, playerNames);

    setStriker(strikerName);
    setNonStriker(nonStrikerName);
    setCurrentBowler(bowlerName);
    setSelectedOutBatsman(strikerName);
    setBattingRoster(liveState.battingRoster || []);
    setFieldingRoster(liveState.fieldingRoster || []);

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

    saveSession(liveState.innings);
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

  const clearSession = () => sessionStorage.removeItem(SCORER_SESSION_KEY);

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
      .then((liveState) => {
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

    if (extraType === 'wide' || extraType === 'no-ball') {
      setCurrentExtras(1);
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

    let totalRuns = currentRuns + currentExtras;
    const isLegalDelivery = currentExtraType !== 'wide' && currentExtraType !== 'no-ball';
    const dismissedBatsman = outBatsmanForBall || striker;

    const requiresWagonWheel = (currentRuns > 0 || isWicket || totalRuns === 0) && currentExtraType !== 'wide';
    
    if (requiresWagonWheel && !shotPoint) {
      toast.error('Please map the shot direction on the Wagon Wheel first!');
      return; // Execution yahin rok dein
    }
    const ballEvent: BallEvent = {
      over: overs,
      ball: balls,
      runs: totalRuns,
      batsmanRuns: currentExtraType === 'bye' || currentExtraType === 'leg-bye' ? 0 : currentRuns,
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
    updateBatsmanStats(striker, currentRuns, isLegalDelivery);
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
        extraType === 'WD' ? Math.max(0, currentExtras - 1)
        : extraType === 'B' || extraType === 'LB' ? currentRuns
        : 0;
      const payload = {
        innings_id: session.inningsId,
        runs_off_bat: runsOffBat,
        extra_type: extraType,
        extra_runs: extraRuns,
        is_wicket: wicketSelected,
        striker_id: session.playerIdMap?.[striker] || session.strikerId,
        non_striker_id: session.playerIdMap?.[nonStriker] || session.nonStrikerId,
        bowler_id: session.playerIdMap?.[currentBowler] || session.bowlerId,
        wagon_x: shotPoint?.x || null,
        wagon_y: shotPoint?.y || null,
        field_area: shotPoint?.fieldArea || null,
        batsman_hand: batsmanHand,
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
            saveSession(wicketRes.innings);
            if (session) {
              const incomingId = wicketPayload.incoming_batsman_id;
              if (dismissedBatsman === striker) session.strikerId = incomingId;
              else session.nonStrikerId = incomingId;
            }
            if (wicketRes.innings_complete) {
              clearSession();
              toast.success('All out - innings complete');
            }
          } else {
            syncFromInnings(res.innings);
            saveSession(res.innings);
          }
          void flushPendingDeliveries();
          if (res.innings_complete) {
            clearSession();
            toast.success('Innings complete');
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

  const progressBall = () => {
    if (balls === 5) {
      setOvers(overs + 1);
      setBalls(0);
      setShowBowlerChangeDialog(true);
      swapStrike();
    } else {
      setBalls(balls + 1);
    }
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
    setShotPoint(null); // 🔥 Shot clear karein
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('/matches')}
            className="p-2 hover:bg-[#f0f0f0] rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[#1a1a1a]">Scorer Console</h1>
            <p className="text-sm text-[#666666]">Live Match Scoring</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              isLive
                ? 'bg-[#e60023] text-white hover:bg-[#cc001e]'
                : 'bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]'
            }`}
          >
            {isLive ? <Pause size={18} /> : <Play size={18} />}
            {isLive ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={() => toast.success('Match saved')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
          >
            <Save size={18} />
            Save
          </button>
        </div>
      </div>

      {/* Live Indicator */}
      {isLive && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-red-600">LIVE SCORING</span>
        </div>
      )}

      {/* LARGE Scoreboard - Production Grade */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] rounded-2xl shadow-2xl p-8 text-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Score */}
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-3 uppercase tracking-wide">Score</p>
            <p className="text-7xl md:text-8xl font-bold tabular-nums">
              {score}<span className="text-5xl text-gray-400">/{wickets}</span>
            </p>
          </div>

          {/* Overs */}
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-3 uppercase tracking-wide">Overs</p>
            <p className="text-7xl md:text-8xl font-bold tabular-nums">
              {overs}<span className="text-5xl text-gray-400">.{balls}</span>
            </p>
          </div>

          {/* Run Rate */}
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-3 uppercase tracking-wide">Run Rate</p>
            <p className="text-7xl md:text-8xl font-bold tabular-nums">
              {runRate}
            </p>
          </div>
        </div>

        {/* Extras Summary */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400">Wides</p>
              <p className="text-2xl font-semibold tabular-nums">{extras.wides}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">No Balls</p>
              <p className="text-2xl font-semibold tabular-nums">{extras.noBalls}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Byes</p>
              <p className="text-2xl font-semibold tabular-nums">{extras.byes}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Leg Byes</p>
              <p className="text-2xl font-semibold tabular-nums">{extras.legByes}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Penalties</p>
              <p className="text-2xl font-semibold tabular-nums">{extras.penalties}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#e0e0e0]">
        <div className="flex gap-8">
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
      {/* Tab Content */}
      {activeTab === 'scoring' && (
        <div className="flex flex-col xl:flex-row gap-6">
          
          {/* ============================================================== */}
          {/* LEFT COLUMN: SCORING CONSOLE (60% Width)                         */}
          {/* ============================================================== */}
          <div className="xl:w-[60%] space-y-6">
            
            {/* Current Players */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Batsmen Block */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-[#e0e0e0] flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[#666666] mb-3 uppercase tracking-wide">Batsmen</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-2 border-green-500">
                      <div>
                        <span className="font-semibold text-[#1a1a1a]">{striker}*</span>
                        <p className="text-xs text-[#666666]">On Strike</p>
                      </div>
                      <span className="text-lg font-bold tabular-nums">
                        {batsmen.find(b => b.name === striker)?.runs || 0} ({batsmen.find(b => b.name === striker)?.balls || 0})
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#f9f9f9] rounded-lg">
                      <div>
                        <span className="font-semibold text-[#1a1a1a]">{nonStriker}</span>
                        <p className="text-xs text-[#666666]">Non-Striker</p>
                      </div>
                      <span className="text-lg font-bold tabular-nums">
                        {batsmen.find(b => b.name === nonStriker)?.runs || 0} ({batsmen.find(b => b.name === nonStriker)?.balls || 0})
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={swapStrike}
                  disabled={!isLive}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Change Strike
                </button>
              </div>

              {/* Current & Previous Bowler Block */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-[#e0e0e0] flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[#666666] mb-3 uppercase tracking-wide">Current Bowler</p>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-2 border-blue-500">
                    <div>
                      <span className="font-semibold text-[#1a1a1a]">{currentBowler}</span>
                      <p className="text-xs text-[#666666]">Bowling</p>
                    </div>
                    <span className="text-lg font-bold tabular-nums">
                      {(bowlers.find(b => b.name === currentBowler)?.overs || 0)}.{Math.abs(bowlers.find(b => b.name === currentBowler)?.balls ?? 0) % 6}-
                      {bowlers.find(b => b.name === currentBowler)?.runs || 0}-
                      {bowlers.find(b => b.name === currentBowler)?.wickets || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-[#666666] mb-3 uppercase tracking-wide">Previous Bowler</p>
                  {previousBowler ? (
                    <div className="flex items-center justify-between p-3 bg-[#f9f9f9] rounded-lg">
                      <div>
                        <span className="font-semibold text-[#1a1a1a]">{previousBowler}</span>
                        <p className="text-xs text-[#666666]">Last Over</p>
                      </div>
                      <span className="text-lg font-bold tabular-nums text-gray-500">
                        {(bowlers.find(b => b.name === previousBowler)?.overs || 0)}.{Math.abs(bowlers.find(b => b.name === previousBowler)?.balls ?? 0) % 6}-
                        {bowlers.find(b => b.name === previousBowler)?.runs || 0}-
                        {bowlers.find(b => b.name === previousBowler)?.wickets || 0}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[68px] p-3 bg-[#f9f9f9] rounded-lg border border-dashed border-gray-300">
                      <span className="text-sm font-medium text-gray-400">No previous bowler</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Current Ball State */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
              <h3 className="text-lg font-semibold mb-4 text-[#1a1a1a]">Current Ball</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-[#666666]">Runs</p>
                  <p className="text-4xl font-bold text-purple-600 tabular-nums">{currentRuns}</p>
                </div>
                <div>
                  <p className="text-sm text-[#666666]">Extras</p>
                  <p className="text-4xl font-bold text-orange-600 tabular-nums">{currentExtras}</p>
                </div>
                <div>
                  <p className="text-sm text-[#666666]">Total</p>
                  <p className="text-4xl font-bold text-green-600 tabular-nums">{currentRuns + currentExtras}</p>
                </div>
              </div>
              {currentExtraType && (
                <div className="mt-3 text-center">
                  <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                    {currentExtraType.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Scoring Inputs (Runs, Extras, Wicket) */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-[#e0e0e0]">
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Score Runs</h2>

              {/* Run Buttons */}
              <div className="mb-6">
                <p className="text-sm text-[#666666] mb-3">Runs off bat</p>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((runs) => (
                    <button
                      key={runs}
                      onClick={() => handleRunClick(runs)}
                      disabled={!isLive}
                      className={`p-4 rounded-xl font-bold text-xl transition-all ${
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
                  <button
                    onClick={() => setShowOthersDialog(true)}
                    disabled={!isLive}
                    className="p-4 rounded-xl font-bold text-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <MoreHorizontal size={24} className="mx-auto" />
                  </button>
                </div>
              </div>

              {/* Extras Buttons */}
              <div className="mb-6">
                <p className="text-sm text-[#666666] mb-3">Extras</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                      className={`p-3 rounded-xl font-medium transition-all ${
                        currentExtraType === type
                          ? `bg-${color}-600 text-white scale-105 shadow-lg`
                          : `bg-${color}-100 text-${color}-900 hover:bg-${color}-200`
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {(currentExtraType === 'wide' || currentExtraType === 'no-ball') && (
                  <div className="mt-3">
                    <p className="text-sm text-[#666666] mb-2">Additional runs from {currentExtraType}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[0, 1, 2, 3, 4].map(extra => (
                        <button
                          key={extra}
                          onClick={() => setCurrentExtras(1 + extra)}
                          className={`p-2 rounded-lg font-semibold ${
                            currentExtras === 1 + extra
                              ? 'bg-orange-600 text-white'
                              : 'bg-orange-100 text-orange-900 hover:bg-orange-200'
                          }`}
                        >
                          +{extra}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(currentExtraType === 'bye' || currentExtraType === 'leg-bye') && (
                  <div className="mt-3">
                    <p className="text-sm text-[#666666] mb-2">Runs from {currentExtraType}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map(extra => (
                        <button
                          key={extra}
                          onClick={() => setCurrentRuns(extra)}
                          className={`p-2 rounded-lg font-semibold ${
                            currentRuns === extra
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-100 text-blue-900 hover:bg-blue-200'
                          }`}
                        >
                          {extra}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Wicket Toggle */}
              <div>
                <button
                  onClick={() => {
                    setSelectedOutBatsman(selectedOutBatsman || striker);
                    setShowWicketDialog(true);
                  }}
                  disabled={!isLive}
                  className="w-full p-4 bg-red-600 text-white rounded-xl font-semibold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {isWicket ? '✓ WICKET SELECTED' : 'WICKET'}
                </button>
              </div>
            </div>

            {/* Recent Deliveries Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-[#e0e0e0]">
              <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Recent Deliveries</h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {ballHistory.slice(0, 12).reverse().map((ball, index) => (
                  <div
                    key={index}
                    className={`flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center font-bold text-lg ${
                      ball.wicket
                        ? 'bg-red-600 text-white'
                        : ball.runs >= 4
                        ? 'bg-green-600 text-white'
                        : ball.runs === 0
                        ? 'bg-gray-300 text-gray-700'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {ball.wicket ? 'W' : ball.runs}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: WAGON WHEEL & ACTIONS (40% Width)                  */}
          {/* ============================================================== */}
          <div className="xl:w-[40%] space-y-6">
            
            <div className="bg-white rounded-xl shadow-sm border border-[#e0e0e0] p-6 sticky top-6">
              
              {/* Header & Handedness Toggle */}
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#1a1a1a]">Shot Direction</h2>
                  <p className="text-xs text-gray-500">Tap field to map delivery</p>
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-lg">
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
              </div>
              
              {/* Actual Wagon Wheel Component */}
              <div className="bg-[#fbfdfb] border border-[#d9e4d5] rounded-xl overflow-hidden mb-6 relative flex justify-center">
                <WagonWheel
                  batsmanHand={batsmanHand}
                  selectedShots={shotPoint ? [shotPoint] : [] as any}
                  onPointSelect={(point: any) => setShotPoint(point)}
                  stadiumEnd="Pavilion End"
                  savePoint={async () => {}}
                />
                
                {shotPoint && (
                  <div className="absolute bottom-3 bg-[#315c2b] text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md">
                    {shotPoint.fieldArea} ({shotPoint.x}, {shotPoint.y})
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS (Moved from left column) */}
              <div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => recordBall()}
                    disabled={!isLive}
                    className="w-full p-4 bg-green-600 text-white rounded-xl font-bold text-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    ✓ RECORD BALL
                  </button>
                  <button
                    onClick={resetCurrentBall}
                    disabled={!isLive}
                    className="w-full p-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Clear Input & Wagon Wheel
                  </button>
                </div>

                {/* Undo / Redo / Reset Actions */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={undoLastBall}
                    disabled={!isLive || ballHistory.length === 0}
                    className="p-3 bg-[#f0f0f0] text-[#1a1a1a] rounded-lg font-medium hover:bg-[#e0e0e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-1 text-xs"
                  >
                    <Undo size={16} /> Undo
                  </button>
                  <button
                    onClick={redoLastBall}
                    disabled={!isLive || undoStack.length === 0}
                    className="p-3 bg-[#f0f0f0] text-[#1a1a1a] rounded-lg font-medium hover:bg-[#e0e0e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-1 text-xs"
                  >
                    <Redo size={16} /> Redo
                  </button>
                  <button
                    onClick={() => setShowResetDialog(true)}
                    className="p-3 bg-[#1a1a1a] text-white rounded-lg font-medium hover:bg-[#2a2a2a] transition-colors flex flex-col items-center justify-center gap-1 text-xs"
                  >
                    <RotateCcw size={16} /> Reset
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* OTHER TABS & DIALOGS (Kept EXACTLY as provided)                  */}
      {/* ============================================================== */}
      {activeTab === 'scorecard' && (
        <div className="space-y-6">
          {/* Batting Table */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-[#e0e0e0]">
            <h2 className="text-xl font-semibold mb-4">Batting</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-[#666666] border-b border-[#e0e0e0]">
                    <th className="pb-3">Batsman</th>
                    <th className="pb-3">Dismissal</th>
                    <th className="pb-3 tabular-nums">R</th>
                    <th className="pb-3 tabular-nums">B</th>
                    <th className="pb-3 tabular-nums">4s</th>
                    <th className="pb-3 tabular-nums">6s</th>
                    <th className="pb-3 tabular-nums">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {batsmen.map((batsman, index) => (
                    <tr key={index} className="border-b border-[#f0f0f0] last:border-0">
                      <td className="py-3 font-medium">{batsman.name}{batsman.name === striker ? '*' : ''}</td>
                      <td className="py-3 text-sm text-[#666666]">{batsman.isOut ? batsman.dismissal : 'not out'}</td>
                      <td className="py-3 tabular-nums font-semibold">{batsman.runs}</td>
                      <td className="py-3 tabular-nums">{batsman.balls}</td>
                      <td className="py-3 tabular-nums">{batsman.fours}</td>
                      <td className="py-3 tabular-nums">{batsman.sixes}</td>
                      <td className="py-3 tabular-nums">
                        {batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(1) : '0.0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Innings Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-[#e0e0e0]">
              <p className="text-sm text-[#666666] mb-2">Total</p>
              <p className="text-3xl font-bold tabular-nums">{score}/{wickets}</p>
              <p className="text-sm text-[#666666] mt-1">Overs {overs}.{balls}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-[#e0e0e0]">
              <p className="text-sm text-[#666666] mb-2">Extras</p>
              <p className="text-3xl font-bold tabular-nums">{/* Assuming totalExtras exists in your scope */ currentExtras}</p>
              <p className="text-sm text-[#666666] mt-1">
                NB {extras.noBalls}, WD {extras.wides}, B {extras.byes}, LB {extras.legByes}, P {extras.penalties}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-[#e0e0e0]">
              <p className="text-sm text-[#666666] mb-2">Total Wickets</p>
              <p className="text-3xl font-bold tabular-nums">{wickets}</p>
              <p className="text-sm text-[#666666] mt-1">{10 - wickets > 0 ? `${10 - wickets} wickets in hand` : 'All out'}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-[#e0e0e0]">
            <h2 className="text-xl font-semibold mb-3">Yet to Bat</h2>
            <p className="text-sm text-[#666666]">
              {/* Assuming yetToBat exists in your scope */}
              {/* {yetToBat.length > 0 ? yetToBat.join(', ') : 'All listed batters have appeared'} */}
              Batters listing
            </p>
          </div>

          {/* Bowling Table */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-[#e0e0e0]">
            <h2 className="text-xl font-semibold mb-4">Bowling</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-[#666666] border-b border-[#e0e0e0]">
                    <th className="pb-3">Bowler</th>
                    <th className="pb-3 tabular-nums">O</th>
                    <th className="pb-3 tabular-nums">M</th>
                    <th className="pb-3 tabular-nums">R</th>
                    <th className="pb-3 tabular-nums">W</th>
                    <th className="pb-3 tabular-nums">Econ</th>
                  </tr>
                </thead>
                <tbody>
                  {bowlers.map((bowler, index) => (
                    <tr key={index} className="border-b border-[#f0f0f0] last:border-0">
                      <td className="py-3 font-medium">{bowler.name}</td>
                      <td className="py-3 tabular-nums">{bowler.overs}.{bowler.balls % 6}</td>
                      <td className="py-3 tabular-nums">{bowler.maidens}</td>
                      <td className="py-3 tabular-nums">{bowler.runs}</td>
                      <td className="py-3 tabular-nums font-semibold">{bowler.wickets}</td>
                      <td className="py-3 tabular-nums">
                        {bowler.overs + (bowler.balls % 6) / 6 > 0
                          ? (bowler.runs / (bowler.overs + (bowler.balls % 6) / 6)).toFixed(2)
                          : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'commentary' && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-[#e0e0e0]">
          <h2 className="text-xl font-semibold mb-4">Ball-by-Ball Commentary</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {ballHistory.length === 0 ? (
              <p className="text-center text-[#666666] py-8">No balls recorded yet</p>
            ) : (
              ballHistory.map((ball, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    ball.wicket
                      ? 'bg-red-50 border-red-600'
                      : ball.runs >= 4
                      ? 'bg-green-50 border-green-600'
                      : 'bg-[#f9f9f9] border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#666666] bg-white px-2 py-1 rounded">
                        {ball.over}.{ball.ball}
                      </span>
                      <span className="text-sm font-medium text-[#1a1a1a]">
                        {ball.bowler} to {ball.batsman}
                      </span>
                    </div>
                    <span
                      className={`text-2xl font-bold tabular-nums ${
                        ball.wicket ? 'text-red-600' : ball.runs >= 4 ? 'text-green-600' : 'text-[#1a1a1a]'
                      }`}
                    >
                      {ball.wicket ? 'W' : ball.runs}
                    </span>
                  </div>
                  <p className="text-sm text-[#666666]">{ball.commentary}</p>
                  {ball.extraType && (
                    <span className="inline-block mt-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      {ball.extraType.toUpperCase()}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Others Dialog (7, 8, Penalty) */}
      {showOthersDialog && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowOthersDialog(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6">
            <h3 className="text-xl font-semibold mb-4">Other Runs</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  handleRunClick(7);
                  setShowOthersDialog(false);
                }}
                className="p-6 bg-purple-600 text-white rounded-xl font-bold text-2xl hover:bg-purple-700 transition-all"
              >
                7
              </button>
              <button
                onClick={() => {
                  handleRunClick(8);
                  setShowOthersDialog(false);
                }}
                className="p-6 bg-purple-600 text-white rounded-xl font-bold text-2xl hover:bg-purple-700 transition-all"
              >
                8
              </button>
              <button
                onClick={() => {
                  setCurrentExtraType('penalty');
                  setCurrentExtras(5);
                  setShowOthersDialog(false);
                }}
                className="p-6 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all"
              >
                Penalty<br/>5 Runs
              </button>
            </div>
            <button
              onClick={() => setShowOthersDialog(false)}
              className="w-full mt-4 p-3 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Wicket Dialog */}
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
                        className="w-full p-3 border border-[#e0e0e0] rounded-lg">
                        <option value="">Select Fielder (Optional)</option>
                        {fieldingRoster.map(name => (
                        <option key={name} value={name}>{name}</option>))}
                </select>
                      </div>)}

              <div>
                <label className="block text-sm font-medium mb-2">Next Batsman</label>
                <select
                    value={nextBatsman}
                        onChange={(e) => setNextBatsman(e.target.value)}
                           className="w-full p-3 border border-[#e0e0e0] rounded-lg">
                      <option value="">Select next batsman</option>
                      {battingRoster
                    .filter(name => name !== striker && name !== nonStriker && !batsmen.some(b => b.name === name && b.isOut)) 
                    .map(name => (
                        <option key={name} value={name}>{name}</option>))}
                    </select>
                  </div>

              <div className="flex gap-3 pt-4">
                <button
  onClick={() => {
    if (!selectedDismissal) {
      toast.error('Please select a dismissal type');
      return;
    }
    if (!nextBatsman) {
      toast.error('Please select the next batsman');
      return;
    }
      setShowWicketDialog(false);
      // 🔥 Your updated logic handles API inside recordBall now
      setIsWicket(true); 
      // Also remember to save your selections somewhere or let recordBall read them
      return;
      
      if (false && isConnected && session && selectedDismissal) {
      // 🔥 1. MAP SE ID NIKALEIN (Agar map mein nahi mila toh fallback ke liye name hi use karein)
      const incomingBatsmanId = session!.playerIdMap?.[nextBatsman] || nextBatsman;
      const fielderId = selectedFielder 
        ? (session!.playerIdMap?.[selectedFielder] || selectedFielder) 
        : undefined;

      // 🔥 2. API KO IDs BHEJEIN
      apiWicketWizard(matchId!, {
        innings_id: session!.inningsId,
        dismissed_player_id: session!.strikerId!, // Note: Isko bhi dynamic karna hoga baad mein
        dismissal_type: selectedDismissal as DismissalType,
        fielder_id: fielderId,
        incoming_batsman_id: incomingBatsmanId,
      })
        .then((res) => {
          syncFromInnings(res.innings);
          // Naye batsman ki ID ko session mein update karein
          session!.strikerId = incomingBatsmanId;
          if (res.innings_complete) toast.success('All out — innings complete');
        })
        .catch((err) =>
          toast.error(err?.response?.data?.error || 'Failed to record wicket')
        );
    }
    toast.success('Wicket selected');
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

      {/* Reset Confirmation Dialog */}
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

      {/* Bowler Change Dialog */}
      {showBowlerChangeDialog && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6">
            <h3 className="text-xl font-semibold mb-4">End of Over - Change Bowler</h3>
            <p className="text-sm text-[#666666] mb-4">Select the bowler for the next over</p>
            
            {/* 🔥 NEW DROPDOWN INSTEAD OF TEXT INPUT */}
            <select
              className="w-full p-3 border border-[#e0e0e0] rounded-lg mb-4 bg-white"
              value={selectedNextBowler}
              onChange={(e) => setSelectedNextBowler(e.target.value)}
            >
              <option value="">Select next bowler</option>
              {fieldingRoster
                // Puraane bowler ko hide karein (consecutive overs not allowed)
                .filter(name => name !== currentBowler)
                .map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <button
  onClick={() => {
    if (!selectedNextBowler) {
      toast.error('Please select the next bowler');
      return;
    }
    
    // Logic to track previous bowler & register the new one
    setPreviousBowler(currentBowler);
    setCurrentBowler(selectedNextBowler);
    
    // 🔥 CRITICAL FIX: Backend ke liye session ki Bowler ID update karein
    if (session) {
      const newBowlerId = session.playerIdMap?.[selectedNextBowler] || selectedNextBowler;
      session.bowlerId = newBowlerId; 
    }
    
    // Ensure the new bowler exists in stats array
    setBowlers(prev => {
      if (!prev.find(b => b.name === selectedNextBowler)) {
        return [...prev, { name: selectedNextBowler, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0 }];
      }
      return prev;
    });

    setShowBowlerChangeDialog(false);
    setSelectedNextBowler(''); // Next over ke liye state clear karein
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
