import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Trophy, Target } from 'lucide-react';
import { getMyPerformances } from '../../lib/analyticsApi';

export function PlayerPerformance() {
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling'>('batting');

  // Live batting/bowling stats — loaded from the player's own performance feed.
  // Defaults are zeros so the page renders cleanly before the fetch resolves or
  // when the account has no innings yet (resolved=false).
  const [battingStats, setBattingStats] = useState({
    totalRuns: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, twoHundreds: 0,
    strikeRate: 0, average: 0, ballsFaced: 0, matches: 0,
  });
  const [bowlingStats, setBowlingStats] = useState({
    totalOvers: '0.0', maidens: 0, wickets: 0, dotBalls: 0, economyRate: 0,
    average: 0, threeWickets: 0, fiveWickets: 0, tenWickets: 0, matches: 0,
  });

  useEffect(() => {
    getMyPerformances()
      .then((data) => {
        const b = data.batting;
        const w = data.bowling;
        setBattingStats({
          totalRuns: b.total_runs, fours: b.fours, sixes: b.sixes, fifties: b.fifties,
          hundreds: b.hundreds, twoHundreds: b.double_hundreds, strikeRate: b.strike_rate,
          average: b.batting_average, ballsFaced: b.balls_faced, matches: b.matches_played,
        });
        setBowlingStats({
          totalOvers: w.overs_bowled, maidens: w.maidens, wickets: w.wickets,
          dotBalls: w.dot_balls, economyRate: w.economy_rate, average: w.bowling_average,
          threeWickets: w.three_fers, fiveWickets: w.five_fers, tenWickets: 0,
          matches: w.matches_bowled,
        });
      })
      .catch(() => { /* keep zeros on error */ });
  }, []);

  // Batting trajectory data
  const runsTrajectory = [
    { match: 'Match 1', runs: 45, average: 45 },
    { match: 'Match 2', runs: 67, average: 56 },
    { match: 'Match 3', runs: 23, average: 45 },
    { match: 'Match 4', runs: 89, average: 56 },
    { match: 'Match 5', runs: 34, average: 51.6 },
    { match: 'Match 6', runs: 102, average: 60 },
    { match: 'Match 7', runs: 45, average: 57.8 },
    { match: 'Match 8', runs: 78, average: 60.3 },
    { match: 'Match 9', runs: 56, average: 59.8 },
    { match: 'Match 10', runs: 91, average: 63 },
  ];

  // Score distribution
  const scoreDistribution = [
    { range: '0-20', count: 12 },
    { range: '21-50', count: 28 },
    { range: '51-100', count: 18 },
    { range: '100+', count: 7 },
  ];

  // Dismissal types
  const dismissalTypes = [
    { name: 'Bowled', value: 15, color: '#e60023' },
    { name: 'Caught', value: 28, color: '#ff758f' },
    { name: 'LBW', value: 10, color: '#c41e3a' },
    { name: 'Run Out', value: 8, color: '#666666' },
    { name: 'Not Out', value: 4, color: '#999999' },
  ];

  // Bowling spell lengths
  const spellLengths = [
    { match: 'Match 1', overs: 3.5, wickets: 2 },
    { match: 'Match 2', overs: 4, wickets: 1 },
    { match: 'Match 3', overs: 3.2, wickets: 3 },
    { match: 'Match 4', overs: 4, wickets: 0 },
    { match: 'Match 5', overs: 3.4, wickets: 2 },
    { match: 'Match 6', overs: 4, wickets: 1 },
    { match: 'Match 7', overs: 3.3, wickets: 2 },
    { match: 'Match 8', overs: 4, wickets: 1 },
  ];

  // Economy stability
  const economyStability = [
    { match: 'Match 1', economy: 6.8 },
    { match: 'Match 2', economy: 7.5 },
    { match: 'Match 3', economy: 5.9 },
    { match: 'Match 4', economy: 8.2 },
    { match: 'Match 5', economy: 6.5 },
    { match: 'Match 6', economy: 7.1 },
    { match: 'Match 7', economy: 6.9 },
    { match: 'Match 8', economy: 7.4 },
  ];

  // Bowling metrics by phase
  const bowlingPhases = [
    { phase: 'Powerplay', economy: 6.2, wickets: 32 },
    { phase: 'Middle', economy: 7.8, wickets: 38 },
    { phase: 'Death', economy: 8.9, wickets: 28 },
  ];

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
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={runsTrajectory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="match" stroke="#666666" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#666666" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="runs" name="Runs Scored" stroke="#e60023" strokeWidth={2} dot={{ fill: '#e60023', r: 4 }} />
                  <Line type="monotone" dataKey="average" name="Moving Average" stroke="#666666" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Score Distribution */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Score Distribution</h3>
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
            </div>

            {/* Dismissal Types */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Dismissal Pattern Analysis</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={dismissalTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {dismissalTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
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
                  <p className="text-sm text-[#666666]">Detailed wagon wheel visualization</p>
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
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={spellLengths}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="match" stroke="#666666" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#666666" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="overs" name="Overs Bowled" fill="#666666" />
                  <Bar dataKey="wickets" name="Wickets" fill="#e60023" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Economy Stability */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Economy Rate Stability</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={economyStability}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="match" stroke="#666666" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#666666" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="economy" name="Economy Rate" stroke="#e60023" strokeWidth={2} dot={{ fill: '#e60023', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Bowling by Phase */}
            <div className="bg-white rounded-xl p-6 border border-[#e0e0e0]">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">Performance by Match Phase</h3>
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
                  <p className="text-sm text-[#666666]">Delivery pattern analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
