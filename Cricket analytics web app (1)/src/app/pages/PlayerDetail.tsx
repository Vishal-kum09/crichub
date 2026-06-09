import { useEffect, useState } from 'react';
import { Card, KPICard } from '../components/Card';
import { Badge } from '../components/Badge';
import { playerRunsData, playerWicketsData } from '../../data/mockData';
import type { Player } from '../../data/mockData';
import { api } from '../../lib/api';
import { ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Static chart data outside component. Per-match trends have no backing
// endpoint in this phase, so they remain sample data.
const RUNS_CHART_DATA = playerRunsData;
const WICKETS_CHART_DATA = playerWicketsData;

interface PlayerDetailProps {
  playerId: string;
  onNavigate: (path: string) => void;
}

export function PlayerDetail({ playerId, onNavigate }: PlayerDetailProps) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/api/viewer/players/${playerId}`)
      .then((res) => {
        if (!cancelled) setPlayer(res.data);
      })
      .catch(() => {
        if (!cancelled) setPlayer(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <p className="text-center text-[#666666]">Loading player…</p>
        </Card>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="space-y-6">
        <Card>
          <p className="text-center text-[#666666]">Player not found</p>
        </Card>
      </div>
    );
  }

  const battingKPIs = [
    { label: 'Matches', value: player.matches },
    { label: 'Runs', value: player.runs },
    { label: 'Batting Avg', value: player.battingAvg.toFixed(1) },
    { label: 'Strike Rate', value: player.strikeRate.toFixed(1) },
  ];

  const bowlingKPIs = [
    { label: 'Wickets', value: player.wickets },
    { label: 'Bowling Avg', value: player.bowlingAvg > 0 ? player.bowlingAvg.toFixed(1) : '-' },
    { label: 'Economy', value: player.economy > 0 ? player.economy.toFixed(1) : '-' },
    { label: 'Best Figures', value: '4/23' },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => onNavigate('/players')}
        className="flex items-center gap-2 text-[#e60023] hover:underline"
      >
        <ArrowLeft size={18} />
        <span>Back to Players</span>
      </button>

      {/* Player Header */}
      <Card>
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-[#e60023] text-white rounded-full flex items-center justify-center text-3xl font-bold flex-shrink-0">
            {player.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-semibold mb-2">{player.name}</h2>
            <p className="text-[#666666] mb-3">{player.team}</p>
            <div className="flex gap-2">
              <Badge variant="role">{player.role}</Badge>
              <Badge>Right-handed</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Batting Statistics */}
      <div>
        <h3 className="text-lg lg:text-xl font-semibold mb-4">Batting Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {battingKPIs.map((kpi, idx) => (
            <KPICard key={idx} {...kpi} />
          ))}
        </div>
      </div>

      {/* Runs Per Match Chart */}
      <Card>
        <h3 className="text-lg lg:text-xl font-semibold mb-4">Runs per Match</h3>
        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={RUNS_CHART_DATA}
              margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="match"
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="runs" fill="#e60023" radius={[8, 8, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {player.wickets > 0 && (
        <>
          {/* Bowling Statistics */}
          <div>
            <h3 className="text-lg lg:text-xl font-semibold mb-4">Bowling Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {bowlingKPIs.map((kpi, idx) => (
                <KPICard key={idx} {...kpi} />
              ))}
            </div>
          </div>

          {/* Wickets Per Match Chart */}
          <Card>
            <h3 className="text-lg lg:text-xl font-semibold mb-4">Wickets per Match</h3>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={WICKETS_CHART_DATA}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="match"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="wickets" fill="#e60023" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
