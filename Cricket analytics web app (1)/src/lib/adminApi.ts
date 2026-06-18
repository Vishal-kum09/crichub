// Typed client for the club-admin and super-admin backends. Uses the shared
// axios instance (attaches the JWT, handles 401s globally).
import { api } from './api';

// ─── club-admin types ────────────────────────────────────────────────────────

export interface PendingApproval {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;   // lowercased account_role (player/scorer/analyst/…)
  date: string;
}

export type AssignedRole = 'Player' | 'Scorer' | 'Analyst' | 'Umpire';

export interface RosterMatch {
  id: string;
  opponent: string;
  date: string;
  venue: string;
  status: string;
  team1_score?: string;
  team2_score?: string;
  live_score?: string;
}

export interface RosterMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  below_18?: boolean;
}

export interface CreateMatchPayload {
  match_type: 'cross_club' | 'local';
  opponent_club_id?: string;
  venue: string;
  scheduled_at: string;   // ISO datetime
  total_overs: number;
  team1_id?: string;
  team2_id?: string;
}

export interface CreateTournamentPayload {
  tournament_name: string;
  tournament_type: 'Knockout' | 'League' | 'RoundRobin';
  overs_limit: number;
  max_teams: number;
  start_date?: string;
  end_date?: string;
}

// ─── super-admin types ───────────────────────────────────────────────────────

export interface ClubSummary {
  id: string;
  name: string;
  location: string;
  members: number;
  matches: number;
  status: string;
  registeredDate: string;
}

export interface ClubMember {
  id: string;
  name: string;
  role: string;
  email: string;
  status: string;
}

export interface PendingClub {
  id: string;
  type: string;
  name: string;
  admin: string;
  email: string;
  location: string;
  date: string;
}

// ─── club-admin endpoints ────────────────────────────────────────────────────

export async function getPendingApprovals(): Promise<PendingApproval[]> {
  const { data } = await api.get('/api/club-admin/approvals/pending');
  return data.approvals as PendingApproval[];
}

export async function decideApproval(
  userId: string,
  action: 'APPROVE' | 'REJECT',
  assignedRole?: AssignedRole
): Promise<void> {
  await api.put(`/api/club-admin/approvals/${userId}`, {
    action,
    ...(assignedRole ? { assigned_role: assignedRole } : {}),
  });
}

export async function createMatch(payload: CreateMatchPayload): Promise<{ match_id: string }> {
  const { data } = await api.post('/api/club-admin/matches', payload);
  return data;
}

export async function createTournament(
  payload: CreateTournamentPayload
): Promise<{ tournament_id: string }> {
  const { data } = await api.post('/api/club-admin/tournaments', payload);
  return data;
}

export async function getRosterMatches(): Promise<RosterMatch[]> {
  const { data } = await api.get('/api/club-admin/roster/matches');
  return data.matches as RosterMatch[];
}

export async function getRosterPlayers(): Promise<RosterMember[]> {
  const { data } = await api.get('/api/club-admin/roster/players');
  return data.players as RosterMember[];
}

export async function getRosterScorers(): Promise<RosterMember[]> {
  const { data } = await api.get('/api/club-admin/roster/scorers');
  return data.scorers as RosterMember[];
}

// ─── super-admin endpoints (FIXED ALIGNMENT FOR FRESH ARCTITECTURE 🚀) ───────────────────────────

export async function getClubs(): Promise<ClubSummary[]> {
  const { data } = await api.get('/api/super-admin/clubs');
  return data as ClubSummary[];
}

export async function getClubMembers(clubId: string): Promise<ClubMember[]> {
  const { data } = await api.get(`/api/super-admin/clubs/${clubId}/members`);
  return data as ClubMember[];
}

export async function getSuperPendingApprovals(): Promise<PendingClub[]> {
  const { data } = await api.get('/api/super-admin/approvals/pending');
  return data as PendingClub[];
}

export async function approveClub(clubId: string): Promise<void> {
  await api.put(`/api/super-admin/clubs/${clubId}/approve`);
}

// 🔥 MATCH WIZARD DROPDOWN FIX: Safely extracts and normalizes payload regardless of database column key variations
export async function getGlobalApprovedClubs(): Promise<any[]> {
  const { data } = await api.get('/api/auth/clubs');
  
  let rawArray: any[] = [];
  if (Array.isArray(data)) rawArray = data;
  else if (data && Array.isArray(data.clubs)) rawArray = data.clubs;
  else if (data && Array.isArray(data.data)) rawArray = data.data;

  // Normalize object structures on structural transfer layer so UI loop never hits an undefined key
  return rawArray.map((club: any) => ({
    id: club.club_id || club.id || club.clubs_id,
    name: club.club_name || club.name
  }));
}

export async function deleteMatchAudit(matchId: string): Promise<void> {
  await api.delete(`/api/super-admin/data-audit/${matchId}`);
}

export interface ClubTeam {
  id: string;
  name: string;
  short_name: string;
  logo_url?: string;
  home_ground: string;
  country?: string;
  player_count: number;
}

export async function getClubTeams(): Promise<ClubTeam[]> {
  const { data } = await api.get('/api/club-admin/teams');
  return data.teams as ClubTeam[];
}

export async function createTeam(payload: {
  name: string;
  short_name?: string;
  logo_url?: string;
  home_ground?: string;
  country?: string;
}): Promise<{ team_id: string }> {
  const { data } = await api.post('/api/club-admin/teams', payload);
  return data;
}

export async function updateClubTeam(teamId: string, payload: {
  name: string;
  short_name?: string;
  logo_url?: string;
  home_ground?: string;
  country?: string;
}): Promise<ClubTeam> {
  const { data } = await api.put(`/api/club-admin/teams/${teamId}`, payload);
  return data.team as ClubTeam;
}

export async function deleteClubTeam(teamId: string): Promise<void> {
  await api.delete(`/api/club-admin/teams/${teamId}`);
}

export async function getClubTeamPlayers(teamId: string): Promise<RosterMember[]> {
  const { data } = await api.get(`/api/club-admin/teams/${teamId}/players`);
  return data.players as RosterMember[];
}

export async function addPlayerToClubTeam(teamId: string, playerId: string): Promise<void> {
  await api.post(`/api/club-admin/teams/${teamId}/players`, { player_id: playerId });
}

export async function removePlayerFromClubTeam(teamId: string, playerId: string): Promise<void> {
  await api.delete(`/api/club-admin/teams/${teamId}/players/${playerId}`);
}

export async function assignScorerToMatch(matchId: string, scorerId: string): Promise<void> {
  await api.post('/api/club-admin/assign-scorer', { match_id: matchId, scorer_id: scorerId });
}

export function toAssignedRole(role: string): AssignedRole {
  const map: Record<string, AssignedRole> = {
    player: 'Player', scorer: 'Scorer', analyst: 'Analyst', umpire: 'Umpire',
  };
  return map[role.toLowerCase()] || 'Player';
}

// 🔥 ADMIN SQUAD ENGINE: Allows Club Admin to register a player directly into the system database
export async function createPlayerDirectByAdmin(payload: {
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  phone?: string;
}): Promise<any> {
  // Sets standard account parameters directly; matches with central validation layers
  const { data } = await api.post('/api/club-admin/players/direct-register', {
    ...payload,
    account_role: 'Player'
  });
  return data;
}
