"use client";

import { useState } from 'react';
import { ACTIVE_STOCKS, AVAILABLE_STOCKS, addStockToActive, removeStockFromActive, StockConfig } from '@/utils/stockConfig';

interface StockManagerProps {
  onStockListUpdate?: () => void;
}

export default function StockManager({ onStockListUpdate }: StockManagerProps) {
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddStock = () => {
    if (selectedStock && addStockToActive(selectedStock)) {
      setSelectedStock('');
      onStockListUpdate?.();
    }
  };

  const handleRemoveStock = (symbol: string) => {
    if (removeStockFromActive(symbol)) {
      onStockListUpdate?.();
    }
  };

  const availableToAdd = AVAILABLE_STOCKS.filter(
    available => !ACTIVE_STOCKS.find(active => active.symbol === available.symbol)
  );

  if (!isExpanded) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-300">Stock Portfolio</span>
            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
              {ACTIVE_STOCKS.length} stocks
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-md transition-colors"
          >
            Manage Stocks
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          Tracking: {ACTIVE_STOCKS.map(s => s.symbol).join(', ')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Manage Stock Portfolio</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      {/* Current Active Stocks */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">
          Active Stocks ({ACTIVE_STOCKS.length})
        </h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {ACTIVE_STOCKS.map((stock: StockConfig) => (
            <div key={stock.symbol} className="flex justify-between items-center bg-gray-700 p-3 rounded-md">
              <div>
                <div className="flex items-center space-x-3">
                  <span className="font-semibold text-white">{stock.symbol}</span>
                  <span className="text-gray-300 text-sm">{stock.name}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {stock.sector} • {stock.exchange}
                </div>
              </div>
              <button
                onClick={() => handleRemoveStock(stock.symbol)}
                className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded-md hover:bg-red-900/20 transition-colors"
                disabled={ACTIVE_STOCKS.length <= 1} // Prevent removing all stocks
                title={ACTIVE_STOCKS.length <= 1 ? "At least one stock must remain active" : "Remove stock"}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add New Stock */}
      {availableToAdd.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Add New Stock</h4>
          <div className="flex space-x-3">
            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a stock to add...</option>
              {availableToAdd.map((stock: StockConfig) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} - {stock.name} ({stock.sector})
                </option>
              ))}
            </select>
            <button
              onClick={handleAddStock}
              disabled={!selectedStock}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Add Stock
            </button>
          </div>
        </div>
      )}

      {availableToAdd.length === 0 && (
        <div className="text-center py-4 text-gray-400">
          <div className="text-2xl mb-2">🎉</div>
          <p>All available stocks are currently active!</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-md">
        <div className="text-xs text-blue-300">
          <div className="font-medium mb-1">💡 Pro Tip:</div>
          <ul className="space-y-1 text-blue-200">
            <li>• Add popular stocks to track real-time market movements</li>
            <li>• Remove stocks you're not interested in to focus your analysis</li>
            <li>• Changes take effect immediately in the stock overview</li>
          </ul>
        </div>
      </div>
    </div>
  );
}