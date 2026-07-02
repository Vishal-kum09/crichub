import { api } from './api';

export const getCommentaryHistory = async (matchId: string) => {
  const res = await api.get(`/api/viewer/matches/${matchId}/commentary`);
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.commentary)) return data.commentary;
  if (Array.isArray(data?.deliveries)) return data.deliveries;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const getRealtimeCommentaryConfig = async () => {
  const res = await api.get('/api/auth/realtime-token');
  return {
    enabled: Boolean(res.data?.enabled && res.data?.token && res.data?.realtime_url),
    token: res.data?.token as string | null,
    realtimeUrl: res.data?.realtime_url as string | null
  };
};

export const buildCommentarySocketUrl = (realtimeUrl: string, matchId: string, token: string) => {
  const base = realtimeUrl.replace(/\/$/, '').replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return `${base}/ws/matches/${matchId}?token=${encodeURIComponent(token)}`;
};

export const commentaryKey = (item: any) =>
  item?.ai_commentary_id || item?.event_id || item?.delivery_id || `commentary-${Math.random()}`;

