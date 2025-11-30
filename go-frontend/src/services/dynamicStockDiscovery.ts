/**
 * Dynamic Stock Discovery Service
 * Automatically discovers available stocks from various data sources
 */

export interface StockSource {
  id: string;
  name: string;
  type: 'websocket' | 'http' | 'feed';
  url: string;
  isActive: boolean;
}

export interface DiscoveredStock {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
  lastSeen: Date;
  sources: string[]; // Which sources provide this stock
  isActive: boolean; // Currently receiving data
  marketCap?: number;
  price?: number;
}

class DynamicStockDiscovery {
  private discoveredStocks = new Map<string, DiscoveredStock>();
  private sources = new Map<string, StockSource>();
  private listeners: ((stocks: DiscoveredStock[]) => void)[] = [];

  constructor() {
    this.initializeDefaultSources();
  }

  private initializeDefaultSources() {
    // Register known data sources
    this.registerSource({
      id: 'yahoo-finance',
      name: 'Yahoo Finance WebSocket',
      type: 'websocket',
      url: 'wss://streamer.finance.yahoo.com/?version=2',
      isActive: true
    });

    this.registerSource({
      id: 'http-api-server',
      name: 'Local HTTP API Server',
      type: 'http',
      url: 'http://localhost:3001',
      isActive: true
    });

    this.registerSource({
      id: 'system-feed',
      name: 'System Feed',
      type: 'feed',
      url: 'internal://system',
      isActive: true
    });
  }

  /**
   * Register a new data source for stock discovery
   */
  registerSource(source: StockSource) {
    this.sources.set(source.id, source);
    console.log(`📡 Registered stock source: ${source.name}`);
  }

  /**
   * Auto-discover stocks from HTTP API endpoint
   */
  async discoverFromHTTPAPI(apiUrl: string): Promise<DiscoveredStock[]> {
    try {
      const response = await fetch(`${apiUrl}/api/stocks`);
      if (!response.ok) return [];

      const stockData = await response.json();
      const discovered: DiscoveredStock[] = [];

      for (const stock of stockData) {
        const discoveredStock: DiscoveredStock = {
          symbol: stock.symbol,
          name: stock.name || `${stock.symbol} Inc`,
          exchange: stock.exchange || 'NMS',
          sector: stock.sector || 'Unknown',
          lastSeen: new Date(),
          sources: ['http-api-server'],
          isActive: true,
          price: stock.price
        };

        this.addOrUpdateStock(discoveredStock);
        discovered.push(discoveredStock);
      }

      return discovered;
    } catch (error) {
      console.warn(`⚠️ Failed to discover stocks from ${apiUrl}:`, error);
      return [];
    }
  }

  /**
   * Discover stocks from WebSocket feed metadata
   */
  async discoverFromWebSocketFeed(feedId: string): Promise<DiscoveredStock[]> {
    try {
      // Query the backend for feed metadata
      const response = await fetch(`/api/feeds/${feedId}/stocks`);
      if (!response.ok) return [];

      const stockList = await response.json();
      const discovered: DiscoveredStock[] = [];

      for (const symbol of stockList) {
        const discoveredStock: DiscoveredStock = {
          symbol,
          name: await this.resolveStockName(symbol),
          exchange: 'NMS', // Default, could be enhanced
          lastSeen: new Date(),
          sources: [feedId],
          isActive: true
        };

        this.addOrUpdateStock(discoveredStock);
        discovered.push(discoveredStock);
      }

      return discovered;
    } catch (error) {
      console.warn(`⚠️ Failed to discover stocks from feed ${feedId}:`, error);
      return [];
    }
  }

