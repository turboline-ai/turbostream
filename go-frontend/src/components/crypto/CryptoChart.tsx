"use client";

import { CryptoData } from "@/types/crypto";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CryptoChartProps {
  data: CryptoData[];
  selectedCrypto: string;
}

interface ChartDataPoint {
  time: string;
  price: number;
}

export default function CryptoChart({ data, selectedCrypto }: CryptoChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const strokeBlue = (typeof window !== 'undefined'
    ? getComputedStyle(document.body).getPropertyValue('--blue').trim()
    : '') || '#5aa3ff';

  useEffect(() => {
    if (!Array.isArray(data)) {
      console.warn("CryptoChart: data is not an array:", data);
      return;
    }
    
    const crypto = data.find((c) => c.symbol === selectedCrypto);
    if (crypto) {
      const now = new Date();
      const newPoint = {
        time: now.toLocaleTimeString(),
        price: crypto.price,
      };

      setChartData((prev) => {
        const updated = [...prev, newPoint];
        // Keep only last 20 data points
        return updated.slice(-20);
      });
    }
  }, [data, selectedCrypto]);

  const selectedCryptoData = Array.isArray(data) ? data.find((c) => c.symbol === selectedCrypto) : undefined;

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 h-full flex flex-col overflow-hidden panel card">
      <div className="flex-shrink-0 px-5 py-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">
          📈 {selectedCryptoData?.name || selectedCrypto} Price Chart
        </h2>
        {selectedCryptoData && (
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              ${selectedCryptoData.price.toLocaleString()}
            </div>
            <div
              className={`text-xs font-bold ${
                selectedCryptoData.changePercent24h >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {selectedCryptoData.changePercent24h >= 0 ? "▲ +" : "▼ "}
              {selectedCryptoData.changePercent24h.toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 p-4">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232837" />
              <XAxis
                dataKey="time"
                stroke="var(--muted)"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                stroke="var(--muted)"
                style={{ fontSize: "12px" }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-1)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  color: "var(--ink)",
                }}
                labelStyle={{ color: "var(--muted)" }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={strokeBlue}
                strokeWidth={1}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 muted">
            Waiting for data...
          </div>
        )}
      </div>
    </div>
  );
}
