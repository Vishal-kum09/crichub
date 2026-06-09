import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import type { Team } from '../../data/mockData';
import { api } from '../../lib/api';
import { Trophy } from 'lucide-react';

interface TeamsProps {
  onNavigate: (path: string, teamId?: string) => void;
}

export function Teams({ onNavigate }: TeamsProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/api/viewer/teams')
      .then((res) => {
        if (!cancelled) setTeams(res.data.teams ?? []);
      })
      .catch(() => {
        if (!cancelled) setTeams([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl lg:text-2xl font-semibold">Teams</h2>
      </div>

      {(loading || teams.length === 0) && (
        <Card>
          <div className="text-center py-8">
            <p className="text-[#666666]">{loading ? 'Loading teams…' : 'No teams found'}</p>
          </div>
        </Card>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {teams.map((team) => (
          <Card
            key={team.id}
            className="cursor-pointer hover:border-2 hover:border-[#e60023] transition-all active:scale-98"
            onClick={() => onNavigate('/team', team.id)}
          >
            <div className="space-y-3 lg:space-y-4">
              {/* Team Logo Placeholder */}
              <div className="w-14 h-14 lg:w-16 lg:h-16 bg-[#e60023]/10 rounded-full flex items-center justify-center">
                <Trophy className="text-[#e60023]" size={28} />
              </div>

              {/* Team Info */}
              <div>
                <h3 className="text-lg lg:text-xl font-semibold mb-1">{team.name}</h3>
                <p className="text-xs lg:text-sm text-[#666666]">{team.competition}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 lg:gap-4 pt-3 lg:pt-4 border-t border-[#e0e0e0]">
                <div>
                  <p className="text-xs lg:text-sm text-[#666666]">Players</p>
                  <p className="text-lg lg:text-xl font-semibold tabular-nums">{team.playerCount}</p>
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-[#666666]">Matches</p>
                  <p className="text-lg lg:text-xl font-semibold tabular-nums">{team.matchCount}</p>
                </div>
              </div>

              {/* Win/Loss */}
              <div className="flex gap-2 text-xs lg:text-sm">
                <span className="text-[#10b981] tabular-nums">{team.wins}W</span>
                <span className="text-[#666666]">-</span>
                <span className="text-[#ef4444] tabular-nums">{team.losses}L</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
