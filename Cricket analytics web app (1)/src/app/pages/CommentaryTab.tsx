import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

interface CommentaryTabProps {
  matchId: string;
}

interface CommentaryItem {
  over: number;
  ball: number;
  commentary: string;
  event: string;
  runs: number;
}

export function CommentaryTab({ matchId }: CommentaryTabProps) {
  const [commentary, setCommentary] = useState<CommentaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/api/viewer/matches/${matchId}/commentary`)
      .then(res => setCommentary(res.data.commentary || []))
      .catch(() => toast.error('Failed to load commentary.'))
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading commentary...</div>;
  }

  if (commentary.length === 0) {
    return <div className="p-6 text-center text-gray-500">Commentary is not available for this match yet.</div>;
  }

  return (
    <div className="space-y-2">
      {commentary.map((item, index) => {
        const isWicket = item.event === 'wicket';
        const isBoundary = item.event === 'boundary';

        return (
          <div key={index} className="flex gap-4 items-start p-3 rounded-lg">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 font-black text-gray-600 text-sm">
              {item.over}.{item.ball}
            </div>
            <div className="flex-grow border-b border-gray-100 pb-3">
              <p className="text-sm text-gray-800 leading-relaxed">{item.commentary}</p>
              {(isWicket || isBoundary) && (
                <div className="mt-2">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${
                      isWicket
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {isWicket ? 'WICKET' : `${item.runs} RUNS`}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}