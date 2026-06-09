import { useEffect, useState } from 'react';
import { Card, KPICard } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/Badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { runRateData } from '../../data/mockData';
import type { Match, DashboardKPI } from '../../data/mockData';
import { api } from '../../lib/api';
import { Calendar, TrendingUp } from 'lucide-react';

// Static chart data outside component to prevent re-creation. The run-rate
// trend has no backing endpoint in this phase, so it remains sample data.
const CHART_DATA = runRateData;

interface DashboardProps {
  onNavigate: (path: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [kpis, setKpis] = useState<DashboardKPI[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<Match[]>([]);

  useEffect(() => {
    api
      .get('/api/viewer/dashboard/kpis')
      .then((res) => {
        const k = res.data;
        setKpis([
          { label: 'Total Matches', value: k.total_matches },
          { label: 'Live Matches', value: k.live_matches },
          { label: 'Total Players', value: k.total_players },
          { label: 'Total Clubs', value: k.total_clubs },
          { label: 'Total Teams', value: k.total_teams },
        ]);
      })
      .catch(() => setKpis([]));

    api
      .get('/api/viewer/matches', { params: { status: 'scheduled' } })
      .then((res) => setUpcomingMatches((res.data.matches ?? []).slice(0, 3)))
      .catch(() => setUpcomingMatches([]));

    api
      .get('/api/viewer/matches', { params: { status: 'completed' } })
      .then((res) => setRecentResults((res.data.matches ?? []).slice(0, 5)))
      .catch(() => setRecentResults([]));
  }, []);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        {kpis.map((kpi, idx) => (
          <KPICard key={idx} {...kpi} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Run Rate Chart */}
        <Card className="lg:col-span-2">
          <h3 className="text-lg lg:text-xl font-semibold mb-4">Run Rate - Last 8 Matches</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={CHART_DATA}
                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="match"
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  dataKey="runRate"
                  stroke="#e60023"
                  strokeWidth={2}
                  dot={{ fill: '#e60023', r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <h3 className="text-lg lg:text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Button variant="primary" className="w-full py-3" onClick={() => onNavigate('/admin')}>
              Create Match
            </Button>
            <Button variant="secondary" className="w-full py-3" onClick={() => onNavigate('/admin')}>
              Add Player
            </Button>
            <Button variant="secondary" className="w-full py-3" onClick={() => onNavigate('/players')}>
              View Stats
            </Button>
          </div>

          {/* Best Performer */}
          <div className="mt-6 p-4 bg-[#1a1a1a] text-white rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-[#e60023]" />
              <h4 className="font-semibold">Best Performer</h4>
            </div>
            <p className="text-2xl font-bold tabular-nums text-[#e60023]">Rohit Sharma</p>
            <p className="text-sm text-[#999999] mt-1">456 runs in last 8 matches</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Upcoming Fixtures */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg lg:text-xl font-semibold">Upcoming Fixtures</h3>
            <Calendar size={20} className="text-[#666666]" />
          </div>
          <div className="space-y-3">
            {upcomingMatches.map((match) => (
              <div
                key={match.id}
                onClick={() => onNavigate('/match', match.id)}
                className="p-3 lg:p-4 bg-[#f9f9f9] rounded-lg hover:bg-[#f0f0f0] transition-colors active:scale-98 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm lg:text-base">{match.opponent}</p>
                  <StatusBadge status={match.status} />
                </div>
                <p className="text-xs lg:text-sm text-[#666666] truncate">{match.venue}</p>
                <p className="text-xs lg:text-sm text-[#666666]">{new Date(match.date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Results */}
        <Card>
          <h3 className="text-lg lg:text-xl font-semibold mb-4">Recent Results</h3>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-[#666666] border-b border-[#e0e0e0]">
                  <th className="pb-2">Opponent</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.map((match) => (
                  <tr
                    key={match.id}
                    onClick={() => onNavigate('/match', match.id)}
                    className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#f9f9f9] cursor-pointer transition-colors"
                  >
                    <td className="py-3 text-sm lg:text-base">{match.opponent}</td>
                    <td className="py-3 text-xs lg:text-sm text-[#666666]">
                      {new Date(match.date).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={match.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            {recentResults.map((match) => (
              <div
                key={match.id}
                onClick={() => onNavigate('/match', match.id)}
                className="p-3 bg-[#f9f9f9] rounded-lg hover:bg-[#f0f0f0] cursor-pointer transition-colors active:scale-98"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm">{match.opponent}</p>
                  <StatusBadge status={match.status} />
                </div>
                <p className="text-xs text-[#666666]">{new Date(match.date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
