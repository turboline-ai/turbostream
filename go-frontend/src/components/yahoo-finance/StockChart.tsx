"use client";

import { StockData } from "@/types/stocks";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface StockChartProps {
  data: StockData[];
  selectedStock: string;
}

interface ChartDataPoint {
  time: string;
  price: number;
  volume: number;
  change: number;
}

export default function StockChart({ data, selectedStock }: StockChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const strokeGreen = (typeof window !== 'undefined'
    ? getComputedStyle(document.body).getPropertyValue('--green').trim()
    : '') || '#10B981';
  const strokeRed = (typeof window !== 'undefined'
    ? getComputedStyle(document.body).getPropertyValue('--red').trim()
    : '') || '#EF4444';

  useEffect(() => {
    if (!Array.isArray(data)) {
      console.warn("StockChart: data is not an array:", data);
      return;
    }
    
    const stock = data.find((s) => s.symbol === selectedStock);
    if (stock) {
      const now = new Date();
      const newPoint = {
        time: now.toLocaleTimeString(),
        price: stock.price,
        volume: stock.dayVolume,
        change: stock.change,
      };

      setChartData((prev) => {
        const updated = [...prev, newPoint];
        // Keep only last 30 data points for stocks (longer history than crypto)
        return updated.slice(-30);
      });
    }
  }, [data, selectedStock]);

  const selectedStockData = data.find((s) => s.symbol === selectedStock);
  const isPositive = selectedStockData ? selectedStockData.change >= 0 : true;

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'price') {
      return [`$${value.toFixed(2)}`, 'Price'];
    }
    if (name === 'volume') {
      return [value.toLocaleString(), 'Volume'];
    }
    if (name === 'change') {
      return [`$${value.toFixed(2)}`, 'Change'];
    }
    return [value, name];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl">
          <p className="text-gray-300 font-medium">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="font-semibold">
              {formatTooltipValue(entry.value, entry.dataKey)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">
          {selectedStock} Stock Chart
        </h2>
        {selectedStockData && (
          <div className="text-right">
            <div className="text-white font-mono text-lg font-bold">
              ${selectedStockData.price.toFixed(2)}
            </div>
            <div className={`text-sm font-semibold ${
              isPositive ? "text-green-400" : "text-red-400"
            }`}>
              {isPositive ? "+" : ""}${selectedStockData.change.toFixed(2)} (
              {isPositive ? "+" : ""}{selectedStockData.changePercent.toFixed(2)}%)
            </div>
            <div className="text-xs text-gray-400">
              Vol: {selectedStockData.dayVolume.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-2">📊</div>
            <p>Waiting for {selectedStock} stock data...</p>
            <p className="text-sm mt-1">Make sure the market is open</p>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="5%" 
                    stopColor={isPositive ? strokeGreen : strokeRed} 
                    stopOpacity={0.3}
                  />
                  <stop 
                    offset="95%" 
                    stopColor={isPositive ? strokeGreen : strokeRed} 
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isPositive ? strokeGreen : strokeRed}
                fillOpacity={1}
                fill="url(#stockGradient)"
                strokeWidth={2}
                dot={{ r: 3, fill: isPositive ? strokeGreen : strokeRed }}
                activeDot={{ r: 5, stroke: isPositive ? strokeGreen : strokeRed, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {selectedStockData && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-400">Day High</div>
              <div className="text-green-400 font-semibold">
                ${selectedStockData.dayHigh.toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Day Low</div>
              <div className="text-red-400 font-semibold">
                ${selectedStockData.dayLow.toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Exchange</div>
              <div className="text-white font-semibold">
                {selectedStockData.exchange}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Status</div>
              <div className={`font-semibold ${
                selectedStockData.marketHours === 1 ? "text-green-400" : "text-yellow-400"
              }`}>
                {selectedStockData.marketHours === 1 ? "Regular" : "Extended"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}