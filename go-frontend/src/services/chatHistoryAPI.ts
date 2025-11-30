// Frontend API Client for Chat History

export interface ChatMessage {
  _id?: string;
  conversationId: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string; // ISO string from backend
  metadata?: {
    prompt?: string;
    dataSnapshot?: any;
    feedId?: string;
    analysisId?: string;
    tokenUsage?: number;
  };
}

export interface ChatConversation {
  _id?: string;
  userId: string;
  feedId: string;
  feedName: string;
  category: string;
  name: string;
  summary?: string;
  tags?: string[];
  isStarred?: boolean;
  messageCount: number;
  totalTokenUsage?: number; // Total tokens used in this conversation
  createdAt: string; // ISO string from backend
  updatedAt: string; // ISO string from backend
}

export interface ConversationFilters {
  feedId?: string;
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchText?: string;
  isStarred?: boolean;
  tags?: string[];
  limit?: number;
  skip?: number;
}

export interface CreateConversationRequest {
  feedId: string;
  feedName: string;
  category: string;
  name?: string;
  initialMessage?: {
    type: 'user' | 'ai';
    content: string;
    metadata?: ChatMessage['metadata'];
  };
}

export interface UpdateConversationRequest {
  name?: string;
  isStarred?: boolean;
  tags?: string[];
}

export interface AddMessageRequest {
  type: 'user' | 'ai' | 'system';
  content: string;
  metadata?: ChatMessage['metadata'];
}

