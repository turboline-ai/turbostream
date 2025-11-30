export interface WebSocketFeed {
  _id?: string;
  name: string;
  description: string;
  systemPrompt?: string; // Custom AI system prompt for this feed
  url: string;
  category: string; // User-defined or predefined categories (crypto, stocks, forex, commodities, custom, etc.)
  icon?: string;
  isActive: boolean;
  isVerified: boolean;
  isPublic: boolean;
  feedType: 'company' | 'user';
  ownerId: string;
  ownerName: string;
  
  // Connection type (auto-detected from URL, but can be explicitly set)
  connectionType?: 'websocket' | 'socketio' | 'http-polling';
  
  // WebSocket specific fields
  eventName?: string;
  dataFormat?: 'json' | 'text' | 'protobuf';
  connectionMessages?: string[];
  protobufType?: string;
  reconnectionEnabled: boolean;
  reconnectionDelay?: number;
  reconnectionAttempts?: number;
  
  // HTTP Polling configuration
  httpConfig?: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH';
    pollingInterval: number;
    timeout: number;
    requestHeaders?: Array<{ key: string; value: string; enabled: boolean }>;
    requestBody?: string;
    responseFormat: 'json' | 'xml' | 'csv' | 'text';
    dataPath?: string;
    authentication?: {
      type: 'none' | 'bearer' | 'api-key' | 'basic' | 'oauth2';
      config: {
        token?: string;
        apiKey?: string;
        keyLocation?: 'header' | 'query';
        keyName?: string;
        username?: string;
        password?: string;
      };
    };
    retryConfig?: {
      maxRetries: number;
      retryDelay: number;
      backoffMultiplier: number;
      retryOn?: Array<number>;
    };
    transform?: {
      enabled: boolean;
      mapping?: Array<{ from: string; to: string }>;
      filters?: Array<{ field: string; operator: 'equals' | 'contains' | 'greater' | 'less'; value: any }>;
    };
  };
  
  // Common fields
  subscriberCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
  tags: string[];
  website?: string;
  documentation?: string;
  defaultAIPrompt?: string; // Default AI analysis prompt for this feed
  aiAnalysisEnabled?: boolean; // Whether AI analysis is enabled for this feed
}

export interface UserSubscription {
  _id?: string;
  userId: string;
  feedId: string;
  subscribedAt: Date;
  isActive: boolean;
  customPrompt?: string; // User-defined prompt for AI analysis of this feed
  settings?: {
    notifications: boolean;
    autoConnect: boolean;
  };
  feed?: WebSocketFeed;
}

export interface FeedData {
  feedId: string;
  feedName: string;
  eventName: string;
  data: any;
  timestamp: Date;
}
