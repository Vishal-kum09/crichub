import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import type { Player } from '../../data/mockData';
import { api } from '../../lib/api';
import { Search, Filter } from 'lucide-react';

interface PlayersProps {
  onNavigate: (path: string, playerId?: string) => void;
}

export function Players({ onNavigate }: PlayersProps) {
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [selectedTeam, setSelectedTeam] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/api/viewer/players')
      .then((res) => {
        if (!cancelled) setPlayers(res.data.players ?? []);
      })
      .catch(() => {
        if (!cancelled) setPlayers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const roles = ['All', 'Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'];
  const teams = ['All', ...Array.from(new Set(players.map((p) => p.team).filter(Boolean)))];

  const filteredPlayers = players.filter((player) => {
    const matchesRole = selectedRole === 'All' || player.role === selectedRole;
    const matchesTeam = selectedTeam === 'All' || player.team === selectedTeam;
    const matchesSearch =
      searchQuery === '' ||
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.team.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesTeam && matchesSearch;
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Filter Bar */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#666666]">
            <Filter size={18} />
            <span className="font-medium text-sm lg:text-base">Filters</span>
          </div>

          <div className="flex flex-col gap-4">
            {/* Role Filter */}
            <div>
              <label className="block text-xs lg:text-sm mb-2">Role</label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`px-3 lg:px-4 py-2 rounded-full text-xs lg:text-sm transition-colors min-h-[44px] touch-manipulation ${
                      selectedRole === role
                        ? 'bg-[#e60023] text-white'
                        : 'bg-[#f9f9f9] text-[#666666] hover:bg-[#f0f0f0]'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Team Filter */}
            <div>
              <label className="block text-xs lg:text-sm mb-2">Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023] text-base"
              >
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs lg:text-sm mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" size={18} />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023] text-base"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Players Table - Desktop */}
      <div className="hidden md:block">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-[#666666] border-b border-[#e0e0e0]">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Team</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3 tabular-nums">Matches</th>
                  <th className="pb-3 tabular-nums">Runs</th>
                  <th className="pb-3 tabular-nums">Wickets</th>
                  <th className="pb-3 tabular-nums">Avg</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => (
                  <tr
                    key={player.id}
                    onClick={() => onNavigate('/player', player.id)}
                    className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#f9f9f9] cursor-pointer transition-colors"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#e60023] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                          {player.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <span className="font-medium">{player.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-sm">{player.team}</td>
                    <td className="py-4">
                      <Badge variant="role">{player.role}</Badge>
                    </td>
                    <td className="py-4 tabular-nums">{player.matches}</td>
                    <td className="py-4 tabular-nums">{player.runs}</td>
                    <td className="py-4 tabular-nums">{player.wickets}</td>
                    <td className="py-4 tabular-nums">{player.battingAvg.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Players Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {filteredPlayers.map((player) => (
          <Card
            key={player.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onNavigate('/player', player.id)}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#e60023] text-white rounded-full flex items-center justify-center font-semibold">
                {player.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{player.name}</h3>
                <p className="text-sm text-[#666666] mb-2">{player.team}</p>
                <Badge variant="role">{player.role}</Badge>
                <div className="grid grid-cols-3 gap-2 mt-3 text-sm tabular-nums">
                  <div>
                    <p className="text-[#666666]">Matches</p>
                    <p className="font-semibold">{player.matches}</p>
                  </div>
                  <div>
                    <p className="text-[#666666]">Runs</p>
                    <p className="font-semibold">{player.runs}</p>
                  </div>
                  <div>
                    <p className="text-[#666666]">Avg</p>
                    <p className="font-semibold">{player.battingAvg.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredPlayers.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-[#666666]">{loading ? 'Loading players…' : 'No players found'}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
