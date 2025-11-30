'use client';

import { use } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WebSocketFeed } from '@/types/marketplace';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useWebSocket } from '@/hooks/useWebSocket';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

interface FeedHistoryPageProps {
  params: Promise<{ id: string }>;
}

export default function FeedHistoryPage({ params }: FeedHistoryPageProps) {
  const resolvedParams = use(params);
  const feedId = resolvedParams.id;
  const router = useRouter();
  const { user, token } = useAuth();
  const { feedData } = useWebSocket();
  const [feed, setFeed] = useState<WebSocketFeed | null>(null);
  const [dataHistory, setDataHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const maxHistorySize = 100; // Show more history on dedicated page

  useEffect(() => {
    loadFeed();
  }, [feedId]);

  // Update history from WebSocket data
  useEffect(() => {
    const feedDataItem = feedData.get(feedId);
    if (feedDataItem) {
      setDataHistory((prev) => {
        const updated = [feedDataItem, ...prev];
        return updated.slice(0, maxHistorySize);
      });
    }
  }, [feedData, feedId]);

  const loadFeed = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${BACKEND_URL}/api/marketplace/feeds/${feedId}`);
      
      if (!response.ok) {
        throw new Error('Feed not found');
      }

      const result = await response.json();
      setFeed(result.data);
    } catch (err: any) {
      console.error('Error loading feed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderValue = (value: any, key?: string): React.ReactElement => {
    if (value === null || value === undefined) {
      return <span className="text-gray-500 italic">null</span>;
    }

    if (typeof value === 'boolean') {
      return (
        <span className={value ? 'text-green-400' : 'text-red-400'}>
          {value ? 'true' : 'false'}
        </span>
      );
    }

    if (typeof value === 'number') {
      return <span className="text-blue-400">{value.toLocaleString()}</span>;
    }

    if (typeof value === 'string') {
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {value}
          </a>
        );
      }
      return <span className="text-green-400">"{value}"</span>;
    }

    if (Array.isArray(value)) {
      return (
        <div className="ml-4 border-l-2 border-gray-700 pl-3">
          <span className="text-gray-400">[</span>
          {value.map((item, index) => (
            <div key={index} className="ml-2">
              {renderValue(item)}
              {index < value.length - 1 && <span className="text-gray-400">,</span>}
            </div>
          ))}
          <span className="text-gray-400">]</span>
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div className="ml-4 border-l-2 border-gray-700 pl-3">
          <span className="text-gray-400">{'{'}</span>
          {Object.entries(value).map(([k, v], index, arr) => (
            <div key={k} className="ml-2">
              <span className="text-purple-400">{k}</span>
              <span className="text-gray-400">: </span>
              {renderValue(v, k)}
              {index < arr.length - 1 && <span className="text-gray-400">,</span>}
            </div>
          ))}
          <span className="text-gray-400">{'}'}</span>
        </div>
      );
    }

    return <span className="text-gray-400">{String(value)}</span>;
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

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

  return (
    <ProtectedRoute>
      <div className="h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="h-full bg-gray-800 rounded-lg overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gray-900 border-b border-gray-700 p-4">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.push(`/feeds/${feedId}`)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                ← Back to Feed
              </button>
              <div className="flex items-center gap-3 flex-1">
                {feed.icon && <span className="text-3xl">{feed.icon}</span>}
                <div>
                  <h1 className="text-2xl font-bold text-white">{feed.name}</h1>
                  <p className="text-gray-400 text-sm">{feed.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded text-xs font-medium ${
                  feed.feedType === 'company' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-blue-500 text-white'
                }`}>
                  {feed.feedType === 'company' ? '🏢 Company' : '👤 User'}
                </span>
                <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-300">Live</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>📊 {feed.dataFormat}</span>
              <span>{dataHistory.length} updates in history</span>
            </div>
          </div>

          {/* History Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Data History
              </h2>
              
              {dataHistory.length > 0 ? (
                <div className="space-y-3">
                  {dataHistory.map((item, index) => (
                    <div
                      key={index}
                      className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-300">
                          {formatTimestamp(item.timestamp)}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                          #{dataHistory.length - index}
                        </span>
                      </div>
                      <div className="bg-gray-950 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                        {renderValue(item.data)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24">
                  <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-gray-400 text-lg">Waiting for data...</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Listening to event: <span className="text-blue-400">{feed.eventName}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Stats */}
          <div className="bg-gray-900 border-t border-gray-700 p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4 text-gray-400">
                <span>Total Updates: {dataHistory.length} / {maxHistorySize}</span>
                <span className="text-gray-500">Auto-updates in real-time</span>
              </div>
              <div className="flex items-center gap-2">
                {feed.website && (
                  <a
                    href={feed.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    🌐 Website
                  </a>
                )}
                {feed.documentation && (
                  <a
                    href={feed.documentation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    📖 Docs
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
