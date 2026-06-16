import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Badge, StatusBadge } from '../components/Badge';
import { api } from '../../lib/api';
import type { Match } from '../../data/mockData';
import { Filter, Search } from 'lucide-react';

interface MatchesProps {
  onNavigate: (path: string, matchId?: string) => void;
}

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

  const formats = ['All', 'T20', 'ODI', 'Test'];
  const statuses = ['All', 'Live', 'Scheduled', 'Completed'];

  // Universal Live Tournament Match Sync Engine
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
    return () => { cancelled = true; };
  }, [selectedStatus]);

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
      {/* =========================================================================
          TOP BANNER HEADER (Clean View Only)
         ========================================================================= */}
      <div>
        <h2 className="text-2xl font-semibold text-[#1a1a1a]">Matches</h2>
        <p className="text-sm text-[#666666]">Browse and monitor live tournament metrics</p>
      </div>

      {/* Filter Row Viewport */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#666666]">
            <Filter size={18} />
            <span className="font-medium text-sm lg:text-base">Filters</span>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs lg:text-sm mb-2">Format</label>
              <div className="flex flex-wrap gap-2">
                {formats.map((format) => (
                  <button
                    key={format}
                    onClick={() => setSelectedFormat(format)}
                    className={`px-3 lg:px-4 py-2 rounded-full text-xs lg:text-sm transition-colors min-h-[44px] touch-manipulation ${
                      selectedFormat === format ? 'bg-[#e60023] text-white' : 'bg-[#f9f9f9] text-[#666666] hover:bg-[#f0f0f0]'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs lg:text-sm mb-2">Status</label>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 lg:px-4 py-2 rounded-full text-xs lg:text-sm transition-colors min-h-[44px] touch-manipulation ${
                      selectedStatus === status ? 'bg-[#e60023] text-white' : 'bg-[#f9f9f9] text-[#666666] hover:bg-[#f0f0f0]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
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

      {/* Matches List - Desktop Table View */}
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
                    <td className="py-4"><Badge>{match.format}</Badge></td>
                    <td className="py-4"><StatusBadge status={match.status} /></td>
                    <td className="py-4 text-sm">{match.result || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Matches List - Mobile Cards View */}
      {/* Matches List - Mobile Cards View */}
<div className="md:hidden space-y-4">
  {filteredMatches.map((match) => (
    <Card key={match.id} className="hover:shadow-lg transition-shadow">
      {/* onClick shifted inside to standard div container */}
      <div 
        onClick={() => onNavigate('/match', match.id)} 
        className="space-y-3 cursor-pointer p-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{match.opponent}</h3>
          <StatusBadge status={match.status as any} />
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
      

      {/* Loader UI Overlays */}
      {loading && (
        <Card><div className="text-center py-8"><p className="text-[#666666]">Loading matches…</p></div></Card>
      )}
      {!loading && error && (
        <Card><div className="text-center py-8"><p className="text-[#666666]">{error}</p></div></Card>
      )}
      {!loading && !error && filteredMatches.length === 0 && (
        <Card><div className="text-center py-8"><p className="text-[#666666]">No matches found</p></div></Card>
      )}
    </div>
  );
}