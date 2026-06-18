// src/lib/viewerApi.ts

import { api } from './api';

/**
 * Fetch all mapped wagon wheel deliveries for a specific match
 */
export const fetchWagonWheelData = async (matchId: string) => {
  try {
    const response = await api.get(`/api/viewer/matches/${matchId}/wagon-wheel`);
    return response.data.shots;
  } catch (error) {
    console.error("Error fetching wagon wheel data:", error);
    // Error aane par empty array return karein taaki frontend crash na ho
    return []; 
  }
};

// Future mein Viewer ke aur bhi APIs (jaise getScorecard, getCommentary) aap yahan add kar sakte hain
