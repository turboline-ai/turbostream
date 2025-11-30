"use client";

import { useState, useCallback } from 'react';
import { StockData } from '@/types/stocks';
import { StockTable, StockChart, YahooFinanceIntegrator, StockManager } from '@/components/yahoo-finance';
import MultiStockChart from '@/components/yahoo-finance/MultiStockChart';
import SocketStatus from '@/components/yahoo-finance/SocketStatus';

export default function StockManagementDemo() {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>("AAPL");
  const [refreshKey, setRefreshKey] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeStockSymbols, setActiveStockSymbols] = useState<string[]>([]);
  const [lastSocketUpdate, setLastSocketUpdate] = useState<Date>();

  const handleStockDataUpdate = useCallback((newStockData: StockData[]) => {
    setStockData(newStockData);
    // Auto-select first stock if current selection is not available
    if (newStockData.length > 0 && !newStockData.find(s => s.symbol === selectedStock)) {
      setSelectedStock(newStockData[0].symbol);
    }
  }, [selectedStock]);

  // Handle individual stock updates (accumulative approach)
  const handleIndividualStockUpdate = useCallback((updatedStock: StockData) => {
    setStockData(prevStocks => {
      // Find if stock already exists
      const existingIndex = prevStocks.findIndex(stock => stock.symbol === updatedStock.symbol);
      
      if (existingIndex >= 0) {
        // Update existing stock
        const newStocks = [...prevStocks];
        newStocks[existingIndex] = updatedStock;
        return newStocks;
      } else {
        // Add new stock to the list
        return [...prevStocks, updatedStock];
      }
    });

    // Auto-select first stock if no stock is currently selected
    if (!selectedStock && stockData.length === 0) {
      setSelectedStock(updatedStock.symbol);
    }
  }, [selectedStock, stockData.length]);

  const handleStockListUpdate = useCallback(() => {
    // Force a refresh of the YahooFinanceIntegrator
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleSocketStatusUpdate = useCallback((isConnected: boolean, activeStocks: string[], lastUpdate?: Date) => {
    setSocketConnected(isConnected);
    setActiveStockSymbols(activeStocks);
    setLastSocketUpdate(lastUpdate);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            📈 Dynamic Stock Portfolio Manager
          </h1>
          <p className="text-gray-400">
            Easily add or remove stocks from your real-time tracking portfolio
          </p>
        </div>

        {/* Stock Manager Component */}
        <StockManager onStockListUpdate={handleStockListUpdate} />

        {/* Socket Status */}
        <SocketStatus 
          isConnected={socketConnected} 
          activeStocks={activeStockSymbols} 
          lastUpdate={lastSocketUpdate}
        />

        {/* Yahoo Finance Data Integration */}
        <YahooFinanceIntegrator 
          key={refreshKey}
          feedId="yahoo-finance" 
          onStockData={handleStockDataUpdate}
          onStockUpdate={handleIndividualStockUpdate}
          onSocketStatus={handleSocketStatusUpdate}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Multi-Stock Chart */}
          <div className="lg:col-span-2">
            <MultiStockChart data={stockData} />
          </div>

          {/* Stock List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 border border-gray-700 rounded-lg h-full">
              <StockTable
                data={stockData}
                onSelectStock={setSelectedStock}
                selectedStock={selectedStock}
              />
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🚀 How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
            <div>
              <h4 className="font-medium text-white mb-2">Adding New Stocks:</h4>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">1</span>
                  Click "Manage Stocks" to expand the portfolio manager
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">2</span>
                  Select a stock from the dropdown (includes popular companies)
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">3</span>
                  Click "Add Stock" to add it to your tracking portfolio
                </li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Managing Your Portfolio:</h4>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">✓</span>
                  View real-time price updates for all active stocks
                </li>
                <li className="flex items-start">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">✓</span>
                  Remove stocks you're no longer interested in tracking
                </li>
                <li className="flex items-start">
                  <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">✓</span>
                  Click on any stock in the table to view its detailed chart
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}