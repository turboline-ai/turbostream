import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

// feedService.ts
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

interface SubmitFeedDataRequest {
  data: any;
  eventName?: string;
}

interface SubmitFeedDataResponse {
  success: boolean;
  message: string;
  data: {
    feedId: string;
    feedName: string;
    eventName: string;
    timestamp: string;
    subscribersNotified: boolean;
  };
}

export class FeedService {
  /**
   * Submit data to a user's feed
   */
  static async submitFeedData(
    feedId: string, 
    requestData: SubmitFeedDataRequest, 
    token: string
  ): Promise<SubmitFeedDataResponse> {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/marketplace/feeds/${feedId}/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
      timeout: 10000,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to submit feed data' }));
      throw new Error(errorData.message || 'Failed to submit feed data');
    }

    return response.json();
  }

  /**
   * Get feed by ID
   */
  static async getFeed(feedId: string, token?: string): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(`${BACKEND_URL}/api/marketplace/feeds/${feedId}`, {
      headers,
      timeout: 10000,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch feed' }));
      throw new Error(errorData.message || 'Failed to fetch feed');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get user's own feeds
   */
  static async getUserFeeds(token: string): Promise<any[]> {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/marketplace/my-feeds`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      timeout: 10000,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch user feeds' }));
      throw new Error(errorData.message || 'Failed to fetch user feeds');
    }

    const result = await response.json();
    return result.data || [];
  }

  /**
   * Update feed's default AI prompt (feed owner only)
   */
  static async updateFeedAIPrompt(
    feedId: string, 
    defaultAIPrompt: string, 
    token: string
  ): Promise<any> {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/marketplace/feeds/${feedId}/ai-prompt`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ defaultAIPrompt }),
      timeout: 10000,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update AI prompt' }));
      throw new Error(errorData.message || 'Failed to update AI prompt');
    }

    return response.json();
  }
}