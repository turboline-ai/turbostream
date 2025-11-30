"use client";

import { CryptoData } from "@/types/crypto";

interface CryptoTableProps {
  data: CryptoData[];
  onSelectCrypto: (symbol: string) => void;
  selectedCrypto: string;
}

export default function CryptoTable({
  data,
  onSelectCrypto,
  selectedCrypto,
}: CryptoTableProps) {
  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-5 py-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">📊 Market Overview</h2>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr className="text-left text-gray-400 border-b-2 border-gray-700">
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase">Symbol</th>
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase">Name</th>
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase text-right">Price</th>
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase text-right">24h Change</th>
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase text-right">Volume</th>
              <th className="pb-3 pt-2 px-4 font-semibold text-xs uppercase text-right">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(data) ? data.map((crypto) => (
              <tr
                key={crypto.symbol}
                onClick={() => onSelectCrypto(crypto.symbol)}
                className={`border-b border-gray-700 hover:bg-gray-700/70 cursor-pointer transition-all ${
                  selectedCrypto === crypto.symbol ? "bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-l-4 border-l-blue-500" : ""
                }`}
              >
                <td className="py-3 px-4 font-bold text-white text-sm">{crypto.symbol}</td>
                <td className="py-3 px-4 text-gray-300 text-sm">{crypto.name}</td>
                <td className="py-3 px-4 text-right font-mono text-white text-sm font-semibold">
                  ${crypto.price.toLocaleString()}
                </td>
                <td
                  className={`py-3 px-4 text-right font-bold text-sm ${
                    crypto.changePercent24h >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {crypto.changePercent24h >= 0 ? "▲ +" : "▼ "}
                  {crypto.changePercent24h.toFixed(2)}%
                </td>
                <td className="py-3 px-4 text-right text-gray-400 font-mono text-sm">
                  ${(crypto.volume24h / 1000000).toFixed(2)}M
                </td>
                <td className="py-3 px-4 text-right text-gray-400 font-mono text-sm">
                  ${(crypto.marketCap / 1000000000).toFixed(2)}B
                </td>
              </tr>
            )) : null}
          </tbody>
        </table>
        {(!Array.isArray(data) || data.length === 0) && (
          <div className="text-center py-8 text-gray-400">
            No data available. Make sure WebSocket server is running.
          </div>
        )}
      </div>
    </div>
  );
}
