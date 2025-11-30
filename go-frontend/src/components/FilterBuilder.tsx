"use client";

import React, { useState, useCallback, useEffect } from "react";
import { 
  FeedFilter, 
  FilterGroup, 
  FilterRule, 
  FilterOperator, 
  FilterCondition 
} from "@/types/filters";
import { useFilters } from "@/contexts/FilterContext";
import { useWebSocket } from "@/contexts/WebSocketContext";

interface FilterBuilderProps {
  feedId?: string;
  existingFilter?: FeedFilter;
  onSave?: (filter: FeedFilter) => void;
  onCancel?: () => void;
}

const OPERATORS: { value: FilterOperator; label: string; description: string }[] = [
  { value: 'equals', label: 'Equals', description: 'Exact match' },
  { value: 'not_equals', label: 'Not Equals', description: 'Does not match' },
  { value: 'contains', label: 'Contains', description: 'Contains text (case-insensitive)' },
  { value: 'not_contains', label: 'Not Contains', description: 'Does not contain text' },
  { value: 'starts_with', label: 'Starts With', description: 'Begins with text' },
  { value: 'ends_with', label: 'Ends With', description: 'Ends with text' },
  { value: 'greater_than', label: 'Greater Than', description: 'Numeric comparison >' },
  { value: 'less_than', label: 'Less Than', description: 'Numeric comparison <' },
  { value: 'greater_than_or_equal', label: 'Greater or Equal', description: 'Numeric comparison >=' },
  { value: 'less_than_or_equal', label: 'Less or Equal', description: 'Numeric comparison <=' },
  { value: 'in_range', label: 'In Range', description: 'Between min and max values' },
  { value: 'regex', label: 'Regex Match', description: 'Regular expression pattern' },
];

const COMMON_FIELDS = {
  crypto: [
    { value: 'symbol', label: 'Symbol', example: 'BTC, ETH' },
    { value: 'name', label: 'Name', example: 'Bitcoin, Ethereum' },
    { value: 'price', label: 'Price', example: '50000' },
    { value: 'change24h', label: '24h Change', example: '1000' },
    { value: 'changePercent24h', label: '24h Change %', example: '5.2' },
    { value: 'volume24h', label: '24h Volume', example: '1000000000' },
    { value: 'marketCap', label: 'Market Cap', example: '1000000000000' },
  ],
  stocks: [
    { value: 'symbol', label: 'Symbol', example: 'AAPL, GOOGL' },
    { value: 'name', label: 'Name', example: 'Apple Inc.' },
    { value: 'price', label: 'Price', example: '150.50' },
    { value: 'change24h', label: '24h Change', example: '2.50' },
    { value: 'changePercent24h', label: '24h Change %', example: '1.68' },
    { value: 'volume24h', label: '24h Volume', example: '50000000' },
    { value: 'sector', label: 'Sector', example: 'Technology' },
  ],
  general: [
    { value: 'data.timestamp', label: 'Timestamp', example: '1640995200000' },
    { value: 'feedId', label: 'Feed ID', example: 'feed123' },
    { value: 'feedName', label: 'Feed Name', example: 'Crypto Feed' },
  ],
};

