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
  match_result?: 'won' | 'lost';
  match_type?: string;
  batter_id?: string;
  batter?: string;
  bat_field_first?: string;
  bowler?: string;
  bowler_style?: string;
  bowler_action?: string;
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
  run_rate_by_over: any[];

boundary_breakdown: {
  fours_count: number;
  sixes_count: number;
  boundary_balls: number;
  non_boundary_balls: number;
  boundary_pct: number;
};

bowling_stats: {
  wides: number;
  no_balls: number;
  leg_byes: number;
  dot_balls: number;
  legal_balls: number;
  wickets: number;
  innings: number;
  maiden_overs_pct: number;
  wickets_per_match: number;
};

fielding_stats: {
  catches_taken: number;
  runouts_effected: number;
  byes_conceded: number;
};

  partnership_maps: {
  batsman_a: string;
  batsman_b: string;
  runs: number;
  balls: number;
}[];

  bowling_economy_by_phase: {
    powerplay: number;
    middle: number;
    death: number;
  };

  wickets_by_phase: {
  powerplay: number;
  middle: number;
  death: number;
};

  top_scorers: any[];

  top_wicket_takers: any[];
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
  qualification: any[];
}

export interface MatchStreams {
  run_rate_by_over: { over_number: number; avg_runs: number }[];
  wicket_timeline: { over_number: number; wickets: number }[];
  extras_breakdown: { wides: number; no_balls: number; leg_byes: number; byes: number };
  boundary_breakdown: {
  fours_count: number;
  sixes_count: number;
  boundary_balls: number;
  non_boundary_balls: number;
  boundary_pct: number;
}
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

export async function getCoreAnalytics(filters?: any) {
  console.log('Sending Core Filters:', filters);

  const { data } = await api.post(
    '/api/analyst/core',
    filters || {}
  );

  return data;
}

export interface TeamOption {
  team_name: string;
}

export async function getTeams(): Promise<TeamOption[]> {
  const { data } = await api.get('/api/analyst/teams');
  return data;
}

export async function getBatters(
  homeTeam: string,
  batterStyle?: string
){
  const { data } =
    await api.get(
      '/api/analyst/batters',
      {
        params: {
  home_team_id: homeTeam,
  batter_style: batterStyle
}
      }
    );

  return data;
}

export async function getOppositionTeams(
  homeTeam?: string
) {
  const { data } = await api.get(
    "/api/analyst/opposition-teams",
    {
      params: {
        home_team_id: homeTeam
      }
    }
  );

  return data;
}

export const getVenues = async (
  filters: AnalystFilters = {}
) => {
  const { data } = await api.get(
    '/api/analyst/venues',
    {
      params: clean(filters)
    }
  );

  return data;
};

export interface BattingExecution {
  matches: number;
  innings: number;
  not_outs: number;
  runs: number;
  average: string;
  strike_rate: string;
  fifties: number;
  hundreds: number;
  highest_score: number;
}

export interface ScoreBreakdown {
  runs_from_1s: number;
  runs_from_2s: number;
  runs_from_4s: number;
  runs_from_6s: number;
}

export interface ShotDistribution {
  shot: number;
  count: number;
}
export async function getBattingExecution(filters: AnalystFilters = {}) {
  const { data } = await api.get(
    '/api/analyst/batting-execution',
    {
      params: clean(filters)
    }
  );

  return data as BattingExecution;
}

export async function getBattingExecutionCharts(filters?: any) {
  const { data } = await api.get(
    '/api/analyst/batting-execution/charts',
    {
      params: filters
    }
  );

  return data;
}

export async function getRunsPerWicket(
  filters: AnalystFilters = {}
) {
  const { data } = await api.get(
    '/api/analyst/batting-execution/runs-per-wicket',
    {
      params: clean(filters)
    }
  );

  return data;
}

export async function getBowlingExecution(
    filters: AnalystFilters={}
){
    const {data}=await api.get(
        "/api/analyst/bowling-execution",
        {
            params: clean(filters)
        }
    );

    return data;
}

export async function getBowlingExecutionCharts(
    filters: AnalystFilters = {}
){
    const { data } = await api.get(
        "/api/analyst/bowling-execution/charts",
        {
            params: clean(filters)
        }
    );

    return data;
}


export async function getBowlerTypes(homeTeam: string) {
    const { data } = await api.get(
        "/api/analyst/bowler-types",
        {
            params: {
                home_team_id: homeTeam
            }
        }
    );

    return data;
}

export async function getBattingKPIs(
  filters: AnalystFilters = {}
) {
  const { data } = await api.get(
    '/api/analyst/batting-execution/kpis',
    {
      params: clean(filters)
    }
  );

  return data;
}

export async function getTopCatchTakers(
  filters: AnalystFilters = {}
) {
  const { data } = await api.get(
    '/api/analyst/fielding/top-catch-takers',
    {
      params: clean(filters),
    }
  );

  return data;
}


export async function getPartnershipAnalysis(filters:any){
    const {data}=await api.get(
        "/api/analyst/batting-execution/partnership-analysis",
        {
            params: clean(filters)
        }
    );

    return data;
}

export async function getTopBatters(filters:any){
    const {data}=await api.get(
        "/api/analyst/batting-execution/top-batters",
        {
            params: clean(filters)
        }
    );

    return data;
}

export async function getScoreBreakdown(
  filters: AnalystFilters = {}
): Promise<ScoreBreakdown> {

  const { data } = await api.get(
    "/api/analyst/batting-execution/score-breakdown",
    {
      params: clean(filters)
    }
  );

  return {
    runs_from_1s: Number(data.runs_from_1s),
    runs_from_2s: Number(data.runs_from_2s),
    runs_from_4s: Number(data.runs_from_4s),
    runs_from_6s: Number(data.runs_from_6s),
  };
}

export async function getShotDistribution(
  filters: AnalystFilters = {}
): Promise<ShotDistribution[]> {

  const { data } = await api.get(
    "/api/analyst/batting-execution/shot-distribution",
    {
      params: clean(filters)
    }
  );

  return data.map((item: any) => ({
    shot: Number(item.shot),
    count: Number(item.count)
  }));
}

export async function getBowlers(
    homeTeam: string,
    bowlerType?: string,
    bowlerStyle?: string
) {

    const { data } = await api.get(
        "/api/analyst/bowlers",
        {
           params: {
    home_team_id: homeTeam,
    bowler_type: bowlerType,
    bowler_style: bowlerStyle
}
        }
    );

    return data;

}

export async function getBowlingScoreBreakdown(
  filters: AnalystFilters = {}
): Promise<ScoreBreakdown> {

  const { data } = await api.get(
    "/api/analyst/bowling-execution/score-breakdown",
    {
      params: clean(filters)
    }
  );

  return {
    runs_from_1s: Number(data.runs_from_1s),
    runs_from_2s: Number(data.runs_from_2s),
    runs_from_4s: Number(data.runs_from_4s),
    runs_from_6s: Number(data.runs_from_6s),
  };
}

export async function getBowlingShotDistribution(
  filters: AnalystFilters = {}
): Promise<ShotDistribution[]> {

  const { data } = await api.get(
    "/api/analyst/bowling-execution/shot-distribution",
    {
      params: clean(filters)
    }
  );

  return data.map((item: any) => ({
    shot: Number(item.shot),
    count: Number(item.count)
  }));
}

export async function getTopBowlers(filters: AnalystFilters = {}) {
  const { data } = await api.get(
    "/api/analyst/top-bowlers",
    {
      params: clean(filters),
    }
  );

  return data;
}

export async function getRunsStrikeRatePerWicket(
    filters: AnalystFilters={}
){
    const {data}=await api.get(
        "/api/analyst/bowling-execution/runs-strikerate-per-wicket",
        {
            params: clean(filters)
        }
    );

    return data;
}

export async function getMaxOver(filters: AnalystFilters = {}) {
  const { data } = await api.get(
    "/api/analyst/max-over",
    {
      params: clean(filters),
    }
  );

  return data;
}