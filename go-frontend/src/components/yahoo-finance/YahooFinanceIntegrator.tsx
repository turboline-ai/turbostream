"use client";

import { StockData, DecodedYahooFinanceData } from '@/types/stocks';
import { useEffect, useState, useCallback, useRef } from 'react';
import { ACTIVE_STOCKS, getCompanyName as getConfigCompanyName, generateMockStockData } from '@/utils/stockConfig';
import { stockDiscovery, DiscoveredStock } from '@/services/dynamicStockDiscovery';

interface YahooFinanceIntegratorProps {
  feedId: string;
  onStockData: (data: StockData[]) => void;
  onStockUpdate?: (stockData: StockData) => void; // New: for individual stock updates
  onSocketStatus?: (isConnected: boolean, activeStocks: string[], lastUpdate?: Date) => void;
}

/**
 * Component to handle Yahoo Finance protobuf feed integration
 * Connects to WebSocket, processes protobuf data, and provides stock data
 */
export default function YahooFinanceIntegrator({ 
  feedId, 
  onStockData,
  onStockUpdate,
  onSocketStatus 
}: YahooFinanceIntegratorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [stockMap, setStockMap] = useState<Map<string, StockData>>(new Map());
  const [latestStockUpdate, setLatestStockUpdate] = useState<StockData | null>(null);
  const [discoveredStocks, setDiscoveredStocks] = useState<DiscoveredStock[]>([]);

  // Initialize dynamic stock discovery
  useEffect(() => {
    // Subscribe to discovered stock updates
    stockDiscovery.onStocksUpdated((stocks) => {
      setDiscoveredStocks(stocks);
    });

    // Initial load of discovered stocks
    setDiscoveredStocks(stockDiscovery.getAllStocks());
  }, []);

  // Use refs to track the latest callback values without causing re-renders
  const onStockDataRef = useRef(onStockData);
  const onStockUpdateRef = useRef(onStockUpdate);
  const onSocketStatusRef = useRef(onSocketStatus);

  // Update refs when callbacks change
  useEffect(() => {
    onStockDataRef.current = onStockData;
    onStockUpdateRef.current = onStockUpdate;
    onSocketStatusRef.current = onSocketStatus;
  });

  // Handle side effects when stock data updates
  useEffect(() => {
    if (latestStockUpdate && lastUpdate) {
      // Report this stock to the discovery service
      stockDiscovery.reportStockSeen(
        latestStockUpdate.symbol, 
        'yahoo-finance-socket',
        {
          name: latestStockUpdate.name,
          exchange: latestStockUpdate.exchange,
          price: latestStockUpdate.price
        }
      );

      // Send individual stock update to parent using ref
      onStockUpdateRef.current?.(latestStockUpdate);
      
      // Send complete list for backward compatibility using ref
      const allCurrentStocks = Array.from(stockMap.values());
      onStockDataRef.current(allCurrentStocks);
      
      // Send socket status update using ref
      onSocketStatusRef.current?.(isConnected, allCurrentStocks.map(s => s.symbol), lastUpdate);
    }
  }, [latestStockUpdate, lastUpdate, stockMap, isConnected]);

  useEffect(() => {
    // TODO: Implement actual WebSocket connection to Yahoo Finance feed
    // This would connect to the backend WebSocket that handles the protobuf decoding
    
    const connectToYahooFeed = () => {
      console.log(`Connecting to Yahoo Finance feed: ${feedId}`);
      
      // Mock connection for demonstration
      setIsConnected(true);
      
      // Simulate receiving stock data from socket - update all stocks simultaneously
      const simulateSocketStockData = () => {
        // Use dynamic stock discovery instead of hardcoded list
        const availableStocks = discoveredStocks.length > 0 
          ? discoveredStocks 
          : ACTIVE_STOCKS; // Fallback to config if discovery is empty
        
        if (availableStocks.length === 0) return;

        // Generate data for ALL stocks to populate multi-stock chart
        const updatedStocks = new Map<string, StockData>();
        let latestStock: StockData | null = null;

        availableStocks.forEach(stock => {
          // Generate socket data for this stock
          const socketStockData = 'basePrice' in stock
            ? generateMockStockData(stock) // Use config-based generator for StockConfig
            : generateMockDataForDiscoveredStock(stock); // Use dynamic generator for DiscoveredStock

          // Convert to StockData format
          const newStockData: StockData = {
            id: socketStockData.id,
            symbol: socketStockData.id,
            name: getCompanyName(socketStockData.id),
            price: socketStockData.price,
            change: socketStockData.change,
            changePercent: socketStockData.changePercent,
            dayHigh: socketStockData.dayHigh,
            dayLow: socketStockData.dayLow,
            dayVolume: parseInt(socketStockData.dayVolume),
            exchange: socketStockData.exchange,
            marketHours: socketStockData.marketHours,
            timestamp: Date.now(), // Current timestamp when data was received
            quoteType: socketStockData.quoteType,
          };

          updatedStocks.set(newStockData.symbol, newStockData);
          if (!latestStock) latestStock = newStockData; // Keep first one for callback
        });

        console.log(`Yahoo Finance Integrator: Updating ${updatedStocks.size} stocks:`, Array.from(updatedStocks.keys()));

        // Update ALL stocks in the map at once
        setStockMap(prevMap => {
          const newMap = new Map(prevMap);
          updatedStocks.forEach((stockData, symbol) => {
            newMap.set(symbol, stockData);
          });
          return newMap;
        });

        // Update timestamp and trigger callbacks via state
        setLastUpdate(new Date());
        if (latestStock) {
          setLatestStockUpdate(latestStock);
        }
      };

      // Simulate periodic socket updates (every 2-5 seconds to be more realistic)
      const interval = setInterval(simulateSocketStockData, 2000 + Math.random() * 3000);
      
      // Don't send initial data - wait for socket data to arrive

      return () => {
        clearInterval(interval);
        setIsConnected(false);
      };
    };

    const cleanup = connectToYahooFeed();
    
    return cleanup;
  }, [feedId, onStockData]);

  // Helper function to get company names (now uses the config system)
  const getCompanyName = (symbol: string): string => {
    return getConfigCompanyName(symbol);
  };

  // Generate mock data for dynamically discovered stocks
  const generateMockDataForDiscoveredStock = (stock: DiscoveredStock) => {
    const basePrice = stock.price || 100 + Math.random() * 400; // Use known price or generate one
    const priceVariation = basePrice * 0.02; // 2% variation
    const currentPrice = basePrice + (Math.random() - 0.5) * priceVariation;
    const change = (Math.random() - 0.5) * (basePrice * 0.05); // Up to 5% change
    const changePercent = (change / basePrice) * 100;
    
    return {
      id: stock.symbol,
      price: currentPrice,
      time: Date.now().toString(),
      exchange: stock.exchange,
      quoteType: 1,
      marketHours: 1,
      changePercent: changePercent,
      dayVolume: Math.floor(Math.random() * 100000000 + 10000000).toString(),
      dayHigh: currentPrice + Math.abs(change) * 0.5,
      dayLow: currentPrice - Math.abs(change) * 0.5,
      change: change,
    };
  };

  return (
    <div className="text-xs text-gray-500 p-2 border-b border-gray-700">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span>Yahoo Finance Feed</span>
        </div>
        <div>
          {lastUpdate ? `Last update: ${lastUpdate.toLocaleTimeString()}` : 'Connecting...'}
        </div>
      </div>
      <div className="mt-1 text-gray-600">
        Protobuf decoder active • {stockMap.size} symbols tracked
      </div>
    </div>
  );
}