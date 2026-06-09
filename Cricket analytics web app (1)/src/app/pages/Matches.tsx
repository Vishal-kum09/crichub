import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Badge, StatusBadge } from '../components/Badge';
import { api } from '../../lib/api';
import type { Match } from '../../data/mockData';
import { Filter, Search, ClipboardList } from 'lucide-react';
import { getAssignedMatches, type AssignedMatch } from '../../lib/scorerApi';

interface MatchesProps {
  onNavigate: (path: string, matchId?: string) => void;
}

// UI status tab -> viewer API status query param.
const STATUS_PARAM: Record<string, string> = {
  All: 'all',
  Live: 'live',
  Scheduled: 'scheduled',
  Completed: 'completed',
};

export function Matches({ onNavigate }: MatchesProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fixtures the signed-in scorer is assigned to. Silently empty for
  // non-scorers (the endpoint 403s for other roles).
  const [assigned, setAssigned] = useState<AssignedMatch[]>([]);
  useEffect(() => {
    let cancelled = false;
    getAssignedMatches()
      .then((rows) => { if (!cancelled) setAssigned(rows); })
      .catch(() => { if (!cancelled) setAssigned([]); });
    return () => { cancelled = true; };
  }, []);

  const formats = ['All', 'T20', 'ODI', 'Test'];
  const statuses = ['All', 'Live', 'Scheduled', 'Completed'];

  // Fetch matches whenever the status tab changes; the server filters by status.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get('/api/viewer/matches', { params: { status: STATUS_PARAM[selectedStatus] || 'all' } })
      .then((res) => {
        if (!cancelled) setMatches(res.data.matches ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to load matches.');
          setMatches([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStatus]);

  // Format + search are applied client-side over the fetched set.
  const filteredMatches = matches.filter((match) => {
    const matchesFormat = selectedFormat === 'All' || match.format === selectedFormat;
    const matchesSearch =
      searchQuery === '' ||
      match.opponent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.venue.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFormat && matchesSearch;
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* New Match Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#1a1a1a]">Matches</h2>
          <p className="text-sm text-[#666666]">Browse and manage cricket matches</p>
        </div>
        <button
          onClick={() => onNavigate('/match-setup')}
          className="px-6 py-3 bg-gradient-to-r from-[#e60023] to-[#ff1744] text-white rounded-xl font-semibold hover:from-[#cc001e] hover:to-[#e6001e] transition-all shadow-lg flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          New Match
        </button>
      </div>

      {/* Assigned to me (Scorer) — only rendered when the scorer has fixtures */}
      {assigned.length > 0 && (
        <Card>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#1a1a1a]">
              <ClipboardList size={18} className="text-[#e60023]" />
              <span className="font-semibold">Assigned to me</span>
              <span className="text-xs text-[#666666]">({assigned.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assigned.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-4 bg-[#f9f9f9] rounded-xl border border-[#e0e0e0]"
                >
                  <div>
                    <p className="font-semibold text-[#1a1a1a]">
                      {m.team1_short_name} vs {m.team2_short_name}
                    </p>
                    <p className="text-xs text-[#666666]">
                      {m.format} · {m.venue || 'TBD'} · {m.status}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('/match-setup', m.id)}
                    className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg text-sm font-medium hover:bg-[#2a2a2a] transition-colors"
                  >
                    Score
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Filter Bar */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#666666]">
            <Filter size={18} />
            <span className="font-medium text-sm lg:text-base">Filters</span>
          </div>

          <div className="flex flex-col gap-4">
            {/* Format Filter */}
            <div>
              <label className="block text-xs lg:text-sm mb-2">Format</label>
              <div className="flex flex-wrap gap-2">
                {formats.map((format) => (
                  <button
                    key={format}
                    onClick={() => setSelectedFormat(format)}
                    className={`px-3 lg:px-4 py-2 rounded-full text-xs lg:text-sm transition-colors min-h-[44px] touch-manipulation ${
                      selectedFormat === format
                        ? 'bg-[#e60023] text-white'
                        : 'bg-[#f9f9f9] text-[#666666] hover:bg-[#f0f0f0]'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs lg:text-sm mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 lg:px-4 py-2 rounded-full text-xs lg:text-sm transition-colors min-h-[44px] touch-manipulation ${
                      selectedStatus === status
                        ? 'bg-[#e60023] text-white'
                        : 'bg-[#f9f9f9] text-[#666666] hover:bg-[#f0f0f0]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs lg:text-sm mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" size={18} />
                <input
                  type="text"
                  placeholder="Search opponent or venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#e60023] text-base"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Matches List - Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-[#666666] border-b border-[#e0e0e0]">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Opponent</th>
                  <th className="pb-3">Venue</th>
                  <th className="pb-3">Format</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map((match) => (
                  <tr
                    key={match.id}
                    onClick={() => onNavigate('/match', match.id)}
                    className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#f9f9f9] cursor-pointer transition-colors"
                  >
                    <td className="py-4 text-sm">{new Date(match.date).toLocaleDateString()}</td>
                    <td className="py-4 font-medium">{match.opponent}</td>
                    <td className="py-4 text-sm text-[#666666]">{match.venue}</td>
                    <td className="py-4">
                      <Badge>{match.format}</Badge>
                    </td>
                    <td className="py-4">
                      <StatusBadge status={match.status} />
                    </td>
                    <td className="py-4 text-sm">{match.result || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Matches List - Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredMatches.map((match) => (
          <Card
            key={match.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onNavigate('/match', match.id)}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{match.opponent}</h3>
                <StatusBadge status={match.status} />
              </div>
              <div className="space-y-1 text-sm text-[#666666]">
                <p>{match.venue}</p>
                <p>{new Date(match.date).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{match.format}</Badge>
                {match.result && <span className="text-sm">{match.result}</span>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {loading && (
        <Card>
          <div className="text-center py-8">
            <p className="text-[#666666]">Loading matches…</p>
          </div>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <div className="text-center py-8">
            <p className="text-[#666666]">{error}</p>
          </div>
        </Card>
      )}

      {!loading && !error && filteredMatches.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <p className="text-[#666666]">No matches found</p>
          </div>
        </Card>
      )}
    </div>
  );
}
