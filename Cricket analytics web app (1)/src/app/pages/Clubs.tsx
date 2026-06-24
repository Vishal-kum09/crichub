import { useEffect, useState } from 'react';
import { Search, Trophy, MapPin, ArrowRight } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { fetchViewerClubs } from '../../lib/viewerApi';

interface ClubsProps {
  onNavigate: (path: string, clubId?: string) => void;
}

type ClubSummary = {
  id: string;
  name: string;
  display_name?: string;
  country?: string;
  home_ground?: string;
  total_matches: number;
  won: number;
  lost: number;
};

export function Clubs({ onNavigate }: ClubsProps) {
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchViewerClubs()
      .then((data) => {
        if (!cancelled) setClubs(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setClubs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = clubs.filter((club) => {
    const text = `${club.name} ${club.display_name || ''} ${club.country || ''} ${club.home_ground || ''}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[radial-gradient(circle_at_top_left,_rgba(230,0,35,0.14),_transparent_35%),linear-gradient(135deg,_#14151a,_#232632)] p-6 text-white shadow-xl border border-black/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/55">Viewer Directory</p>
            <h2 className="mt-2 text-2xl md:text-3xl font-black tracking-tight">Clubs</h2>
            <p className="mt-1 text-sm text-white/70">Browse every listed club, then drill into their match history.</p>
          </div>
          <div className="relative w-full md:w-[360px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clubs, cities, grounds..."
              className="w-full rounded-2xl border border-white/10 bg-white/8 px-11 py-3 text-sm font-medium text-white placeholder:text-white/40 outline-none backdrop-blur-md"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <Card>
          <p className="py-10 text-center text-[#666666]">Loading clubs…</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-[#666666]">No clubs found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((club) => {
            const winRate = club.total_matches > 0 ? Math.round((club.won / club.total_matches) * 100) : 0;
            return (
              <button
                key={club.id}
                onClick={() => onNavigate('/club', club.id)}
                className="text-left rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-[#e60023]/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e60023]/10 text-[#e60023]">
                      <Trophy size={28} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900">{club.name}</h3>
                      <p className="text-xs font-semibold text-gray-500">{club.display_name || 'Club'}</p>
                    </div>
                  </div>
                  <Badge variant="role">{winRate}% win rate</Badge>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-gray-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Matches</p>
                    <p className="mt-1 text-xl font-black tabular-nums text-gray-900">{club.total_matches}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Won</p>
                    <p className="mt-1 text-xl font-black tabular-nums text-emerald-700">{club.won}</p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">Lost</p>
                    <p className="mt-1 text-xl font-black tabular-nums text-rose-700">{club.lost}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-1 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="truncate">{club.country || club.home_ground || 'Location not listed'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 text-xs font-bold uppercase tracking-wider text-[#e60023]">
                    <span>View matches</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
