"use client";

import { useEffect, useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useFilters } from "@/contexts/FilterContext";
import { FilteredFeedData } from "@/types/filters";

/**
 * Hook that integrates WebSocket data with filtering functionality
 * This hook should be used at the app level to ensure filters are applied to all feed data
 */
export function useFilteredFeedData() {
  const { feedData, filteredFeedData } = useWebSocket();
  const { activeFilters, applyFilters } = useFilters();

  // Apply filters to all feed data whenever activeFilters or feedData changes
  const processFilteredData = useCallback(() => {
    const processedData = new Map<string, FilteredFeedData>();

    for (const [feedId, data] of feedData.entries()) {
      const activeFilter = activeFilters.get(feedId);
      
      if (activeFilter && activeFilter.enabled) {
        // Apply the filter to the data
        const filteredData = applyFilters(feedId, data.data);
        
        const processedFeedData: FilteredFeedData = {
          feedId: data.feedId,
          feedName: data.feedName,
          eventName: data.eventName,
          originalData: data.data,
          filteredData: filteredData,
          filterApplied: true,
          filterId: activeFilter.id,
          filterName: activeFilter.name,
          matchCount: Array.isArray(filteredData) ? filteredData.length : (filteredData ? 1 : 0),
          totalCount: Array.isArray(data.data) ? data.data.length : 1,
          timestamp: data.timestamp,
        };
        
        processedData.set(feedId, processedFeedData);
      } else {
        // No filter applied, pass through original data
        const processedFeedData: FilteredFeedData = {
          feedId: data.feedId,
          feedName: data.feedName,
          eventName: data.eventName,
          originalData: data.data,
          filteredData: data.data,
          filterApplied: false,
          timestamp: data.timestamp,
        };
        
        processedData.set(feedId, processedFeedData);
      }
    }

    return processedData;
  }, [feedData, activeFilters, applyFilters]);

  // Process filtered data whenever dependencies change
  useEffect(() => {
    // This would update the filteredFeedData in WebSocketContext
    // For now, we'll return the processed data for components to use
  }, [processFilteredData]);

  return {
    filteredFeedData: processFilteredData(),
    rawFeedData: feedData,
    activeFilters,
  };
}

/**
 * Hook for getting filtered data for a specific feed
 */
export function useFilteredFeed(feedId: string) {
  const { filteredFeedData } = useFilteredFeedData();
  
  return {
    data: filteredFeedData.get(feedId),
    isFiltered: filteredFeedData.get(feedId)?.filterApplied || false,
    filterName: filteredFeedData.get(feedId)?.filterName,
    matchCount: filteredFeedData.get(feedId)?.matchCount,
    totalCount: filteredFeedData.get(feedId)?.totalCount,
  };
}

/**
 * Hook for getting filter statistics across all feeds
 */
export function useFilterStats() {
  const { filteredFeedData } = useFilteredFeedData();
  
  const stats = {
    totalFeeds: filteredFeedData.size,
    filteredFeeds: 0,
    totalItems: 0,
    filteredItems: 0,
    filterReduction: 0,
  };

  for (const data of filteredFeedData.values()) {
    if (data.filterApplied) {
      stats.filteredFeeds++;
    }
    
    if (typeof data.totalCount === 'number') {
      stats.totalItems += data.totalCount;
    }
    
    if (typeof data.matchCount === 'number') {
      stats.filteredItems += data.matchCount;
    }
  }

  if (stats.totalItems > 0) {
    stats.filterReduction = ((stats.totalItems - stats.filteredItems) / stats.totalItems) * 100;
  }

  return stats;
}