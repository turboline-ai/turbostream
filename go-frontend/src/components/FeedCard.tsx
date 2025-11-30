"use client";

import React, { useState, useEffect } from 'react';
import { WebSocketFeed } from '@/types/marketplace';
import { useAuth } from '@/contexts/AuthContext';

interface FeedCardProps {
  feed: WebSocketFeed;
  onSubscribe?: (feedId: string) => void;
  onUnsubscribe?: (feedId: string) => void;
  onSelect?: (feed: WebSocketFeed) => void;
  isSubscribed?: boolean;
}

const FeedCard: React.FC<FeedCardProps> = ({ feed, onSubscribe, onUnsubscribe, onSelect, isSubscribed = false }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleToggleSubscription = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (isSubscribed && onUnsubscribe) {
        await onUnsubscribe(feed._id!);
      } else if (!isSubscribed && onSubscribe) {
        await onSubscribe(feed._id!);
      }
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      crypto: 'bg-yellow-500',
      stocks: 'bg-blue-500',
      forex: 'bg-green-500',
      commodities: 'bg-purple-500',
      custom: 'bg-gray-500',
    };
    return colors[category] || colors.custom;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-all panel card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {feed.icon && <span className="text-3xl">{feed.icon}</span>}
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {feed.name}
              {feed.isVerified && (
                <span className="text-blue-400" title="Verified">
                  ✓
                </span>
              )}
            </h3>
            <p className="text-gray-400 text-sm muted">by {feed.ownerName}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <span className={`${
            feed.feedType === 'company' 
              ? 'bg-purple-500' 
              : 'bg-blue-500'
          } text-white text-xs px-3 py-1 rounded-full font-medium`}>
            {feed.feedType === 'company' ? '🏢 Company' : '👤 User'}
          </span>
          <span className={`${getCategoryColor(feed.category)} text-white text-xs px-3 py-1 rounded-full`}>
            {feed.category}
          </span>
        </div>
      </div>

      <p className="text-gray-300 mb-4 line-clamp-2 muted">{feed.description}</p>

      {/* Tags removed per request */}

      {/* Subscriber count and icon removed per request */}

      {user ? (
        <div className="space-y-2">
          <button
            onClick={handleToggleSubscription}
            disabled={loading}
            className={`w-full py-2 px-4 rounded font-medium transition-colors btn ${
              isSubscribed
                ? 'bg-gray-600 hover:bg-gray-500 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                {isSubscribed ? 'Unsubscribing...' : 'Subscribing...'}
              </span>
            ) : isSubscribed ? (
              '✓ Subscribed - Click to Unsubscribe'
            ) : (
              '📡 Subscribe to Feed'
            )}
          </button>
          

        </div>
      ) : (
        <div className="w-full py-2 px-4 rounded bg-gray-700 text-gray-400 text-center panel muted">
          <span>🔒 Login to subscribe</span>
        </div>
      )}
    </div>
  );
};

export default FeedCard;