  /**
   * Report that a stock was seen in real-time data
   */
  async reportStockSeen(symbol: string, sourceId: string, additionalData?: Partial<DiscoveredStock>) {
    const existing = this.discoveredStocks.get(symbol);
    
    if (existing) {
      // Update existing stock
      existing.lastSeen = new Date();
      existing.isActive = true;
      if (!existing.sources.includes(sourceId)) {
        existing.sources.push(sourceId);
      }
      if (additionalData) {
        Object.assign(existing, additionalData);
      }
    } else {
      // Add new stock
      const newStock: DiscoveredStock = {
        symbol,
        name: additionalData?.name || await this.resolveStockName(symbol),
        exchange: additionalData?.exchange || 'NMS',
        sector: additionalData?.sector,
        lastSeen: new Date(),
        sources: [sourceId],
        isActive: true,
        ...additionalData
      };
      
      this.discoveredStocks.set(symbol, newStock);
      console.log(`📈 Discovered new stock: ${symbol} from ${sourceId}`);
    }

    // Notify listeners of changes
    this.notifyListeners();
  }

  /**
   * Mark a stock as inactive (no recent data)
   */
  markStockInactive(symbol: string) {
    const stock = this.discoveredStocks.get(symbol);
    if (stock) {
      stock.isActive = false;
      this.notifyListeners();
    }
  }

  /**
   * Get all discovered stocks
   */
  getAllStocks(): DiscoveredStock[] {
    return Array.from(this.discoveredStocks.values());
  }

  /**
   * Get only active stocks (recently seen)
   */
  getActiveStocks(): DiscoveredStock[] {
    return this.getAllStocks().filter(stock => stock.isActive);
  }

  /**
   * Get stocks from a specific source
   */
  getStocksFromSource(sourceId: string): DiscoveredStock[] {
    return this.getAllStocks().filter(stock => 
      stock.sources.includes(sourceId)
    );
  }

  /**
   * Subscribe to stock discovery updates
   */
  onStocksUpdated(callback: (stocks: DiscoveredStock[]) => void) {
    this.listeners.push(callback);
  }

  /**
   * Run periodic cleanup of inactive stocks
   */
  startCleanupTask() {
    setInterval(() => {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      
      let hasChanges = false;
      for (const stock of this.discoveredStocks.values()) {
        if (stock.lastSeen.getTime() < fiveMinutesAgo && stock.isActive) {
          stock.isActive = false;
          hasChanges = true;
          console.log(`⏰ Marked ${stock.symbol} as inactive (no data for 5+ minutes)`);
        }
      }
      
      if (hasChanges) {
        this.notifyListeners();
      }
    }, 60000); // Check every minute
  }

  private addOrUpdateStock(stock: DiscoveredStock) {
    this.discoveredStocks.set(stock.symbol, stock);
  }

  private async resolveStockName(symbol: string): Promise<string> {
    // Could integrate with a stock name resolution API
    // For now, use a basic mapping
    const knownNames: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc.',
      'TSLA': 'Tesla Inc.',
      'AMZN': 'Amazon.com Inc.',
      'NVDA': 'NVIDIA Corporation',
      'META': 'Meta Platforms Inc.',
      'NFLX': 'Netflix Inc.',
      'SPY': 'SPDR S&P 500 ETF Trust'
    };

    return knownNames[symbol] || `${symbol} Corporation`;
  }

  private notifyListeners() {
    const stocks = this.getAllStocks();
    this.listeners.forEach(callback => callback(stocks));
  }
}

// Create singleton instance
export const stockDiscovery = new DynamicStockDiscovery();

// Auto-start cleanup task
stockDiscovery.startCleanupTask();

// Helper functions for easy integration
export function useDiscoveredStocks() {
  return {
    getAllStocks: () => stockDiscovery.getAllStocks(),
    getActiveStocks: () => stockDiscovery.getActiveStocks(),
    reportStock: (symbol: string, source: string, data?: Partial<DiscoveredStock>) => 
      stockDiscovery.reportStockSeen(symbol, source, data),
    onUpdate: (callback: (stocks: DiscoveredStock[]) => void) => 
      stockDiscovery.onStocksUpdated(callback)
  };
}