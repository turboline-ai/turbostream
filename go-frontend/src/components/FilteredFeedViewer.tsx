"use client";

import React, { useMemo, useState } from "react";
import { useFilteredFeed } from "@/hooks/useFilteredFeedData";
import { useWebSocket } from "@/contexts/WebSocketContext";
import FilterManager from "./FilterManager";

const normalizePayload = (value: any): { structured: any; raw: string | null } => {
  if (value === null || value === undefined) {
    return { structured: null, raw: null };
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return { structured: parsed, raw: value };
    } catch {
      return { structured: value, raw: value };
    }
  }
  return { structured: value, raw: null };
};

interface FilteredFeedViewerProps {
  feedId: string;
  className?: string;
}

export function FilteredFeedViewer({ feedId, className = "" }: FilteredFeedViewerProps) {
  const { data: filteredData, isFiltered, filterName, matchCount, totalCount } = useFilteredFeed(feedId);
  const { feedData } = useWebSocket();
  const [showFilterManager, setShowFilterManager] = useState(false);

  const rawData = feedData.get(feedId);

  if (!rawData && !filteredData) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No data available for feed: {feedId}</p>
      </div>
    );
  }

  const dataToDisplay = filteredData?.filteredData || rawData?.data;

  const normalized = useMemo(() => normalizePayload(dataToDisplay), [dataToDisplay]);
  const structuredData = normalized.structured;
  const rawText = normalized.raw;
  const isArray = Array.isArray(structuredData);

  if (showFilterManager) {
    return (
      <div className={className}>
        <FilterManager 
          feedId={feedId} 
          showFeedColumn={false}
        />
        <div className="mt-4">
          <button
            onClick={() => setShowFilterManager(false)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back to Data View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header with Filter Status */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {rawData?.feedName || 'Feed Data'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Feed ID: {feedId}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {isFiltered && (
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-900 dark:text-green-200">
                    Filtered
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {filterName}
                  </span>
                </div>
                {matchCount !== undefined && totalCount !== undefined && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Showing {matchCount} of {totalCount} items
                  </p>
                )}
              </div>
            )}
            
            <button
              onClick={() => setShowFilterManager(true)}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Manage Filters
            </button>
          </div>
        </div>
      </div>

      {/* Data Display */}
      <div className="p-6">
        {!structuredData && !rawText ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No data to display</p>
            {isFiltered && (
              <p className="text-sm mt-2">
                The active filter may be excluding all items
              </p>
            )}
          </div>
        ) : isArray && structuredData.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No items match the current filter</p>
            <p className="text-sm mt-2">
              Try adjusting your filter criteria
            </p>
          </div>
        ) : isArray ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Data Items ({structuredData.length})
              </h3>
              {isFiltered && totalCount && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {((structuredData.length / totalCount) * 100).toFixed(1)}% of original data
                </span>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {structuredData.map((item: any, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                >
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        ) : structuredData && typeof structuredData === 'object' ? (
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
              Data Object
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(structuredData, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
              Raw Data
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
                {(typeof structuredData === 'string' && structuredData) || rawText}
              </pre>
            </div>
          </div>
        )}

        {rawText && structuredData && typeof structuredData === 'object' && (
          <div className="mt-4 bg-gray-50 dark:bg-gray-900/60 rounded p-4">
            <p className="text-xs text-gray-400 mb-2">Raw Payload</p>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">
              {rawText}
            </pre>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Last Updated</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {rawData?.timestamp 
                  ? new Date(rawData.timestamp).toLocaleTimeString()
                  : 'Unknown'
                }
              </p>
            </div>
            
            <div>
              <p className="text-gray-500 dark:text-gray-400">Event Type</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {rawData?.eventName || 'Unknown'}
              </p>
            </div>
            
            <div>
              <p className="text-gray-500 dark:text-gray-400">Filter Status</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {isFiltered ? 'Active' : 'None'}
              </p>
            </div>
            
            <div>
              <p className="text-gray-500 dark:text-gray-400">Data Type</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {isArray
                  ? `Array (${structuredData?.length || 0})`
                  : structuredData && typeof structuredData === 'object'
                  ? 'Object'
                  : 'Raw'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilteredFeedViewer;
