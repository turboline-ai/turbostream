"use client";

import { useState, useEffect } from 'react';
import { stockDiscovery, DiscoveredStock } from '@/services/dynamicStockDiscovery';

/**
 * Hook for using dynamic stock discovery
 */
export function useDynamicStocks() {
  const [allStocks, setAllStocks] = useState<DiscoveredStock[]>([]);
  const [activeStocks, setActiveStocks] = useState<DiscoveredStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to stock updates
    stockDiscovery.onStocksUpdated((stocks) => {
      setAllStocks(stocks);
      setActiveStocks(stocks.filter(s => s.isActive));
      setIsLoading(false);
    });

    // Load initial data
    const initialStocks = stockDiscovery.getAllStocks();
    setAllStocks(initialStocks);
    setActiveStocks(initialStocks.filter(s => s.isActive));
    setIsLoading(false);

    // Try to discover stocks from HTTP API
    stockDiscovery.discoverFromHTTPAPI('http://localhost:3001')
      .catch(err => console.warn('Could not discover stocks from HTTP API:', err));

  }, []);

  const reportStock = async (symbol: string, source: string, data?: Partial<DiscoveredStock>) => {
    await stockDiscovery.reportStockSeen(symbol, source, data);
  };

  return {
    allStocks,
    activeStocks,
    isLoading,
    reportStock,
    stockCount: allStocks.length,
    activeStockCount: activeStocks.length
  };
}

/**
 * Component to display dynamic stock discovery status
 */
export function DynamicStockStatus() {
  const { allStocks, activeStocks, isLoading } = useDynamicStocks();

  if (isLoading) {
    return (
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-md p-3 mb-4">
        <div className="text-blue-300 text-sm">
          🔍 Discovering available stocks...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-900/20 border border-green-700/30 rounded-md p-3 mb-4">
      <div className="text-green-300 text-sm">
        <div className="font-medium mb-1">📊 Dynamic Stock Discovery Active</div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-semibold">{allStocks.length}</span> stocks discovered
          </div>
          <div>
            <span className="font-semibold text-green-400">{activeStocks.length}</span> currently active
          </div>
        </div>
        {activeStocks.length > 0 && (
          <div className="mt-2 text-xs text-green-200">
            Active: {activeStocks.map(s => s.symbol).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}