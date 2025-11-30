"use client";

import React, { useState } from "react";
import { Button, Card, Space, Tag, Tooltip, Badge } from "antd";
import { 
  FilterOutlined, 
  ThunderboltOutlined, 
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  FireOutlined,
  RocketOutlined
} from "@ant-design/icons";
import { FeedFilter, FilterGroup, FilterRule, FilterCondition } from "@/types/filters";
import { useFilters } from "@/contexts/FilterContext";
import { useWebSocket } from "@/contexts/WebSocketContext";

interface QuickFilterTemplatesProps {
  feedId?: string;
  onFilterApplied?: (filter: FeedFilter) => void;
}

interface FilterTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: string[];
  filter: Omit<FeedFilter, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
}

// Dynamic templates generated from actual feed data

export function QuickFilterTemplates({ 
  feedId, 
  onFilterApplied 
}: QuickFilterTemplatesProps) {
  const { createFilter, setFeedFilter } = useFilters();
  const { feedData } = useWebSocket();
  const [isApplying, setIsApplying] = useState<string | null>(null);

  // Analyze actual feed data to generate appropriate templates
  const generateTemplatesFromFeedData = (): FilterTemplate[] => {
    if (!feedId) return [];
    
    const currentFeedData = feedData.get(feedId);
    if (!currentFeedData?.data || currentFeedData.data.length === 0) return [];
    
    const sampleData = currentFeedData.data[0];
    const templates: FilterTemplate[] = [];

    // Analyze available fields and generate smart templates
    const fields = Object.keys(sampleData);
    
    // Generate high volume template if volume field exists
    if (fields.includes('volume24h')) {
      const volumes = currentFeedData.data.map((item: any) => item.volume24h || 0);
      const avgVolume = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length;
      const highVolumeThreshold = avgVolume * 2;
      
      templates.push({
        id: 'high-volume',
        name: 'High Volume',
        description: `Items with volume > ${(highVolumeThreshold / 1000000).toFixed(0)}M`,
        icon: <ThunderboltOutlined />,
        color: 'blue',
        category: ['generic'],
        filter: {
          name: 'High Volume Filter',
          description: 'Shows items with above-average trading volume',
          groups: [{
            id: 'group-1',
            name: 'Volume Filter',
            condition: 'and' as FilterCondition,
            rules: [{
              id: 'rule-1',
              field: 'volume24h',
              operator: 'greater_than',
              value: highVolumeThreshold,
              enabled: true
            }],
            enabled: true
          }],
          groupCondition: 'and' as FilterCondition,
          enabled: true
        }
      });
    }

    // Generate price movement templates if change fields exist
    if (fields.includes('changePercent24h')) {
      templates.push({
        id: 'gainers',
        name: 'Top Gainers',
        description: 'Items with positive price movement > 3%',
        icon: <RiseOutlined />,
        color: 'green',
        category: ['generic'],
        filter: {
          name: 'Price Gainers',
          description: 'Shows items with positive price performance',
          groups: [{
            id: 'group-1',
            name: 'Gainers Filter',
            condition: 'and' as FilterCondition,
            rules: [{
              id: 'rule-1',
              field: 'changePercent24h',
              operator: 'greater_than',
              value: 3,
              enabled: true
            }],
            enabled: true
          }],
          groupCondition: 'and' as FilterCondition,
          enabled: true
        }
      });

      templates.push({
        id: 'losers',
        name: 'Top Losers',
        description: 'Items with negative price movement < -3%',
        icon: <FallOutlined />,
        color: 'red',
        category: ['generic'],
        filter: {
          name: 'Price Losers',
          description: 'Shows items with negative price performance',
          groups: [{
            id: 'group-1',
            name: 'Losers Filter',
            condition: 'and' as FilterCondition,
            rules: [{
              id: 'rule-1',
              field: 'changePercent24h',
              operator: 'less_than',
              value: -3,
              enabled: true
            }],
            enabled: true
          }],
          groupCondition: 'and' as FilterCondition,
          enabled: true
        }
      });
    }

    // Generate market cap template if available
    if (fields.includes('marketCap')) {
      const marketCaps = currentFeedData.data.map((item: any) => item.marketCap || 0);
      const avgMarketCap = marketCaps.reduce((a: number, b: number) => a + b, 0) / marketCaps.length;
      const largeCapThreshold = avgMarketCap * 2;
      
      templates.push({
        id: 'large-cap',
        name: 'Large Cap',
        description: `Market cap > $${(largeCapThreshold / 1000000000).toFixed(1)}B`,
        icon: <TrophyOutlined />,
        color: 'gold',
        category: ['generic'],
        filter: {
          name: 'Large Cap Filter',
          description: 'Shows large market capitalization items',
          groups: [{
            id: 'group-1',
            name: 'Market Cap Filter',
            condition: 'and' as FilterCondition,
            rules: [{
              id: 'rule-1',
              field: 'marketCap',
              operator: 'greater_than',
              value: largeCapThreshold,
              enabled: true
            }],
            enabled: true
          }],
          groupCondition: 'and' as FilterCondition,
          enabled: true
        }
      });
    }

    // Generate top symbols template (most common/popular items)
    if (fields.includes('symbol')) {
      const symbolCounts = currentFeedData.data.reduce((acc: Record<string, number>, item: any) => {
        acc[item.symbol] = (acc[item.symbol] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topSymbols = Object.entries(symbolCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([symbol]) => symbol);

      if (topSymbols.length > 0) {
        templates.push({
          id: 'top-symbols',
          name: 'Popular Items',
          description: `Focus on top ${topSymbols.length} popular items`,
          icon: <TrophyOutlined />,
          color: 'purple',
          category: ['generic'],
          filter: {
            name: 'Popular Items Filter',
            description: 'Shows most frequently traded items',
            groups: [{
              id: 'group-1',
              name: 'Popular Symbols',
              condition: 'or' as FilterCondition,
              rules: topSymbols.map((symbol, index) => ({
                id: `rule-${index + 1}`,
                field: 'symbol',
                operator: 'equals' as const,
                value: symbol,
                enabled: true
              })),
              enabled: true
            }],
            groupCondition: 'and' as FilterCondition,
            enabled: true
          }
        });
      }
    }

    // Generate sector-specific template if sector field exists
    if (fields.includes('sector')) {
      const sectors = [...new Set(currentFeedData.data.map((item: any) => item.sector).filter(Boolean))];
      
      sectors.slice(0, 3).forEach((sector: any, index) => {
        templates.push({
          id: `sector-${String(sector).toLowerCase().replace(/\s+/g, '-')}`,
          name: `${sector} Sector`,
          description: `Filter by ${sector} sector items`,
          icon: <FilterOutlined />,
          color: ['cyan', 'magenta', 'volcano'][index] || 'default',
          category: ['generic'],
          filter: {
            name: `${sector} Sector Filter`,
            description: `Shows only ${sector} sector items`,
            groups: [{
              id: 'group-1',
              name: 'Sector Filter',
              condition: 'and' as FilterCondition,
              rules: [{
                id: 'rule-1',
                field: 'sector',
                operator: 'equals',
                value: sector,
                enabled: true
              }],
              enabled: true
            }],
            groupCondition: 'and' as FilterCondition,
            enabled: true
          }
        });
      });
    }

    return templates;
  };

  const getTemplates = (): FilterTemplate[] => {
    return generateTemplatesFromFeedData();
  };

  const applyTemplate = async (template: FilterTemplate) => {
    if (!feedId) {
      console.warn('No feedId provided, cannot apply filter');
      return;
    }

    try {
      setIsApplying(template.id);

      // Create a unique filter name with timestamp
      const uniqueFilter = {
        ...template.filter,
        name: `${template.filter.name} (Quick)`,
        feedId: feedId,
        userId: 'user', // TODO: Get from auth context
      };

      // Create the filter
      const createdFilter = await createFilter(uniqueFilter);

      // Apply it to the feed
      setFeedFilter(feedId, createdFilter.id);

      // Notify parent component
      onFilterApplied?.(createdFilter);

      console.log(`✅ Applied filter template: ${template.name}`);
    } catch (error) {
      console.error('Failed to apply filter template:', error);
    } finally {
      setIsApplying(null);
    }
  };

  const templates = getTemplates();

  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
          <RocketOutlined style={{ color: 'var(--blue)' }} />
          Quick Filter Templates
        </h4>
        <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
          Apply pre-configured filters with one click. Perfect for common analysis scenarios.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templates.map((template) => (
          <Card
            key={template.id}
            size="small"
            className="cursor-pointer transition-all duration-200 hover:shadow-md"
            style={{ 
              borderColor: 'var(--line)',
              backgroundColor: 'var(--bg-0)'
            }}
            bodyStyle={{ padding: '12px' }}
            onClick={() => applyTemplate(template)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Tag 
                    color={template.color} 
                    icon={template.icon}
                    style={{ margin: 0, fontSize: '11px' }}
                  >
                    {template.name}
                  </Tag>
                </div>
                
                <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {template.description}
                </p>
                
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                    <FilterOutlined style={{ fontSize: '10px' }} />
                    {template.filter.groups.reduce((acc, g) => acc + g.rules.length, 0)} rule{template.filter.groups.reduce((acc, g) => acc + g.rules.length, 0) !== 1 ? 's' : ''}
                  </div>
                  
                  <Button
                    type="primary"
                    size="small"
                    loading={isApplying === template.id}
                    style={{
                      fontSize: '11px',
                      height: '24px',
                      paddingLeft: '8px',
                      paddingRight: '8px'
                    }}
                  >
                    {isApplying === template.id ? 'Applying...' : 'Apply'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-0)', border: '1px solid var(--line)' }}>
        <div className="text-xs" style={{ color: 'var(--muted)' }}>
          <strong>💡 Tip:</strong> These templates create new filters that you can further customize. 
          Each applied filter will appear in your filter list for future use and modification.
        </div>
      </div>
    </div>
  );
}

export default QuickFilterTemplates;