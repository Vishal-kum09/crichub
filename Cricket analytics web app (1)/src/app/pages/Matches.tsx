import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
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

  const statusLabel = (status: string) => status === 'In Progress' ? 'Live' : status;

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredMatches.map((match) => (
          <button
            key={match.id}
            onClick={() => onNavigate('/match', match.id)}
            className="text-left bg-white border border-[#e0e0e0] rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-[#d0d0d0] transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{match.format}</Badge>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${match.status === 'In Progress' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                    {statusLabel(match.status)}
                  </span>
                </div>
                <h3 className="text-lg font-black text-[#1a1a1a]">{match.teamA}</h3>
                <p className="text-xs font-bold text-[#999999] my-1">vs</p>
                <h3 className="text-lg font-black text-[#1a1a1a]">{match.teamB}</h3>
              </div>
              <div className="text-right min-w-[120px]">
                {match.status === 'In Progress' && match.liveScore ? (
                  <>
                    <p className="text-[10px] font-black uppercase text-red-600">Live</p>
                    <p className="text-2xl font-black text-[#1a1a1a] tabular-nums">{match.liveScore}</p>
                  </>
                ) : match.status === 'Completed' || match.result ? (
                  <div className="space-y-2">
                    <p className="text-sm font-black text-[#1a1a1a] tabular-nums">{match.teamAScore || '-'}</p>
                    <p className="text-sm font-black text-[#1a1a1a] tabular-nums">{match.teamBScore || '-'}</p>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-[#666666]">{new Date(match.date).toLocaleDateString()}</p>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#f0f0f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-[#666666]">
              <span>{match.venue}</span>
              <span>{match.result || new Date(match.date).toLocaleDateString()}</span>
            </div>
          </button>
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
