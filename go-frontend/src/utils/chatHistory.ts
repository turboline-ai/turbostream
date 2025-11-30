// Chat History Storage and Management Utility

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    prompt?: string;
    dataSnapshot?: any;
    feedId?: string;
    analysisId?: string;
  };
}

export interface ChatConversation {
  id: string;
  name: string;
  feedId: string;
  feedName: string;
  category: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  isStarred?: boolean;
  summary?: string;
  totalTokenUsage?: number; // Total tokens used in this conversation
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
}

class ChatHistoryStorage {
  private storageKey = 'chat-history';
  private maxConversations = 100; // Limit to prevent storage bloat
  
  // Save conversation with automatic naming
  saveConversation(
    feedId: string,
    feedName: string,
    category: string,
    messages: ChatMessage[],
    existingId?: string
  ): string {
    const conversations = this.getAllConversations();
    
    const conversationId = existingId || this.generateId();
    const now = Date.now();
    
    const conversation: ChatConversation = {
      id: conversationId,
      name: this.generateConversationName(feedName, messages),
      feedId,
      feedName,
      category,
      messages: [...messages],
      createdAt: existingId ? conversations.find(c => c.id === existingId)?.createdAt || now : now,
      updatedAt: now,
      tags: this.extractTags(messages),
      summary: this.generateSummary(messages)
    };
    
    // Remove existing conversation if updating
    const filteredConversations = conversations.filter(c => c.id !== conversationId);
    
    // Add new/updated conversation
    filteredConversations.unshift(conversation);
    
    // Keep only recent conversations
    const trimmedConversations = filteredConversations.slice(0, this.maxConversations);
    
    localStorage.setItem(this.storageKey, JSON.stringify(trimmedConversations));
    
    return conversationId;
  }
  
