import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';

interface MatchDetailProps {
  matchId: string;
  onNavigate: (path: string) => void;
}

// Shapes returned by GET /api/viewer/matches/:id/scorecard.
interface BattingRow {
  player_id: string;
  name: string;
  dismissal: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strike_rate: number;
  is_captain: boolean;
  is_wicket_keeper: boolean;
}
interface BowlingRow {
  player_id: string;
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}
interface FowRow {
  wicket_number: number;
  score_at_fall: number;
  over_at_fall: number;
  dismissed_player: string;
}
interface Innings {
  innings_id: string;
  innings_number: number;
  batting_team_name: string;
  fielding_team_name: string;
  status: string;
  total: { runs: number; wickets: number; balls: number };
  extras: { total: number; no_balls: number; wides: number; byes: number; leg_byes: number };
  batting: BattingRow[];
  bowling: BowlingRow[];
  fall_of_wickets: FowRow[];
  yet_to_bat: string[];
}
interface Scorecard {
  match_id: string;
  status: string;
  venue: string;
  date: string;
  format: string;
  competition: string;
  team1_name: string;
  team2_name: string;
  result_summary: string | null;
  innings: Innings[];
}

// Render a legal-ball count as an "overs.balls" string (6 balls per over).
const oversFromBalls = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

// A batter's display name, annotated with captain (©) / wicket-keeper (WK).
const batterLabel = (b: BattingRow) =>
  `${b.name}${b.is_captain ? ' (©)' : ''}${b.is_wicket_keeper ? ' (WK)' : ''}`;

