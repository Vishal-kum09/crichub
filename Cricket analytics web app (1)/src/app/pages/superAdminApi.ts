// Super Admin API client — typed endpoints for platform-wide management.
// Uses the centralized axios instance from lib/api.ts for consistent auth headers.
import { api } from '../../lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PlatformStats {
  totalClubs: number;
  totalMatches: number;
  totalUsers: number;
  totalTournaments: number;
}

export interface ClubRow {
  id: string;
  name: string;
  country: string;
  home_ground: string;
  is_approved: boolean;
  created_at: string;
  members: number;
  matches: number;
}

export interface PendingClub {
  id: string;
  name: string;
  country: string;
  email: string;
  owner_name: string;
  admin_name: string;
  admin_email: string;
  created_at: string;
}

export interface ClubMember {
  id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  account_role: string;
  is_active: boolean;
  is_approved: boolean;
}

// ─── Endpoints ─────────────────────────────────────────────────────────────────

/** Fetch all registered clubs with member & match counts */
export const findAllClubs = async (): Promise<ClubRow[]> => {
  const { data } = await api.get('/api/super-admin/clubs');
  return data;
};

/** Fetch a single club by ID */
export const findClubById = async (clubId: string): Promise<ClubRow> => {
  const { data } = await api.get(`/api/super-admin/clubs/${clubId}`);
  return data;
};

/** Fetch members of a specific club */
export const findClubMembers = async (clubId: string): Promise<ClubMember[]> => {
  const { data } = await api.get(`/api/super-admin/clubs/${clubId}/members`);
  return data;
};

/** Fetch pending (unapproved) club registrations */
export const findPendingClubs = async (): Promise<PendingClub[]> => {
  const { data } = await api.get('/api/super-admin/approvals/pending');
  return data;
};

/** Approve a club registration (returns updated club) */
export const approveClub = async (clubId: string): Promise<any> => {
  const { data } = await api.put(`/api/super-admin/clubs/${clubId}/approve`);
  return data;
};

/** Reject (delete) a pending club registration */
export const rejectClub = async (clubId: string): Promise<void> => {
  await api.delete(`/api/super-admin/clubs/${clubId}`);
};

/** Fetch platform-wide aggregate statistics */
export const getPlatformStats = async (): Promise<PlatformStats> => {
  const { data } = await api.get('/api/super-admin/stats');
  return data;
};

/** Permanently delete a match and all its child records (data audit) */
export const deleteMatchAudit = async (matchId: string): Promise<any> => {
  const { data } = await api.delete(`/api/super-admin/data-audit/${matchId}`);
  return data;
};
