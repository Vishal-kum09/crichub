import { useEffect, useState } from 'react';
import { Badge, StatusBadge } from '../components/Badge';
import { getAssignedMatches, getCompletedMatches } from '../../lib/scorerApi';
import { ClipboardList, CheckCircle2, MapPin, Calendar, ArrowRight } from 'lucide-react';

interface ScorerDashboardProps {
  onNavigate: (path: string, matchId?: string) => void;
}

export function ScorerDashboard({ onNavigate }: ScorerDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'assigned' | 'completed'>('assigned');
  const [assignedMatches, setAssignedMatches] = useState<Awaited<ReturnType<typeof getAssignedMatches>>>([]);
  const [completedMatches, setCompletedMatches] = useState<Awaited<ReturnType<typeof getCompletedMatches>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getAssignedMatches(), getCompletedMatches()])
      .then(([assigned, completed]) => {
        if (!cancelled) {
          setAssignedMatches(assigned);
          setCompletedMatches(completed);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load scorer assignments from the server.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-gray-500 font-semibold">Syncing Scoring Console Datasets...</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto text-black">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900">Scoring Hub Console</h2>
          <p className="text-sm text-gray-500">Initialize dynamic matches and view archived scoring scorecards</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-bold">⚠️ {error}</div>
      )}

      <div className="flex border-b border-gray-200 bg-white p-1 rounded-xl shadow-sm max-w-md">
        <button
          onClick={() => setActiveSubTab('assigned')}
          className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'assigned'
              ? 'bg-[#e60023] text-white shadow-md'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <ClipboardList size={16} />
          Assigned Duties ({assignedMatches.length})
        </button>
        <button
          onClick={() => setActiveSubTab('completed')}
          className={`flex-1 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'completed'
              ? 'bg-[#e60023] text-white shadow-md'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <CheckCircle2 size={16} />
          My Matches ({completedMatches.length})
        </button>
      </div>

      <div className="pt-2">
        {activeSubTab === 'assigned' && (
          <div className="space-y-4">
            {assignedMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedMatches.map((match) => (
                  <div key={match.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Badge>{match.format}</Badge>
                        <StatusBadge status={match.status as any} />
                      </div>
                      <h3 className="font-black text-gray-900 text-base lg:text-lg">
                        {match.team1_name} <span className="text-gray-400 font-normal">vs</span> {match.team2_name}
                      </h3>
                      <div className="space-y-1 text-xs text-gray-500 font-bold">
                        <p className="flex items-center gap-1.5"><MapPin size={14} /> {match.venue}</p>
                        <p className="flex items-center gap-1.5">
                          <Calendar size={14} /> {new Date(match.scheduled_at || match.match_date).toLocaleDateString()}
                        </p>
                      </div>
                      {match.live_score && (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-wider font-black text-emerald-700">Live Score</p>
                          <p className="text-2xl font-black text-gray-900 tabular-nums">{match.live_score}</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onNavigate(match.status === 'live' ? '/scorer' : '/match-setup', match.id)}
                      className="w-full mt-2 py-2.5 bg-[#e60023] text-white rounded-xl text-sm font-bold shadow-md hover:bg-red-700 transition-all flex items-center justify-center gap-1.5 group"
                    >
                      {match.status === 'live' ? 'Resume Scoring' : 'Start Live Scoring'}
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-dashed rounded-2xl text-gray-400 font-semibold text-sm">
                No active fixtures currently dispatched by Club Administrators.
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'completed' && (
          <div className="space-y-4 max-w-4xl">
            {completedMatches.length > 0 ? (
              completedMatches.map((match) => (
                <div
                  key={match.id}
                  onClick={() => onNavigate('/match', match.id)}
                  className="bg-white border border-gray-200 hover:border-gray-300 p-5 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black tracking-wider uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                        {match.format}
                      </span>
                      <span className="text-xs text-gray-400 font-bold">
                        📅 {new Date(match.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-xl">
                      <div>
                        <p className="font-extrabold text-gray-900 text-sm md:text-base">{match.team1_name}</p>
                        <p className="text-xs text-gray-500 font-bold mt-0.5">{match.team1_score || '—'}</p>
                      </div>
                      <span className="text-xs font-bold text-gray-300 hidden sm:block">VS</span>
                      <div className="sm:text-right">
                        <p className="font-extrabold text-gray-900 text-sm md:text-base">{match.team2_name}</p>
                        <p className="text-xs text-gray-500 font-bold mt-0.5">{match.team2_score || '—'}</p>
                      </div>
                    </div>
                    {match.result_summary && (
                      <p className="text-xs md:text-sm text-emerald-600 font-extrabold italic pt-1 border-t border-gray-50 w-fit">
                        🏆 {match.result_summary}
                      </p>
                    )}
                  </div>
                  <div className="text-left sm:text-right text-xs text-gray-400 font-semibold border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                    <span className="bg-gray-100 text-gray-600 font-black px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider block w-fit sm:ml-auto mb-2">
                      Archived Logs
                    </span>
                    <p className="truncate max-w-[200px]">📍 {match.venue}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-white border border-dashed rounded-2xl text-gray-400 font-semibold text-sm">
                You haven't completed or locked any match sheets yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
