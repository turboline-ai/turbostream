"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UserSubscription, WebSocketFeed } from '@/types/marketplace';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

interface SubscriptionContextType {
  subscriptions: UserSubscription[];
  myFeeds: WebSocketFeed[];
  isLoading: boolean;
  refreshSubscriptions: () => Promise<void>;
  refreshMyFeeds: () => Promise<void>;
  refreshAll: () => Promise<void>;
  isSubscribed: (feedId: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [myFeeds, setMyFeeds] = useState<WebSocketFeed[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Changed to false for lazy loading
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const { user, token } = useAuth();

  // Load subscriptions from API with optimized error handling
  const refreshSubscriptions = useCallback(async () => {
    if (!user || !token) {
      setSubscriptions([]);
      return;
    }

    try {
      const response = await fetchWithTimeout(`${BACKEND_URL}/api/marketplace/subscriptions`, {
        timeout: 3000, // Further reduced to 3000ms for faster failure detection
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const result = await response.json();
        //console.log('✅ Loaded subscriptions:', result.data?.length || 0);
        setSubscriptions(result.data || []);
      } else {
        console.warn('⚠️ Failed to load subscriptions:', response.status);
        if (response.status !== 401) { // Don't clear on auth errors
          setSubscriptions([]);
        }
      }
    } catch (error: any) {
      if (error.message.includes('timeout')) {
        console.warn('⏱️ Subscriptions request timed out - continuing without blocking');
      } else {
        console.error('❌ Error loading subscriptions:', error.message);
      }
      // Don't clear subscriptions on network errors to maintain UX
    }
  }, [user, token]);

  // Load my feeds from API with optimized error handling
  const refreshMyFeeds = useCallback(async () => {
    if (!user || !token) {
      setMyFeeds([]);
      return;
    }

    try {
      const response = await fetchWithTimeout(`${BACKEND_URL}/api/marketplace/my-feeds`, {
        timeout: 3000, // Further reduced to 3000ms for faster failure detection
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const result = await response.json();
        //console.log('✅ Loaded my feeds:', result.data?.length || 0);
        setMyFeeds(result.data || []);
      } else {
        console.warn('⚠️ Failed to load my feeds:', response.status);
        if (response.status !== 401) { // Don't clear on auth errors
          setMyFeeds([]);
        }
      }
    } catch (error: any) {
      if (error.message.includes('timeout')) {
        console.warn('⏱️ My feeds request timed out - continuing without blocking');
      } else {
        console.error('❌ Error loading my feeds:', error.message);
      }
      // Don't clear feeds on network errors to maintain UX
    }
  }, [user, token]);

  // Refresh all data with parallel loading and faster completion
  const refreshAll = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Load data in parallel but don't wait for both to complete
    const promises = [refreshSubscriptions(), refreshMyFeeds()];
    
    try {
      // Use Promise.allSettled to continue even if one fails
      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('Some data loading failed, but continuing...', error);
    } finally {
      setIsLoading(false);
    }
    setHasLoadedOnce(true);
  }, [user, refreshSubscriptions, refreshMyFeeds]);

  // Check if user is subscribed to a feed
  const isSubscribed = useCallback((feedId: string): boolean => {
    return subscriptions.some((sub) => sub.feedId === feedId && sub.isActive !== false);
  }, [subscriptions]);

  // Completely lazy loading - no automatic data loading to prevent blocking navigation
  // Components must explicitly call refreshAll() when they need data
  useEffect(() => {
    if (!user) {
      setHasLoadedOnce(false);
      setSubscriptions([]);
      setMyFeeds([]);
    }
  }, [user]);

  const value: SubscriptionContextType = {
    subscriptions,
    myFeeds,
    isLoading,
    refreshSubscriptions,
    refreshMyFeeds,
    refreshAll,
    isSubscribed,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptions() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptions must be used within a SubscriptionProvider');
  }
  return context;
}