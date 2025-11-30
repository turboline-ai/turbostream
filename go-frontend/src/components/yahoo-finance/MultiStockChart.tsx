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
  Legend
} from "recharts";

interface MultiStockChartProps {
  data: StockData[];
}

interface MultiStockDataPoint {
  time: string;
  timestamp: number;
  [key: string]: number | string; // Dynamic stock symbols as keys
}

// Color palette for different stocks
const STOCK_COLORS = [
  '#10B981', // Green
  '#3B82F6', // Blue  
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6366F1', // Indigo
];

export default function MultiStockChart({ data }: MultiStockChartProps) {
  const [chartData, setChartData] = useState<MultiStockDataPoint[]>([]);
  const [stockColors, setStockColors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    // Create a new data point with current prices for all stocks
    const now = new Date();
    const newPoint: MultiStockDataPoint = {
      time: now.toLocaleTimeString(),
      timestamp: now.getTime(),
    };

    // Track if we need to update colors
    let needsColorUpdate = false;
    const newStockColors = { ...stockColors };
    let colorIndex = Object.keys(newStockColors).length;

    // Add each stock's current price to the data point
    data.forEach(stock => {
      newPoint[stock.symbol] = stock.price;
      
      // Assign color if not already assigned
      if (!newStockColors[stock.symbol]) {
        newStockColors[stock.symbol] = STOCK_COLORS[colorIndex % STOCK_COLORS.length];
        colorIndex++;
        needsColorUpdate = true;
        console.log(`📈 Added new stock line: ${stock.symbol} with color ${STOCK_COLORS[colorIndex - 1]}`);
      }
    });

    // Only update colors if there are new stocks
    if (needsColorUpdate) {
      setStockColors(newStockColors);
    }

    setChartData(prev => {
      const updated = [...prev, newPoint];
      // Keep only last 50 data points for better performance
      const result = updated.slice(-50);
      console.log(`📊 Chart data updated: ${result.length} points, ${Object.keys(newStockColors).length} stock lines`);
      return result;
    });
  }, [data]); // Remove stockColors from dependencies to prevent infinite loop

  const formatTooltipValue = (value: number, name: string) => {
    if (typeof value === 'number') {
      return [`$${value.toFixed(2)}`, name];
    }
    return [value, name];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl max-w-xs">
          <p className="text-gray-300 font-medium mb-2">{`Time: ${label}`}</p>
          <div className="space-y-1">
            {payload
              .filter((entry: any) => entry.dataKey !== 'timestamp')
              .sort((a: any, b: any) => b.value - a.value) // Sort by price descending
              .map((entry: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-300 text-sm font-medium">
                      {entry.dataKey}
                    </span>
                  </div>
                  <span className="text-white font-semibold text-sm">
                    ${entry.value.toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload || payload.length === 0) return null;

    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload
          .filter((entry: any) => entry.dataKey !== 'timestamp')
          .map((entry: any, index: number) => {
            const stockData = data.find(s => s.symbol === entry.dataKey);
            const isPositive = stockData ? stockData.change >= 0 : true;
            
            return (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <div className="text-xs">
                  <div className="text-gray-300 font-medium">{entry.dataKey}</div>
                  {stockData && (
                    <div className={`font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      ${stockData.price.toFixed(2)} ({isPositive ? '+' : ''}{stockData.changePercent.toFixed(2)}%)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    );
  };

  const getYAxisDomain = () => {
    if (chartData.length === 0) return ['auto', 'auto'];
    
    let min = Infinity;
    let max = -Infinity;
    
    chartData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'time' && key !== 'timestamp' && typeof point[key] === 'number') {
          const value = point[key] as number;
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      });
    });
    
    const padding = (max - min) * 0.1; // 10% padding
    return [Math.max(0, min - padding), max + padding];
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">
          📈 Multi-Stock Real-Time Chart
        </h2>
        <div className="text-sm text-gray-400">
          {data.length} stocks • {Object.keys(stockColors).length} lines • Live data
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-2">📊</div>
            <p>Waiting for stock data...</p>
            <p className="text-sm mt-1">Multiple stock lines will appear as data arrives</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    // Show every 5th tick to avoid crowding
                    return value;
                  }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  domain={getYAxisDomain()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
                
                {/* Dynamic Lines for each stock */}
                {Object.keys(stockColors).map(symbol => (
                  <Line
                    key={symbol}
                    type="monotone"
                    dataKey={symbol}
                    stroke={stockColors[symbol]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    activeDot={{ 
                      r: 4, 
                      stroke: stockColors[symbol], 
                      strokeWidth: 2,
                      fill: '#1F2937'
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stock Summary */}
      {data.length > 0 && (
        <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
          <div className="text-xs text-gray-400 mb-2">Current Prices</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {data.map(stock => {
              const isPositive = stock.change >= 0;
              return (
                <div key={stock.symbol} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: stockColors[stock.symbol] }}
                    />
                    <span className="text-gray-300 text-xs font-medium">
                      {stock.symbol}
                    </span>
                  </div>
                  <div className={`text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    ${stock.price.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}