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
    // Safety check for undefined properties before searching
    const opponentSafe = match.opponent || '';
    const venueSafe = match.venue || '';
    
    const matchesSearch =
      searchQuery === '' ||
      opponentSafe.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venueSafe.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesFormat && matchesSearch;
  });

  const statusLabel = (status: string) => status === 'In Progress' ? 'Live' : status;

  return (
    <div className="space-y-4 lg:space-y-6">
      
      {/* =========================================================================
          TOP BANNER HEADER
         ========================================================================= */}
      

      {/* =========================================================================
          🔥 ULTRA-COMPACT FILTERS SECTION (Single Row) 🔥
         ========================================================================= */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-fadeIn">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-[#e60023]" />
          <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Quick Filters</h3>
        </div>
        
        {/* 🔥 All 3 items in a single Flex row on Desktop 🔥 */}
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Format Dropdown */}
          <select 
            value={selectedFormat} 
            onChange={(e) => setSelectedFormat(e.target.value)} 
            className="w-full md:w-85 px-29 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:border-[#e60023] focus:ring-1 focus:ring-[#e60023] cursor-pointer transition-all"
          >
            <option value="All">All Formats</option>
            <option value="T20">T20</option>
            <option value="50 Overs">50 Overs</option>
            <option value="Multi Day">Multi Day</option>
            <option value="National Cup(40 Overs)">National Cup(40 Overs)</option>
            <option value="Custom">Custom</option>
          </select>

          {/* Status Dropdown */}
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-85 px-30 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none focus:border-[#e60023] focus:ring-1 focus:ring-[#e60023] cursor-pointer transition-all"
          >
            <option value="All">All Statuses</option>
            <option value="Live">Live</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Search Bar - Takes up the remaining horizontal space (flex-1) */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} pointerEvents="none" />
            <input 
              type="text" 
              placeholder="Search opponent team or venue..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#e60023] focus:ring-1 focus:ring-[#e60023] transition-all"
            />
          </div>
          
        </div>
      </div>

      {/* =========================================================================
          🔥 MATCH CARDS GRID (3 columns on large screens) 🔥
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMatches.map((match) => (
          <button
            key={match.id}
            onClick={() => onNavigate('/match', match.id)}
            className="text-left bg-white border border-[#e0e0e0] rounded-2xl p-4 shadow-sm hover:shadow-lg hover:border-[#e60023] transition-all group flex flex-col justify-between h-full"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Badge>{match.format}</Badge>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${match.status === 'In Progress' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                    {statusLabel(match.status)}
                  </span>
                </div>
              </div>
              
              <h3 className="text-base font-black text-[#1a1a1a] leading-tight group-hover:text-[#e60023] transition-colors line-clamp-1">{match.teamA}</h3>
              <p className="text-[10px] font-bold text-[#999999] my-1 uppercase">vs</p>
              <h3 className="text-base font-black text-[#1a1a1a] leading-tight group-hover:text-[#e60023] transition-colors line-clamp-1">{match.teamB}</h3>
            </div>
            
            <div className="mt-3 flex justify-between items-end">
               <div>
                  <div className="flex flex-col gap-0.5 text-xs font-bold text-[#666666]">
                    <span className="truncate max-w-[150px]">{match.venue || 'TBD Venue'}</span>
                    <span>{match.result || new Date(match.date).toLocaleDateString()}</span>
                  </div>
               </div>

              <div className="text-right shrink-0 ml-2">
                {match.status === 'In Progress' && match.liveScore ? (
                  <>
                    <p className="text-[10px] font-black uppercase text-red-600 flex items-center justify-end gap-1">
                       <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span> Live
                    </p>
                    <p className="text-xl font-black text-[#1a1a1a] tabular-nums">{match.liveScore}</p>
                  </>
                ) : match.status === 'Completed' || match.result ? (
                  <div className="space-y-1">
                    <p className="text-xs font-black text-[#1a1a1a] tabular-nums">{match.teamAScore || '-'}</p>
                    <p className="text-xs font-black text-[#1a1a1a] tabular-nums">{match.teamBScore || '-'}</p>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-[#666666]">{new Date(match.date).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* =========================================================================
          LOADER & EMPTY STATES
         ========================================================================= */}
      {loading && (
        <Card><div className="text-center py-8"><p className="text-[#666666]">Loading matches…</p></div></Card>
      )}
      {!loading && error && (
        <Card><div className="text-center py-8"><p className="text-red-600 font-medium">{error}</p></div></Card>
      )}
      {!loading && !error && filteredMatches.length === 0 && (
        <Card><div className="text-center py-8"><p className="text-[#666666] font-medium">No matches found matching your filters.</p></div></Card>
      )}
    </div>
  );
}