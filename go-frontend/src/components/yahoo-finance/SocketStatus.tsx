"use client";

import { useState, useEffect } from 'react';
import { AVAILABLE_STOCKS } from '@/utils/stockConfig';

interface SocketStatusProps {
  isConnected: boolean;
  activeStocks: string[];
  lastUpdate?: Date;
}

export default function SocketStatus({ isConnected, activeStocks, lastUpdate }: SocketStatusProps) {
  const [blinkStatus, setBlinkStatus] = useState(false);

  // Blink effect when data is received
  useEffect(() => {
    if (lastUpdate) {
      setBlinkStatus(true);
      const timer = setTimeout(() => setBlinkStatus(false), 300);
      return () => clearTimeout(timer);
    }
  }, [lastUpdate]);

  const allPossibleStocks = AVAILABLE_STOCKS.concat([
    { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 0, exchange: '', sector: '' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', basePrice: 0, exchange: '', sector: '' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 0, exchange: '', sector: '' },
    { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 0, exchange: '', sector: '' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', basePrice: 0, exchange: '', sector: '' },
    { symbol: 'NFLX', name: 'Netflix Inc.', basePrice: 0, exchange: '', sector: '' },
  ]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full transition-colors ${
              isConnected ? (blinkStatus ? 'bg-yellow-400' : 'bg-green-400') : 'bg-red-400'
            }`} />
            <span className="text-white font-medium">Yahoo Finance Socket</span>
          </div>
          <div className={`text-xs px-2 py-1 rounded-full ${
            isConnected ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-red-900/30 text-red-400 border border-red-500/30'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        
        <div className="text-xs text-gray-400">
          {lastUpdate ? `Last update: ${lastUpdate.toLocaleTimeString()}` : 'No data yet'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Stocks */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Receiving Data ({activeStocks.length})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {activeStocks.length > 0 ? activeStocks.map(symbol => (
              <div key={symbol} className="flex items-center space-x-2 text-xs">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white font-mono">{symbol}</span>
                <span className="text-gray-400">
                  {allPossibleStocks.find(s => s.symbol === symbol)?.name || symbol}
                </span>
              </div>
            )) : (
              <div className="text-xs text-gray-500 italic">
                Waiting for socket data...
              </div>
            )}
          </div>
        </div>

        {/* Waiting Stocks */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Waiting for Data ({allPossibleStocks.length - activeStocks.length})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {allPossibleStocks
              .filter(stock => !activeStocks.includes(stock.symbol))
              .slice(0, 8) // Show only first 8 to avoid clutter
              .map(stock => (
              <div key={stock.symbol} className="flex items-center space-x-2 text-xs">
                <div className="w-2 h-2 bg-gray-600 rounded-full" />
                <span className="text-gray-500 font-mono">{stock.symbol}</span>
                <span className="text-gray-600">
                  {stock.name || stock.symbol}
                </span>
              </div>
            ))}
            {allPossibleStocks.length - activeStocks.length > 8 && (
              <div className="text-xs text-gray-600 italic">
                ...and {allPossibleStocks.length - activeStocks.length - 8} more
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          💡 <strong>Real-time Socket Behavior:</strong> Stocks appear as data arrives from Yahoo Finance WebSocket. 
          Only companies with active price feeds will be displayed in the table.
        </div>
      </div>
    </div>
  );
}