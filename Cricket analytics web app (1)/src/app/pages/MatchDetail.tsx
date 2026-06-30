import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Swords, TrendingUp, Compass, MessageSquare, ShieldAlert, Award, PieChart, MonitorPlay, Mic, Radio } from 'lucide-react';
import { api } from '../../lib/api';
import { buildCommentarySocketUrl, commentaryKey, getCommentaryHistory, getRealtimeCommentaryConfig } from '../../lib/commentaryApi';
import { WagonWheelTab } from '../components/WagonWheeltab';
import { CommentaryItem } from '../components/CommentaryItem'; 
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AudioCommentaryPlayer } from '../components/AudioCommentaryPlayer';

interface MatchDetailProps {
  matchId: string;
  onNavigate: (path: string) => void;
}

interface BattingRow {
  player_id: string;
  name: string;
  dismissal: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strike_rate: number;
  is_captain: boolean;
  is_wicket_keeper: boolean;
}
interface BowlingRow {
  player_id: string;
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}
interface FowRow {
  wicket_number: number;
  score_at_fall: number;
  over_at_fall: number;
  dismissed_player: string;
}
interface RecentDelivery {
  delivery_id: string;
  over_number: number;
  ball_in_over: number;
  delivery_sequence: number;
  bowler_id: string;
  batter_id: string;
  non_striker_id: string;
  delivery_type: string;
  runs_batter: number;
  runs_extras: number;
  runs_total: number;
  is_wicket: boolean;
  is_boundary_four: boolean;
  is_boundary_six: boolean;
  extra_type: string | null;
}
interface Innings {
  innings_id: string;
  innings_number: number;
  batting_team_name: string;
  fielding_team_name: string;
  status: string;
  total: { runs: number; wickets: number; balls: number };
  target_runs?: number;
  extras: { total: number; no_balls: number; wides: number; byes: number; leg_byes: number };
  batting: BattingRow[];
  bowling: BowlingRow[];
  fall_of_wickets: FowRow[];
  yet_to_bat: string[];
  recent_deliveries?: RecentDelivery[];
}
interface Scorecard {
  match_id: string;
  status: string;
  venue: string;
  date: string;
  format: string;
  total_overs?: number;
  competition: string;
  team1_name: string;
  team2_name: string;
  result_summary: string | null;
  innings: Innings[];
}

const oversFromBalls = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;
const batterLabel = (b: BattingRow) =>
  `${b.name}${b.is_captain ? ' (©)' : ''}${b.is_wicket_keeper ? ' (WK)' : ''}`;

const extraLabel = (type: string | null) => {
  const map: Record<string, string> = { wide: 'WD', no_ball: 'NB', bye: 'B', leg_bye: 'LB', penalty: 'P' };
  return type ? (map[type] || type.replace(/_/g, ' ').toUpperCase()) : 'EX';
};

const ordinal = (n: number) => { const s = ["th","st","nd","rd"]; const v = n % 100; return s[(v-20)%10]||s[v]||s[0]; };

const ballOutcome = (delivery: RecentDelivery) => {
  if (delivery.is_wicket) return 'W';
  if (delivery.is_boundary_six) return '6';
  if (delivery.is_boundary_four) return '4';
  if (delivery.runs_extras > 0) return `${delivery.runs_total}${extraLabel(delivery.extra_type)}`;
  return delivery.runs_batter === 0 ? '•' : String(delivery.runs_batter);
};

const ballOutcomeClass = (delivery: RecentDelivery) => {
  if (delivery.is_wicket) return 'bg-red-600 text-white';
  if (delivery.is_boundary_six) return 'bg-purple-600 text-white';
  if (delivery.is_boundary_four) return 'bg-green-600 text-white';
  if (delivery.runs_extras > 0) return 'bg-gray-200 text-gray-700';
  return 'bg-gray-100 text-gray-600';
};

export function MatchDetail({ matchId, onNavigate }: MatchDetailProps) {
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'scorecard' | 'commentary' | 'analytics' | 'watch_live'>('overview');
  const [activeInningsIndex, setActiveInningsIndex] = useState<number>(0);

  const [commentaryInnings, setCommentaryInnings] = useState<1 | 2>(1);
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [overs, setOvers] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeAnalyticsInnings, setActiveAnalyticsInnings] = useState<1|2>(1);
  const [commentarySort, setCommentarySort] = useState<'asc' | 'desc'>('desc');
  const [commentaryList, setCommentaryList] = useState<any[]>([]);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // 🟢 SCORECARD FETCHING (LIVE AUTO-REFRESH EVERY 5 SECONDS) 🟢
  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval>;
    
    const fetchScorecard = (isInitial = false) => {
      if (isInitial) setLoading(true);
      api
        .get(`/api/viewer/matches/${matchId}/scorecard`)
        .then((res) => { if (!cancelled) setScorecard(res.data); })
        .catch(() => { if (!cancelled) setScorecard(null); })
        .finally(() => { if (!cancelled && isInitial) setLoading(false); });
    };

    // First fetch immediately
    fetchScorecard(true);

    // Fetch silently every 5 seconds (5000ms)
    intervalId = setInterval(() => fetchScorecard(false), 5000);

    return () => { 
      cancelled = true; 
      clearInterval(intervalId);
    };
  }, [matchId]);

  // 🟢 ANALYTICS FETCHING (LIVE AUTO-REFRESH EVERY 10 SECONDS) 🟢
  useEffect(() => {
    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval>;
    
    const fetchAnalytics = (isInitial = false) => {
      if (isInitial) setAnalyticsLoading(true);
      
      Promise.all([
        api.get(`/api/viewer/matches/${matchId}/partnerships`),
        api.get(`/api/viewer/matches/${matchId}/overs`)
      ])
      .then(([partnershipsRes, oversRes]) => {
        if (isMounted) {
          setPartnerships(partnershipsRes.data.partnerships || []);
          setOvers(oversRes.data.overs || []);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch analytics data:", err);
      })
      .finally(() => {
        if (isMounted && isInitial) setAnalyticsLoading(false);
      });
    };

    if (activeTab === 'analytics') {
      fetchAnalytics(true);
      // Fetch silently every 10 seconds (10000ms)
      intervalId = setInterval(() => fetchAnalytics(false), 10000);
    }

    return () => { 
      isMounted = false; 
      if (intervalId) clearInterval(intervalId);
    };
  }, [matchId, activeTab]);

  // Commentary WebSockets
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isMounted = true;
    let fallbackIntervalId: ReturnType<typeof setInterval>;

    const setupLiveCommentary = async () => {
      if (activeTab === 'commentary') {
        const fetchHistory = () => {
          getCommentaryHistory(matchId, commentaryInnings)
            .then(fetchedData => {
              if (!isMounted) return;
              // Only update if websocket is not connected (Fallback mode)
              if (!isWsConnected) setCommentaryList(fetchedData);
            })
            .catch(err => {
              console.error("Failed to load commentary history", err);
            });
        };

        // Initial fetch
        fetchHistory();
        
        // 🟢 Fallback Polling every 5 seconds for Commentary (if WebSocket fails)
        fallbackIntervalId = setInterval(fetchHistory, 5000);

        try {
          const realtime = await getRealtimeCommentaryConfig();
          if (!isMounted || !realtime.enabled || !realtime.realtimeUrl || !realtime.token) return;

          const WS_URL = buildCommentarySocketUrl(realtime.realtimeUrl, matchId, realtime.token);
          ws = new WebSocket(WS_URL);
          wsRef.current = ws;

          ws.onopen = () => { if (isMounted) setIsWsConnected(true); };
          
          ws.onmessage = (event) => {
            try {
              const payload = JSON.parse(event.data);
              const newCommentary = payload.data ? payload.data : payload;

              setCommentaryList(prev => {
                const safePrev = Array.isArray(prev) ? prev : [];
                if (safePrev.some(c => commentaryKey(c, -1) === commentaryKey(newCommentary, -2))) {
                  return safePrev;
                }
                return [newCommentary, ...safePrev];
              });
            } catch (e) {
              console.error("Failed to parse websocket message", e);
            }
          };

          ws.onclose = () => { if (isMounted) setIsWsConnected(false); };

        } catch (error) {
          console.error("❌ Failed to authenticate realtime stream", error);
        }
      }
    };

    setupLiveCommentary();

    return () => {
      isMounted = false;
      if (ws) ws.close();
      if (fallbackIntervalId) clearInterval(fallbackIntervalId);
    };
  }, [activeTab, matchId, commentaryInnings, isWsConnected]);

  if (loading) {
    return <div className="p-6 max-w-7xl mx-auto"><div className="animate-pulse space-y-4"><div className="h-32 bg-gray-200 rounded-xl" /><div className="h-12 bg-gray-200 rounded-lg" /><div className="h-64 bg-gray-200 rounded-xl" /></div></div>;
  }

  if (!scorecard) {
    return (
      <div className="p-6 max-w-md mx-auto text-center mt-12 bg-white rounded-xl border border-gray-200 shadow-sm space-y-4">
        <ShieldAlert size={48} className="mx-auto text-gray-400" />
        <h3 className="text-lg font-bold text-gray-900">Match Node Offline</h3>
        <p className="text-sm text-gray-500">The metric payloads for match target "{matchId}" could not be parsed.</p>
        <button onClick={() => onNavigate('/matches')} className="px-4 py-2 bg-[#e60023] text-white rounded-lg text-sm font-semibold">Return to Feed</button>
      </div>
    );
  }

  const immersiveTabs = [
    { id: 'overview' as const, label: 'Overview', icon: Award },
    { id: 'scorecard' as const, label: 'Scorecard', icon: Swords },
    { id: 'commentary' as const, label: 'Commentary', icon: MessageSquare },
    { id: 'analytics' as const, label: 'Analytics', icon: PieChart },
    { id: 'watch_live' as const, label: 'Watch Live', icon: MonitorPlay },
  ];

  const scoreFor = (teamName: string, expectedInningsIndex: number) => {
    let inn = scorecard.innings.find((i) => i.batting_team_name === teamName);
    if (!inn && scorecard.innings[expectedInningsIndex]) {
      inn = scorecard.innings[expectedInningsIndex];
    }
    if (!inn) return null;
    return `${inn.total.runs}/${inn.total.wickets} (${oversFromBalls(inn.total.balls)} Ov)`;
  };

  const team1Score = scoreFor(scorecard.team1_name, 0);
  const team2Score = scoreFor(scorecard.team2_name, 1);
  
  const liveInnings = scorecard.innings.find((inn) => inn.status === 'in_progress') || scorecard.innings[scorecard.innings.length - 1] || null;
  const firstInnings = scorecard.innings.find((inn) => inn.innings_number === 1);
  const recentDeliveries = liveInnings?.recent_deliveries ?? [];
  const latestDelivery = recentDeliveries[recentDeliveries.length - 1];
  const currentBatters = liveInnings?.batting.filter((b) => b.dismissal === 'not out').slice(0, 2) ?? [];
  const recentBowlerIds = Array.from(new Set([...recentDeliveries].reverse().map((d) => d.bowler_id).filter(Boolean)));
  const currentBowlers = recentBowlerIds
    .slice(0, 2)
    .map((bowlerId) => liveInnings?.bowling.find((b) => b.player_id === bowlerId))
    .filter(Boolean) as BowlingRow[];
  const targetRuns = liveInnings && liveInnings.innings_number > 1
    ? (liveInnings.target_runs || ((firstInnings?.total.runs ?? 0) + 1))
    : 0;
  const ballsRemaining = liveInnings && scorecard.total_overs
    ? Math.max((scorecard.total_overs * 6) - liveInnings.total.balls, 0)
    : 0;
  const runsNeeded = targetRuns ? Math.max(targetRuns - (liveInnings?.total.runs ?? 0), 0) : 0;

  return (
    <div className="min-h-screen bg-[#f4f5f7] pb-12 font-sans antialiased text-black">
      
      <div className="sticky top-0 bg-white border-b border-gray-200 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/matches')}
            className="flex items-center gap-2 text-gray-600 hover:text-[#e60023] transition-colors font-semibold text-sm"
          >
            <ArrowLeft size={18} />
            <span>Back to Matches</span>
          </button>
          <span className="text-xs font-bold uppercase tracking-wider bg-red-100 text-[#e60023] px-3 py-1 rounded-full animate-pulse border border-red-200">
            {scorecard.status}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-4 space-y-4">
        
        <div className="bg-gradient-to-br from-[#1a1c23] to-[#2d3142] rounded-2xl text-white shadow-xl overflow-hidden border border-gray-800">
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left space-y-1 flex-1">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">{scorecard.team1_name}</h2>
                <div className="text-3xl md:text-4xl font-extrabold tracking-tighter text-gray-100">
                  {team1Score || <span className="text-gray-500 text-lg font-normal">Yet to Bat</span>}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-gray-800/80 border border-gray-700 flex items-center justify-center font-black text-xs text-red-500 shadow-inner">VS</div>
              </div>
              <div className="text-center md:text-right space-y-1 flex-1">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">{scorecard.team2_name}</h2>
                <div className="text-3xl md:text-4xl font-extrabold tracking-tighter text-gray-100">
                  {team2Score || <span className="text-gray-500 text-lg font-normal">Yet to Bat</span>}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700/50 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs md:text-sm text-gray-400">
              <p className="font-semibold text-gray-300">📍 {scorecard.venue || 'International Arena'}</p>
              <div className="bg-black/40 px-4 py-2 rounded-xl text-center font-bold text-amber-400 border border-amber-500/20 shadow-md">
                📢 {scorecard.result_summary || 'Match simulation real-time synchronization active.'}
              </div>
              <p className="font-medium">📅 {scorecard.date ? new Date(scorecard.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Live'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-none border-b border-gray-100 bg-gray-50/50">
            {immersiveTabs.map((tab) => {
              const Icon = tab.icon;
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[120px] py-3.5 px-3 text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 border-b-2 whitespace-nowrap ${
                    isTabActive 
                      ? 'border-[#e60023] text-[#e60023] bg-white shadow-sm' 
                      : 'border-transparent text-gray-500 hover:text-black hover:bg-gray-100/50'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <AudioCommentaryPlayer matchId={matchId} />

        <div className="space-y-6">
          
          {activeTab === 'overview' && liveInnings && (
            <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b border-gray-100 pb-3">
                <div>
                  <p className="text-[11px] font-black text-[#e60023] uppercase tracking-widest">Live Match Summary</p>
                  <h3 className="text-lg font-black text-gray-900">{liveInnings.batting_team_name}</h3>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl md:text-3xl font-black text-gray-900 tabular-nums">
                    {liveInnings.total.runs}/{liveInnings.total.wickets}
                  </p>
                  <p className="text-xs font-bold text-gray-500">
                    {oversFromBalls(liveInnings.total.balls)} Ov | Extras: {liveInnings.extras.total} (NB {liveInnings.extras.no_balls}, WD {liveInnings.extras.wides})
                  </p>
                </div>
              </div>

              {targetRuns > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-black text-amber-900">
                  Target: {targetRuns} | {liveInnings.batting_team_name} needs {runsNeeded} runs from {ballsRemaining} balls
                </div>
              )}

              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                      <tr>
                        <th className="p-3 text-left">Batters</th>
                        <th className="p-3 text-center">R</th>
                        <th className="p-3 text-center">B</th>
                        <th className="p-3 text-center">4s</th>
                        <th className="p-3 text-center">6s</th>
                        <th className="p-3 text-center">SR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(currentBatters.length ? currentBatters : liveInnings.batting.slice(0, 2)).map((b, index) => (
                        <tr key={b.player_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="p-3 font-black text-gray-900">{b.name}{latestDelivery?.batter_id === b.player_id ? '*' : ''}</td>
                          <td className="p-3 text-center font-black text-[#e60023]">{b.runs}</td>
                          <td className="p-3 text-center font-semibold text-gray-600">{b.balls}</td>
                          <td className="p-3 text-center text-gray-600">{b.fours}</td>
                          <td className="p-3 text-center text-gray-600">{b.sixes}</td>
                          <td className="p-3 text-center font-semibold text-gray-700">{b.strike_rate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
                      <tr>
                        <th className="p-3 text-left">Bowlers</th>
                        <th className="p-3 text-center">O</th>
                        <th className="p-3 text-center">M</th>
                        <th className="p-3 text-center">R</th>
                        <th className="p-3 text-center">W</th>
                        <th className="p-3 text-center">Econ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(currentBowlers.length ? currentBowlers : liveInnings.bowling.slice(0, 2)).map((b, index) => (
                        <tr key={b.player_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="p-3 font-black text-gray-900">{b.name}</td>
                          <td className="p-3 text-center font-semibold text-gray-700">{b.overs}</td>
                          <td className="p-3 text-center text-gray-600">{b.maidens}</td>
                          <td className="p-3 text-center text-gray-600">{b.runs}</td>
                          <td className="p-3 text-center font-black text-green-600">{b.wickets}</td>
                          <td className="p-3 text-center font-semibold text-gray-700">{b.economy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wide text-gray-500">Recent Balls</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {recentDeliveries.length === 0 ? (
                    <span className="text-xs font-bold text-gray-400">No deliveries recorded yet.</span>
                  ) : recentDeliveries.map((delivery, index) => {
                    const previous = recentDeliveries[index - 1];
                    const showOverLabel = !previous || previous.over_number !== delivery.over_number;
                    const overRuns = recentDeliveries
                      .filter((item) => item.over_number === delivery.over_number)
                      .reduce((sum, item) => sum + item.runs_total, 0);
                    return (
                      <div key={delivery.delivery_id} className="flex items-center gap-2">
                        {showOverLabel && (
                          <span className="shrink-0 text-[10px] font-black text-gray-400 uppercase tracking-wide border-l border-gray-300 pl-2">
                            Over {delivery.over_number} | {overRuns} runs
                          </span>
                        )}
                        <span className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-black tabular-nums ${ballOutcomeClass(delivery)}`}>
                          {ballOutcome(delivery)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scorecard' && (
            <div className="space-y-6 animate-fadeIn">
              {scorecard.innings.length > 1 && (
                <div className="flex gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm w-fit">
                  {scorecard.innings.map((inn, idx) => (
                    <button
                      key={inn.innings_id}
                      onClick={() => setActiveInningsIndex(idx)}
                      className={`px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
                        activeInningsIndex === idx ? 'bg-[#e60023] text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {inn.batting_team_name}
                    </button>
                  ))}
                </div>
              )}

              {scorecard.innings[activeInningsIndex] ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 shadow-sm overflow-hidden">
                    <h4 className="text-base md:text-lg font-black text-gray-900 mb-4 flex items-center gap-2">🏏 {scorecard.innings[activeInningsIndex].batting_team_name} Batting Lineup</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-400 text-left font-bold bg-gray-50/50 rounded-lg">
                            <th className="p-3">Batsman</th>
                            <th className="p-3">Status/Dismissal</th>
                            <th className="p-3 text-center">R</th>
                            <th className="p-3 text-center">B</th>
                            <th className="p-3 text-center">4s</th>
                            <th className="p-3 text-center">6s</th>
                            <th className="p-3 text-center">S/R</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {scorecard.innings[activeInningsIndex].batting.map((b) => (
                            <tr key={b.player_id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-3 font-bold text-gray-900">{batterLabel(b)}</td>
                              <td className="p-3 text-xs text-gray-500 italic font-medium">{b.dismissal}</td>
                              <td className="p-3 text-center font-black text-[#e60023] text-base">{b.runs}</td>
                              <td className="p-3 text-center font-medium text-gray-600">{b.balls}</td>
                              <td className="p-3 text-center text-gray-500">{b.fours}</td>
                              <td className="p-3 text-center text-gray-500">{b.sixes}</td>
                              <td className="p-3 text-center font-semibold text-gray-600">{b.strike_rate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 shadow-sm">
                    <h4 className="text-base md:text-lg font-black text-gray-900 mb-2">Yet to Bat</h4>
                    <p className="text-sm font-medium text-gray-600">
                      {scorecard.innings[activeInningsIndex].yet_to_bat.length > 0
                        ? scorecard.innings[activeInningsIndex].yet_to_bat.join(', ')
                        : 'All listed batters have appeared'}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 shadow-sm overflow-hidden">
                    <h4 className="text-base md:text-lg font-black text-gray-900 mb-4 flex items-center gap-2">🥎 {scorecard.innings[activeInningsIndex].fielding_team_name} Bowling Spell</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-400 text-left font-bold bg-gray-50/50">
                            <th className="p-3">Bowler</th>
                            <th className="p-3 text-center">Overs</th>
                            <th className="p-3 text-center">Maidens</th>
                            <th className="p-3 text-center">Runs</th>
                            <th className="p-3 text-center">Wickets</th>
                            <th className="p-3 text-center">Econ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {scorecard.innings[activeInningsIndex].bowling.map((b) => (
                            <tr key={b.player_id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-3 font-bold text-gray-900">{b.name}</td>
                              <td className="p-3 text-center font-semibold text-gray-700">{b.overs}</td>
                              <td className="p-3 text-center text-gray-500">{b.maidens}</td>
                              <td className="p-3 text-center text-gray-600">{b.runs}</td>
                              <td className="p-3 text-center font-black text-green-600 text-base">{b.wickets}</td>
                              <td className="p-3 text-center font-medium text-gray-600">{b.economy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-6 border text-center text-gray-500">No layout dataset loaded for selected index row.</div>
              )}
            </div>
          )}

          {activeTab === 'commentary' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between shrink-0 -mt-2 -mx-2 mb-0 p-2 bg-gray-50 dark:bg-gray-900 rounded-t-xl border-b border-gray-200">
                <div className="flex gap-1 p-1 bg-gray-200 dark:bg-gray-800 rounded-md">
                  <button
                    onClick={() => setCommentaryInnings(1)}
                    className={`px-3 py-1 text-xs font-bold rounded ${commentaryInnings === 1 ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
                  >
                    1st Innings
                  </button>
                  <button
                    onClick={() => setCommentaryInnings(2)}
                    disabled={scorecard.innings.length < 2}
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
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  🎙️ Live AI Commentary Stream
                </h3>
                {isWsConnected ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Live
                  </span>
                ) : (
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                    Connecting...
                  </span>
                )}
              </div>

              <div className="space-y-4 w-full">
                {!Array.isArray(commentaryList) || commentaryList.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">Waiting for commentary updates...</p>
                ) : (
                  [...commentaryList]
                    .filter(c => c && c.is_visible !== false && c.innings_number === commentaryInnings)
                    .sort((a, b) => {
                      const overA = a.over !== undefined ? a.over : (a.over_number !== undefined ? a.over_number : 0);
                      const ballA = a.ball !== undefined ? a.ball : (a.ball_number !== undefined ? a.ball_number : 0);
                      const overB = b.over !== undefined ? b.over : (b.over_number !== undefined ? b.over_number : 0);
                      const ballB = b.ball !== undefined ? b.ball : (b.ball_number !== undefined ? b.ball_number : 0);
                      
                      if (commentarySort === 'asc') return overA !== overB ? overA - overB : ballA - ballB;
                      
                      if (overA !== overB) return overB - overA; 
                      return ballB - ballA; 
                    })
                    .map((item, index) => {
                      const taskStr = typeof item.task === 'string' ? item.task : '';
                      const isWicket = taskStr.includes('wicket') || item.is_wicket;
                      const isBoundary = taskStr.includes('boundary') || (item.runs !== undefined && item.runs >= 4);
                      
                      const uniqueKey = commentaryKey(item, index);
                      
                      const overVal = item.over !== undefined ? item.over : (item.over_number !== undefined ? item.over_number : 0);
                      const ballVal = item.ball !== undefined ? item.ball : (item.ball_number !== undefined ? item.ball_number : 0);
                      const displayOver = `Over ${overVal}.${ballVal}`;

                      return (
                        <div key={uniqueKey} className="relative">
                          <CommentaryItem
                            overNumber={displayOver}
                            bowler={item.bowler_name || item.bowler || 'Bowler'}
                            batter={item.batter_name || item.batter || 'Batter'}
                            runs={item.runs !== undefined ? item.runs : (item.runs_scored || 0)}
                            text={item.output || 'No commentary available'}
                            audioUrl={item.audio_url || item.audioUrl} 
                            isWicket={isWicket}
                            isBoundary={isBoundary}
                          />

                          <div className="absolute bottom-2 right-4 flex gap-2">
                            <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold bg-white/80 px-1 rounded">
                              Src: {item.source || 'AI'}
                            </span>
                            {item.is_manual_override && (
                              <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 rounded font-bold">
                                Manual Edit
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-fadeIn">
              <WagonWheelTab matchId={matchId} />

              {analyticsLoading ? (
                <div className="text-center py-6 text-gray-500 font-medium">Loading analytics...</div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveAnalyticsInnings(1)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeAnalyticsInnings === 1 ? "bg-[#e60023] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>Innings 1</button>
                    <button onClick={() => setActiveAnalyticsInnings(2)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeAnalyticsInnings === 2 ? "bg-[#e60023] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>Innings 2</button>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
                    <h3 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">🤝 Partnership Breakdown</h3>
                    {(() => {
                      const flt = partnerships.filter(p => Number(p.innings_number) === activeAnalyticsInnings);
                      if (flt.length === 0) return <p className='text-sm text-gray-400'>No partnership data for this innings.</p>;
                      const mx = Math.max(...flt.map(x => x.runs), 1);
                      return (
                        <div className='space-y-4 max-w-2xl'>
                          {flt.map((p, i) => (
                            <div key={p.partnerships_id || i} className='space-y-2'>
                              <div className='flex justify-between text-xs md:text-sm font-bold text-gray-700'>
                                <span>{p.batsmen}</span>
                                <span className='text-[#e60023]'>{p.runs} runs ({p.balls} balls)</span>
                              </div>
                              <div className='w-full bg-gray-100 h-3 rounded-full overflow-hidden flex shadow-inner'>
                                <div className='bg-red-500 h-full' style={{ width: Math.min(100, Math.round((p.runs / mx) * 100)) + '%' }} />
                              </div>
                              <p className='text-[11px] text-gray-400 font-medium text-center'>
                                {p.wicket_number}{ordinal(p.wicket_number)} Wicket Stand &middot; {p.batter1_runs}({p.batter1_balls}) &middot; {p.batter2_runs}({p.batter2_balls})</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">📈 Over-by-Over Run Rate</h3>
                    <p className="text-sm text-gray-500">Run rate progression across the innings</p>
                    {(() => {
                      const flt = overs.filter(o => Number(o.innings_number) === activeAnalyticsInnings);
                      if (flt.length === 0) return <p className='text-sm text-gray-400'>No over data for this innings.</p>;
                      const ch = flt.map(o => ({ over: o.over_number, runs: o.runs_scored, cumulative: o.cumulative_runs, runRate: Number(o.run_rate) }));
                      return (
                        <ResponsiveContainer width='100%' height={300}>
                          <LineChart data={ch}>
                            <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                            <XAxis dataKey='over' stroke='#6b7280' label={{ value: 'Over', position: 'insideBottom', offset: -5 }} />
                            <YAxis yAxisId='l' stroke='#6b7280' label={{ value: 'Runs', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                            <YAxis yAxisId='r' orientation='right' stroke='#e60023' label={{ value: 'Run Rate', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: '#e60023' } }} />
                            <Tooltip />
                            <Line yAxisId='l' type='monotone' dataKey='cumulative' stroke='#2563eb' strokeWidth={2} name='Cumulative Runs' dot={false} />
                            <Line yAxisId='l' type='monotone' dataKey='runs' stroke='#10b981' strokeWidth={2} name='Runs in Over' />
                            <Line yAxisId='r' type='monotone' dataKey='runRate' stroke='#e60023' strokeWidth={2} name='Run Rate' dot={false} strokeDasharray='4 4' />
                          </LineChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'watch_live' && (
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-200 animate-fadeIn space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <MonitorPlay className="text-[#e60023]" size={20} />
                  Live Broadcast
                </h3>
                <span className="flex items-center gap-2 bg-red-50 text-[#e60023] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-[#e60023] animate-pulse"></span>
                  Live Synchronized
                </span>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-grow bg-black rounded-2xl overflow-hidden shadow-inner relative border border-gray-800">
                  <video controls autoPlay muted className="w-full h-full aspect-video object-cover">
                    <source src="https://storage.googleapis.com/YOUR_BUCKET_NAME/live_match_feed.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute top-4 right-4 bg-red-600/90 text-white text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm">
                    <Radio size={12} /> LIVE FEED
                  </div>
                </div>

                <div className="w-full lg:w-80 flex flex-col gap-4">
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 flex flex-col h-full shadow-sm">
                    <div className="flex items-center gap-3 mb-4 border-b border-gray-200 pb-3">
                      <div className="p-2.5 bg-red-100 rounded-xl">
                        <Mic size={20} className="text-[#e60023]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">AI Audio Commentary</h4>
                        <p className="text-xs text-gray-500 font-medium">Real-time generated voice</p>
                      </div>
                    </div>

                    <div className="flex-grow flex items-center justify-center py-6">
                      <div className="flex items-end gap-1.5 h-12 w-full justify-center opacity-70">
                        {[...Array(12)].map((_, i) => (
                          <div key={i} className="w-2 bg-[#e60023] rounded-t-sm animate-pulse" style={{ height: `${Math.max(20, Math.random() * 100)}%`, animationDelay: `${i * 0.1}s` }}></div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-auto pt-4">
                      <audio controls className="w-full h-10 outline-none">
                        <source src="https://storage.googleapis.com/YOUR_BUCKET_NAME/ai_commentary.mp3" type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                     <p className="text-xs text-blue-800 font-medium italic leading-relaxed">
                       "The AI engine is currently synthesizing match events into dynamic audio. Make sure your volume is turned up to experience the broadcast."
                     </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}