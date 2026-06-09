import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Save, ArrowLeft, Undo, Redo, MoreHorizontal, RotateCcw, AlertCircle } from 'lucide-react';
import { toast } from '../../lib/toast';

// sessionStorage key for crash-recovery of an in-progress scoring session.
const SCORER_SESSION_KEY = 'scorer_session';
import {
  recordBall as apiRecordBall,
  wicketWizard as apiWicketWizard,
  undoBall as apiUndoBall,
  getLiveSession,
  toExtraType,
  type InningsState,
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

  // Players state
  const [striker, setStriker] = useState('Rohit Sharma');
  const [nonStriker, setNonStriker] = useState('Virat Kohli');
  const [currentBowler, setCurrentBowler] = useState('Jasprit Bumrah');

  // Ball history
  const [ballHistory, setBallHistory] = useState<BallEvent[]>([]);
  const [undoStack, setUndoStack] = useState<BallEvent[]>([]);

  // Batsmen data
  const [batsmen, setBatsmen] = useState<Batsman[]>([
    { name: 'Rohit Sharma', runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false },
    { name: 'Virat Kohli', runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false },
  ]);

  // Bowlers data
  const [bowlers, setBowlers] = useState<Bowler[]>([
    { name: 'Jasprit Bumrah', overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0 },
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
  const [nextBatsman, setNextBatsman] = useState('');

  // Live DB session — present when MatchSetup initialized a real innings.
  // matchId prop identifies the match; the session carries the innings + ids.
  const [session] = useState(() => getLiveSession());
  const isConnected = Boolean(session && matchId);

  // Mirror the authoritative innings state from the backend into the local
  // scoreboard so the UI reflects what was actually committed to the DB.
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

  // ── Crash guard + offline queue ──────────────────────────────────────────
  // Deliveries that failed to reach the backend (network error) are queued here
  // and replayed on the next successful request. connLostToast holds the id of
  // the non-dismissable "connection lost" banner so we can clear it on recovery.
  const pendingDeliveries = useRef<any[]>([]);
  const connLostToast = useRef<string | number | null>(null);

  // Persist a snapshot of the live scoreboard to sessionStorage so a refresh or
  // crash mid-innings can be recovered. Keyed by match id.
  const saveSession = (innings: InningsState) => {
    if (!matchId) return;
    sessionStorage.setItem(SCORER_SESSION_KEY, JSON.stringify({
      matchId,
      inningsId: session?.inningsId ?? null,
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

  // Restore a saved session for THIS match on mount; clear it on unmount.
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

  // Replay any queued deliveries in order once connectivity is back.
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
        // Still offline — requeue the rest and stop.
        if (!err?.response) { pendingDeliveries.current.push(payload); }
      }
    }
    if (pendingDeliveries.current.length === 0 && connLostToast.current != null) {
      toast.dismiss(connLostToast.current);
      connLostToast.current = null;
      toast.success('Reconnected — queued deliveries synced');
    }
  };

  // Calculate run rate
  const runRate = overs + balls / 6 > 0 ? (score / (overs + balls / 6)).toFixed(2) : '0.00';

  // Handle run scoring
  const handleRunClick = (runs: number) => {
    if (!isLive) return;
    setCurrentRuns(runs);
  };

  // Handle extras
  const handleExtraClick = (extraType: string) => {
    if (!isLive) return;
    setCurrentExtraType(currentExtraType === extraType ? null : extraType);

    if (extraType === 'wide' || extraType === 'no-ball') {
      setCurrentExtras(1); // Automatic 1 run
    } else {
      setCurrentExtras(0); // Bye/Leg-bye have no automatic run
    }
  };

  // Record the ball
  const recordBall = () => {
    if (!isLive) return;

    let totalRuns = currentRuns + currentExtras;
    const isLegalDelivery = currentExtraType !== 'wide' && currentExtraType !== 'no-ball';

    // Create ball event
    const ballEvent: BallEvent = {
      over: overs,
      ball: balls,
      runs: totalRuns,
      batsmanRuns: currentExtraType === 'bye' || currentExtraType === 'leg-bye' ? 0 : currentRuns,
      extraRuns: currentExtras,
      extraType: currentExtraType as any,
      wicket: isWicket,
      batsman: striker,
      nonStriker: nonStriker,
      bowler: currentBowler,
      commentary: generateCommentary(currentRuns, currentExtras, currentExtraType, isWicket),
      timestamp: new Date(),
    };

    // Update score
    setScore(score + totalRuns);

    // Update batsman stats
    updateBatsmanStats(striker, currentRuns, isLegalDelivery);

    // Update bowler stats
    updateBowlerStats(currentBowler, totalRuns, isWicket, isLegalDelivery);

    // Update extras
    if (currentExtraType) {
      updateExtras(currentExtraType, currentExtras + currentRuns);
    }

    // Add to history
    setBallHistory([ballEvent, ...ballHistory]);
    setUndoStack([]); // Clear redo stack

    // Progress ball if legal delivery
    if (isLegalDelivery && !isWicket) {
      progressBall();

      // Change strike on odd runs
      if (currentRuns % 2 !== 0) {
        swapStrike();
      }
    }

    // Persist to the backend when connected to a real innings. The backend is
    // the source of truth, so the local scoreboard is reconciled from its
    // response (which keeps the over/ball counters exact even under extras).
    if (isConnected && session) {
      const extraType = toExtraType(currentExtraType);
      // For byes/leg-byes the console stores the runs in currentRuns; for
      // wides the penalty is folded into currentExtras (1 + additional).
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
        is_wicket: isWicket,
        striker_id: session.strikerId,
        non_striker_id: session.nonStrikerId,
        bowler_id: session.bowlerId,
      };
      apiRecordBall(matchId!, payload)
        .then((res) => {
          syncFromInnings(res.innings);
          saveSession(res.innings);           // crash-recovery snapshot
          void flushPendingDeliveries();      // replay anything queued offline
          if (res.innings_complete) {
            clearSession();                    // innings over — discard session
            toast.success('Innings complete');
          }
        })
        .catch((err) => {
          if (!err?.response) {
            // Network error (no response) — queue locally and warn persistently.
            pendingDeliveries.current.push(payload);
            if (connLostToast.current == null) {
              connLostToast.current = toast.persist('Connection lost — deliveries queued locally');
            }
          } else {
            toast.error(err?.response?.data?.error || 'Failed to record ball');
          }
        });
    }

    // Reset current ball
    resetCurrentBall();
    toast.success('Ball recorded');
  };

  const generateCommentary = (runs: number, extraRuns: number, extraType: string | null, wicket: boolean): string => {
    if (wicket) return `${striker} is OUT!`;
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
      setShowBowlerChangeDialog(true); // End of over - change bowler
      swapStrike(); // Strike changes at end of over
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
  };

  const undoLastBall = () => {
    if (ballHistory.length === 0) return;

    const lastBall = ballHistory[0];

    // Move to undo stack
    setUndoStack([lastBall, ...undoStack]);

    // Remove from history
    setBallHistory(ballHistory.slice(1));

    // Reverse score
    setScore(score - lastBall.runs);

    // Reverse ball count
    if (balls === 0) {
      setOvers(Math.max(0, overs - 1));
      setBalls(5);
    } else {
      setBalls(balls - 1);
    }

    // Reverse the last delivery in the DB and reconcile from the restored state.
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

    // Move back to history
    setBallHistory([ballToRedo, ...ballHistory]);

    // Remove from undo stack
    setUndoStack(undoStack.slice(1));

    // Restore score
    setScore(score + ballToRedo.runs);

    // Restore ball count
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
      {activeTab === 'scoring' && (
        <div className="space-y-6">
          {/* Current Players */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-[#e0e0e0]">
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
              <button
                onClick={swapStrike}
                disabled={!isLive}
                className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Change Strike
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-[#e0e0e0]">
              <p className="text-xs text-[#666666] mb-3 uppercase tracking-wide">Current Bowler</p>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-2 border-blue-500">
                <div>
                  <span className="font-semibold text-[#1a1a1a]">{currentBowler}</span>
                  <p className="text-xs text-[#666666]">Bowling</p>
                </div>
                <span className="text-lg font-bold tabular-nums">
                  {bowlers.find(b => b.name === currentBowler)?.overs || 0}.{bowlers.find(b => b.name === currentBowler)?.balls || 0}-
                  {bowlers.find(b => b.name === currentBowler)?.runs || 0}-
                  {bowlers.find(b => b.name === currentBowler)?.wickets || 0}
                </span>
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

          {/* Scoring Buttons */}
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
            <div className="mb-6">
              <button
                onClick={() => setShowWicketDialog(true)}
                disabled={!isLive}
                className="w-full p-4 bg-red-600 text-white rounded-xl font-semibold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {isWicket ? '✓ WICKET SELECTED' : 'WICKET'}
              </button>
            </div>

            {/* Record Ball Button */}
            <div className="grid grid-cols-2 gap-3 pt-6 border-t border-[#e0e0e0]">
              <button
                onClick={recordBall}
                disabled={!isLive}
                className="p-4 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                ✓ Record Ball
              </button>
              <button
                onClick={resetCurrentBall}
                disabled={!isLive}
                className="p-4 bg-gray-600 text-white rounded-xl font-semibold text-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Clear
              </button>
            </div>

            {/* Undo/Redo/Reset */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                onClick={undoLastBall}
                disabled={!isLive || ballHistory.length === 0}
                className="p-3 bg-[#f0f0f0] text-[#1a1a1a] rounded-lg font-medium hover:bg-[#e0e0e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Undo size={18} />
                Undo
              </button>
              <button
                onClick={redoLastBall}
                disabled={!isLive || undoStack.length === 0}
                className="p-3 bg-[#f0f0f0] text-[#1a1a1a] rounded-lg font-medium hover:bg-[#e0e0e0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Redo size={18} />
                Redo
              </button>
              <button
                onClick={() => setShowResetDialog(true)}
                className="p-3 bg-[#1a1a1a] text-white rounded-lg font-medium hover:bg-[#2a2a2a] transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                Reset
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
      )}

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
                <select className="w-full p-3 border border-[#e0e0e0] rounded-lg">
                  <option>{striker}</option>
                  <option>{nonStriker}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Dismissal Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Bowled', 'LBW', 'Caught', 'Run Out', 'Stumped', 'Hit Wicket', 'Timed Out'].map(type => (
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
                  <input
                    type="text"
                    value={selectedFielder}
                    onChange={(e) => setSelectedFielder(e.target.value)}
                    placeholder="Enter fielder name"
                    className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Next Batsman</label>
                <input
                  type="text"
                  value={nextBatsman}
                  onChange={(e) => setNextBatsman(e.target.value)}
                  placeholder="Enter next batsman name"
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setIsWicket(true);
                    setWickets(wickets + 1);
                    setShowWicketDialog(false);
                    // Run the 4-step wicket pipeline against the DB when connected.
                    if (isConnected && session && selectedDismissal) {
                      apiWicketWizard(matchId!, {
                        innings_id: session.inningsId,
                        dismissed_player_id: session.strikerId!,
                        dismissal_type: selectedDismissal as DismissalType,
                        fielder_id: selectedFielder || undefined,
                        incoming_batsman_id: nextBatsman || session.nonStrikerId!,
                      })
                        .then((res) => {
                          syncFromInnings(res.innings);
                          if (res.innings_complete) toast.success('All out — innings complete');
                        })
                        .catch((err) =>
                          toast.error(err?.response?.data?.error || 'Failed to record wicket')
                        );
                    }
                    toast.success('Wicket recorded');
                  }}
                  className="flex-1 p-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
                >
                  Record Wicket
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
            <input
              type="text"
              placeholder="Enter bowler name"
              className="w-full p-3 border border-[#e0e0e0] rounded-lg mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setCurrentBowler((e.target as HTMLInputElement).value);
                  setShowBowlerChangeDialog(false);
                  toast.success('Bowler changed');
                }
              }}
            />
            <button
              onClick={() => setShowBowlerChangeDialog(false)}
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
