// Filter types for feed data filtering system
export type FilterOperator = 
  | 'equals' 
  | 'not_equals'
  | 'contains' 
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'in_range'
  | 'regex';

export type FilterCondition = 'and' | 'or';

export interface FilterRule {
  id: string;
  field: string; // Path to the data field (supports nested paths like 'data.price', 'data.symbol')
  operator: FilterOperator;
  value: any;
  enabled: boolean;
}

export interface FilterGroup {
  id: string;
  name: string;
  condition: FilterCondition; // How to combine rules within this group
  rules: FilterRule[];
  enabled: boolean;
}

export interface FeedFilter {
  id: string;
  name: string;
  description?: string;
  feedId?: string; // If specified, only applies to this feed
  groups: FilterGroup[];
  groupCondition: FilterCondition; // How to combine groups
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string; // Owner of the filter
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  category: 'crypto' | 'stocks' | 'forex' | 'commodities' | 'custom';
  filter: Omit<FeedFilter, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  isPublic: boolean;
  usageCount: number;
  tags: string[];
}

// Context type for filter management
export interface FilterContextType {
  filters: FeedFilter[];
  activeFilters: Map<string, FeedFilter>; // feedId -> active filter
  presets: FilterPreset[];
  
  // Filter management
  createFilter: (filter: Omit<FeedFilter, 'id' | 'createdAt' | 'updatedAt'>) => Promise<FeedFilter>;
  updateFilter: (id: string, updates: Partial<FeedFilter>) => Promise<FeedFilter>;
  deleteFilter: (id: string) => Promise<void>;
  
  // Apply filters to feeds
  setFeedFilter: (feedId: string, filterId: string) => void;
  removeFeedFilter: (feedId: string) => void;
  
  // Filter data
  applyFilters: (feedId: string, data: any) => any;
  
  // Presets
  loadPreset: (presetId: string, feedId?: string) => Promise<FeedFilter>;
  saveAsPreset: (filterId: string, name: string, description: string, isPublic?: boolean) => Promise<FilterPreset>;
}

// Enhanced FeedData with filter information
export interface FilteredFeedData {
  feedId: string;
  feedName: string;
  eventName: string;
  originalData: any;
  filteredData: any;
  filterApplied: boolean;
  filterId?: string;
  filterName?: string;
  matchCount?: number; // For array data, how many items matched
  totalCount?: number; // For array data, total items before filtering
  timestamp: Date;
}