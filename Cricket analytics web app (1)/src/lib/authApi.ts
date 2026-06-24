import { api } from './api';

const TOKEN_KEY = 'cricket_token';

export type ApiAccountRole =
  | 'Viewer'
  | 'Player'
  | 'Scorer'
  | 'Analyst'
  | 'Club_Admin'
  | 'Super_Admin'
  | 'Umpire';

export type AppUserRole =
  | 'viewer'
  | 'player'
  | 'scorer'
  | 'analyst'
  | 'club_admin'
  | 'super_admin';

export interface AuthUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  role: ApiAccountRole;
  club_id: string | null;
  is_approved: boolean;
}

export const toAppRole = (role: ApiAccountRole | string): AppUserRole => {
  const map: Record<string, AppUserRole> = {
    Viewer: 'viewer',
    Player: 'player',
    Scorer: 'scorer',
    Analyst: 'analyst',
    Club_Admin: 'club_admin',
    Super_Admin: 'super_admin',
    Umpire: 'viewer',
  };
  return map[role] || 'viewer';
};

export const getStoredToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const { data } = await api.post('/api/auth/login', { email, password });
  setStoredToken(data.token);
  return data;
}

export async function registerIndividual(payload: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  display_name?: string;
}): Promise<AuthUser> {
  const { data } = await api.post('/api/auth/register', payload);
  return data.user;
}

export async function registerClub(payload: {
  club: {
    name: string;
    home_ground?: string;
    contact_number?: string;
    email?: string;
    country?: string;
    display_initials?: string;
    owner_name?: string;
  };
  admin: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone?: string;
    display_name?: string;
  };
}): Promise<void> {
  await api.post('/api/auth/register/club', payload);
}

export async function sendOtp(phone: string): Promise<void> {
  await api.post('/api/auth/otp/send', { phone });
}

export async function verifyOtp(phone: string, code: string): Promise<void> {
  await api.post('/api/auth/otp/verify', { phone, code });
}

export async function getMe(): Promise<AuthUser & { phone?: string }> {
  const { data } = await api.get('/api/auth/me');
  return data;
}

export async function listApprovedClubs(): Promise<{ id: string; name: string }[]> {
  const { data } = await api.get('/api/auth/clubs');
  const raw = data?.clubs ?? (Array.isArray(data) ? data : []);
  return raw.map((club: any) => ({
    id: String(club.club_id || club.id),
    name: club.club_name || club.name || club.display_name || 'Unnamed Club',
  }));
}

export const defaultRouteForRole = (role: AppUserRole): string => {
  switch (role) {
    case 'scorer': return '/assigned-matches';
    case 'club_admin': return '/admin';
    case 'super_admin': return '/super-admin';
    default: return '/matches';
  }
};
