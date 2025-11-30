# Frontend Component Structure

This document outlines the organized structure of the frontend components, specifically for crypto and Yahoo Finance/stock components.

## Directory Structure

```
frontend/src/
├── components/
│   ├── crypto/                     # Crypto-specific components
│   │   ├── index.ts                # Barrel export file
│   │   ├── CryptoChart.tsx         # Crypto price chart visualization
│   │   └── CryptoTable.tsx         # Crypto market data table
│   ├── yahoo-finance/              # Yahoo Finance/Stock components
│   │   ├── index.ts                # Barrel export file
│   │   ├── StockChart.tsx          # Stock price chart with technical indicators
│   │   ├── StockTable.tsx          # Stock market data table with trading info
│   │   └── YahooFinanceIntegrator.tsx # Yahoo Finance protobuf integration
│   └── ... (other components)
├── types/
│   ├── crypto.ts                   # Crypto-related TypeScript interfaces
│   ├── stocks.ts                   # Stock/Yahoo Finance TypeScript interfaces
│   └── ... (other types)
└── app/
    └── feeds/[id]/page.tsx         # Dynamic feed page supporting both crypto and stocks
```

## Component Organization

### Crypto Components (`/components/crypto/`)

- **CryptoChart.tsx**: Real-time cryptocurrency price chart with volume indicators
- **CryptoTable.tsx**: Comprehensive crypto market data table with sorting and selection
- **index.ts**: Barrel export for clean imports

### Yahoo Finance Components (`/components/yahoo-finance/`)

- **StockChart.tsx**: Advanced stock price chart with technical analysis features
- **StockTable.tsx**: Professional stock market data table with exchange info and market status
- **YahooFinanceIntegrator.tsx**: Handles Yahoo Finance protobuf feed integration and data processing
- **index.ts**: Barrel export for clean imports

## Type Definitions

### Crypto Types (`/types/crypto.ts`)
```typescript
interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
  // ... other crypto-specific fields
}
```

### Stock Types (`/types/stocks.ts`)
```typescript
interface StockData {
  id: string;          // Ticker symbol
  symbol: string;      // Ticker symbol
  name: string;        // Company name
  price: number;       // Current stock price
  change: number;      // Price change in dollars
  changePercent: number; // Percentage change
  dayHigh: number;     // Day high
  dayLow: number;      // Day low
  dayVolume: number;   // Trading volume
  exchange: string;    // Exchange (e.g., 'NMS' for NASDAQ)
  marketHours: number; // Market status (1=Regular, 0=Extended)
  timestamp: number;   // Timestamp
}
```

## Usage Examples

### Import Components

```typescript
// Clean imports using barrel exports
import { CryptoChart, CryptoTable } from '@/components/crypto';
import { StockChart, StockTable, YahooFinanceIntegrator } from '@/components/yahoo-finance';
```

### Using Crypto Components

```typescript
const CryptoFeedPage = () => {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<string>("BTC");
  
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-8">
        <CryptoChart data={cryptoData} selectedCrypto={selectedCrypto} />
        <CryptoTable
          data={cryptoData}
          onSelectCrypto={setSelectedCrypto}
          selectedCrypto={selectedCrypto}
        />
      </div>
    </div>
  );
};
```

### Using Stock Components

```typescript
const StockFeedPage = () => {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>("AAPL");
  
  const handleStockDataUpdate = (newStockData: StockData[]) => {
    setStockData(newStockData);
  };
  
  return (
    <div className="flex flex-col">
      <YahooFinanceIntegrator 
        feedId={feedId} 
        onStockData={handleStockDataUpdate} 
      />
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8">
          <StockChart data={stockData} selectedStock={selectedStock} />
          <StockTable
            data={stockData}
            onSelectStock={setSelectedStock}
            selectedStock={selectedStock}
          />
        </div>
      </div>
    </div>
  );
};
```

## Yahoo Finance Protobuf Integration

The `YahooFinanceIntegrator` component handles:

1. **WebSocket Connection**: Connects to Yahoo Finance WebSocket API
2. **Protobuf Decoding**: Processes base64-encoded protobuf messages
3. **Data Transformation**: Converts Yahoo Finance format to standardized StockData
4. **Real-time Updates**: Provides live stock price updates
5. **Error Handling**: Manages connection errors and reconnection logic

### Protobuf Message Flow

1. Yahoo Finance sends protobuf messages via WebSocket
2. Backend decodes protobuf using `.proto` schema files
3. Decoded data is formatted for LLM consumption
4. Frontend receives structured stock data
5. Components update in real-time

## Features

### Crypto Components Features
- Real-time price updates
- 24h change indicators
- Volume and market cap display
- Interactive chart with zoom
- Responsive table design

### Stock Components Features
- Real-time stock prices from Yahoo Finance
- Market status indicators (Regular/Extended hours)
- Day high/low ranges
- Trading volume display
- Exchange information
- Technical chart indicators
- Professional financial data formatting

## Integration with AI Analysis

Both crypto and stock components integrate with the `UniversalAIInsights` component for:
- Real-time market analysis
- Custom prompt support
- Streaming AI responses
- Context-aware insights based on feed type

## Best Practices

1. **Import Organization**: Use barrel exports for cleaner imports
2. **Type Safety**: Always use proper TypeScript interfaces
3. **Component Reusability**: Design components to be reusable across different feeds
4. **Performance**: Use React.memo for expensive chart components
5. **Error Handling**: Gracefully handle missing or malformed data
6. **Accessibility**: Ensure components are keyboard accessible and screen reader friendly

## Future Enhancements

- Add more technical indicators to stock charts
- Implement options and futures data support
- Add sector-based stock grouping
- Enhanced filtering and sorting options
- Real-time news integration
- Portfolio tracking features