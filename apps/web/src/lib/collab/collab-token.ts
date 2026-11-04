import { apiClient } from '../api-client';

export async function fetchCollabToken(interviewId: string): Promise<string> {
  try {
    const res = await apiClient<{ token: string }>(`/rooms/${interviewId}/collab-token`, {
      method: 'POST',
    });
    return res.token;
  } catch {
    // If request fails, attempt GET
    try {
      const res = await apiClient<{ token: string }>(`/rooms/${interviewId}/collab-token`);
      return res.token;
    } catch {
      return '';
    }
  }
}
