export interface BattingRow {
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

export interface BowlingRow {
  player_id: string;
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface RecentDelivery {
  delivery_id: string;
  over_number: number;
  ball_in_over: number;
  delivery_sequence: number;
  bowler_id: string;
  batter_id: string;
  non_striker_id: string;
  delivery_type: string;
  runs_batter: number;
  runs_extras: number;
  runs_total: number;
  is_wicket: boolean;
  is_boundary_four: boolean;
  is_boundary_six: boolean;
  extra_type: string | null;
}

export interface ViewerInnings {
  innings_id: string;
  innings_number: number;
  batting_team_name: string;
  fielding_team_name: string;
  status: string;
  total: { runs: number; wickets: number; balls: number };
  target_runs?: number;
  extras: { total: number; no_balls: number; wides: number; byes: number; leg_byes: number };
  batting: BattingRow[];
  bowling: BowlingRow[];
  fall_of_wickets: unknown[];
  yet_to_bat: string[];
  recent_deliveries?: RecentDelivery[];
}

export interface ViewerScorecard {
  match_id: string;
  status: string;
  venue: string;
  date: string;
  format: string;
  total_overs?: number;
  competition: string;
  team1_name: string;
  team2_name: string;
  result_summary: string | null;
  innings: ViewerInnings[];
}

export const oversFromBalls = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

export const batterLabel = (b: BattingRow) =>
  `${b.name}${b.is_captain ? ' (©)' : ''}${b.is_wicket_keeper ? ' (WK)' : ''}`;

export const extraLabel = (type: string | null) => {
  const map: Record<string, string> = { wide: 'WD', no_ball: 'NB', bye: 'B', leg_bye: 'LB', penalty: 'P' };
  return type ? (map[type] || type.replace(/_/g, ' ').toUpperCase()) : 'EX';
};

export const ballOutcome = (delivery: RecentDelivery) => {
  if (delivery.is_wicket) return 'W';
  if (delivery.is_boundary_six) return '6';
  if (delivery.is_boundary_four) return '4';
  if (delivery.runs_extras > 0) return `${delivery.runs_total}${extraLabel(delivery.extra_type)}`;
  return delivery.runs_batter === 0 ? '•' : String(delivery.runs_batter);
};

export const ballOutcomeClass = (delivery: RecentDelivery) => {
  if (delivery.is_wicket) return 'bg-red-600 text-white';
  if (delivery.is_boundary_six) return 'bg-purple-600 text-white';
  if (delivery.is_boundary_four) return 'bg-green-600 text-white';
  if (delivery.runs_extras > 0) return 'bg-gray-200 text-gray-700';
  return 'bg-gray-100 text-gray-600';
};
