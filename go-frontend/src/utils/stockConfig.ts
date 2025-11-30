// Stock configuration utility - makes it easy to add/remove stocks
export interface StockConfig {
  symbol: string;
  name: string;
  basePrice: number;
  exchange: string;
  sector: string;
}

// Current active stocks configuration
export const ACTIVE_STOCKS: StockConfig[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    basePrice: 252.29,
    exchange: 'NMS',
    sector: 'Technology'
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    basePrice: 428.12,
    exchange: 'NMS',
    sector: 'Technology'
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    basePrice: 185.25,
    exchange: 'NMS',
    sector: 'Technology'
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    basePrice: 348.50,
    exchange: 'NMS',
    sector: 'Automotive'
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    basePrice: 174.85,
    exchange: 'NMS',
    sector: 'E-commerce'
  },
  {
    symbol: 'NFLX',
    name: 'Netflix Inc.',
    basePrice: 695.25,
    exchange: 'NMS',
    sector: 'Entertainment'
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    basePrice: 890.45,
    exchange: 'NMS',
    sector: 'Technology'
  }
];

// Popular stocks that can be easily added
export const AVAILABLE_STOCKS: StockConfig[] = [
  {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    basePrice: 485.20,
    exchange: 'NMS',
    sector: 'Technology'
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    basePrice: 890.45,
    exchange: 'NMS',
    sector: 'Technology'
  },
  {
    symbol: 'BRK.B',
    name: 'Berkshire Hathaway Inc.',
    basePrice: 442.85,
    exchange: 'NYQ',
    sector: 'Financial'
  },
  {
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    basePrice: 158.75,
    exchange: 'NYQ',
    sector: 'Healthcare'
  },
  {
    symbol: 'V',
    name: 'Visa Inc.',
    basePrice: 295.40,
    exchange: 'NYQ',
    sector: 'Financial'
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    basePrice: 225.30,
    exchange: 'NYQ',
    sector: 'Financial'
  },
  {
    symbol: 'WMT',
    name: 'Walmart Inc.',
    basePrice: 175.85,
    exchange: 'NYQ',
    sector: 'Retail'
  },
  {
    symbol: 'PG',
    name: 'Procter & Gamble Co.',
    basePrice: 168.95,
    exchange: 'NYQ',
    sector: 'Consumer Goods'
  },
  {
    symbol: 'UNH',
    name: 'UnitedHealth Group Inc.',
    basePrice: 615.75,
    exchange: 'NYQ',
    sector: 'Healthcare'
  },
  {
    symbol: 'HD',
    name: 'The Home Depot Inc.',
    basePrice: 385.60,
    exchange: 'NYQ',
    sector: 'Retail'
  }
];

// Utility functions
export function getStockBySymbol(symbol: string): StockConfig | undefined {
  return [...ACTIVE_STOCKS, ...AVAILABLE_STOCKS].find(stock => stock.symbol === symbol);
}

export function getAllStockSymbols(): string[] {
  return ACTIVE_STOCKS.map(stock => stock.symbol);
}

export function getCompanyName(symbol: string): string {
  const stock = getStockBySymbol(symbol);
  return stock ? stock.name : symbol;
}

export function addStockToActive(symbol: string): boolean {
  const availableStock = AVAILABLE_STOCKS.find(stock => stock.symbol === symbol);
  if (availableStock && !ACTIVE_STOCKS.find(stock => stock.symbol === symbol)) {
    ACTIVE_STOCKS.push(availableStock);
    return true;
  }
  return false;
}

export function removeStockFromActive(symbol: string): boolean {
  const index = ACTIVE_STOCKS.findIndex(stock => stock.symbol === symbol);
  if (index !== -1) {
    ACTIVE_STOCKS.splice(index, 1);
    return true;
  }
  return false;
}

// Generate mock Yahoo Finance data for a stock
export function generateMockStockData(config: StockConfig) {
  const priceVariation = config.basePrice * 0.02; // 2% variation
  const currentPrice = config.basePrice + (Math.random() - 0.5) * priceVariation;
  const change = (Math.random() - 0.5) * (config.basePrice * 0.05); // Up to 5% change
  const changePercent = (change / config.basePrice) * 100;
  
  return {
    id: config.symbol,
    price: currentPrice,
    time: Date.now().toString(),
    exchange: config.exchange,
    quoteType: 1,
    marketHours: 1,
    changePercent: changePercent,
    dayVolume: Math.floor(Math.random() * 100000000 + 10000000).toString(),
    dayHigh: currentPrice + Math.abs(change) * 0.5,
    dayLow: currentPrice - Math.abs(change) * 0.5,
    change: change,
  };
}