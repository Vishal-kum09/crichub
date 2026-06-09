// Typed client for the player self-stats endpoint and the analyst nv_play
// aggregation streams. Uses the shared axios instance (attaches the JWT).
import { api } from './api';

// ─── player my-performances ──────────────────────────────────────────────────

export interface BattingStats {
  total_runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  fifties: number;
  hundreds: number;
  double_hundreds: number;
  strike_rate: number;
  batting_average: number;
  matches_played: number;
  innings_batted: number;
  highest_score: number;
  dot_balls_faced: number;
}

export interface BowlingStats {
  overs_bowled: string;
  maidens: number;
  runs_conceded: number;
  wickets: number;
  dot_balls: number;
  economy_rate: number;
  bowling_average: number;
  three_fers: number;
  five_fers: number;
  matches_bowled: number;
  best_bowling_figures: string;
}

export interface MyPerformances {
  resolved: boolean;
  player_id: string | null;
  batting: BattingStats;
  bowling: BowlingStats;
}

export async function getMyPerformances(): Promise<MyPerformances> {
  const { data } = await api.get('/api/player/my-performances');
  return data;
}

// ─── analyst filters + stream responses ──────────────────────────────────────

export interface AnalystFilters {
  tournament_id?: string;
  home_team_id?: string;
  opposition_team_id?: string;
  home_away?: 'home' | 'away' | 'neutral';
  toss_result?: 'won' | 'lost';
  match_type?: string;
  batter_id?: string;
  bowler_id?: string;
  bowler_type?: string;
  batter_hand?: string;
  bowler_hand?: string;
  venue?: string;
  date_from?: string;
  date_to?: string;
  over_min?: number;
  over_max?: number;
}

export interface PhaseValues { powerplay: number; middle: number; death: number }

export interface TeamStreams {
  run_rate_by_over: { over_number: number; avg_runs: number }[];
  boundary_breakdown: { fours_count: number; sixes_count: number; boundary_pct: number };
  partnership_maps: { batsman_a: string; batsman_b: string; runs: number; balls: number }[];
  bowling_economy_by_phase: PhaseValues;
  top_scorers: { player_name: string; runs: number; innings: number }[];
  top_wicket_takers: { player_name: string; wickets: number; economy: number }[];
}

export interface PlayerStreams {
  strike_rate_by_phase: PhaseValues;
  dot_ball_index: { over_number: number; dot_ball_pct: number }[];
  dismissal_patterns: { dismissal_type: string; count: number; pct: number }[];
  head_to_head: { bowler_name: string; balls: number; runs: number; dismissals: number }[];
  recent_form: { match: string; innings: number; date: string; score: number }[];
}

export interface TournamentStreams {
  points_table: { team: string; played: number; won: number; lost: number; points: number; nrr: number }[];
  top_scorers: { player_name: string; runs: number; innings: number; average: number }[];
  top_wicket_takers: { player_name: string; wickets: number; matches: number; economy: number }[];
  venue_stats: { venue: string; matches_played: number; avg_innings_total: number }[];
}

export interface MatchStreams {
  run_rate_by_over: { over_number: number; avg_runs: number }[];
  wicket_timeline: { over_number: number; wickets: number }[];
  extras_breakdown: { wides: number; no_balls: number; leg_byes: number; byes: number };
  boundary_breakdown: { fours_count: number; sixes_count: number; boundary_pct: number };
  innings_totals: { match: string; innings: number; batting_team: string; total_runs: number; wickets: number }[];
}

// Drop undefined/empty values so only active filters become query params.
function clean(filters: AnalystFilters): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v as string | number;
  }
  return out;
}

export async function getTeamStreams(filters: AnalystFilters = {}): Promise<TeamStreams> {
  const { data } = await api.get('/api/analyst/nvplay-streams/team', { params: clean(filters) });
  return data;
}

export async function getPlayerStreams(filters: AnalystFilters = {}): Promise<PlayerStreams> {
  const { data } = await api.get('/api/analyst/nvplay-streams/player', { params: clean(filters) });
  return data;
}

export async function getTournamentStreams(filters: AnalystFilters = {}): Promise<TournamentStreams> {
  const { data } = await api.get('/api/analyst/nvplay-streams/tournament', { params: clean(filters) });
  return data;
}

export async function getMatchStreams(filters: AnalystFilters = {}): Promise<MatchStreams> {
  const { data } = await api.get('/api/analyst/nvplay-streams/match', { params: clean(filters) });
  return data;
}
