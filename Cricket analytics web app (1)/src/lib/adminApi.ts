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
}

export interface RosterMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
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

// ─── super-admin endpoints ───────────────────────────────────────────────────

export async function getClubs(): Promise<ClubSummary[]> {
  const { data } = await api.get('/api/super-admin/clubs');
  return data.clubs as ClubSummary[];
}

export async function getClubMembers(clubId: string): Promise<ClubMember[]> {
  const { data } = await api.get(`/api/super-admin/clubs/${clubId}/members`);
  return data.members as ClubMember[];
}

export async function getSuperPendingApprovals(): Promise<PendingClub[]> {
  const { data } = await api.get('/api/super-admin/approvals/pending');
  return data.approvals as PendingClub[];
}

export async function approveClub(clubId: string): Promise<void> {
  await api.put(`/api/super-admin/clubs/${clubId}/approve`);
}

export async function deleteMatchAudit(matchId: string): Promise<void> {
  await api.delete(`/api/super-admin/data-audit/${matchId}`);
}

// Capitalize a lowercased role for the assigned_role enum (player -> Player).
export function toAssignedRole(role: string): AssignedRole {
  const map: Record<string, AssignedRole> = {
    player: 'Player', scorer: 'Scorer', analyst: 'Analyst', umpire: 'Umpire',
  };
  return map[role.toLowerCase()] || 'Player';
}