class ChatHistoryAPI {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210') {
    this.baseUrl = baseUrl;
    console.log(`🔧 ChatHistoryAPI initialized with baseUrl: ${this.baseUrl}`);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; message?: string; count?: number }> {
    const token = localStorage.getItem('auth_token') || 
                  document.cookie.split('; ')
                    .find(row => row.startsWith('token='))
                    ?.split('=')[1];

    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const fullUrl = `${this.baseUrl}/api/chat-history${endpoint}`;
    console.log(`🌐 Making request to: ${fullUrl}`, { method: options.method || 'GET' });
    
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      credentials: 'include',
    });

    console.log(`📡 Response status: ${response.status} for ${fullUrl}`);

    if (!response.ok) {
      let errorData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: 'Invalid JSON response' };
        }
      } else {
        // If it's not JSON (like HTML error page), read as text
        const textContent = await response.text();
        errorData = { 
          message: `Server returned non-JSON response: ${response.status} ${response.statusText}`,
          content: textContent.substring(0, 200) // First 200 chars for debugging
        };
      }
      
      console.error(`❌ API Error:`, { 
        status: response.status, 
        statusText: response.statusText,
        url: fullUrl,
        error: errorData 
      });
      throw new Error(errorData.message || `HTTP ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // Get conversations with filters
  async getConversations(filters: ConversationFilters = {}): Promise<ChatConversation[]> {
    const params = new URLSearchParams();
    
    if (filters.feedId) params.set('feedId', filters.feedId);
    if (filters.category) params.set('category', filters.category);
    if (filters.isStarred !== undefined) params.set('isStarred', filters.isStarred.toString());
    if (filters.searchText) params.set('searchText', filters.searchText);
    if (filters.limit) params.set('limit', filters.limit.toString());
    if (filters.skip) params.set('skip', filters.skip.toString());
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }
    if (filters.dateRange) {
      params.set('startDate', filters.dateRange.start.toISOString());
      params.set('endDate', filters.dateRange.end.toISOString());
    }

    const queryString = params.toString();
    const endpoint = `/conversations${queryString ? `?${queryString}` : ''}`;
    
    const result = await this.request<ChatConversation[]>(endpoint);
    return result.data || [];
  }

  // Get specific conversation
  async getConversation(id: string): Promise<ChatConversation | null> {
    const result = await this.request<ChatConversation>(`/conversations/${id}`);
    return result.data || null;
  }

  // Create new conversation
  async createConversation(request: CreateConversationRequest): Promise<ChatConversation> {
    console.log(`📝 Creating conversation:`, request);
    
    const result = await this.request<ChatConversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    console.log(`✅ Conversation created:`, result);
    
    if (!result.data) {
      throw new Error('Failed to create conversation');
    }
    
    return result.data;
  }

  // Update conversation
  async updateConversation(id: string, updates: UpdateConversationRequest): Promise<ChatConversation> {
    const result = await this.request<ChatConversation>(`/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    
    if (!result.data) {
      throw new Error('Failed to update conversation');
    }
    
    return result.data;
  }

  // Delete conversation
  async deleteConversation(id: string): Promise<void> {
    await this.request(`/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  // Get messages for conversation
  async getMessages(conversationId: string, limit?: number, skip?: number): Promise<ChatMessage[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (skip) params.set('skip', skip.toString());
    
    const queryString = params.toString();
    const endpoint = `/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;
    
    const result = await this.request<ChatMessage[]>(endpoint);
    return result.data || [];
  }

  // Add message to conversation
  async addMessage(conversationId: string, message: AddMessageRequest): Promise<ChatMessage> {
    console.log(`💬 Adding message to conversation ${conversationId}:`, message);
    
    const result = await this.request<ChatMessage>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    });
    
    console.log(`✅ Message added:`, result);
    
    if (!result.data) {
      throw new Error('Failed to add message');
    }
    
    return result.data;
  }

  // Get recent conversations
  async getRecentConversations(limit?: number): Promise<ChatConversation[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    
    const queryString = params.toString();
    const endpoint = `/recent${queryString ? `?${queryString}` : ''}`;
    
    const result = await this.request<ChatConversation[]>(endpoint);
    return result.data || [];
  }

  // Get conversations by feed
  async getConversationsByFeed(feedId: string): Promise<ChatConversation[]> {
    const result = await this.request<ChatConversation[]>(`/feeds/${feedId}`);
    return result.data || [];
  }

  // Search conversations
  async searchConversations(searchText: string, limit?: number): Promise<ChatConversation[]> {
    const params = new URLSearchParams();
    params.set('q', searchText);
    if (limit) params.set('limit', limit.toString());
    
    const queryString = params.toString();
    const endpoint = `/search?${queryString}`;
    
    const result = await this.request<ChatConversation[]>(endpoint);
    return result.data || [];
  }

  // Helper method to create conversation with first message
  async createConversationWithMessage(
    feedId: string,
    feedName: string,
    category: string,
    userMessage: string,
    aiResponse: string,
    metadata?: ChatMessage['metadata']
  ): Promise<{ conversation: ChatConversation; messages: ChatMessage[] }> {
    // Create conversation with initial user message
    const conversation = await this.createConversation({
      feedId,
      feedName,
      category,
      initialMessage: {
        type: 'user',
        content: userMessage
      }
    });

    // Add AI response
    const aiMessage = await this.addMessage(conversation._id!, {
      type: 'ai',
      content: aiResponse,
      metadata
    });

    // Get all messages to return complete conversation
    const messages = await this.getMessages(conversation._id!);

    return { conversation, messages };
  }

  // Toggle starred status
  async toggleStarred(conversationId: string, isStarred: boolean): Promise<ChatConversation> {
    return await this.updateConversation(conversationId, { isStarred });
  }

  // Update conversation name
  async updateConversationName(conversationId: string, name: string): Promise<ChatConversation> {
    return await this.updateConversation(conversationId, { name });
  }
}

// Export singleton instance
export const chatHistoryAPI = new ChatHistoryAPI();

// Helper functions
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function createChatMessage(
  type: 'user' | 'ai' | 'system',
  content: string,
  metadata?: ChatMessage['metadata']
): Omit<ChatMessage, '_id' | 'conversationId' | 'timestamp'> {
  return {
    type,
    content,
    metadata
  };
}