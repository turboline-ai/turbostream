"use client";

import React, { useState, useEffect } from "react";
import { FeedFilter } from "@/types/filters";
import { useFilters } from "@/contexts/FilterContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import FilterBuilder from "./FilterBuilder";
import QuickFilterTemplates from "./QuickFilterTemplates";
import DataStructureViewer from "./DataStructureViewer";
import FilteringExamples from "./FilteringExamples";

interface FilterManagerProps {
  feedId?: string;
  showFeedColumn?: boolean;
}

export function FilterManager({ feedId, showFeedColumn = true }: FilterManagerProps) {
  const { 
    filters, 
    activeFilters, 
    deleteFilter, 
    setFeedFilter, 
    removeFeedFilter 
  } = useFilters();
  const { feedData } = useWebSocket();

  const [showBuilder, setShowBuilder] = useState(false);
  const [editingFilter, setEditingFilter] = useState<FeedFilter | null>(null);
  const [selectedFeedId, setSelectedFeedId] = useState<string>(feedId || '');

  // Filter filters based on feedId if provided
  const relevantFilters = feedId 
    ? filters.filter(f => !f.feedId || f.feedId === feedId)
    : filters;

  const handleEditFilter = (filter: FeedFilter) => {
    setEditingFilter(filter);
    setShowBuilder(true);
  };

  const handleDeleteFilter = async (filterId: string) => {
    if (window.confirm('Are you sure you want to delete this filter?')) {
      try {
        await deleteFilter(filterId);
      } catch (error) {
        console.error('Failed to delete filter:', error);
        alert('Failed to delete filter. Please try again.');
      }
    }
  };

  const handleApplyFilter = (filterId: string, targetFeedId?: string) => {
    const feedIdToUse = targetFeedId || selectedFeedId || feedId;
    if (feedIdToUse) {
      setFeedFilter(feedIdToUse, filterId);
    }
  };

  const handleRemoveFilter = (targetFeedId?: string) => {
    const feedIdToUse = targetFeedId || selectedFeedId || feedId;
    if (feedIdToUse) {
      removeFeedFilter(feedIdToUse);
    }
  };

  const isFilterActive = (filterId: string, targetFeedId?: string) => {
    const feedIdToUse = targetFeedId || selectedFeedId || feedId;
    if (!feedIdToUse) return false;
    
    const activeFilter = activeFilters.get(feedIdToUse);
    return activeFilter?.id === filterId;
  };

  const getFilterStats = (filter: FeedFilter) => {
    const enabledGroups = filter.groups.filter(g => g.enabled);
    const enabledRules = enabledGroups.reduce((acc, g) => acc + g.rules.filter(r => r.enabled).length, 0);
    
    return {
      groups: enabledGroups.length,
      rules: enabledRules,
    };
  };

  const getAvailableFeeds = () => {
    return Array.from(feedData.keys()).map(feedId => {
      const data = feedData.get(feedId);
      return {
        id: feedId,
        name: data?.feedName || feedId,
      };
    });
  };



  if (showBuilder) {
    return (
      <FilterBuilder
        feedId={selectedFeedId || feedId}
        existingFilter={editingFilter || undefined}
        onSave={() => {
          setShowBuilder(false);
          setEditingFilter(null);
        }}
        onCancel={() => {
          setShowBuilder(false);
          setEditingFilter(null);
        }}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {feedId ? 'Feed Filters' : 'Filter Management'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage data filters for real-time feeds
          </p>
        </div>
        
        <button
          onClick={() => setShowBuilder(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Create Filter
        </button>
      </div>

      {!feedId && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Apply to Feed
          </label>
          <select
            value={selectedFeedId}
            onChange={(e) => setSelectedFeedId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Select a feed...</option>
            {getAvailableFeeds().map(feed => (
              <option key={feed.id} value={feed.id}>
                {feed.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Active Filter Status */}
      {(feedId || selectedFeedId) && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                Current Filter Status
              </h3>
              {(() => {
                const targetFeedId = feedId || selectedFeedId;
                const activeFilter = activeFilters.get(targetFeedId!);
                
                if (activeFilter) {
                  return (
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      <strong>{activeFilter.name}</strong> is active on this feed
                    </p>
                  );
                } else {
                  return (
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      No filter is currently applied
                    </p>
                  );
                }
              })()}
            </div>
            
            {(() => {
              const targetFeedId = feedId || selectedFeedId;
              const activeFilter = activeFilters.get(targetFeedId!);
              
              return activeFilter ? (
                <button
                  onClick={() => handleRemoveFilter(targetFeedId)}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                >
                  Remove Filter
                </button>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Data Structure Guide */}
      {(feedId || selectedFeedId) && (
        <div className="mb-6">
          <DataStructureViewer feedId={feedId || selectedFeedId} />
        </div>
      )}

      {/* Filtering Examples */}
      {(feedId || selectedFeedId) && (
        <div className="mb-6">
          <FilteringExamples />
        </div>
      )}

      {/* Quick Filter Templates */}
      {(feedId || selectedFeedId) && (
        <div className="mb-6">
          <QuickFilterTemplates
            feedId={feedId || selectedFeedId}
            onFilterApplied={(filter) => {
              console.log('Quick filter applied:', filter.name);
            }}
          />
        </div>
      )}

      {/* Filters List */}
      <div className="space-y-4">
        {relevantFilters.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-lg">No filters created yet</p>
            <p className="text-sm">Click "Create Filter" to get started</p>
          </div>
        ) : (
          relevantFilters.map((filter) => {
            const stats = getFilterStats(filter);
            const isActive = isFilterActive(filter.id);
            
            return (
              <div
                key={filter.id}
                className={`p-4 border rounded-lg transition-colors ${
                  isActive 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {filter.name}
                      </h3>
                      
                      {isActive && (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                          Active
                        </span>
                      )}
                      
                      {!filter.enabled && (
                        <span className="px-2 py-1 bg-gray-400 text-white text-xs rounded-full">
                          Disabled
                        </span>
                      )}
                      
                      {filter.feedId && showFeedColumn && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full dark:bg-blue-900 dark:text-blue-200">
                          Feed-specific
                        </span>
                      )}
                    </div>
                    
                    {filter.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        {filter.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{stats.groups} group{stats.groups !== 1 ? 's' : ''}</span>
                      <span>{stats.rules} rule{stats.rules !== 1 ? 's' : ''}</span>
                      <span>Condition: {filter.groupCondition.toUpperCase()}</span>
                      <span>
                        Created: {new Date(filter.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {(feedId || selectedFeedId) && !isActive && (
                      <button
                        onClick={() => handleApplyFilter(filter.id)}
                        disabled={!filter.enabled}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Apply
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleEditFilter(filter)}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    
                    <button
                      onClick={() => handleDeleteFilter(filter.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {relevantFilters.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <strong>{relevantFilters.length}</strong> filter{relevantFilters.length !== 1 ? 's' : ''} total
            {feedId && (
              <>
                {' '} for this feed
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export default FilterManager;