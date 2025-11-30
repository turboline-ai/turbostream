'use client';

import { use } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WebSocketFeed } from '@/types/marketplace';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import GenericFeedViewer from '@/components/GenericFeedViewer';
import { StockChart, StockTable, YahooFinanceIntegrator } from '@/components/yahoo-finance';
import UniversalAIInsights from '@/components/UniversalAIInsights';
import { useWebSocket } from '@/hooks/useWebSocket';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { StockData } from '@/types/stocks';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

interface FeedPageProps {
  params: Promise<{ id: string }>;
}

export default function FeedPage({ params }: FeedPageProps) {
  const resolvedParams = use(params);
  const feedId = resolvedParams.id;
  const router = useRouter();
  const { user, token } = useAuth();
  const { isConnected, registerUser, subscribeToFeed } = useWebSocket();
  const [feed, setFeed] = useState<WebSocketFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<string>("AAPL");
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [customPrompt, setCustomPrompt] = useState<string | undefined>();

  // Register user with WebSocket system when authenticated and connected
  useEffect(() => {
    if (user && isConnected) {
      //console.log(`🔑 Registering user ${user._id} on feed page ${feedId}`);
      registerUser(user._id);
    }
  }, [user, isConnected, registerUser, feedId]);

  // Subscribe to the feed to receive data
  useEffect(() => {
    if (user && isConnected && feedId) {
      console.log(`📺 Subscribing to feed ${feedId} for user ${user._id}`);
      subscribeToFeed(feedId, user._id);
    }
  }, [user, isConnected, feedId, subscribeToFeed]);

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${BACKEND_URL}/api/marketplace/feeds/${feedId}`);
      
      if (!response.ok) {
        throw new Error('Feed not found');
      }

      const result = await response.json();
      //console.log('Loaded feed data:', result.data); // Debug log
      setFeed(result.data);
    } catch (err: any) {
      console.error('Error loading feed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [feedId]);

  const loadUserSubscription = useCallback(async () => {
    if (!user || !token || !feed) return;
    
    try {
      // If user is the feed owner, use the feed's default AI prompt
      if (feed.ownerId === user._id) {
        setCustomPrompt(feed.defaultAIPrompt || '');
        return;
      }

      // If user is a subscriber, load their subscription custom prompt
      const response = await fetchWithTimeout(`${BACKEND_URL}/api/marketplace/subscriptions`, {
        timeout: 10000,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        const subscriptions = result.data || [];
        
        // Find subscription for this feed
        const subscription = subscriptions.find((sub: any) => sub.feedId === feedId);
        if (subscription && subscription.customPrompt) {
          setCustomPrompt(subscription.customPrompt);
        }
      }
    } catch (error) {
      console.error('Error loading user subscription:', error);
    }
  }, [user, token, feed, feedId]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (user && token && feed) {
      loadUserSubscription();
    }
  }, [user, token, feed, loadUserSubscription]);

  // Handle stock data from YahooFinanceIntegrator
  const handleStockDataUpdate = useCallback((newStockData: StockData[]) => {
    setStockData(newStockData);
    
    // Set default selected stock if not set and data is available
    if (newStockData.length > 0 && !selectedStock) {
      setSelectedStock(newStockData[0].symbol);
    }
  }, [selectedStock]);

  const handleCustomPromptChange = useCallback(async (newPrompt: string) => {
    if (!user || !token || !feed?._id) return;

    try {
      setCustomPrompt(newPrompt);
      
      // If user is the feed owner, update the feed's default AI prompt
      if (feed.ownerId === user._id) {
        const response = await fetchWithTimeout(`${BACKEND_URL}/api/marketplace/feeds/${feed._id}/ai-prompt`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            defaultAIPrompt: newPrompt,
          }),
          timeout: 10000,
        });

        if (!response.ok) {
          throw new Error('Failed to update feed AI prompt');
        }

        // Update the feed state to reflect the new default prompt
        setFeed(prev => prev ? { ...prev, defaultAIPrompt: newPrompt } : null);
      } else {
        // If user is a subscriber, update their subscription custom prompt
        const response = await fetchWithTimeout(`${BACKEND_URL}/api/marketplace/subscriptions/custom-prompt`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            feedId: feed._id,
            customPrompt: newPrompt,
          }),
          timeout: 10000,
        });

        if (!response.ok) {
          throw new Error('Failed to update subscription custom prompt');
        }
      }
    } catch (error) {
      console.error('Error updating custom prompt:', error);
      // Don't call loadUserSubscription() here to prevent infinite loops
      // The UI will show the updated prompt anyway, and the user can retry if needed
    }
  }, [user, token, feed]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Loading feed...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !feed) {
    return (
      <ProtectedRoute>
        <div className="h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-2xl font-bold text-white mb-2">Feed Not Found</h2>
            <p className="text-gray-400 mb-6">{error || 'This feed does not exist'}</p>
            <button
              onClick={() => router.push('/marketplace')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded font-medium transition-colors"
            >
              Browse Marketplace
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Yahoo Finance / Stock feeds
  if ((feed.feedType === 'company' && feed.category === 'stocks') || 
      (feed.category === 'stocks' && (feed.name?.includes('Yahoo Finance') || feed.url?.includes('yahoo')))) {
    return (
      <ProtectedRoute>
        <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden flex flex-col">
          {/* Yahoo Finance Integration */}
          <YahooFinanceIntegrator 
            feedId={feedId} 
            onStockData={handleStockDataUpdate} 
          />
          
          <div className="flex-1 overflow-hidden">
            <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
              {/* Left Side - Stock Data (8 columns) */}
              <div className="lg:col-span-8 flex flex-col gap-4 overflow-hidden">
                <div className="h-[45%] overflow-hidden">
                  <StockChart data={stockData} selectedStock={selectedStock} />
                </div>
                <div className="h-[55%] overflow-hidden">
                  <StockTable
                    data={stockData}
                    onSelectStock={setSelectedStock}
                    selectedStock={selectedStock}
                  />
                </div>
              </div>
              
              {/* Right Side - AI Analysis (4 columns) */}
              <div className="lg:col-span-4 overflow-hidden h-full">
                <UniversalAIInsights 
                  feed={feed}
                  realTimeData={stockData} 
                  userCustomPrompt={customPrompt}
                  onPromptChange={handleCustomPromptChange}
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // User-registered feed with generic viewer
  return (
    <ProtectedRoute>
      <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden p-2" style={{height: 'calc(100vh - 65px)'}}>
        <GenericFeedViewer 
          feed={feed} 
          userCustomPrompt={customPrompt}
          onPromptChange={handleCustomPromptChange}
        />
      </div>
    </ProtectedRoute>
  );
}
