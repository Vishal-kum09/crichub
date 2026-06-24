import { api } from './api';

export interface ClubAnalyticsMatch {
  id: string;
  date: string;
  venue: string;
  status: string;
  format: string;
  host_club: string;
  opponent_club: string;
  label: string;
  team1_score: string | null;
  team2_score: string | null;
}

export interface ClubAnalyticsPlayer {
  id: string;
  name: string;
  role: string;
}

export interface MatchAnalysis {
  match_id: string;
  label: string;
  date: string;
  venue: string;
  format: string;
  status: string;
  manhattan: {
    innings1: { over: number; runs: number; wickets: number }[];
    innings2: { over: number; runs: number; wickets: number }[];
  };
  run_rate: {
    innings1: { over: number; run_rate: number }[];
    innings2: { over: number; run_rate: number }[];
  };
  extras: { wides: number; no_balls: number; byes: number; leg_byes: number; total: number };
  top_performers: { player_name: string; runs: number; balls: number; innings: number }[];
}

export interface ClubPlayerPerformance {
  player_id: string;
  batting: {
    total_runs: number;
    balls_faced: number;
    fours: number;
    sixes: number;
    fifties: number;
    hundreds: number;
    strike_rate: number;
    batting_average: number;
    matches_played: number;
    highest_score: number;
    match_history: { match_name: string; runs_scored: number; running_average: number }[];
  };
  bowling: {
    overs_bowled: string;
    wickets: number;
    runs_conceded: number;
    economy_rate: number;
    bowling_average: number;
    three_fers: number;
    five_fers: number;
    best_bowling_figures: string;
  };
}

export async function getClubAnalyticsMatches(): Promise<ClubAnalyticsMatch[]> {
  const { data } = await api.get('/api/club-analytics/matches');
  return data.matches ?? [];
}

export async function getClubAnalyticsPlayers(): Promise<ClubAnalyticsPlayer[]> {
  const { data } = await api.get('/api/club-analytics/players');
  return data.players ?? [];
}

export async function getClubMatchAnalysis(matchId: string): Promise<MatchAnalysis> {
  const { data } = await api.get(`/api/club-analytics/matches/${matchId}/analysis`);
  return data;
}

export async function getClubPlayerPerformance(playerId: string): Promise<ClubPlayerPerformance> {
  const { data } = await api.get(`/api/club-analytics/players/${playerId}/performance`);
  return data;
}
