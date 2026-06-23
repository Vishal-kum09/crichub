import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import type { Team, Player, Match } from '../../data/mockData';
import { api } from '../../lib/api';
import { ArrowLeft, Trophy } from 'lucide-react';

interface TeamDetailProps {
  teamId: string;
  onNavigate: (path: string, id?: string) => void;
}

// /api/viewer/teams/:id returns the Team fields plus its squad and matches.
type TeamDetailResponse = Team & { squad: Player[]; matches: Match[] };

export function TeamDetail({ teamId, onNavigate }: TeamDetailProps) {
  const [team, setTeam] = useState<TeamDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matches' | 'squad' | 'stats'>('matches');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/api/viewer/teams/${teamId}`)
      .then((res) => {
        if (!cancelled) setTeam(res.data);
      })
      .catch(() => {
        if (!cancelled) setTeam(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <p className="text-center text-[#666666]">Loading team…</p>
        </Card>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-6">
        <Card>
          <p className="text-center text-[#666666]">Team not found</p>
        </Card>
      </div>
    );
  }

  const teamPlayers = team.squad ?? [];
  const teamMatches = team.matches ?? [];
  const winRate = team.matchCount > 0 ? ((team.wins / team.matchCount) * 100).toFixed(1) : '0.0';

  const tabs = [
    { id: 'matches', label: 'Matches' },
    { id: 'squad', label: 'Squad' },
    { id: 'stats', label: 'Team Stats' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => onNavigate('/teams')}
        className="flex items-center gap-2 text-[#e60023] hover:underline"
      >
        <ArrowLeft size={18} />
        <span>Back to Clubs</span>
      </button>

      {/* Team Header */}
      <Card>
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-[#e60023]/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Trophy className="text-[#e60023]" size={40} />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-semibold mb-2">{team.name}</h2>
            <p className="text-[#666666] mb-4">{team.competition}</p>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-[#666666]">Players</p>
                <p className="text-2xl font-semibold tabular-nums">{team.playerCount}</p>
              </div>
              <div>
                <p className="text-sm text-[#666666]">Matches</p>
                <p className="text-2xl font-semibold tabular-nums">{team.matchCount}</p>
              </div>
              <div>
                <p className="text-sm text-[#666666]">Win Rate</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {winRate}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-[#e0e0e0]">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 relative transition-colors ${
                activeTab === tab.id ? 'text-[#e60023] font-medium' : 'text-[#666666] hover:text-[#1a1a1a]'
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
      {activeTab === 'squad' && (
        <Card>
          <h3 className="text-xl font-semibold mb-4">Squad</h3>
          <div className="space-y-3">
            {teamPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-4 bg-[#f9f9f9] rounded-lg hover:bg-[#f0f0f0] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#e60023] text-white rounded-full flex items-center justify-center font-semibold">
                    {player.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <p className="font-semibold">{player.name}</p>
                    <Badge variant="role" className="mt-1">
                      {player.role}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-6 text-sm tabular-nums">
                  <div className="text-right">
                    <p className="text-[#666666]">Matches</p>
                    <p className="font-semibold">{player.matches}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#666666]">Runs</p>
                    <p className="font-semibold">{player.runs}</p>
                  </div>
                  {player.wickets > 0 && (
                    <div className="text-right">
                      <p className="text-[#666666]">Wickets</p>
                      <p className="font-semibold">{player.wickets}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'matches' && (
        <Card>
          <h3 className="text-xl font-semibold mb-4">Matches Played</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[#666666] border-b border-[#e0e0e0]">
                  <th className="py-3 px-2">Date</th>
                  <th className="py-3 px-2">Match</th>
                  <th className="py-3 px-2">Venue</th>
                  <th className="py-3 px-2">Result</th>
                  <th className="py-3 px-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
            {teamMatches.map((match) => (
              <tr key={match.id} onClick={() => onNavigate('/match', match.id)} className="cursor-pointer hover:bg-[#f9f9f9] transition-colors">
                <td className="py-3 px-2 text-[#666666]">{new Date(match.date).toLocaleDateString()}</td>
                <td className="py-3 px-2 font-semibold">{match.teamA} vs {match.teamB}</td>
                <td className="py-3 px-2 text-[#666666]">{match.venue}</td>
                <td className="py-3 px-2">
                  <Badge variant={match.status === 'Won' ? 'won' : match.status === 'Lost' ? 'lost' : 'scheduled'}>
                    {match.result || match.status}
                  </Badge>
                </td>
                <td className="py-3 px-2 text-right tabular-nums text-[#666666]">
                  {[match.teamAScore, match.teamBScore].filter(Boolean).join(' / ') || '-'}
                </td>
              </tr>
            ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'stats' && (
        <Card>
          <h3 className="text-lg lg:text-xl font-semibold mb-4">Team Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div className="p-4 bg-[#f9f9f9] rounded-lg">
              <p className="text-sm text-[#666666] mb-1">Total Wins</p>
              <p className="text-3xl font-semibold tabular-nums">{team.wins}</p>
            </div>
            <div className="p-4 bg-[#f9f9f9] rounded-lg">
              <p className="text-sm text-[#666666] mb-1">Total Losses</p>
              <p className="text-3xl font-semibold tabular-nums">{team.losses}</p>
            </div>
            <div className="p-4 bg-[#f9f9f9] rounded-lg">
              <p className="text-sm text-[#666666] mb-1">Win Rate</p>
              <p className="text-3xl font-semibold tabular-nums">
                {((team.wins / team.matchCount) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-[#f9f9f9] rounded-lg">
              <p className="text-sm text-[#666666] mb-1">Squad Size</p>
              <p className="text-3xl font-semibold tabular-nums">{team.playerCount}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
