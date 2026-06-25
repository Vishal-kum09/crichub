import { api } from './api';

/**
 * Fetches a summary list of all approved clubs for the viewer directory.
 * Corresponds to the new /clubs page.
 */
export async function fetchViewerClubs() {
  try {
    // Assuming the backend provides an endpoint like this.
    // Based on the backend plan, this might need to be created.
    const response = await api.get('/api/viewer/teams');
    return response.data.teams || response.data || [];
  } catch (error) {
    console.error('Failed to fetch viewer clubs:', error);
    return [];
  }
}

/**
 * Fetches detailed information for a single club, including its match history.
 * Corresponds to the new /club/:id page.
 */
export async function fetchViewerClub(clubId: string) {
  // Assuming an endpoint like this exists to get club details + matches.
  const response = await api.get(`/api/viewer/teams/${clubId}`);
  return response.data;
}

/**
 * Fetches wagon wheel shot data for a specific match.
 * Corresponds to the WagonWheelTab component.
 */
export async function fetchWagonWheelData(matchId: string) {
  try {
    const response = await api.get(`/api/viewer/matches/${matchId}/wagon-wheel`);
    return response.data.shots || response.data || [];
  } catch (error) {
    console.error(`Failed to fetch wagon wheel data for match ${matchId}:`, error);
    return [];
  }
}