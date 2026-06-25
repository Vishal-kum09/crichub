import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';

interface ScorecardTabProps {
  matchId: string;
}

interface BattingStat {
  player_name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strike_rate: string;
  dismissal_comment: string;
}

interface BowlingStat {
  player_name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: string;
}

interface InningsCard {
  innings_number: number;
  batting_team_name: string;
  total_runs: number;
  total_wickets: number;
  total_overs: string;
  batting: BattingStat[];
  bowling: BowlingStat[];
  extras: {
    total: number;
    wides: number;
    no_balls: number;
    byes: number;
    leg_byes: number;
  };
  fall_of_wickets: {
    player_name: string;
    score: number;
    over: number;
  }[];
  yet_to_bat: string[];
}

interface ScorecardData {
  match_title: string;
  result: string;
  innings: InningsCard[];
}

export function ScorecardTab({ matchId }: ScorecardTabProps) {
  const [scorecard, setScorecard] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/api/viewer/matches/${matchId}/scorecard`)
      .then(res => setScorecard(res.data))
      .catch(() => toast.error('Failed to load scorecard.'))
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading scorecard...</div>;
  }

  if (!scorecard || scorecard.innings.length === 0) {
    return <div className="p-6 text-center text-gray-500">Scorecard data is not available for this match yet.</div>;
  }

  return (
    <div className="space-y-6">
      {scorecard.innings.map(inning => (
        <div key={inning.innings_number} className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-gray-200">
          <div className="border-b border-gray-200 pb-3 mb-4">
            <h3 className="text-lg font-bold text-gray-900">{inning.batting_team_name}</h3>
            <p className="text-2xl font-black text-gray-800">
              {inning.total_runs}/{inning.total_wickets} <span className="text-lg font-bold text-gray-500">({inning.total_overs} Overs)</span>
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-black uppercase text-gray-500 mb-2">Batting</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-gray-500">
                    <tr>
                      <th className="p-2">Batsman</th>
                      <th className="p-2">Dismissal</th>
                      <th className="p-2 text-right">R</th>
                      <th className="p-2 text-right">B</th>
                      <th className="p-2 text-right">4s</th>
                      <th className="p-2 text-right">6s</th>
                      <th className="p-2 text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inning.batting.map((batter, i) => (
                      <tr key={i}>
                        <td className="p-2 font-bold text-gray-800">{batter.player_name}</td>
                        <td className="p-2 text-gray-600 text-xs">{batter.dismissal_comment}</td>
                        <td className="p-2 font-bold text-right">{batter.runs}</td>
                        <td className="p-2 text-right">{batter.balls}</td>
                        <td className="p-2 text-right">{batter.fours}</td>
                        <td className="p-2 text-right">{batter.sixes}</td>
                        <td className="p-2 text-right">{batter.strike_rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase text-gray-500 mb-2">Bowling</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-gray-500">
                    <tr>
                      <th className="p-2">Bowler</th>
                      <th className="p-2 text-right">O</th>
                      <th className="p-2 text-right">M</th>
                      <th className="p-2 text-right">R</th>
                      <th className="p-2 text-right">W</th>
                      <th className="p-2 text-right">Econ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inning.bowling.map((bowler, i) => (
                      <tr key={i}>
                        <td className="p-2 font-bold text-gray-800">{bowler.player_name}</td>
                        <td className="p-2 font-bold text-right">{bowler.overs}</td>
                        <td className="p-2 text-right">{bowler.maidens}</td>
                        <td className="p-2 text-right">{bowler.runs}</td>
                        <td className="p-2 font-bold text-right">{bowler.wickets}</td>
                        <td className="p-2 text-right">{bowler.economy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}