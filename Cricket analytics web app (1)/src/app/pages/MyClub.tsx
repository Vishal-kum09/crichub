import { useEffect, useState } from 'react';
import { Trophy, MapPin, CalendarDays, ArrowRight } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { fetchViewerClub } from '../../lib/viewerApi';

interface MyClubProps {
  clubId: string;
  onNavigate: (path: string, matchId?: string) => void;
}

type ClubDetailResponse = {
  id: string;
  name: string;
  display_name?: string;
  country?: string;
  home_ground?: string;
  total_matches: number;
  won: number;
  lost: number;
  matches: Array<{
    id: string;
    teamA: string;
    teamB: string;
    date: string;
    format: string;
    status: string;
    venue: string;
    result?: string;
    teamAScore?: string;
    teamBScore?: string;
    liveScore?: string;
  }>;
};

export function MyClub({ clubId, onNavigate }: MyClubProps) {
  const [club, setClub] = useState<ClubDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchViewerClub(clubId)
      .then((data) => {
        if (!cancelled) setClub(data);
      })
      .catch(() => {
        if (!cancelled) setClub(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  if (loading) {
    return (
      <Card>
        <p className="py-10 text-center text-[#666666]">Loading your club details…</p>
      </Card>
    );
  }

  if (!club) {
    return (
      <Card>
        <p className="py-10 text-center text-[#666666]">Your affiliated club could not be found.</p>
      </Card>
    );
  }

  const winRate = club.total_matches > 0 ? ((club.won / club.total_matches) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-18 w-18 items-center justify-center rounded-3xl bg-[#e60023]/10 text-[#e60023]">
              <Trophy size={36} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900">{club.name}</h2>
              <p className="mt-1 text-sm font-medium text-gray-500">{club.display_name || 'Club profile'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="role">Win rate {winRate}%</Badge>
                <Badge variant="role">{club.total_matches} matches</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:min-w-[320px]">
            <div className="rounded-2xl bg-gray-50 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Matches</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-gray-900">{club.total_matches}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Won</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-emerald-700">{club.won}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">Lost</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-rose-700">{club.lost}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
            <MapPin size={18} className="text-gray-400" />
            <span>{club.country || club.home_ground || 'Location not listed'}</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
            <CalendarDays size={18} className="text-gray-400" />
            <span>Recent fixtures ordered newest first</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-black text-gray-900">Match History</h3>
        {club.matches.length === 0 ? (
          <Card>
            <p className="py-8 text-center text-[#666666]">No matches found for this club.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {club.matches.map((match) => (
              <button
                key={match.id}
                onClick={() => onNavigate('/match', match.id)}
                className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-[#e60023]/30 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Badge>{match.format}</Badge>
                    <h4 className="mt-3 text-base font-black text-gray-900">{match.teamA} vs {match.teamB}</h4>
                    <p className="mt-1 text-sm text-gray-500">{match.venue || 'Venue not listed'}</p>
                  </div>
                  <ArrowRight size={18} className="text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}