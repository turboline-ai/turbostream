"use client";

import React from "react";
import { useFilterStats, useFilteredFeedData } from "@/hooks/useFilteredFeedData";
import { useFilters } from "@/contexts/FilterContext";

interface FilterStatusProps {
  className?: string;
}

export function FilterStatus({ className = "" }: FilterStatusProps) {
  const stats = useFilterStats();
  const { activeFilters } = useFilters();
  const { filteredFeedData } = useFilteredFeedData();

  if (stats.totalFeeds === 0) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">Filter Status</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Real-time
        </span>
      </div>

      <div className="space-y-3">
        {/* Overall Statistics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Active Feeds</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {stats.filteredFeeds} / {stats.totalFeeds}
            </p>
          </div>
          
          {stats.totalItems > 0 && (
            <div>
              <p className="text-gray-500 dark:text-gray-400">Data Reduction</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {stats.filterReduction.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {/* Individual Feed Status */}
        {stats.filteredFeeds > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Active Filters:</p>
            <div className="space-y-1">
              {Array.from(filteredFeedData.entries())
                .filter(([_, data]) => data.filterApplied)
                .map(([feedId, data]) => {
                  const reductionPercent = data.totalCount && data.matchCount !== undefined
                    ? ((data.totalCount - data.matchCount) / data.totalCount) * 100
                    : 0;

                  return (
                    <div
                      key={feedId}
                      className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700 rounded p-2"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
                          {data.feedName}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                          {data.filterName}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        {data.matchCount !== undefined && data.totalCount && (
                          <>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {data.matchCount} / {data.totalCount}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">
                              -{reductionPercent.toFixed(0)}%
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* No Filters Message */}
        {stats.filteredFeeds === 0 && (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No filters active
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              All feed data is being displayed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FilterStatus;