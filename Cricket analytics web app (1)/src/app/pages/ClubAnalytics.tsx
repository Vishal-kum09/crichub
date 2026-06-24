import { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, Calendar, Loader2, MapPin, Trophy, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getClubAnalyticsMatches,
  getClubAnalyticsPlayers,
  getClubMatchAnalysis,
  getClubPlayerPerformance,
  type ClubAnalyticsMatch,
  type ClubAnalyticsPlayer,
  type ClubPlayerPerformance,
  type MatchAnalysis,
} from '../../lib/clubAnalyticsApi';

interface ClubAnalyticsProps {
  onNavigate: (path: string, id?: string) => void;
  matchId?: string;
  playerId?: string;
}

export function ClubAnalytics({ onNavigate, matchId, playerId }: ClubAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'matches' | 'players'>('matches');
  const [matches, setMatches] = useState<ClubAnalyticsMatch[]>([]);
  const [players, setPlayers] = useState<ClubAnalyticsPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<MatchAnalysis | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<ClubPlayerPerformance | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([getClubAnalyticsMatches(), getClubAnalyticsPlayers()])
      .then(([matchRows, playerRows]) => {
        setMatches(matchRows);
        setPlayers(playerRows);
      })
      .catch(() => {
        setMatches([]);
        setPlayers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!matchId) {
      setSelectedMatch(null);
      return;
    }
    setDetailLoading(true);
    setDetailError('');
    getClubMatchAnalysis(matchId)
      .then(setSelectedMatch)
      .catch((err) => {
        setSelectedMatch(null);
        setDetailError(err?.response?.data?.error || 'Could not load match analysis.');
      })
      .finally(() => setDetailLoading(false));
  }, [matchId]);

  useEffect(() => {
    if (!playerId) {
      setSelectedPlayer(null);
      return;
    }
    setDetailLoading(true);
    setDetailError('');
    getClubPlayerPerformance(playerId)
      .then(setSelectedPlayer)
      .catch((err) => {
        setSelectedPlayer(null);
        setDetailError(err?.response?.data?.error || 'Player analytics unavailable. They may no longer be part of your club.');
      })
      .finally(() => setDetailLoading(false));
  }, [playerId]);

  if (matchId) {
    return (
      <MatchAnalysisView
        loading={detailLoading}
        error={detailError}
        data={selectedMatch}
        onBack={() => onNavigate('/club-analytics')}
      />
    );
  }

  if (playerId) {
    return (
      <PlayerAnalysisView
        loading={detailLoading}
        error={detailError}
        data={selectedPlayer}
        onBack={() => onNavigate('/club-analytics')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="text-[#e60023]" size={28} />
          <h1 className="text-3xl font-bold">Club Analytics</h1>
        </div>
        <p className="text-white/70">Recent matches and player performance for your club</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
            activeTab === 'matches'
              ? 'bg-[#e60023] text-white shadow-lg'
              : 'bg-white text-[#666666] border border-[#e0e0e0] hover:border-[#e60023]'
          }`}
        >
          Recent Matches
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
            activeTab === 'players'
              ? 'bg-[#e60023] text-white shadow-lg'
              : 'bg-white text-[#666666] border border-[#e0e0e0] hover:border-[#e60023]'
          }`}
        >
          My Players
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-gray-500">
          <Loader2 className="animate-spin text-[#e60023]" size={24} />
          Loading club analytics...
        </div>
      ) : activeTab === 'matches' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400 font-medium bg-white rounded-xl border">
              No completed or live matches found for your club yet.
            </div>
          ) : (
            matches.map((match) => (
              <button
                key={match.id}
                onClick={() => onNavigate('/club-analytics/match', match.id)}
                className="text-left bg-white rounded-xl border border-[#e0e0e0] p-5 hover:border-[#e60023] hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-bold text-[#1a1a1a]">{match.label}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Calendar size={12} /> {match.date}
                    </p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                    match.status === 'live' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                  }`}>
                    {match.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                  <MapPin size={12} /> {match.venue || 'Venue TBC'}
                </p>
                {(match.team1_score || match.team2_score) && (
                  <p className="text-sm font-semibold text-[#e60023]">
                    {match.team1_score || '-'} | {match.team2_score || '-'}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400 font-medium bg-white rounded-xl border">
              No active club players found.
            </div>
          ) : (
            players.map((player) => (
              <button
                key={player.id}
                onClick={() => onNavigate('/club-analytics/player', player.id)}
                className="text-left bg-white rounded-xl border border-[#e0e0e0] p-5 hover:border-[#e60023] hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#e60023]/10 flex items-center justify-center">
                    <Users className="text-[#e60023]" size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-[#1a1a1a]">{player.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{player.role || 'Player'}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MatchAnalysisView({
  loading,
  error,
  data,
  onBack,
}: {
  loading: boolean;
  error: string;
  data: MatchAnalysis | null;
  onBack: () => void;
}) {
  const manhattan = data?.manhattan.innings1.length
    ? data.manhattan.innings1
    : data?.manhattan.innings2 || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 hover:text-white mb-6">
          <ArrowLeft size={20} /> Back to Club Analytics
        </button>

        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-white/60">
            <Loader2 className="animate-spin" size={24} /> Loading match analysis...
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-200">{error}</div>
        ) : data ? (
          <>
            <h1 className="text-3xl font-bold mb-1">{data.label}</h1>
            <p className="text-white/60 mb-8">{data.date} · {data.venue} · {data.format}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Wides" value={data.extras.wides} />
              <StatCard label="No Balls" value={data.extras.no_balls} />
              <StatCard label="Byes" value={data.extras.byes} />
              <StatCard label="Leg Byes" value={data.extras.leg_byes} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ChartPanel title="Manhattan (Runs per Over)">
                {manhattan.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={manhattan}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="over" stroke="rgba(255,255,255,0.5)" />
                      <YAxis stroke="rgba(255,255,255,0.5)" />
                      <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                      <Bar dataKey="runs" fill="#e60023" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No ball-by-ball data recorded yet." />
                )}
              </ChartPanel>

              <ChartPanel title="Run Rate Progression">
                {(data.run_rate.innings1.length > 0 || data.run_rate.innings2.length > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data.run_rate.innings1.length ? data.run_rate.innings1 : data.run_rate.innings2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="over" stroke="rgba(255,255,255,0.5)" />
                      <YAxis stroke="rgba(255,255,255,0.5)" />
                      <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                      <Line type="monotone" dataKey="run_rate" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Run rate data will appear once scoring begins." />
                )}
              </ChartPanel>
            </div>

            <ChartPanel title="Top Performers">
              {data.top_performers.length > 0 ? (
                <div className="space-y-3">
                  {data.top_performers.map((p, i) => (
                    <div key={`${p.player_name}-${i}`} className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <Trophy className={i === 0 ? 'text-yellow-400' : 'text-white/30'} size={18} />
                        <span className="font-semibold">{p.player_name}</span>
                      </div>
                      <span className="text-[#e60023] font-bold">{p.runs} ({p.balls})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyChart message="No batting scorecards for this match yet." />
              )}
            </ChartPanel>
          </>
        ) : null}
      </div>
    </div>
  );
}

function PlayerAnalysisView({
  loading,
  error,
  data,
  onBack,
}: {
  loading: boolean;
  error: string;
  data: ClubPlayerPerformance | null;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800">
        <ArrowLeft size={18} /> Back to Club Analytics
      </button>

      {loading ? (
        <div className="flex h-48 items-center justify-center gap-2 text-gray-500">
          <Loader2 className="animate-spin text-[#e60023]" size={24} /> Loading player analytics...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">{error}</div>
      ) : data ? (
        <>
          <div className="bg-gradient-to-r from-[#e60023] to-[#c41e3a] rounded-xl p-6 text-white">
            <h1 className="text-2xl font-bold">Player Performance</h1>
            <p className="text-white/90 mt-1">Active club member analytics</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <LightStat label="Total Runs" value={data.batting.total_runs} />
            <LightStat label="Strike Rate" value={data.batting.strike_rate} />
            <LightStat label="Average" value={data.batting.batting_average} />
            <LightStat label="Wickets" value={data.bowling.wickets} />
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold mb-4">Recent Match Form</h3>
            {data.batting.match_history.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.batting.match_history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="match_name" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="runs_scored" stroke="#e60023" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No innings recorded for this player yet.</p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <LightStat label="4s" value={data.batting.fours} />
            <LightStat label="6s" value={data.batting.sixes} />
            <LightStat label="Economy" value={data.bowling.economy_rate} />
            <LightStat label="Best Bowling" value={data.bowling.best_bowling_figures} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
      <p className="text-xs text-white/50 uppercase">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function LightStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-[#1a1a1a] mt-1">{value}</p>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <p className="text-sm text-white/50 text-center py-12">{message}</p>;
}

export default ClubAnalytics;
