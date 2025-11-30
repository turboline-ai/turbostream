"use client";

import { StockData, MarketStatus } from "@/types/stocks";

interface StockTableProps {
  data: StockData[];
  onSelectStock: (symbol: string) => void;
  selectedStock: string;
}

export default function StockTable({
  data,
  onSelectStock,
  selectedStock,
}: StockTableProps) {
  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 30) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toLocaleString();
  };

  const getMarketStatusBadge = (marketHours: number) => {
    if (marketHours === MarketStatus.REGULAR_HOURS) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
          • Regular Hours
        </span>
      );
    } else if (marketHours === MarketStatus.EXTENDED_HOURS) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-500/30">
          • Extended Hours
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-500/30">
          • Market Closed
        </span>
      );
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-5 py-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Stock Market Overview</h2>
          <div className="text-sm text-gray-400">
            {Array.isArray(data) ? data.length : 0} stocks
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr className="text-left text-gray-400 border-b-2 border-gray-700">
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase">Symbol</th>
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase">Exchange</th>
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase text-right">Price</th>
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase text-right">Change</th>
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase text-right">Day Range</th>
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase text-right">Volume</th>
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase text-center">Status</th>
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase text-center">Last Received</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(data) ? data.map((stock) => (
              <tr
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol)}
                className={`border-b border-gray-700 hover:bg-gray-700/70 cursor-pointer transition-all ${
                  selectedStock === stock.symbol ? "bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-l-4 border-l-blue-500" : ""
                }`}
              >
                <td className="py-3 px-4 font-bold text-white text-sm">
                  <div>
                    <div className="font-bold">{stock.symbol}</div>
                    {stock.name && (
                      <div className="text-xs text-gray-400 truncate max-w-[120px]">
                        {stock.name}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-300 text-sm">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                    {stock.exchange || 'N/A'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-mono text-white text-sm font-semibold">
                  {formatPrice(stock.price)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-sm">
                  <div className={
                    stock.change >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }>
                    <div>
                      {stock.change >= 0 ? "+" : ""}{formatPrice(stock.change)}
                    </div>
                    <div className="text-xs">
                      ({stock.change >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%)
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono text-sm">
                  <div className="text-gray-300">
                    <div className="text-red-400">{formatPrice(stock.dayLow)}</div>
                    <div className="text-green-400">{formatPrice(stock.dayHigh)}</div>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono text-gray-300 text-sm">
                  {formatVolume(stock.dayVolume)}
                </td>
                <td className="py-3 px-4 text-center">
                  {getMarketStatusBadge(stock.marketHours)}
                </td>
                <td className="py-3 px-4 text-center text-xs">
                  <div className="text-gray-400">
                    <div className="font-mono">
                      {new Date(stock.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-gray-500 mt-1">
                      {getTimeAgo(stock.timestamp)}
                    </div>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-400">
                  <div className="text-4xl mb-2">📈</div>
                  <p>Waiting for stock data from socket...</p>
                  <p className="text-sm mt-1">Stocks will appear as data arrives from Yahoo Finance feed</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {Array.isArray(data) && data.length > 0 && (
        <div className="flex-shrink-0 px-5 py-3 border-t border-gray-700 bg-gray-800/50">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <div>
              <span className="text-green-400 font-semibold">
                {data.filter(s => s.change >= 0).length}
              </span>
              {" "}up, {" "}
              <span className="text-red-400 font-semibold">
                {data.filter(s => s.change < 0).length}
              </span>
              {" "}down
            </div>
            <div>
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}