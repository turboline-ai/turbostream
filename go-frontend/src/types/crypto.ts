export interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface PriceHistory {
  timestamp: number;
  price: number;
}

export interface CryptoWithHistory extends CryptoData {
  history: PriceHistory[];
}

export interface AIAnalysis {
  summary: string;
  insights: string[];
  recommendations: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

export interface AnalysisRequest {
  cryptoData: CryptoData[];
  question?: string;
}
