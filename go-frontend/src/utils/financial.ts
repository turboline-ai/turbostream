/**
 * Utility functions for financial calculations and formatting
 * Shared between crypto and stock components
 */

// Number formatting utilities
export const formatCurrency = (value: number, decimals: number = 2): string => {
  return `$${value.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })}`;
};

export const formatPercent = (value: number, decimals: number = 2): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

export const formatVolume = (volume: number): string => {
  if (volume >= 1000000000) {
    return `${(volume / 1000000000).toFixed(1)}B`;
  }
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toLocaleString();
};

export const formatMarketCap = (marketCap: number): string => {
  if (marketCap >= 1000000000000) {
    return `${(marketCap / 1000000000000).toFixed(2)}T`;
  }
  if (marketCap >= 1000000000) {
    return `${(marketCap / 1000000000).toFixed(2)}B`;
  }
  if (marketCap >= 1000000) {
    return `${(marketCap / 1000000).toFixed(2)}M`;
  }
  return formatCurrency(marketCap, 0);
};

// Color utilities for price changes
export const getPriceChangeColor = (change: number): string => {
  if (change > 0) return 'text-green-400';
  if (change < 0) return 'text-red-400';
  return 'text-gray-400';
};

export const getPriceChangeBgColor = (change: number): string => {
  if (change > 0) return 'bg-green-900/30';
  if (change < 0) return 'bg-red-900/30';
  return 'bg-gray-700/30';
};

// Technical analysis utilities
export const calculateMovingAverage = (prices: number[], period: number): number => {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
  return sum / period;
};

export const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

// Time formatting utilities
export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString();
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString();
};

export const formatDateTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

// Market status utilities
export const getMarketStatusText = (marketHours: number): string => {
  switch (marketHours) {
    case 1:
      return 'Regular Hours';
    case 0:
      return 'Extended Hours';
    default:
      return 'Market Closed';
  }
};

export const isMarketOpen = (marketHours: number): boolean => {
  return marketHours === 1;
};

// Data validation utilities
export const isValidPrice = (price: number): boolean => {
  return !isNaN(price) && price > 0 && isFinite(price);
};

export const isValidPercentage = (percentage: number): boolean => {
  return !isNaN(percentage) && isFinite(percentage);
};

// Chart data utilities
export const generateChartDataPoint = (
  timestamp: number, 
  price: number, 
  volume?: number
) => ({
  time: formatTime(timestamp),
  timestamp,
  price,
  volume: volume || 0,
});

export const limitChartData = <T>(data: T[], maxPoints: number = 50): T[] => {
  if (data.length <= maxPoints) return data;
  return data.slice(-maxPoints);
};

// Sorting utilities
export const sortByPrice = <T extends { price: number }>(data: T[], ascending = true): T[] => {
  return [...data].sort((a, b) => ascending ? a.price - b.price : b.price - a.price);
};

export const sortByChange = <T extends { change: number }>(data: T[], ascending = true): T[] => {
  return [...data].sort((a, b) => ascending ? a.change - b.change : b.change - a.change);
};

export const sortByVolume = <T extends { dayVolume: number }>(data: T[], ascending = true): T[] => {
  return [...data].sort((a, b) => ascending ? a.dayVolume - b.dayVolume : b.dayVolume - a.dayVolume);
};