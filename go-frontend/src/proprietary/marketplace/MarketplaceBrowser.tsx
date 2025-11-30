'use client';

import React, { useEffect, useState } from 'react';
import { WebSocketFeed } from '@/types/marketplace';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSubscriptions } from '@/contexts/SubscriptionContext';
import UnifiedFeedCard from '@/components/UnifiedFeedCard';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { Card, Input, Select } from '@/components/ui';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

interface MarketplaceBrowserProps {
  onFeedSelect?: (feed: WebSocketFeed) => void;
}

const MarketplaceBrowser: React.FC<MarketplaceBrowserProps> = ({ onFeedSelect }) => {
  const { user, token } = useAuth();
  const { isConnected, registerUser } = useWebSocket();
  const { subscriptions, refreshSubscriptions, isSubscribed } = useSubscriptions();
  const [feeds, setFeeds] = useState<WebSocketFeed[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFeedType, setSelectedFeedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'crypto', label: 'Crypto' },
    { value: 'stocks', label: 'Stocks' },
    { value: 'forex', label: 'Forex' },
    { value: 'commodities', label: 'Commodities' },
    { value: 'custom', label: 'Custom' },
  ];

  const feedTypes = [
    { value: 'all', label: 'All Feeds' },
    { value: 'company', label: '🏢 Company' },
    { value: 'user', label: '👤 User' },
  ];

  useEffect(() => {
    if (user && isConnected) {
      registerUser(user._id);
    }
  }, [user, isConnected, registerUser]);

  useEffect(() => {
    if (user && subscriptions.length === 0) {
      setTimeout(() => {
        refreshSubscriptions().catch((err) => console.warn('Subscription refresh failed:', err));
      }, 0);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFeeds();
    }, 0);

    return () => clearTimeout(timer);
  }, [selectedCategory, user]);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      setError(null);

      const categoryParam = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
      const response = await fetchWithTimeout(`${BACKEND_URL}/api/marketplace/feeds${categoryParam}`, {
        timeout: 5000,
      });

      if (!response.ok) {
        throw new Error('Failed to load feeds');
      }

      const result = await response.json();
      setFeeds(result.data || []);
    } catch (err: any) {
      console.error('Error loading feeds:', err);
      setError(err.message);
      setFeeds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (feedId: string) => {
    if (!user) {
      alert('Please login to subscribe to feeds');
      return;
    }

    try {
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      const response = await fetchWithTimeout(`${BACKEND_URL}/api/marketplace/subscribe/${feedId}`, {
        timeout: 10000,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to subscribe to feed');
      }

      await Promise.all([loadFeeds(), refreshSubscriptions()]);

      alert('Successfully subscribed! Set a custom AI prompt in My Subscriptions page.');
    } catch (error: any) {
      console.error('Error subscribing to feed:', error);
      alert(`Failed to subscribe: ${error.message}`);
    }
  };

  const handleUnsubscribe = async (feedId: string) => {
    if (!user) {
      alert('Please login to unsubscribe from feeds');
      return;
    }

    try {
      if (!token) {
        alert('Authentication token not found. Please login again.');
        return;
      }

      const response = await fetchWithTimeout(`${BACKEND_URL}/api/marketplace/unsubscribe/${feedId}`, {
        timeout: 10000,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to unsubscribe');
      }

      alert('Successfully unsubscribed!');
      await refreshSubscriptions();
      await loadFeeds();
    } catch (err: any) {
      console.error('Unsubscribe error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const filteredFeeds = feeds.filter((feed) => {
    if (selectedFeedType !== 'all' && feed.feedType !== selectedFeedType) {
      return false;
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      return (
        feed.name.toLowerCase().includes(query) ||
        feed.description.toLowerCase().includes(query) ||
        feed.category.toLowerCase().includes(query) ||
        (feed.eventName?.toLowerCase().includes(query) ?? false)
      );
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <Card className="panel">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 muted">
              Search Feeds
            </label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, description, or category"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 muted">
              Category
            </label>
            <Select
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value)}
              options={categories}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 muted">
              Feed Type
            </label>
            <Select
              value={selectedFeedType}
              onChange={(value) => setSelectedFeedType(value)}
              options={feedTypes}
            />
          </div>
        </div>
      </Card>

      {error && (
        <Card className="panel border border-red-500/40 bg-red-500/5 text-red-400">
          <p>{error}</p>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-400 mt-4">Loading marketplace feeds...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFeeds.map((feed) => (
            <UnifiedFeedCard
              key={feed._id}
              id={feed._id!}
              title={feed.name}
              description={feed.description}
              provider={feed.ownerName}
              icon={feed.icon ? <span className="text-3xl">{feed.icon}</span> : undefined}
              verified={!!feed.isVerified}
              live={!!feed.isActive}
              tags={(feed.tags || []).slice(0, 4)}
              isSubscribed={isSubscribed(feed._id!)}
              onView={() => onFeedSelect?.(feed)}
              onSubscribe={() => handleSubscribe(feed._id!)}
              onUnsubscribe={() => handleUnsubscribe(feed._id!)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketplaceBrowser;
