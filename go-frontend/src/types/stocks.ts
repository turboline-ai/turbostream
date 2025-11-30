export interface StockData {
  id: string; // Ticker symbol (e.g., "AAPL")
  symbol: string; // Ticker symbol for consistency with other types
  name: string; // Company name
  price: number; // Current stock price
  change: number; // Price change in dollars
  changePercent: number; // Percentage change
  dayHigh: number; // Highest price of the day
  dayLow: number; // Lowest price of the day
  dayVolume: number; // Trading volume for the day
  exchange: string; // Exchange name (e.g., "NMS" for NASDAQ)
  marketHours: number; // Market hours indicator (1 = Regular, 0 = Extended)
  timestamp: number; // Timestamp in milliseconds
  quoteType?: number; // Quote type
}

export interface StockPriceHistory {
  timestamp: number;
  price: number;
  volume?: number;
}

export interface StockWithHistory extends StockData {
  history: StockPriceHistory[];
}

export interface YahooFinanceMessage {
  type: string;
  message: string; // Base64-encoded protobuf data
}

export interface DecodedYahooFinanceData {
  id: string;
  price: number;
  time: string;
  exchange: string;
  quoteType: number;
  marketHours: number;
  changePercent: number;
  dayVolume: string;
  dayHigh: number;
  dayLow: number;
  change: number;
}

export interface StockAIAnalysis {
  summary: string;
  insights: string[];
  recommendations: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  technicalAnalysis?: {
    trend: 'upward' | 'downward' | 'sideways';
    support: number;
    resistance: number;
    rsi?: number;
    movingAverages?: {
      sma20: number;
      sma50: number;
      sma200: number;
    };
  };
}

export interface StockAnalysisRequest {
  stockData: StockData[];
  question?: string;
  timeframe?: '1d' | '1w' | '1m' | '3m' | '6m' | '1y';
}

// Market status enum
export enum MarketStatus {
  REGULAR_HOURS = 1,
  EXTENDED_HOURS = 0,
  CLOSED = 2
}

// Stock categories/sectors
export interface StockSector {
  name: string;
  code: string;
  description: string;
}

export const STOCK_SECTORS: StockSector[] = [
  { name: 'Technology', code: 'TECH', description: 'Technology companies' },
  { name: 'Healthcare', code: 'HEALTH', description: 'Healthcare and pharmaceutical companies' },
  { name: 'Financial', code: 'FINANCE', description: 'Financial services and banking' },
  { name: 'Consumer', code: 'CONSUMER', description: 'Consumer goods and services' },
  { name: 'Energy', code: 'ENERGY', description: 'Energy and oil companies' },
  { name: 'Utilities', code: 'UTILITIES', description: 'Utility companies' },
  { name: 'Industrial', code: 'INDUSTRIAL', description: 'Industrial and manufacturing' },
  { name: 'Materials', code: 'MATERIALS', description: 'Materials and mining' },
  { name: 'Real Estate', code: 'REALESTATE', description: 'Real estate investment trusts' },
  { name: 'Telecommunications', code: 'TELECOM', description: 'Telecommunications services' }
];