  // Get all conversations
  getAllConversations(): ChatConversation[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load chat history:', error);
      return [];
    }
  }
  
  // Get conversation by ID
  getConversation(id: string): ChatConversation | null {
    const conversations = this.getAllConversations();
    return conversations.find(c => c.id === id) || null;
  }
  
  // Get conversations with filters
  getFilteredConversations(filters: ConversationFilters): ChatConversation[] {
    let conversations = this.getAllConversations();
    
    if (filters.feedId) {
      conversations = conversations.filter(c => c.feedId === filters.feedId);
    }
    
    if (filters.category) {
      conversations = conversations.filter(c => c.category === filters.category);
    }
    
    if (filters.isStarred) {
      conversations = conversations.filter(c => c.isStarred);
    }
    
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      conversations = conversations.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.summary?.toLowerCase().includes(searchLower) ||
        c.messages.some(m => m.content.toLowerCase().includes(searchLower))
      );
    }
    
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      conversations = conversations.filter(c => 
        c.updatedAt >= start.getTime() && c.updatedAt <= end.getTime()
      );
    }
    
    if (filters.tags && filters.tags.length > 0) {
      conversations = conversations.filter(c => 
        c.tags?.some(tag => filters.tags!.includes(tag))
      );
    }
    
    return conversations;
  }
  
  // Delete conversation
  deleteConversation(id: string): boolean {
    const conversations = this.getAllConversations();
    const filteredConversations = conversations.filter(c => c.id !== id);
    
    if (filteredConversations.length !== conversations.length) {
      localStorage.setItem(this.storageKey, JSON.stringify(filteredConversations));
      return true;
    }
    return false;
  }
  
  // Star/unstar conversation
  toggleStarred(id: string): boolean {
    const conversations = this.getAllConversations();
    const conversation = conversations.find(c => c.id === id);
    
    if (conversation) {
      conversation.isStarred = !conversation.isStarred;
      conversation.updatedAt = Date.now();
      localStorage.setItem(this.storageKey, JSON.stringify(conversations));
      return conversation.isStarred;
    }
    return false;
  }
  
  // Update conversation name
  updateConversationName(id: string, newName: string): boolean {
    const conversations = this.getAllConversations();
    const conversation = conversations.find(c => c.id === id);
    
    if (conversation) {
      conversation.name = newName;
      conversation.updatedAt = Date.now();
      localStorage.setItem(this.storageKey, JSON.stringify(conversations));
      return true;
    }
    return false;
  }
  
  // Get recent conversations (last 10)
  getRecentConversations(limit: number = 10): ChatConversation[] {
    return this.getAllConversations()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }
  
  // Get conversations by feed
  getConversationsByFeed(feedId: string): ChatConversation[] {
    return this.getAllConversations()
      .filter(c => c.feedId === feedId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
  
  // Export conversations for backup
  exportConversations(): string {
    return JSON.stringify(this.getAllConversations(), null, 2);
  }
  
  // Import conversations from backup
  importConversations(jsonData: string): boolean {
    try {
      const conversations = JSON.parse(jsonData);
      if (Array.isArray(conversations)) {
        localStorage.setItem(this.storageKey, JSON.stringify(conversations));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import conversations:', error);
      return false;
    }
  }
  
  // Clear all conversations
  clearAllConversations(): void {
    localStorage.removeItem(this.storageKey);
  }
  
  // Private helper methods
  private generateId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateConversationName(feedName: string, messages: ChatMessage[]): string {
    // Try to extract meaningful topic from first user message or AI response
    const firstUserMessage = messages.find(m => m.type === 'user')?.content;
    const firstAiMessage = messages.find(m => m.type === 'ai')?.content;
    
    if (firstUserMessage && firstUserMessage.length < 50) {
      return `${feedName}: ${firstUserMessage}`;
    }
    
    // Extract key topics from AI response
    if (firstAiMessage) {
      const topics = this.extractKeyTopics(firstAiMessage);
      if (topics.length > 0) {
        return `${feedName}: ${topics.slice(0, 2).join(', ')}`;
      }
    }
    
    // Fallback to timestamp-based name
    const date = new Date();
    const timeStr = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `${feedName} Analysis - ${timeStr}`;
  }
  
  private extractKeyTopics(text: string): string[] {
    const topics: string[] = [];
    
    // Look for common financial terms and patterns
    const patterns = [
      /\b(bullish|bearish|trending|surge|drop|spike|dip)\b/gi,
      /\b(resistance|support|breakout|breakdown)\b/gi,
      /\b(volume|volatility|momentum|correlation)\b/gi,
      /\b(bitcoin|btc|ethereum|eth|crypto)\b/gi,
      /\b(stock|price|market|trading)\b/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        topics.push(...matches.map(m => m.toLowerCase()));
      }
    });
    
    // Remove duplicates and return unique topics
    return [...new Set(topics)];
  }
  
  private extractTags(messages: ChatMessage[]): string[] {
    const tags: string[] = [];
    
    messages.forEach(message => {
      if (message.type === 'ai') {
        const topics = this.extractKeyTopics(message.content);
        tags.push(...topics);
      }
    });
    
    // Return unique tags, limited to 5
    return [...new Set(tags)].slice(0, 5);
  }
  
  private generateSummary(messages: ChatMessage[]): string {
    const aiMessages = messages.filter(m => m.type === 'ai');
    if (aiMessages.length === 0) return '';
    
    // Take first AI response and create a brief summary
    const firstResponse = aiMessages[0].content;
    const sentences = firstResponse.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    if (sentences.length > 0) {
      // Return first sentence, truncated to 100 characters
      const summary = sentences[0].trim();
      return summary.length > 100 ? summary.substring(0, 97) + '...' : summary;
    }
    
    return '';
  }
}

// Export singleton instance
export const chatHistoryStorage = new ChatHistoryStorage();

// Helper function to create chat message
export function createChatMessage(
  type: 'user' | 'ai' | 'system',
  content: string,
  metadata?: ChatMessage['metadata']
): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    content,
    timestamp: Date.now(),
    metadata
  };
}