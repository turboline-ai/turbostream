"use client";

import React from "react";
import { FilterProvider } from "@/contexts/FilterContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import FilterManager from "@/components/FilterManager";
import FilterStatus from "@/components/FilterStatus";
import FilteredFeedViewer from "@/components/FilteredFeedViewer";

export function FilterDemo() {
  const { feedData, isConnected } = useWebSocket();

  const availableFeeds = Array.from(feedData.keys());

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Feed Data Filtering System
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Connecting to WebSocket server...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FilterProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Feed Data Filtering System
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Create custom filters to process real-time feed data. Filter by any field, 
              set conditions, and see results instantly.
            </p>
          </div>

          {/* Status Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <FilterStatus />
            </div>
            
            <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Available Feeds ({availableFeeds.length})
              </h3>
              
              {availableFeeds.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No active feeds. Make sure websocket connections are established.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableFeeds.map(feedId => {
                    const data = feedData.get(feedId);
                    return (
                      <div 
                        key={feedId}
                        className="p-3 bg-gray-50 dark:bg-gray-700 rounded border"
                      >
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {data?.feedName || feedId}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {feedId}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Updated: {data?.timestamp 
                            ? new Date(data.timestamp).toLocaleTimeString()
                            : 'Never'
                          }
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Filter Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <FilterManager showFeedColumn={true} />
            </div>
            
            {/* Quick Filter Examples */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Filter Examples
              </h3>
              
              <div className="space-y-4 text-sm">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    Crypto: High Volume
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300">
                    Filter: volume24h greater than 1,000,000,000
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 text-xs">
                    Shows only cryptocurrencies with high trading volume
                  </p>
                </div>
                
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                  <h4 className="font-medium text-green-900 dark:text-green-100">
                    Stocks: Tech Sector Gainers
                  </h4>
                  <p className="text-green-700 dark:text-green-300">
                    Filter: sector equals "Technology" AND changePercent24h greater than 0
                  </p>
                  <p className="text-green-600 dark:text-green-400 text-xs">
                    Shows only technology stocks with positive performance
                  </p>
                </div>
                
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <h4 className="font-medium text-purple-900 dark:text-purple-100">
                    Price Range Filter
                  </h4>
                  <p className="text-purple-700 dark:text-purple-300">
                    Filter: price in range 100 to 500
                  </p>
                  <p className="text-purple-600 dark:text-purple-400 text-xs">
                    Shows items within a specific price range
                  </p>
                </div>
                
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <h4 className="font-medium text-orange-900 dark:text-orange-100">
                    Symbol Pattern
                  </h4>
                  <p className="text-orange-700 dark:text-orange-300">
                    Filter: symbol regex "^(BTC|ETH|ADA)"
                  </p>
                  <p className="text-orange-600 dark:text-orange-400 text-xs">
                    Shows only specific cryptocurrency symbols
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feed Data Viewers */}
          {availableFeeds.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Live Feed Data
              </h2>
              
              <div className="grid grid-cols-1 gap-6">
                {availableFeeds.slice(0, 3).map(feedId => (
                  <FilteredFeedViewer
                    key={feedId}
                    feedId={feedId}
                    className="w-full"
                  />
                ))}
              </div>
              
              {availableFeeds.length > 3 && (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400">
                    Showing first 3 feeds. Total feeds available: {availableFeeds.length}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </FilterProvider>
  );
}

export default FilterDemo;