export function FilterBuilder({ feedId, existingFilter, onSave, onCancel }: FilterBuilderProps) {
  const { createFilter, updateFilter } = useFilters();
  const { feedData } = useWebSocket();

  // Initialize filter state
  const [filter, setFilter] = useState<Partial<FeedFilter>>({
    name: existingFilter?.name || '',
    description: existingFilter?.description || '',
    feedId: feedId || existingFilter?.feedId,
    groups: existingFilter?.groups || [createDefaultGroup()],
    groupCondition: existingFilter?.groupCondition || 'and',
    enabled: existingFilter?.enabled ?? true,
    userId: '', // Will be set by the API
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update default fields when feed data becomes available
  useEffect(() => {
    if (feedId && feedData.get(feedId)?.data?.length) {
      const availableFields = getFieldSuggestions();
      const preferredField = availableFields.find(f => f.value === 'symbol')?.value || 
                            availableFields.find(f => f.value !== 'feedId' && f.value !== 'feedName')?.value || 
                            availableFields[0]?.value;
      
      if (preferredField) {
        // Update any rules that still have default 'symbol' field to use actual available field
        setFilter(prev => ({
          ...prev,
          groups: prev.groups?.map(group => ({
            ...group,
            rules: group.rules.map(rule => 
              rule.field === 'symbol' && !availableFields.find(f => f.value === 'symbol')
                ? { ...rule, field: preferredField }
                : rule
            )
          })) || []
        }));
      }
    }
  }, [feedId, feedData]);

  function createDefaultGroup(): FilterGroup {
    return {
      id: generateId(),
      name: 'Group 1',
      condition: 'and',
      rules: [createDefaultRule()],
      enabled: true,
    };
  }

  function createDefaultRule(): FilterRule {
    return {
      id: generateId(),
      field: 'symbol', // Will be updated to first available field when component renders
      operator: 'equals',
      value: '',
      enabled: true,
    };
  }

  function generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Add new group
  const addGroup = useCallback(() => {
    const newGroup = {
      ...createDefaultGroup(),
      name: `Group ${(filter.groups?.length || 0) + 1}`,
    };
    
    setFilter(prev => ({
      ...prev,
      groups: [...(prev.groups || []), newGroup],
    }));
  }, [filter.groups]);

  // Remove group
  const removeGroup = useCallback((groupId: string) => {
    setFilter(prev => ({
      ...prev,
      groups: prev.groups?.filter(g => g.id !== groupId) || [],
    }));
  }, []);

  // Update group
  const updateGroup = useCallback((groupId: string, updates: Partial<FilterGroup>) => {
    setFilter(prev => ({
      ...prev,
      groups: prev.groups?.map(g => 
        g.id === groupId ? { ...g, ...updates } : g
      ) || [],
    }));
  }, []);

  // Add rule to group
  const addRule = useCallback((groupId: string) => {
    const newRule = createDefaultRule();
    
    setFilter(prev => ({
      ...prev,
      groups: prev.groups?.map(g => 
        g.id === groupId 
          ? { ...g, rules: [...g.rules, newRule] }
          : g
      ) || [],
    }));
  }, []);

  // Remove rule from group
  const removeRule = useCallback((groupId: string, ruleId: string) => {
    setFilter(prev => ({
      ...prev,
      groups: prev.groups?.map(g => 
        g.id === groupId 
          ? { ...g, rules: g.rules.filter(r => r.id !== ruleId) }
          : g
      ) || [],
    }));
  }, []);

  // Update rule
  const updateRule = useCallback((groupId: string, ruleId: string, updates: Partial<FilterRule>) => {
    setFilter(prev => ({
      ...prev,
      groups: prev.groups?.map(g => 
        g.id === groupId 
          ? { 
              ...g, 
              rules: g.rules.map(r => 
                r.id === ruleId ? { ...r, ...updates } : r
              )
            }
          : g
      ) || [],
    }));
  }, []);

  // Save filter
  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validation
      if (!filter.name?.trim()) {
        throw new Error('Filter name is required');
      }

      if (!filter.groups || filter.groups.length === 0) {
        throw new Error('At least one group is required');
      }

      const hasValidRules = filter.groups.some(g => 
        g.enabled && g.rules.some(r => r.enabled && r.field && r.value !== '')
      );

      if (!hasValidRules) {
        throw new Error('At least one enabled rule with a value is required');
      }

      let savedFilter: FeedFilter;
      
      if (existingFilter) {
        savedFilter = await updateFilter(existingFilter.id, filter);
      } else {
        savedFilter = await createFilter(filter as Omit<FeedFilter, 'id' | 'createdAt' | 'updatedAt'>);
      }

      onSave?.(savedFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save filter');
    } finally {
      setIsLoading(false);
    }
  };

  // Get field suggestions from actual feed data
  const getFieldSuggestions = () => {
    if (!feedId) {
      // No specific feed, return common fields as fallback
      return [...COMMON_FIELDS.general, ...COMMON_FIELDS.crypto, ...COMMON_FIELDS.stocks];
    }

    const currentFeedData = feedData.get(feedId);
    if (!currentFeedData?.data || currentFeedData.data.length === 0) {
      // No data available yet, return common fields
      return [...COMMON_FIELDS.general, ...COMMON_FIELDS.crypto, ...COMMON_FIELDS.stocks];
    }

    // Analyze actual data structure
    const sampleData = currentFeedData.data[0];
    const detectedFields: { value: string; label: string; example: string }[] = [];

    // Add feed metadata fields
    detectedFields.push(
      { value: 'feedId', label: 'Feed ID', example: feedId },
      { value: 'feedName', label: 'Feed Name', example: currentFeedData.feedName || 'Unknown Feed' }
    );

    // Analyze each field in the data
    Object.entries(sampleData).forEach(([key, value]) => {
      let label = key;
      let example = String(value);

      // Create user-friendly labels
      switch (key) {
        case 'symbol':
          label = 'Symbol/Ticker';
          break;
        case 'name':
          label = 'Name';
          break;
        case 'price':
          label = 'Current Price';
          break;
        case 'change24h':
          label = '24h Price Change';
          break;
        case 'changePercent24h':
          label = '24h Change Percentage';
          break;
        case 'volume24h':
          label = '24h Trading Volume';
          break;
        case 'marketCap':
          label = 'Market Capitalization';
          break;
        case 'high24h':
          label = '24h High Price';
          break;
        case 'low24h':
          label = '24h Low Price';
          break;
        case 'sector':
          label = 'Sector/Category';
          break;
        case 'timestamp':
          label = 'Timestamp';
          break;
        case 'basePrice':
          label = 'Base Price';
          break;
        case 'volatility':
          label = 'Volatility';
          break;
        default:
          // Convert camelCase to Title Case
          label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      }

      // Format example values
      if (typeof value === 'number') {
        if (key.includes('percent') || key.includes('Percent')) {
          example = `${value.toFixed(2)}%`;
        } else if (key.includes('volume') || key.includes('Volume') || key.includes('cap') || key.includes('Cap')) {
          example = value.toLocaleString();
        } else {
          example = value.toString();
        }
      } else if (typeof value === 'string') {
        example = value.length > 20 ? `${value.substring(0, 20)}...` : value;
      } else {
        example = String(value);
      }

      detectedFields.push({
        value: key,
        label: label,
        example: example
      });
    });

    return detectedFields;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {existingFilter ? 'Edit Filter' : 'Create Filter'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Define conditions to filter feed data in real-time
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Field Detection Status */}
      {(() => {
        if (!feedId) return null;
        
        const currentFeedData = feedData.get(feedId);
        const hasLiveData = currentFeedData?.data && currentFeedData.data.length > 0;
        
        return (
          <div className={`mb-4 p-3 rounded-md border ${
            hasLiveData 
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
              : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              <span className={hasLiveData ? 'text-green-800 dark:text-green-300' : 'text-yellow-800 dark:text-yellow-300'}>
                {hasLiveData ? '✅' : '⏳'} Field Detection: 
              </span>
              <span className={hasLiveData ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}>
                {hasLiveData 
                  ? `${getFieldSuggestions().length - 2} fields detected from live feed data`
                  : 'Using default fields (no live data available yet)'
                }
              </span>
            </div>
          </div>
        );
      })()}

      {/* Basic Filter Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter Name *
          </label>
          <input
            type="text"
            value={filter.name || ''}
            onChange={(e) => setFilter(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., High Volume Crypto"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Group Condition
          </label>
          <select
            value={filter.groupCondition || 'and'}
            onChange={(e) => setFilter(prev => ({ 
              ...prev, 
              groupCondition: e.target.value as FilterCondition 
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="and">ALL groups must match (AND)</option>
            <option value="or">ANY group can match (OR)</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description (Optional)
        </label>
        <textarea
          value={filter.description || ''}
          onChange={(e) => setFilter(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe what this filter does..."
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div className="flex items-center mb-6">
        <input
          type="checkbox"
          checked={filter.enabled ?? true}
          onChange={(e) => setFilter(prev => ({ ...prev, enabled: e.target.checked }))}
          className="mr-2"
        />
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Enable this filter
        </label>
      </div>

      {/* Filter Groups */}
      <div className="space-y-6 mb-6">
        {filter.groups?.map((group, groupIndex) => (
          <div key={group.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={group.enabled}
                  onChange={(e) => updateGroup(group.id, { enabled: e.target.checked })}
                  className="mr-2"
                />
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <select
                  value={group.condition}
                  onChange={(e) => updateGroup(group.id, { condition: e.target.value as FilterCondition })}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="and">ALL rules (AND)</option>
                  <option value="or">ANY rule (OR)</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => addRule(group.id)}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Add Rule
                </button>
                {filter.groups && filter.groups.length > 1 && (
                  <button
                    onClick={() => removeGroup(group.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    Remove Group
                  </button>
                )}
              </div>
            </div>

            {/* Rules */}
            <div className="space-y-3">
              {group.rules.map((rule, ruleIndex) => (
                <div key={rule.id} className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => updateRule(group.id, rule.id, { enabled: e.target.checked })}
                  />
                  
                  <select
                    value={rule.field}
                    onChange={(e) => updateRule(group.id, rule.id, { field: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  >
                    <option value="">Select field...</option>
                    {getFieldSuggestions().map(field => (
                      <option key={field.value} value={field.value} title={`Example: ${field.example}`}>
                        {field.label} (e.g., {field.example})
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(group.id, rule.id, { operator: e.target.value as FilterOperator })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  >
                    {OPERATORS.map(op => (
                      <option key={op.value} value={op.value} title={op.description}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  
                  {rule.operator === 'in_range' ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        placeholder="Min"
                        value={Array.isArray(rule.value) ? rule.value[0] : (rule.value?.min || '')}
                        onChange={(e) => {
                          const newValue = Array.isArray(rule.value) 
                            ? [e.target.value, rule.value[1]] 
                            : [e.target.value, rule.value?.max || ''];
                          updateRule(group.id, rule.id, { value: newValue });
                        }}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={Array.isArray(rule.value) ? rule.value[1] : (rule.value?.max || '')}
                        onChange={(e) => {
                          const newValue = Array.isArray(rule.value) 
                            ? [rule.value[0], e.target.value] 
                            : [rule.value?.min || '', e.target.value];
                          updateRule(group.id, rule.id, { value: newValue });
                        }}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                      />
                    </div>
                  ) : (
                    <input
                      type={['greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal'].includes(rule.operator) ? 'number' : 'text'}
                      value={rule.value || ''}
                      onChange={(e) => updateRule(group.id, rule.id, { value: e.target.value })}
                      placeholder="Value..."
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    />
                  )}
                  
                  {group.rules.length > 1 && (
                    <button
                      onClick={() => removeRule(group.id, rule.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={addGroup}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Add Group
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Filter'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilterBuilder;