import { useEffect, useState } from 'react';
import { ArrowLeft, Swords, TrendingUp, Compass, MessageSquare, ShieldAlert, Award } from 'lucide-react';
import { api } from '../../lib/api';

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
interface Innings {
  innings_id: string;
  innings_number: number;
  batting_team_name: string;
  fielding_team_name: string;
  status: string;
  total: { runs: number; wickets: number; balls: number };
  extras: { total: number; no_balls: number; wides: number; byes: number; leg_byes: number };
  batting: BattingRow[];
  bowling: BowlingRow[];
  fall_of_wickets: FowRow[];
  yet_to_bat: string[];
}
interface Scorecard {
  match_id: string;
  status: string;
  venue: string;
  date: string;
  format: string;
  competition: string;
  team1_name: string;
  team2_name: string;
  result_summary: string | null;
  innings: Innings[];
}

const oversFromBalls = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;
const batterLabel = (b: BattingRow) =>
  `${b.name}${b.is_captain ? ' (©)' : ''}${b.is_wicket_keeper ? ' (WK)' : ''}`;

export function MatchDetail({ matchId, onNavigate }: MatchDetailProps) {
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Expanded to 6-Tab Immersive View Structure Setup
  const [activeTab, setActiveTab] = useState<'overview' | 'scorecard' | 'commentary' | 'wagon' | 'partnerships' | 'graphs'>('overview');
  const [activeInningsIndex, setActiveInningsIndex] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/api/viewer/matches/${matchId}/scorecard`)
      .then((res) => { if (!cancelled) setScorecard(res.data); })
      .catch(() => { if (!cancelled) setScorecard(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [matchId]);

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
    { id: 'wagon' as const, label: 'Wagon Wheel', icon: Compass },
    { id: 'partnerships' as const, label: 'Partnerships', icon: Swords },
    { id: 'graphs' as const, label: 'Overs Graph', icon: TrendingUp },
  ];

  const scoreFor = (teamName: string) => {
    const inn = scorecard.innings.find((i) => i.batting_team_name === teamName);
    if (!inn) return null;
    return `${inn.total.runs}/${inn.total.wickets} (${oversFromBalls(inn.total.balls)} Ov)`;
  };

  const team1Score = scoreFor(scorecard.team1_name);
  const team2Score = scoreFor(scorecard.team2_name);

  return (
    <div className="min-h-screen bg-[#f4f5f7] pb-12 font-sans antialiased text-black">
      
      {/* =========================================================================
          FRAME 1: ACTION ACTION HEADER NAVIGATION BAR
         ========================================================================= */}
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
        
        {/* =========================================================================
            FRAME 2: CORE IMMERSIVE LIVE STREAM SCORE BANNER
           ========================================================================= */}
        <div className="bg-gradient-to-br from-[#1a1c23] to-[#2d3142] rounded-2xl text-white shadow-xl overflow-hidden border border-gray-800">
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              
              {/* Team 1 Frame */}
              <div className="text-center md:text-left space-y-1 flex-1">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">{scorecard.team1_name}</h2>
                <div className="text-3xl md:text-4xl font-extrabold tracking-tighter text-gray-100">
                  {team1Score || <span className="text-gray-500 text-lg font-normal">Yet to Bat</span>}
                </div>
              </div>

              {/* VS Divider Badge */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-gray-800/80 border border-gray-700 flex items-center justify-center font-black text-xs text-red-500 shadow-inner">VS</div>
              </div>

              {/* Team 2 Frame */}
              <div className="text-center md:text-right space-y-1 flex-1">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">{scorecard.team2_name}</h2>
                <div className="text-3xl md:text-4xl font-extrabold tracking-tighter text-gray-100">
                  {team2Score || <span className="text-gray-500 text-lg font-normal">Yet to Bat</span>}
                </div>
              </div>
            </div>

            {/* Live Verdict Center Row */}
            <div className="border-t border-gray-700/50 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs md:text-sm text-gray-400">
              <p className="font-semibold text-gray-300">📍 {scorecard.venue || 'International Arena'}</p>
              <div className="bg-black/40 px-4 py-2 rounded-xl text-center font-bold text-amber-400 border border-amber-500/20 shadow-md">
                📢 {scorecard.result_summary || 'Match simulation real-time synchronization active.'}
              </div>
              <p className="font-medium">📅 {scorecard.date ? new Date(scorecard.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Live'}</p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            FRAME 3: 6-TAB MATRIX CONTROLLER
           ========================================================================= */}
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

        {/* =========================================================================
            FRAME 4: RENDERING WORKSPACE LAYOUTS (Dynamic Conditional Core)
           ========================================================================= */}
        <div className="space-y-6">
          
          {/* 1. OVERVIEW SCREEN COMPONENT */}
          {activeTab === 'overview' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Tournament Intelligence Overview</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><p className="text-gray-400 font-medium mb-0.5">Format Architecture</p><p className="font-bold text-gray-900 text-base">{scorecard.format}</p></div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><p className="text-gray-400 font-medium mb-0.5">League Competition</p><p className="font-bold text-gray-900 text-base">{scorecard.competition || 'Corporate Cup'}</p></div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><p className="text-gray-400 font-medium mb-0.5">Arena Host Venue</p><p className="font-bold text-gray-900 text-base">{scorecard.venue || '—'}</p></div>
              </div>
            </div>
          )}

          {/* 2. DYNAMIC SCORECARD SCREEN COMPONENT */}
          {activeTab === 'scorecard' && (
            <div className="space-y-6">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-400 uppercase">Total</p>
                      <p className="text-3xl font-black text-gray-900 tabular-nums">
                        {scorecard.innings[activeInningsIndex].total.runs}/{scorecard.innings[activeInningsIndex].total.wickets}
                      </p>
                      <p className="text-sm font-medium text-gray-500">
                        {oversFromBalls(scorecard.innings[activeInningsIndex].total.balls)} Overs
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-400 uppercase">Extras</p>
                      <p className="text-3xl font-black text-gray-900 tabular-nums">
                        {scorecard.innings[activeInningsIndex].extras.total}
                      </p>
                      <p className="text-sm font-medium text-gray-500">
                        NB {scorecard.innings[activeInningsIndex].extras.no_balls}, WD {scorecard.innings[activeInningsIndex].extras.wides}, B {scorecard.innings[activeInningsIndex].extras.byes}, LB {scorecard.innings[activeInningsIndex].extras.leg_byes}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <p className="text-xs font-bold text-gray-400 uppercase">Total Wickets</p>
                      <p className="text-3xl font-black text-gray-900 tabular-nums">
                        {scorecard.innings[activeInningsIndex].total.wickets}
                      </p>
                      <p className="text-sm font-medium text-gray-500">
                        {10 - scorecard.innings[activeInningsIndex].total.wickets > 0 ? `${10 - scorecard.innings[activeInningsIndex].total.wickets} wickets in hand` : 'All out'}
                      </p>
                    </div>
                  </div>

                  {/* Batting Engine Display Container */}
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

                  {/* Bowling Engine Display Container */}
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

          {/* 3. EXPERT LIVE BALL-BY-BALL COMMENTARY TIMELINE */}
          {activeTab === 'commentary' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">🎙️ Ball-by-Ball Live Commentary Stream</h3>
              <div className="space-y-4 max-w-3xl">
                <div className="flex gap-4 p-4 rounded-xl border border-red-100 bg-red-50/20">
                  <span className="font-black text-sm text-[#e60023] bg-red-100 h-fit px-2.5 py-1 rounded-md">14.6</span>
                  <div className="space-y-1"><p className="font-bold text-gray-900">FOUR! Elegant cover drive!</p><p className="text-xs md:text-sm text-gray-600">Full pitched ball outside off stump, the batter leans into the shot and strikes it through the gap between cover and extra cover for a boundary.</p></div>
                </div>
                <div className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-white">
                  <span className="font-black text-sm text-gray-600 bg-gray-100 h-fit px-2.5 py-1 rounded-md">14.5</span>
                  <div className="space-y-1"><p className="font-semibold text-gray-800">1 Run. Back of a length delivery.</p><p className="text-xs md:text-sm text-gray-500">Pushed softly down towards long-on for a quick rotation of strike.</p></div>
                </div>
                <div className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-white">
                  <span className="font-black text-sm text-white bg-black h-fit px-2.5 py-1 rounded-md">14.4</span>
                  <div className="space-y-1"><p className="font-black text-red-600">OUT! WICKET! Caught at Deep Midwicket!</p><p className="text-xs md:text-sm text-gray-500">Short ball, the batsman pulled it hard but failed to clear the boundary ropes. Safe hands out in the deep field.</p></div>
                </div>
              </div>
            </div>
          )}

          {/* 4. DESIGN FRAME: RADIAL VECTOR WAGON WHEEL METRICS */}
          {activeTab === 'wagon' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">🎯 Radial Shot Distribution Wheel</h3>
                <p className="text-sm text-gray-500">Interactive zone allocation vector showing where runs have been compiled across the field boundary coordinates.</p>
                <div className="grid grid-cols-2 gap-3 text-xs font-bold text-gray-700">
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex justify-between"><span>Off Side Cover:</span><span className="text-[#e60023]">34 Runs</span></div>
                  <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex justify-between"><span>On Side Midwicket:</span><span className="text-green-600">48 Runs</span></div>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex justify-between"><span>Straight Long On:</span><span className="text-blue-600">22 Runs</span></div>
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex justify-between"><span>Fine Leg Scope:</span><span className="text-amber-600">15 Runs</span></div>
                </div>
              </div>
              {/* SVG Graphic Implementation Mock Component */}
              <div className="flex justify-center">
                <div className="relative w-64 h-64 md:w-72 md:h-72 rounded-full border-4 border-dashed border-emerald-500/30 bg-emerald-800/10 flex items-center justify-center shadow-inner overflow-hidden">
                  <div className="absolute w-2 h-2 rounded-full bg-white z-10" />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-white/20" />
                  <div className="absolute left-0 right-0 h-0.5 bg-white/20" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest absolute bottom-4">Cricket Hub Field Canvas</span>
                </div>
              </div>
            </div>
          )}

          {/* 5. DESIGN FRAME: PROGRESSIVE PARTNERSHIP METRICS CHIPS */}
          {activeTab === 'partnerships' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">🤝 Innings Partnership Breakdown</h3>
              <div className="space-y-5 max-w-2xl">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs md:text-sm font-bold text-gray-700"><span>Virat Kohli (42)</span><span className="text-[#e60023]">84 Runs (52 Balls)</span><span>Rohit Sharma (38)</span></div>
                  <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden flex shadow-inner"><div className="bg-red-500 h-full w-[55%]" /><div className="bg-amber-400 h-full w-[45%]" /></div>
                  <p className="text-[11px] text-gray-400 font-medium text-center">1st Wicket Stand · Progressive run-rate acceleration marker</p>
                </div>
              </div>
            </div>
          )}

          {/* 6. DESIGN FRAME: DYNAMIC OVER-BY-OVER PROGRESSION RUN GRAPH */}
          {activeTab === 'graphs' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">📊 Over-by-Over Worm & Run-Rate Graph</h3>
              <p className="text-sm text-gray-500">Comparative run progression analysis matrix tracking matching milestones and fall-of-wicket intersections.</p>
              <div className="w-full bg-gray-50 border border-gray-100 rounded-xl h-64 flex items-end justify-between p-4 relative shadow-inner">
                {/* Simulated Data Bar Loops */}
                <div className="w-4 bg-[#e60023] h-[15%] rounded-t-sm" />
                <div className="w-4 bg-[#e60023] h-[35%] rounded-t-sm" />
                <div className="w-4 bg-[#e60023] h-[30%] rounded-t-sm relative"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-black text-white p-0.5 rounded font-bold">W</span></div>
                <div className="w-4 bg-[#e60023] h-[55%] rounded-t-sm" />
                <div className="w-4 bg-[#e60023] h-[70%] rounded-t-sm" />
                <div className="w-4 bg-[#e60023] h-[90%] rounded-t-sm" />
                <span className="absolute left-4 top-2 text-[10px] font-black uppercase text-gray-400 bg-white px-2 py-1 rounded border shadow-sm">Runs Stack Bar Chart</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
