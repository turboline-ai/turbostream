"use client";

import { CryptoData } from "@/types/crypto";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useWebSocket } from "@/hooks/useWebSocket";

interface AnalysisMessage {
  id: string;
  timestamp: number;
  crypto: string;
  price: number;
  content: string;
  duration?: number;
}

interface AIAnalysisProps {
  cryptoData: CryptoData[];
  selectedCrypto: string;
  customPrompt?: string;
}

export default function AIAnalysis({
  cryptoData,
  selectedCrypto,
  customPrompt,
}: AIAnalysisProps) {
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [autoInterval, setAutoInterval] = useState<number>(30);
  
  const { analyzeWithAI, isConnected } = useWebSocket();

  const selectedCryptoData = Array.isArray(cryptoData) ? cryptoData.find(
    (c) => c.symbol === selectedCrypto
  ) : undefined;

  const analyzeData = async () => {
    if (!selectedCryptoData || !isConnected) return;

    setIsLoading(true);
    setCurrentAnalysis("");
    
    const messageId = `msg-${Date.now()}`;
    
    try {
      // Prepare data for backend
      const dataToAnalyze = cryptoData.map(coin => ({
        symbol: coin.symbol,
        price: coin.price,
        change: coin.changePercent24h,
      }));

      // Use custom prompt if available, otherwise use default
      const prompt = customPrompt 
        ? `${customPrompt} Focus on ${selectedCryptoData.symbol}.`
        : `Analyze ${selectedCryptoData.symbol} in the context of the current market. Provide a concise analysis.`;

      analyzeWithAI(
        dataToAnalyze,
        prompt,
        {
          onToken: (token: string) => {
            setCurrentAnalysis((prev) => prev + token);
          },
          onComplete: (response: string, duration?: number) => {
            // Add completed message to history
            const newMessage: AnalysisMessage = {
              id: messageId,
              timestamp: Date.now(),
              crypto: selectedCryptoData.symbol,
              price: selectedCryptoData.price,
              content: response,
              duration,
            };
            setMessages((prev) => [...prev, newMessage]);
            setCurrentAnalysis("");
            setIsLoading(false);
          },
          onError: (error: string) => {
            console.error("AI Analysis error:", error);
            const errorMessage: AnalysisMessage = {
              id: messageId,
              timestamp: Date.now(),
              crypto: selectedCryptoData.symbol,
              price: selectedCryptoData.price,
              content: `⚠️ Failed to get AI analysis: ${error}`,
            };
            setMessages((prev) => [...prev, errorMessage]);
            setCurrentAnalysis("");
            setIsLoading(false);
          }
        }
      );
    } catch (error) {
      console.error("Error analyzing data:", error);
      const errorMessage: AnalysisMessage = {
        id: messageId,
        timestamp: Date.now(),
        crypto: selectedCryptoData.symbol,
        price: selectedCryptoData.price,
        content: "⚠️ Failed to get AI analysis. Please check your configuration.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!autoAnalyze) return;
    
    // Initial analysis when auto-analyze is enabled
    analyzeData();

    // Set up interval for continuous analysis
    const interval = setInterval(() => {
      analyzeData();
    }, autoInterval * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyze, selectedCrypto, autoInterval]);

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 h-full flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-gray-700 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            AI Analysis
          </h2>
          <div className="flex items-center gap-2">
            {!isConnected && (
              <span className="text-xs text-red-400 mr-2">⚠️ Disconnected</span>
            )}
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={autoAnalyze}
                onChange={(e) => setAutoAnalyze(e.target.checked)}
                className="w-3.5 h-3.5 cursor-pointer accent-blue-500"
                disabled={!isConnected}
              />
              <span className="font-medium">Auto</span>
            </label>
            {autoAnalyze && (
              <select
                value={autoInterval}
                onChange={(e) => setAutoInterval(Number(e.target.value))}
                className="bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600 cursor-pointer hover:border-blue-500 transition-colors"
              >
                <option value={1}>1s</option>
                <option value={2}>2s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={20}>20s</option>
                <option value={30}>30s</option>
                <option value={45}>45s</option>
                <option value={60}>60s</option>
              </select>
            )}
          </div>
        </div>

        {/* Selected Crypto Info - Compact */}
        {selectedCryptoData && (
          <div className="bg-gray-900/50 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white">
                {selectedCryptoData.name}
              </h3>
              <span className="text-gray-400 text-xs">{selectedCryptoData.symbol}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Price:</span>
                <span className="text-white ml-2 font-mono font-semibold">
                  ${selectedCryptoData.price.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-400">24h:</span>
                <span
                  className={`ml-2 font-bold ${
                    selectedCryptoData.changePercent24h >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {selectedCryptoData.changePercent24h >= 0 ? "+" : ""}
                  {selectedCryptoData.changePercent24h.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Analyze Button - Fixed */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-gray-700">
        <button
          onClick={analyzeData}
          disabled={isLoading || !selectedCryptoData || !isConnected}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Analyzing...
            </span>
          ) : !isConnected ? (
            <span className="flex items-center justify-center gap-2">
              ⚠️ Disconnected from Backend
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              🔍 Analyze with AI
            </span>
          )}
        </button>
      </div>

      {/* Messages Area - Scrollable with fixed height */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {messages.length === 0 && !currentAnalysis && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-500 text-sm">
                Click "Analyze with AI" to get insights
              </p>
              <p className="text-gray-600 text-xs mt-1">
                about {selectedCrypto}
              </p>
              {!isConnected && (
                <p className="text-red-400 text-xs mt-2">
                  ⚠️ Waiting for backend connection...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Current streaming analysis - Shows first (reversed order) */}
        {currentAnalysis && (
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-3 border border-blue-500/50 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-300 font-bold text-sm">{selectedCryptoData?.symbol}</span>
                <span className="text-gray-500 text-xs">
                  ${selectedCryptoData?.price.toLocaleString()}
                </span>
              </div>
              <span className="text-blue-400 text-xs font-medium animate-pulse">Analyzing...</span>
            </div>
            <div className="text-gray-200 text-sm prose prose-invert max-w-none
              prose-p:mb-1.5 prose-p:leading-relaxed prose-p:text-sm
              prose-strong:text-white prose-strong:font-semibold
              prose-ul:list-none prose-ul:ml-0 prose-ul:my-1
              prose-li:text-sm prose-li:leading-relaxed prose-li:mb-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentAnalysis}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Previous messages - Reverse order (newest first) */}
        {[...messages].reverse().map((message) => (
          <div key={message.id} className="bg-gray-800/80 rounded-lg p-3 border border-gray-700/50 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-bold text-sm">{message.crypto}</span>
                <span className="text-gray-500 text-xs">
                  ${message.price.toLocaleString()}
                </span>
                {message.duration && (
                  <span className="text-gray-600 text-xs">
                    ({(message.duration / 1000).toFixed(1)}s)
                  </span>
                )}
              </div>
              <span className="text-gray-500 text-xs">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="text-gray-300 text-sm prose prose-invert max-w-none
              prose-p:mb-1.5 prose-p:leading-relaxed prose-p:text-sm
              prose-strong:text-white prose-strong:font-semibold
              prose-ul:list-none prose-ul:ml-0 prose-ul:my-1
              prose-li:text-sm prose-li:leading-relaxed prose-li:mb-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
