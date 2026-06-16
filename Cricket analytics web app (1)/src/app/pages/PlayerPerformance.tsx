import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Trophy, Target, Loader2 } from 'lucide-react';
import { getMyPerformances } from '../../lib/analyticsApi';

export function PlayerPerformance() {
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling'>('batting');
  const [loading, setLoading] = useState(true);

  // Core Aggregates
  const [battingStats, setBattingStats] = useState({
    totalRuns: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, twoHundreds: 0,
    strikeRate: 0, average: 0, ballsFaced: 0, matches: 0,
  });
  const [bowlingStats, setBowlingStats] = useState({
    totalOvers: '0.0', maidens: 0, wickets: 0, dotBalls: 0, economyRate: 0,
    average: 0, threeWickets: 0, fiveWickets: 0, tenWickets: 0, matches: 0,
  });

  // Dynamic Chart Arrays straight from Database Feed
  const [runsTrajectory, setRunsTrajectory] = useState<any[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);
  const [dismissalTypes, setDismissalTypes] = useState<any[]>([]);
  const [spellLengths, setSpellLengths] = useState<any[]>([]);
  const [economyStability, setEconomyStability] = useState<any[]>([]);
  const [bowlingPhases, setBowlingPhases] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    getMyPerformances()
      .then((data: any) => {
        // 🔥 FIXED: Explicitly casting data nodes to 'any' to smash TS2339 compiler blocks
        const b = (data?.batting || {}) as any;
        const w = (data?.bowling || {}) as any;
        
        // 1. Set Batting Core Stats
        setBattingStats({
          totalRuns: b.total_runs || 0, fours: b.fours || 0, sixes: b.sixes || 0, fifties: b.fifties || 0,
          hundreds: b.hundreds || 0, twoHundreds: b.double_hundreds || 0, strikeRate: b.strike_rate || 0,
          average: b.batting_average || 0, ballsFaced: b.balls_faced || 0, matches: b.matches_played || 0,
        });

        // 2. Set Bowling Core Stats
        setBowlingStats({
          totalOvers: w.overs_bowled || '0.0', maidens: w.maidens || 0, wickets: w.wickets || 0,
          dotBalls: w.dot_balls || 0, economyRate: w.economy_rate || 0, average: w.bowling_average || 0,
          threeWickets: w.three_fers || 0, fiveWickets: w.five_fers || 0, tenWickets: w.ten_fers || 0,
          matches: w.matches_bowled || 0,
        });

        // ─── DYNAMIC BATTING VISUALIZATIONS ───
        if (b.match_history && b.match_history.length > 0) {
          setRunsTrajectory(b.match_history.map((m: any, i: number) => ({
            match: m.match_name || `Match ${i + 1}`,
            runs: m.runs_scored || 0,
            average: m.running_average || b.batting_average || 0
          })));
        }

        if (b.score_ranges) {
          setScoreDistribution([
            { range: '0-20', count: b.score_ranges.single_digits || 0 },
            { range: '21-50', count: b.score_ranges.twenties_to_forties || 0 },
            { range: '51-100', count: b.score_ranges.fifties_plus || 0 },
            { range: '100+', count: b.score_ranges.centuries || 0 },
          ]);
        }

        if (b.dismissal_breakdown) {
          const colors = ['#e60023', '#ff758f', '#c41e3a', '#666666', '#999999'];
          setDismissalTypes(b.dismissal_breakdown.map((d: any, index: number) => ({
            name: d.dismissal_type || 'Unknown',
            value: d.count || 0,
            color: colors[index % colors.length]
          })));
        }

        // ─── DYNAMIC BOWLING VISUALIZATIONS ───
        if (w.match_history && w.match_history.length > 0) {
          setSpellLengths(w.match_history.map((m: any, i: number) => ({
            match: m.match_name || `Match ${i + 1}`,
            overs: parseFloat(m.overs_bowled || 0),
            wickets: m.wickets_taken || 0
          })));

          setEconomyStability(w.match_history.map((m: any, i: number) => ({
            match: m.match_name || `Match ${i + 1}`,
            economy: parseFloat(m.match_economy || 0)
          })));
        }

        if (w.phases_data) {
          setBowlingPhases([
            { phase: 'Powerplay', economy: w.phases_data.powerplay_economy || 0, wickets: w.phases_data.powerplay_wickets || 0 },
            { phase: 'Middle', economy: w.phases_data.middle_economy || 0, wickets: w.phases_data.middle_wickets || 0 },
            { phase: 'Death', economy: w.phases_data.death_economy || 0, wickets: w.phases_data.death_wickets || 0 },
          ]);
        }
      })
      .catch((err) => {
        console.error('Error loading dynamic database telemetry feed:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center gap-2 text-gray-500 font-medium">
        <Loader2 className="animate-spin text-[#e60023]" size={32} />
        Compiling real-time performance analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#e60023] to-[#c41e3a] rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">My Performances</h1>
        <p className="text-white/90">Track your cricket journey and milestones</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab('batting')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
            activeTab === 'batting'
              ? 'bg-[#e60023] text-white shadow-lg'
              : 'bg-white text-[#666666] border border-[#e0e0e0] hover:border-[#e60023]'
          }`}
        >
          Batting Performance
        </button>
        <button
          onClick={() => setActiveTab('bowling')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
            activeTab === 'bowling'
              ? 'bg-[#e60023] text-white shadow-lg'
              : 'bg-white text-[#666666] border border-[#e0e0e0] hover:border-[#e60023]'
          }`}
        >
          Bowling Performance
        </button>
      </div>

      {/* Batting Tab */}
      {activeTab === 'batting' && (
        <div className="space-y-6">
          {/* Key Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="text-[#e60023]" size={20} />
                <p className="text-sm text-[#666666]">Total Runs</p>
              </div>
              <p className="text-3xl font-bold text-[#1a1a1a]">{battingStats.totalRuns}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
              <div className="flex items-center gap-2 mb-2">
                <Target className="text-[#e60023]" size={20} />
                <p className="text-sm text-[#666666]">Strike Rate</p>
              </div>
              <p className="text-3xl font-bold text-[#1a1a1a]">{battingStats.strikeRate}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-[#e60023]" size={20} />
                <p className="text-sm text-[#666666]">Average</p>
              </div>
              <p className="text-3xl font-bold text-[#1a1a1a]">{battingStats.average}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
              <p className="text-sm text-[#666666] mb-2">Balls Faced</p>
              <p className="text-3xl font-bold text-[#1a1a1a]">{battingStats.ballsFaced}</p>
            </div>
          </div>

          {/* Milestones */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Career Milestones</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#e60023]">{battingStats.fours}</p>
                <p className="text-sm text-[#666666] mt-1">Fours</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#e60023]">{battingStats.sixes}</p>
                <p className="text-sm text-[#666666] mt-1">Sixes</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#e60023]">{battingStats.fifties}</p>
                <p className="text-sm text-[#666666] mt-1">50s</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#e60023]">{battingStats.hundreds}</p>
                <p className="text-sm text-[#666666] mt-1">100s</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#e60023]">{battingStats.twoHundreds}</p>
                <p className="text-sm text-[#666666] mt-1">200s</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#e60023]">{battingStats.matches}</p>
                <p className="text-sm text-[#666666] mt-1">Matches</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Run Trajectory */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Run Scoring Trajectory (Last 10 Matches)</h3>
              {runsTrajectory.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={runsTrajectory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="match" stroke="#666666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666666" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="runs" name="Runs Scored" stroke="#e60023" strokeWidth={2} dot={{ fill: '#e60023', r: 4 }} />
                    <Line type="monotone" dataKey="average" name="Moving Average" stroke="#666666" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm font-semibold text-gray-400 bg-gray-50 rounded-lg">No batting telemetry records found.</div>
              )}
            </div>

            {/* Score Distribution */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Score Distribution</h3>
              {scoreDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="range" stroke="#666666" />
                    <YAxis stroke="#666666" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Innings" fill="#e60023" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm font-semibold text-gray-400 bg-gray-50 rounded-lg">No innings distribution logs.</div>
              )}
            </div>

            {/* Dismissal Types */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Dismissal Pattern Analysis</h3>
              {dismissalTypes.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={dismissalTypes} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {dismissalTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm font-semibold text-gray-400 bg-gray-50 rounded-lg">No out types metrics cached.</div>
              )}
            </div>

            {/* Wagon Wheel Placeholder */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Wagon Wheel Summary</h3>
              <div className="flex items-center justify-center h-[280px]">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full border-4 border-[#e60023] flex items-center justify-center mb-4 mx-auto">
                    <div className="text-center">
                      <p className="text-sm text-[#666666]">Scoring Zones</p>
                      <p className="text-2xl font-bold text-[#e60023]">360°</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#666666]">Live match telemetry synced</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bowling Tab */}
      {activeTab === 'bowling' && (
        <div className="space-y-6">
          {/* Key Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="text-[#e60023]" size={20} />
                <p className="text-sm text-[#666666]">Total Wickets</p>
              </div>
              <p className="text-3xl font-bold text-[#1a1a1a]">{bowlingStats.wickets}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="text-[#e60023]" size={20} />
                <p className="text-sm text-[#666666]">Economy Rate</p>
              </div>
              <p className="text-3xl font-bold text-[#1a1a1a]">{bowlingStats.economyRate}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
              <div className="flex items-center gap-2 mb-2">
                <Target className="text-[#e60023]" size={20} />
                <p className="text-sm text-[#666666]">Average</p>
              </div>
              <p className="text-3xl font-bold text-[#1a1a1a]">{bowlingStats.average}</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#e0e0e0]">
              <p className="text-sm text-[#666666] mb-2">Dot Balls</p>
              <p className="text-3xl font-bold text-[#1a1a1a]">{bowlingStats.dotBalls}</p>
            </div>
          </div>

          {/* Milestones */}
          <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Bowling Milestones</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#e60023]">{bowlingStats.totalOvers}</p>
                <p className="text-sm text-[#666666] mt-1">Total Overs</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#e60023]">{bowlingStats.maidens}</p>
                <p className="text-sm text-[#666666] mt-1">Maidens</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#e60023]">{bowlingStats.threeWickets}</p>
                <p className="text-sm text-[#666666] mt-1">3-Wkt Hauls</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#e60023]">{bowlingStats.fiveWickets}</p>
                <p className="text-sm text-[#666666] mt-1">5-Wkt Hauls</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#e60023]">{bowlingStats.tenWickets}</p>
                <p className="text-sm text-[#666666] mt-1">10-Wkt Hauls</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-[#e60023]">{bowlingStats.matches}</p>
                <p className="text-sm text-[#666666] mt-1">Matches</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spell Lengths */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Spell Lengths & Wickets (Last 8 Matches)</h3>
              {spellLengths.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={spellLengths}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="match" stroke="#666666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666666" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="overs" name="Overs Bowled" fill="#666666" />
                    <Bar dataKey="wickets" name="Wickets" fill="#e60023" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm font-semibold text-gray-400 bg-gray-50 rounded-lg">No bowling history stats compiled.</div>
              )}
            </div>

            {/* Economy Stability */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Economy Rate Stability</h3>
              {economyStability.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={economyStability}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="match" stroke="#666666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666666" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="economy" name="Economy Rate" stroke="#e60023" strokeWidth={2} dot={{ fill: '#e60023', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm font-semibold text-gray-400 bg-gray-50 rounded-lg">No economy stability telemetry tracked.</div>
              )}
            </div>

            {/* Bowling by Phase */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Performance by Match Phase</h3>
              {bowlingPhases.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={bowlingPhases}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="phase" stroke="#666666" />
                    <YAxis stroke="#666666" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="economy" name="Economy" fill="#666666" />
                    <Bar dataKey="wickets" name="Wickets" fill="#e60023" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm font-semibold text-gray-400 bg-gray-50 rounded-lg">No match phase data segments found.</div>
              )}
            </div>

            {/* Pitch Map Placeholder */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Pitch Map Heatmap</h3>
              <div className="flex items-center justify-center h-[280px]">
                <div className="text-center">
                  <div className="w-24 h-48 border-4 border-[#e60023] flex items-center justify-center mb-4 mx-auto rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-[#666666]">Line</p>
                      <p className="text-lg font-bold text-[#e60023]">&</p>
                      <p className="text-xs text-[#666666]">Length</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#666666]">Delivery pattern analysis active</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}