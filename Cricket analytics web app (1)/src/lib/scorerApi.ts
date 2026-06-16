  // Typed client for the scorer backend (mounted at /api/scorer). Uses the shared
  // axios instance, which attaches the stored JWT and handles 401s globally.
  import { api } from './api';

  // ─── wire types (match the backend response/request shapes) ──────────────────

  export type ExtraType = 'None' | 'NB' | 'WD' | 'LB' | 'B';

  export type DismissalType =
    | 'Bowled' | 'Caught' | 'LBW' | 'Run Out' | 'Stumped'
    | 'Hit Wicket' | 'Retired Hurt' | 'Obstructing the Field';

  export interface InningsState {
    innings_id: string;
    match_id: string;
    status: string;
    total_runs: number;
    total_wickets: number;
    total_balls: number;
    overs_completed: number;
    balls_this_over: number;
    overs_display: string;
    extras: {
      wides: number;
      no_balls: number;
      leg_byes: number;
      byes: number;
      penalties: number;
      total: number;
    };
  }

  export interface BatterState {
    player_id: string;
    runs: number;
    balls_faced: number;
    fours: number;
    sixes: number;
    is_dismissed: boolean;
  }

  export interface BowlerState {
    player_id: string;
    balls_bowled: number;
    overs: string;
    runs_conceded: number;
    wickets: number;
  }

  export interface InitializePayload {
    batting_team_id: string;
    fielding_team_id: string;
    innings_number?: number;
    target_runs?: number;
    striker_id?: string;
    non_striker_id?: string;
    bowler_id?: string;
  }

  export interface InitializeResponse {
    innings: InningsState;
    overs_per_match: number | null;
    striker: BatterState | null;
    non_striker: BatterState | null;
    bowler: BowlerState | null;
  }

  export interface BallPayload {
    innings_id: string;
    runs_off_bat: number;        // 0..6
    extra_type: ExtraType;
    extra_runs: number;          // 0..5
    is_wicket: boolean;
    striker_id?: string;
    non_striker_id?: string;
    bowler_id?: string;
  }

  export interface BallResponse {
    ok: true;
    delivery: {
      id: string;
      over_number: number;
      ball_in_over: number;
      delivery_sequence: number;
      delivery_type: string;
      runs_batter: number;
      runs_extras: number;
      runs_total: number;
      is_wicket: boolean;
    };
    innings: InningsState;
    striker: BatterState | null;
    non_striker: BatterState | null;
    bowler: BowlerState | null;
    over_completed: boolean;
    innings_complete: boolean;
  }

  export interface WicketPayload {
    dismissed_player_id: string;
    dismissal_type: DismissalType;
    fielder_id?: string;
    incoming_batsman_id: string;
    innings_id?: string;
  }

  export interface WicketResponse {
    ok: true;
    dismissal: { id: string; type: string; wicket_number: number; dismissed_player_id: string } | null;
    retired_hurt: boolean;
    innings: InningsState;
    partnership: BatterState[];
    innings_complete: boolean;
  }

  export interface UndoResponse {
    ok: true;
    undone_delivery_id: string;
    innings: InningsState;
  }

  export interface AssignedMatch {
    id: string;
    match_date: string;
    start_time: string;
    scheduled_at: string;
    status: string;
    format: string;
    overs_per_match: number | null;
    venue: string;
    team1_name: string;
    team1_short_name: string;
    team2_name: string;
    team2_short_name: string;
    live_score?: string;
    accepted: boolean;
    assigned_at: string;
  }

  // ─── endpoint wrappers ───────────────────────────────────────────────────────

  export async function initializeMatch(
    matchId: string,
    payload: InitializePayload
  ): Promise<InitializeResponse> {
    const { data } = await api.post(`/api/scorer/matches/${matchId}/initialize`, payload);
    return data;
  }

  export async function recordBall(matchId: string, payload: BallPayload): Promise<BallResponse> {
    const { data } = await api.post(`/api/scorer/matches/${matchId}/ball`, payload);
    return data;
  }

  export async function wicketWizard(matchId: string, payload: WicketPayload): Promise<WicketResponse> {
    const { data } = await api.post(`/api/scorer/matches/${matchId}/wicket-wizard`, payload);
    return data;
  }

  export async function undoBall(matchId: string, inningsId?: string): Promise<UndoResponse> {
    const { data } = await api.post(`/api/scorer/matches/${matchId}/undo`, { innings_id: inningsId });
    return data;
  }

  export async function getAssignedMatches(): Promise<AssignedMatch[]> {
    const { data } = await api.get('/api/scorer/matches/assigned');
    return data.matches as AssignedMatch[];
  }

  export interface MatchPreview {
    match_id: string;
    team1_id: string;
    team2_id: string;
    team1_name: string;
    team2_name: string;
    venue: string;
    ground: string;
    country: string;
    format: string;
    total_overs: number;
    overs_per_bowler: number;
    status: string;
    team1_roster: { id: string; name: string; role: string }[];
    team2_roster: { id: string; name: string; role: string }[];
  }

  export interface CompletedScorerMatch {
    id: string;
    team1_name: string;
    team2_name: string;
    format: string;
    venue: string;
    date: string;
    status: string;
    result_summary?: string;
    team1_score?: string;
    team2_score?: string;
  }

  export async function getMatchPreview(matchId: string): Promise<MatchPreview> {
    const { data } = await api.get(`/api/scorer/matches/${matchId}/preview`);
    return data;
  }

  export async function getCompletedMatches(): Promise<CompletedScorerMatch[]> {
    const { data } = await api.get('/api/scorer/my-completed-matches');
    return data.matches as CompletedScorerMatch[];
  }

  // ─── helpers ─────────────────────────────────────────────────────────────────

  // Map the console's local extra-type union onto the backend enum. 'penalty' has
  // no slot in the backend ball schema, so it falls back to 'None'.
  export function toExtraType(local: string | null): ExtraType {
    switch (local) {
      case 'wide': return 'WD';
      case 'no-ball': return 'NB';
      case 'bye': return 'B';
      case 'leg-bye': return 'LB';
      default: return 'None';
    }
  }

  // ─── live session bridge ─────────────────────────────────────────────────────
  // The app uses a hand-rolled router that only threads matchId to the console, so
  // MatchSetup stashes the initialized innings here for ScorerConsole to pick up.
  export interface LiveSession {
    matchId: string;
    inningsId: string;
    strikerId?: string;
    nonStrikerId?: string;
    bowlerId?: string;
    playerNames?: { [key: string]: string };
    battingRoster?: string[];
    fieldingRoster?: string[];
    playerIdMap?: { [name: string]: string }; 
}
  

  let liveSession: LiveSession | null = null;
  export const setLiveSession = (s: LiveSession | null): void => { liveSession = s; };
  export const getLiveSession = (): LiveSession | null => liveSession;
