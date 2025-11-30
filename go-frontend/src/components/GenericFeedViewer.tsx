'use client';

import React, { useEffect, useState } from 'react';
import { WebSocketFeed, FeedData } from '@/types/marketplace';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import UniversalAIInsights from './UniversalAIInsights';

interface GenericFeedViewerProps {
  feed: WebSocketFeed;
  userCustomPrompt?: string;
  onPromptChange?: (prompt: string) => void;
}

const normalizePayload = (value: any): { structured: any; raw: string | null } => {
  if (value === null || value === undefined) {
    return { structured: null, raw: null };
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return { structured: parsed, raw: value };
    } catch {
      return { structured: value, raw: value };
    }
  }
  return { structured: value, raw: null };
};

const GenericFeedViewer: React.FC<GenericFeedViewerProps> = ({ feed, userCustomPrompt, onPromptChange }) => {
  const { feedData, isConnected } = useWebSocket();
  const { user } = useAuth();
  const [currentPayload, setCurrentPayload] = useState<{ structured: any; raw: string | null }>({
    structured: null,
    raw: null,
  });
  const [dataHistory, setDataHistory] = useState<any[]>([]);
  const [totalDataTransferred, setTotalDataTransferred] = useState<number>(0);
  const [lastDataSize, setLastDataSize] = useState<number>(0);
  const maxHistorySize = 50;

  useEffect(() => {
    const feedDataItem = feedData.get(feed._id!);
    if (feedDataItem) {
      // console.log(`📊 GenericFeedViewer: Received new data for feed ${feed._id} (${feed.name}):`, {
      //   dataType: typeof feedDataItem.data,
      //   dataLength: Array.isArray(feedDataItem.data) ? feedDataItem.data.length : 'N/A',
      //   timestamp: feedDataItem.timestamp
      // });
      
      const normalized = normalizePayload(feedDataItem.data);
      setCurrentPayload(normalized);
      
      // Calculate data size and add to total
      const dataSize =
        typeof feedDataItem.data === 'string'
          ? feedDataItem.data.length
          : JSON.stringify(feedDataItem.data ?? {}).length;
      setLastDataSize(dataSize);
      setTotalDataTransferred(prev => prev + dataSize);
      
      // Add to history
      setDataHistory((prev) => {
        const updated = [feedDataItem, ...prev];
        return updated.slice(0, maxHistorySize);
      });
    } else {
      // console.log(`🔍 GenericFeedViewer: No data found for feed ${feed._id} (${feed.name}) in feedData map. Available feeds:`, Array.from(feedData.keys()));
    }
  }, [feedData, feed._id, feed.name]);

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
      // Check if it's a URL
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
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="flex flex-col bg-gray-800 rounded-lg overflow-hidden h-full" >
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-2 px-3">
        <div className="flex items-center gap-3">
          {feed.icon && <span className="text-2xl">{feed.icon}</span>}
          <div className="flex-1 flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">{feed.name}</h2>
            {/* Connection Status */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${
              !feed.isActive 
                ? 'bg-red-900/30 border border-red-600' 
                : 'bg-gray-700/50 border border-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                !feed.isActive 
                  ? 'bg-red-500' 
                  : isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className={`text-xs ${
                !feed.isActive 
                  ? 'text-red-400' 
                  : 'text-gray-300'
              }`}>
                {!feed.isActive ? 'Inactive' : isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                Updates: {dataHistory.length}
              </span>
              {(currentPayload.structured !== null || currentPayload.raw) && (
                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                  Size: {formatSize(lastDataSize)}
                </span>
              )}
              <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Total: {formatSize(totalDataTransferred)}</span>
              {feed.website && (
                <a
                  href={feed.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-2 py-1 rounded-full transition-colors"
                >
                  🌐 Website
                </a>
              )}
              {feed.documentation && (
                <a
                  href={feed.documentation}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-2 py-1 rounded-full transition-colors"
                >
                  📖 Docs
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Current Data */}
        <div className="w-1/2 border-r border-gray-700 overflow-y-auto p-1 space-y-4">
          {currentPayload.structured !== null || currentPayload.raw ? (
            <>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                {currentPayload.structured !== null && typeof currentPayload.structured !== 'string' ? (
                  renderValue(currentPayload.structured)
                ) : (
                  <pre className="whitespace-pre-wrap text-gray-100">
                    {typeof currentPayload.structured === 'string'
                      ? currentPayload.structured
                      : currentPayload.raw}
                  </pre>
                )}
              </div>
              {currentPayload.raw && typeof currentPayload.structured !== 'string' && (
                <div className="bg-gray-900/70 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-2">Raw Payload</p>
                  <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all">
                    {currentPayload.raw}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-400">Waiting for data...</p>
              <p className="text-gray-500 text-sm mt-2">
                Listening to event:{" "}
                <span className="text-blue-400">{feed.eventName}</span>
              </p>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="w-1/2 p-1">
          <UniversalAIInsights
            feed={feed}
            realTimeData={
              currentPayload.structured !== null
                ? currentPayload.structured
                : currentPayload.raw
            }
            userCustomPrompt={userCustomPrompt}
            onPromptChange={onPromptChange}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default GenericFeedViewer;
