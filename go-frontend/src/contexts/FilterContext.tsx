"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { 
  FeedFilter, 
  FilterPreset, 
  FilterContextType, 
  FilterRule, 
  FilterGroup,
  FilterOperator,
  FilterCondition
} from "@/types/filters";

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FeedFilter[]>([]);
  const [activeFilters, setActiveFilters] = useState<Map<string, FeedFilter>>(() => {
    // Load active filters from localStorage on initialization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activeFilters');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return new Map(Object.entries(parsed));
        } catch (e) {
          console.warn('Failed to load active filters from localStorage:', e);
        }
      }
    }
    return new Map();
  });
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // API Base URL
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

  // Persist active filters to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeFiltersObj = Object.fromEntries(activeFilters);
      localStorage.setItem('activeFilters', JSON.stringify(activeFiltersObj));
    }
  }, [activeFilters]);



  // Helper function to make authenticated API calls
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}/api${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  };

  // Load user's filters
  const loadFilters = useCallback(async (feedId?: string) => {
    try {
      setIsLoading(true);
      const queryParam = feedId ? `?feedId=${encodeURIComponent(feedId)}` : '';
      const filters = await apiCall(`/filters${queryParam}`);
      setFilters(filters);
    } catch (error) {
      console.error('Failed to load filters:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load filters on component mount to ensure active filters are available
  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  // Load presets
  const loadPresets = useCallback(async (category?: string) => {
    try {
      const queryParam = category ? `?category=${encodeURIComponent(category)}` : '';
      const presets = await apiCall(`/filter-presets${queryParam}`);
      setPresets(presets);
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  }, []);

  // Create a new filter
  const createFilter = useCallback(async (
    filter: Omit<FeedFilter, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<FeedFilter> => {
    const newFilter = await apiCall('/filters', {
      method: 'POST',
      body: JSON.stringify(filter),
    });

    setFilters(prev => [...prev, newFilter]);
    return newFilter;
  }, []);

  // Update an existing filter
  const updateFilter = useCallback(async (
    id: string, 
    updates: Partial<FeedFilter>
  ): Promise<FeedFilter> => {
    const updatedFilter = await apiCall(`/filters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    setFilters(prev => prev.map(f => f.id === id ? updatedFilter : f));
    
    // Update active filters if this filter is currently active
    setActiveFilters(prev => {
      const updated = new Map(prev);
      for (const [feedId, activeFilter] of updated.entries()) {
        if (activeFilter.id === id) {
          updated.set(feedId, updatedFilter);
        }
      }
      return updated;
    });

    return updatedFilter;
  }, []);

  // Delete a filter
  const deleteFilter = useCallback(async (id: string): Promise<void> => {
    await apiCall(`/filters/${id}`, { method: 'DELETE' });

    setFilters(prev => prev.filter(f => f.id !== id));
    
    // Remove from active filters if it's currently active
    setActiveFilters(prev => {
      const updated = new Map(prev);
      for (const [feedId, activeFilter] of updated.entries()) {
        if (activeFilter.id === id) {
          updated.delete(feedId);
        }
      }
      return updated;
    });
  }, []);

  // Set active filter for a feed
  const setFeedFilter = useCallback((feedId: string, filterId: string) => {
    const filter = filters.find(f => f.id === filterId);
    if (filter) {
      setActiveFilters(prev => {
        const updated = new Map(prev);
        updated.set(feedId, filter);
        return updated;
      });
    }
  }, [filters]);

  // Remove filter from a feed
  const removeFeedFilter = useCallback((feedId: string) => {
    setActiveFilters(prev => {
      const updated = new Map(prev);
      updated.delete(feedId);
      return updated;
    });
  }, []);

  // Apply filters to data (client-side filtering)
  const applyFilters = useCallback((feedId: string, data: any): any => {
    const filter = activeFilters.get(feedId);
    
    if (!filter || !filter.enabled) {
      return data; // No filter or filter disabled
    }

    return executeFilter(filter, data);
  }, [activeFilters]);

  // Execute filter logic (client-side implementation)
  const executeFilter = useCallback((filter: FeedFilter, data: any): any => {
    // Handle array data (most common for feeds)
    if (Array.isArray(data)) {
      return data.filter(item => evaluateFilterGroups(filter.groups, filter.groupCondition, item));
    }

    // Handle single object
    const passes = evaluateFilterGroups(filter.groups, filter.groupCondition, data);
    return passes ? data : null;
  }, []);

  // Evaluate filter groups with the specified condition
  const evaluateFilterGroups = useCallback((
    groups: FilterGroup[], 
    condition: FilterCondition, 
    item: any
  ): boolean => {
    const enabledGroups = groups.filter(g => g.enabled);
    
    if (enabledGroups.length === 0) {
      return true; // No filters = pass through
    }

    const results = enabledGroups.map(group => evaluateFilterGroup(group, item));

    return condition === 'and' 
      ? results.every(r => r)
      : results.some(r => r);
  }, []);

  // Evaluate a single filter group
  const evaluateFilterGroup = useCallback((group: FilterGroup, item: any): boolean => {
    const enabledRules = group.rules.filter(r => r.enabled);
    
    if (enabledRules.length === 0) {
      return true; // No rules = pass through
    }

    const results = enabledRules.map(rule => evaluateFilterRule(rule, item));

    return group.condition === 'and'
      ? results.every(r => r)
      : results.some(r => r);
  }, []);

  // Evaluate a single filter rule
  const evaluateFilterRule = useCallback((rule: FilterRule, item: any): boolean => {
    const fieldValue = getNestedValue(item, rule.field);
    
    switch (rule.operator) {
      case 'equals':
        return fieldValue === rule.value;
        
      case 'not_equals':
        return fieldValue !== rule.value;
        
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase());
        
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase());
        
      case 'starts_with':
        return String(fieldValue).toLowerCase().startsWith(String(rule.value).toLowerCase());
        
      case 'ends_with':
        return String(fieldValue).toLowerCase().endsWith(String(rule.value).toLowerCase());
        
      case 'greater_than':
        return Number(fieldValue) > Number(rule.value);
        
      case 'less_than':
        return Number(fieldValue) < Number(rule.value);
        
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(rule.value);
        
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(rule.value);
        
      case 'in_range':
        const [min, max] = Array.isArray(rule.value) ? rule.value : [rule.value.min, rule.value.max];
        const numValue = Number(fieldValue);
        return numValue >= Number(min) && numValue <= Number(max);
        
      case 'regex':
        try {
          const regex = new RegExp(rule.value, 'i');
          return regex.test(String(fieldValue));
        } catch (e) {
          console.error('Invalid regex pattern:', rule.value);
          return false;
        }
        
      default:
        console.warn('Unknown filter operator:', rule.operator);
        return true;
    }
  }, []);

  // Get nested value from object using dot notation
  const getNestedValue = useCallback((obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }, []);

  // Load preset as a new filter
  const loadPreset = useCallback(async (presetId: string, feedId?: string): Promise<FeedFilter> => {
    const filter = await apiCall(`/filter-presets/${presetId}/load`, {
      method: 'POST',
      body: JSON.stringify({ feedId }),
    });

    setFilters(prev => [...prev, filter]);
    return filter;
  }, []);

  // Save filter as preset
  const saveAsPreset = useCallback(async (
    filterId: string, 
    name: string, 
    description: string, 
    isPublic?: boolean
  ): Promise<FilterPreset> => {
    const filter = filters.find(f => f.id === filterId);
    if (!filter) {
      throw new Error('Filter not found');
    }

    // Determine category based on feedId or default to 'custom'
    let category = 'custom';
    if (filter.feedId) {
      // You could map feedIds to categories here
      category = 'custom';
    }

    const preset = await apiCall(`/filters/${filterId}/preset`, {
      method: 'POST',
      body: JSON.stringify({ name, description, category, isPublic }),
    });

    setPresets(prev => [...prev, preset]);
    return preset;
  }, [filters]);

  // Initialize context by loading filters and presets
  useEffect(() => {
    loadFilters();
    loadPresets();
  }, [loadFilters, loadPresets]);

  const contextValue: FilterContextType = {
    filters,
    activeFilters,
    presets,
    createFilter,
    updateFilter,
    deleteFilter,
    setFeedFilter,
    removeFeedFilter,
    applyFilters,
    loadPreset,
    saveAsPreset,
  };

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}