'use client';

import React from 'react';
import { Tooltip } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

export default function TokenUsageDisplay() {
  const { user } = useAuth();

  // Format token count for display (e.g., 1000000 -> "1M")
  const formatTokenCount = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${Math.floor(tokens / 1000)}K`;
    }
    return tokens.toString();
  };

  // Get color based on token usage percentage
  const getTokenUsageColor = (percentage: number): string => {
    if (percentage >= 90) return '#ef4444'; // red
    if (percentage >= 75) return '#f59e0b'; // amber
    return '#10b981'; // green
  };

  // Show default values if no token usage data yet
  const tokenUsage = user?.tokenUsage || {
    tokensUsed: 0,
    limit: 1000000,
    currentMonth: new Date().toISOString().slice(0, 7),
    lastResetDate: new Date()
  };

  const usagePercentage = (tokenUsage.tokensUsed / tokenUsage.limit) * 100;
  
  // console.log('📊 TokenUsageDisplay render:', {
  //   hasUser: !!user,
  //   hasTokenUsage: !!user?.tokenUsage,
  //   tokensUsed: tokenUsage.tokensUsed,
  //   limit: tokenUsage.limit
  // });

  return (
    <Tooltip 
      title={
        <div className="text-center">
          <div className="font-semibold mb-2">Monthly Token Usage</div>
          <div className="text-sm">
            <strong>{tokenUsage.tokensUsed.toLocaleString()}</strong> / {tokenUsage.limit.toLocaleString()} tokens
          </div>
          <div className="text-xs text-gray-300 mt-1">
            {tokenUsage.currentMonth} • {(tokenUsage.limit - tokenUsage.tokensUsed).toLocaleString()} remaining
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Resets: {new Date(tokenUsage.lastResetDate).toLocaleDateString()}
          </div>
        </div>
      }
      placement="bottom"
      mouseEnterDelay={0.3}
      backgroundColor="#0A0F1C"
    >
      <div className="flex items-center gap-2 px-3 py-2 cursor-default">
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ color: getTokenUsageColor(usagePercentage) }}
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <div className="flex items-center gap-2">
          {/* Progress bar */}
          <div className="w-12 sm:w-16 h-2 bg-gray-700 rounded-full overflow-hidden border border-gray-600 relative">
            <div 
              className="h-full transition-all duration-500 ease-out rounded-full relative"
              style={{
                width: `${Math.min(usagePercentage, 100)}%`,
                backgroundColor: getTokenUsageColor(usagePercentage),
                boxShadow: `0 0 4px ${getTokenUsageColor(usagePercentage)}40`
              }}
            >
              {/* Subtle glow animation when near limits */}
              {usagePercentage > 75 && (
                <div 
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    backgroundColor: getTokenUsageColor(usagePercentage),
                    opacity: 0.3
                  }}
                />
              )}
            </div>
          </div>
          {/* Percentage text */}
          <span 
            className="text-xs font-medium min-w-[2rem] text-right tabular-nums"
            style={{ color: getTokenUsageColor(usagePercentage) }}
          >
            {Math.round(usagePercentage)}%
          </span>
        </div>
      </div>
    </Tooltip>
  );
}
