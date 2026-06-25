import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { buildCommentarySocketUrl, commentaryKey, getCommentaryHistory, getRealtimeCommentaryConfig } from '../../../lib/commentaryApi';
import { CommentaryItem } from '../CommentaryItem';
import {
  batterLabel,
  ballOutcome,
  ballOutcomeClass,
  type ViewerScorecard,
} from './matchViewHelpers';

export async function fetchViewerScorecard(matchId: string): Promise<ViewerScorecard | null> {
  try {
    const res = await api.get(`/api/viewer/matches/${matchId}/scorecard`);
    return res.data as ViewerScorecard;
  } catch {
    return null;
  }
}

export function ViewerRecentDeliveries({
  scorecard,
  compact = false,
}: {
  scorecard: ViewerScorecard | null;
  compact?: boolean;
}) {
  const liveInnings =
    scorecard?.innings.find((inn) => inn.status === 'in_progress') ||
    scorecard?.innings[scorecard.innings.length - 1] ||
    null;
  const recentDeliveries = liveInnings?.recent_deliveries ?? [];

  return (
    <div className={compact ? '' : 'space-y-2'}>
      <p className="text-xs font-black uppercase tracking-wide text-gray-500">Recent Balls</p>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {recentDeliveries.length === 0 ? (
          <span className="text-xs font-bold text-gray-400">No deliveries recorded yet.</span>
        ) : (
          recentDeliveries.map((delivery, index) => {
            const previous = recentDeliveries[index - 1];
            const showOverLabel = !previous || previous.over_number !== delivery.over_number;
            const overRuns = recentDeliveries
              .filter((item) => item.over_number === delivery.over_number)
              .reduce((sum, item) => sum + item.runs_total, 0);
            return (
              <div key={delivery.delivery_id} className="flex items-center gap-2">
                {showOverLabel && (
                  <span className="shrink-0 text-[10px] font-black text-gray-400 uppercase tracking-wide border-l border-gray-300 pl-2">
                    Over {delivery.over_number} | {overRuns} runs
                  </span>
                )}
                <span
                  className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-black tabular-nums ${ballOutcomeClass(delivery)}`}
                >
                  {ballOutcome(delivery)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ViewerScorecardPanel({ matchId, refreshKey = 0 }: { matchId: string; refreshKey?: number }) {
  const [scorecard, setScorecard] = useState<ViewerScorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeInningsIndex, setActiveInningsIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchViewerScorecard(matchId)
      .then((data) => {
        if (cancelled) return;
        setScorecard(data);
        if (data?.innings.length) {
          const liveIdx = data.innings.findIndex((inn) => inn.status === 'in_progress');
          setActiveInningsIndex(liveIdx >= 0 ? liveIdx : data.innings.length - 1);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [matchId, refreshKey]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-500">Loading scorecard...</div>;
  }

  if (!scorecard || !scorecard.innings.length) {
    return <div className="p-8 text-center text-sm text-gray-500">No scorecard data available yet.</div>;
  }

  const inn = scorecard.innings[activeInningsIndex];

  return (
    <div className="space-y-6 animate-fadeIn overflow-y-auto h-full pb-6">
      {scorecard.innings.length > 1 && (
        <div className="flex gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm w-fit">
          {scorecard.innings.map((item, idx) => (
            <button
              key={item.innings_id}
              onClick={() => setActiveInningsIndex(idx)}
              className={`px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
                activeInningsIndex === idx ? 'bg-[#e60023] text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.batting_team_name}
            </button>
          ))}
        </div>
      )}

      {inn ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 shadow-sm overflow-hidden">
            <h4 className="text-base md:text-lg font-black text-gray-900 mb-4">🏏 {inn.batting_team_name} Batting Lineup</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 text-left font-bold bg-gray-50/50">
                    <th className="p-3">Batsman</th>
                    <th className="p-3">Status/Dismissal</th>
                    <th className="p-3 text-center">R</th>
                    <th className="p-3 text-center">B</th>
                    <th className="p-3 text-center">4s</th>
                    <th className="p-3 text-center">6s</th>
                    <th className="p-3 text-center">S/R</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inn.batting.map((b) => (
                    <tr key={b.player_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 font-bold text-gray-900">{batterLabel(b)}</td>
                      <td className="p-3 text-xs text-gray-500 italic font-medium">{b.dismissal}</td>
                      <td className="p-3 text-center font-black text-[#e60023] text-base">{b.runs}</td>
                      <td className="p-3 text-center font-medium text-gray-600">{b.balls}</td>
                      <td className="p-3 text-center text-gray-500">{b.fours}</td>
                      <td className="p-3 text-center text-gray-500">{b.sixes}</td>
                      <td className="p-3 text-center font-semibold text-gray-600">{b.strike_rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 shadow-sm">
            <h4 className="text-base md:text-lg font-black text-gray-900 mb-2">Yet to Bat</h4>
            <p className="text-sm font-medium text-gray-600">
              {inn.yet_to_bat.length > 0 ? inn.yet_to_bat.join(', ') : 'All listed batters have appeared'}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200 shadow-sm overflow-hidden">
            <h4 className="text-base md:text-lg font-black text-gray-900 mb-4">🥎 {inn.fielding_team_name} Bowling Spell</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 text-left font-bold bg-gray-50/50">
                    <th className="p-3">Bowler</th>
                    <th className="p-3 text-center">Overs</th>
                    <th className="p-3 text-center">Maidens</th>
                    <th className="p-3 text-center">Runs</th>
                    <th className="p-3 text-center">Wickets</th>
                    <th className="p-3 text-center">Econ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inn.bowling.map((b) => (
                    <tr key={b.player_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 font-bold text-gray-900">{b.name}</td>
                      <td className="p-3 text-center font-semibold text-gray-700">{b.overs}</td>
                      <td className="p-3 text-center text-gray-500">{b.maidens}</td>
                      <td className="p-3 text-center text-gray-600">{b.runs}</td>
                      <td className="p-3 text-center font-black text-green-600 text-base">{b.wickets}</td>
                      <td className="p-3 text-center font-medium text-gray-600">{b.economy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ViewerCommentaryPanel({ matchId, enabled }: { matchId: string; enabled: boolean }) {
  const [commentaryList, setCommentaryList] = useState<any[]>([]);
  const [isWsConnected, setIsWsConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let isMounted = true;

    const setup = async () => {
      if (!enabled) return;

      getCommentaryHistory(matchId)
        .then((fetchedData) => {
          if (isMounted) setCommentaryList(fetchedData);
        })
        .catch(() => {
          if (isMounted) setCommentaryList([]);
        });

      try {
        const realtime = await getRealtimeCommentaryConfig();
        if (!isMounted || !realtime.enabled || !realtime.realtimeUrl || !realtime.token) return;

        ws = new WebSocket(buildCommentarySocketUrl(realtime.realtimeUrl, matchId, realtime.token));
        ws.onopen = () => { if (isMounted) setIsWsConnected(true); };
        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            const newCommentary = payload.data ? payload.data : payload;
            setCommentaryList((prev) => {
              const safePrev = Array.isArray(prev) ? prev : [];
              if (safePrev.some((c) => commentaryKey(c, -1) === commentaryKey(newCommentary, -2))) return safePrev;
              return [newCommentary, ...safePrev];
            });
          } catch {
            /* ignore parse errors */
          }
        };
        ws.onclose = () => { if (isMounted) setIsWsConnected(false); };
      } catch {
        /* ignore ws setup errors */
      }
    };

    void setup();
    return () => {
      isMounted = false;
      ws?.close();
    };
  }, [enabled, matchId]);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6 animate-fadeIn h-full overflow-y-auto">
      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">🎙️ Live AI Commentary Stream</h3>
        {isWsConnected ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live
          </span>
        ) : (
          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
            Connecting...
          </span>
        )}
      </div>

      <div className="space-y-4 max-w-3xl">
        {!Array.isArray(commentaryList) || commentaryList.length === 0 ? (
          <p className="text-gray-500 text-sm italic">Waiting for commentary updates...</p>
        ) : (
          [...commentaryList]
            .filter((c) => c && c.is_visible !== false)
            .sort((a, b) => {
              const overA = a.over !== undefined ? a.over : (a.over_number ?? 0);
              const ballA = a.ball !== undefined ? a.ball : (a.ball_number ?? 0);
              const overB = b.over !== undefined ? b.over : (b.over_number ?? 0);
              const ballB = b.ball !== undefined ? b.ball : (b.ball_number ?? 0);
              if (overA !== overB) return overB - overA;
              return ballB - ballA;
            })
            .map((item, index) => {
              const taskStr = typeof item.task === 'string' ? item.task : '';
              const isWicket = taskStr.includes('wicket') || item.is_wicket;
              const isBoundary = taskStr.includes('boundary') || (item.runs !== undefined && item.runs >= 4);
              const overVal = item.over !== undefined ? item.over : (item.over_number ?? 0);
              const ballVal = item.ball !== undefined ? item.ball : (item.ball_number ?? 0);

              return (
                <div key={commentaryKey(item, index)} className="relative">
                  <CommentaryItem
                    overNumber={`Over ${overVal}.${ballVal}`}
                    bowler={item.bowler_name || item.bowler || 'Bowler'}
                    batter={item.batter_name || item.batter || 'Batter'}
                    runs={item.runs !== undefined ? item.runs : (item.runs_scored || 0)}
                    text={item.output || 'No commentary available'}
                    audioUrl={item.audio_url || item.audioUrl}
                    isWicket={isWicket}
                    isBoundary={isBoundary}
                  />
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}