export function MatchDetail({ matchId, onNavigate }: MatchDetailProps) {
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'scorecard' | 'stats'>('overview');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/api/viewer/matches/${matchId}/scorecard`)
      .then((res) => {
        if (!cancelled) setScorecard(res.data);
      })
      .catch(() => {
        if (!cancelled) setScorecard(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (loading) {
    return <div className="p-6"><p className="text-center text-[#666666]">Loading match…</p></div>;
  }

  if (!scorecard) {
    return <div className="p-6"><p className="text-center text-[#666666]">Match not found</p></div>;
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'scorecard' as const, label: 'Scorecard' },
    { id: 'stats' as const, label: 'Stats' },
  ];

  // Innings score line for a named team (empty if the team has not batted).
  const scoreFor = (teamName: string) => {
    const inn = scorecard.innings.find((i) => i.batting_team_name === teamName);
    if (!inn) return null;
    return `${inn.total.runs}/${inn.total.wickets} (${oversFromBalls(inn.total.balls)})`;
  };

  const team1Score = scoreFor(scorecard.team1_name);
  const team2Score = scoreFor(scorecard.team2_name);

  // Aggregate stats across all innings for the Stats tab.
  const totalFours = scorecard.innings.reduce((a, i) => a + i.batting.reduce((x, b) => x + b.fours, 0), 0);
  const totalSixes = scorecard.innings.reduce((a, i) => a + i.batting.reduce((x, b) => x + b.sixes, 0), 0);
  const totalExtrasAll = scorecard.innings.reduce((a, i) => a + i.extras.total, 0);

  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* Back Button */}
      <div className="p-4 bg-white border-b border-[#e0e0e0]">
        <button
          onClick={() => onNavigate('/matches')}
          className="flex items-center gap-2 text-[#e60023] hover:underline"
        >
          <ArrowLeft size={18} />
          <span>Back to Matches</span>
        </button>
      </div>

      {/* Match Overview Banner */}
      <div className="bg-white border-b border-[#e0e0e0]">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <div className="text-sm text-[#666666] mb-1">{scorecard.team1_name}</div>
              <div className="text-2xl font-bold text-[#1a1a1a]">{team1Score || '—'}</div>
            </div>
            <div className="px-4 text-lg font-semibold text-[#666666]">vs</div>
            <div className="flex-1 text-right">
              <div className="text-sm text-[#666666] mb-1">{scorecard.team2_name}</div>
              <div className="text-2xl font-bold text-[#1a1a1a]">{team2Score || '—'}</div>
            </div>
          </div>
          <div className="bg-[#f9f9f9] rounded-lg p-2 text-center text-sm text-[#666666]">
            {scorecard.result_summary || scorecard.status}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-white border-b border-[#e0e0e0]">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? 'text-[#e60023]' : 'text-[#666666] hover:text-[#1a1a1a]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e60023]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 md:p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl p-4 md:p-6 border border-[#e0e0e0]">
            <h3 className="text-base md:text-lg font-semibold text-[#1a1a1a] mb-4">Match Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#666666]">Venue</p>
                <p className="font-medium text-[#1a1a1a]">{scorecard.venue || '—'}</p>
              </div>
              <div>
                <p className="text-[#666666]">Date</p>
                <p className="font-medium text-[#1a1a1a]">
                  {scorecard.date ? new Date(scorecard.date).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-[#666666]">Format</p>
                <p className="font-medium text-[#1a1a1a]">{scorecard.format}</p>
              </div>
              <div>
                <p className="text-[#666666]">Competition</p>
                <p className="font-medium text-[#1a1a1a]">{scorecard.competition || '—'}</p>
              </div>
              <div>
                <p className="text-[#666666]">Status</p>
                <p className="font-medium text-[#1a1a1a]">{scorecard.status}</p>
              </div>
              <div>
                <p className="text-[#666666]">Result</p>
                <p className="font-medium text-[#1a1a1a]">{scorecard.result_summary || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Scorecard Tab */}
        {activeTab === 'scorecard' && (
          <div className="space-y-4 md:space-y-6">
            {scorecard.innings.length === 0 && (
              <div className="bg-white rounded-xl p-6 border border-[#e0e0e0] text-center text-[#666666]">
                No scorecard available yet.
              </div>
            )}

            {scorecard.innings.map((inn) => (
              <div key={inn.innings_id} className="space-y-4 md:space-y-6">
                {/* Batting */}
                <div className="bg-white rounded-xl p-4 md:p-6 border border-[#e0e0e0]">
                  <h3 className="text-base md:text-lg font-semibold text-[#1a1a1a] mb-4">
                    {inn.batting_team_name} Innings
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#e0e0e0]">
                          <th className="text-left py-2 font-semibold text-[#666666]">Batsman</th>
                          <th className="text-left py-2 font-semibold text-[#666666]">Dismissal</th>
                          <th className="text-center py-2 font-semibold text-[#666666]">R</th>
                          <th className="text-center py-2 font-semibold text-[#666666]">B</th>
                          <th className="text-center py-2 font-semibold text-[#666666]">4s</th>
                          <th className="text-center py-2 font-semibold text-[#666666]">6s</th>
                          <th className="text-center py-2 font-semibold text-[#666666]">S/R</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inn.batting.map((b) => (
                          <tr key={b.player_id} className="border-b border-[#f0f0f0]">
                            <td className="py-2 font-medium text-[#1a1a1a]">{batterLabel(b)}</td>
                            <td className="py-2 text-[#666666]">{b.dismissal}</td>
                            <td className="py-2 text-center font-semibold text-[#1a1a1a]">{b.runs}</td>
                            <td className="py-2 text-center text-[#666666]">{b.balls}</td>
                            <td className="py-2 text-center text-[#666666]">{b.fours}</td>
                            <td className="py-2 text-center text-[#666666]">{b.sixes}</td>
                            <td className="py-2 text-center text-[#666666]">{b.strike_rate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Extras and Total */}
                  <div className="mt-4 pt-4 border-t border-[#e0e0e0] space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#666666]">Extras</span>
                      <span className="font-semibold text-[#1a1a1a]">
                        {inn.extras.total} (NB {inn.extras.no_balls}, WD {inn.extras.wides}, LB{' '}
                        {inn.extras.leg_byes}, B {inn.extras.byes})
                      </span>
                    </div>
                    <div className="flex justify-between text-base">
                      <span className="font-semibold text-[#1a1a1a]">Total</span>
                      <span className="font-bold text-[#e60023]">
                        {inn.total.runs}/{inn.total.wickets} ({oversFromBalls(inn.total.balls)} overs)
                      </span>
                    </div>
                  </div>

                  {/* Yet to Bat */}
                  {inn.yet_to_bat.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#e0e0e0]">
                      <p className="text-sm font-semibold text-[#666666] mb-2">Yet to Bat</p>
                      <p className="text-sm text-[#1a1a1a]">{inn.yet_to_bat.join(', ')}</p>
                    </div>
                  )}

                  {/* Fall of Wickets */}
                  {inn.fall_of_wickets.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#e0e0e0]">
                      <p className="text-sm font-semibold text-[#666666] mb-2">Fall of Wickets</p>
                      <div className="space-y-1">
                        {inn.fall_of_wickets.map((f) => (
                          <p key={f.wicket_number} className="text-sm text-[#1a1a1a]">
                            {f.wicket_number}-{f.score_at_fall} ({f.dismissed_player}, {f.over_at_fall} ov)
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bowling */}
                <div className="bg-white rounded-xl p-4 md:p-6 border border-[#e0e0e0]">
                  <h3 className="text-base md:text-lg font-semibold text-[#1a1a1a] mb-4">
                    {inn.fielding_team_name} Bowling
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#e0e0e0]">
                          <th className="text-left py-2 font-semibold text-[#666666]">Bowling</th>
                          <th className="text-center py-2 font-semibold text-[#666666]">O</th>
                          <th className="text-center py-2 font-semibold text-[#666666]">M</th>
                          <th className="text-center py-2 font-semibold text-[#666666]">R</th>
                          <th className="text-center py-2 font-semibold text-[#666666]">W</th>
                          <th className="text-center py-2 font-semibold text-[#666666]">Econ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inn.bowling.map((b) => (
                          <tr key={b.player_id} className="border-b border-[#f0f0f0]">
                            <td className="py-2 font-medium text-[#1a1a1a]">{b.name}</td>
                            <td className="py-2 text-center text-[#666666]">{b.overs}</td>
                            <td className="py-2 text-center text-[#666666]">{b.maidens}</td>
                            <td className="py-2 text-center text-[#666666]">{b.runs}</td>
                            <td className="py-2 text-center font-semibold text-[#e60023]">{b.wickets}</td>
                            <td className="py-2 text-center text-[#666666]">{b.economy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="bg-white rounded-xl p-4 md:p-6 border border-[#e0e0e0]">
            <h3 className="text-base md:text-lg font-semibold text-[#1a1a1a] mb-4">Match Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#666666] mb-1">Boundaries</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">
                  {totalFours} (4s) + {totalSixes} (6s)
                </p>
              </div>
              <div>
                <p className="text-[#666666] mb-1">Total Extras</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">{totalExtrasAll}</p>
              </div>
              <div>
                <p className="text-[#666666] mb-1">Innings</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">{scorecard.innings.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
