"use client";

import React, { useState } from "react";
import { Card, Typography, Space, Tag, Divider, Alert, Button } from "antd";
import { 
  BulbOutlined, 
  FilterOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  DollarOutlined
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

interface FilteringExamplesProps {
  // No specific category - examples will be generic and applicable to any feed
}

export function FilteringExamples({}: FilteringExamplesProps) {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  // Generic examples that work with any feed data structure

  const getCurrentExamples = () => {
    // Show generic examples that apply to any type of financial data
    return [
      {
        id: 'high-volume-activity',
        title: 'High Volume Activity',
        icon: <ThunderboltOutlined />,
        color: 'blue',
        description: 'Items with above-average trading volume',
        filters: [
          'Volume > Average * 2 (high activity)',
          'Price change ±2% (some movement)',
          'Market cap > minimum threshold'
        ],
        useCase: 'Find actively traded items with institutional or retail interest',
        sample: {
          matched: ['ITEM1: $45.32 (+3.2%, 2.5M vol)', 'ITEM2: $123.89 (-2.8%, 1.8M vol)'],
          filtered: ['ITEM3: $67.45 (+0.1%, 45K vol)', 'ITEM4: $23.12 (-0.2%, 12K vol)']
        }
      },
      {
        id: 'price-breakouts',
        title: 'Price Breakouts',
        icon: <RiseOutlined />,
        color: 'green',
        description: 'Strong positive or negative price movements',
        filters: [
          'Absolute price change > 5%',
          'Volume > average (confirmation)',
          'Not a micro-cap (reliable data)'
        ],
        useCase: 'Catch momentum moves and breakout patterns',
        sample: {
          matched: ['ITEM1: $89.45 (+8.7%, 1.2M vol)', 'ITEM2: $156.78 (-6.3%, 890K vol)'],
          filtered: ['ITEM3: $45.23 (+1.2%, 234K vol)', 'ITEM4: $78.90 (+0.8%, 156K vol)']
        }
      },
      {
        id: 'stable-performers',
        title: 'Stable Performers',
        icon: <DollarOutlined />,
        color: 'gold',
        description: 'Steady, low-volatility items',
        filters: [
          'Price change between -2% and +2%',
          'Market cap > $1B (established)',
          'Consistent volume (not illiquid)'
        ],
        useCase: 'Conservative screening for stable, established assets',
        sample: {
          matched: ['ITEM1: $245.67 (+0.8%, 456K vol)', 'ITEM2: $89.12 (-1.2%, 234K vol)'],
          filtered: ['ITEM3: $12.34 (+12.5%, 2.1M vol)', 'ITEM4: $0.0045 (+45.2%, 567K vol)']
        }
      }
    ];
  };

  const examples = getCurrentExamples();

  return (
    <Card
      size="small"
      title={
        <Space>
          <BulbOutlined style={{ color: 'var(--yellow)' }} />
          Filtering Examples & Use Cases
        </Space>
      }
      style={{ 
        borderColor: 'var(--line)',
        backgroundColor: 'var(--bg-0)'
      }}
    >
      <div className="space-y-4">
        <Alert
          message="Real-World Filtering Scenarios"
          description="Learn how professional traders and analysts use filtering to find opportunities in real-time market data."
          type="info"
          showIcon
          style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--blue)' }}
        />

        <div className="grid gap-3">
          {examples.map((example) => (
            <Card
              key={example.id}
              size="small"
              className="cursor-pointer transition-all duration-200"
              style={{ 
                borderColor: selectedExample === example.id ? 'var(--blue)' : 'var(--line)',
                backgroundColor: selectedExample === example.id ? 'var(--bg-1)' : 'var(--bg-0)'
              }}
              bodyStyle={{ padding: '12px' }}
              onClick={() => setSelectedExample(
                selectedExample === example.id ? null : example.id
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag 
                      color={example.color} 
                      icon={example.icon}
                      style={{ margin: 0 }}
                    >
                      {example.title}
                    </Tag>
                  </div>
                  
                  <Paragraph 
                    className="text-sm mb-3" 
                    style={{ color: 'var(--muted)', margin: 0 }}
                  >
                    {example.description}
                  </Paragraph>

                  {selectedExample === example.id && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <Text strong style={{ color: 'var(--ink)', fontSize: '12px' }}>
                          Filter Conditions:
                        </Text>
                        <ul className="mt-1 space-y-1">
                          {example.filters.map((filter, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs">
                              <FilterOutlined 
                                style={{ color: 'var(--blue)', fontSize: '10px' }} 
                              />
                              <code 
                                className="px-1 rounded"
                                style={{ 
                                  backgroundColor: 'var(--bg-0)', 
                                  color: 'var(--ink)' 
                                }}
                              >
                                {filter}
                              </code>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Divider style={{ margin: '8px 0' }} />

                      <div>
                        <Text strong style={{ color: 'var(--ink)', fontSize: '12px' }}>
                          Use Case:
                        </Text>
                        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                          {example.useCase}
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <div 
                              className="w-2 h-2 rounded-full bg-green-500"
                            />
                            <Text 
                              strong 
                              style={{ color: 'var(--green)', fontSize: '11px' }}
                            >
                              Would Match:
                            </Text>
                          </div>
                          {example.sample.matched.map((item, idx) => (
                            <div 
                              key={idx}
                              className="text-xs p-2 rounded mb-1"
                              style={{ 
                                backgroundColor: 'var(--green-bg)', 
                                color: 'var(--green)',
                                fontFamily: 'monospace'
                              }}
                            >
                              {item}
                            </div>
                          ))}
                        </div>

                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <div 
                              className="w-2 h-2 rounded-full bg-red-500"
                            />
                            <Text 
                              strong 
                              style={{ color: 'var(--red)', fontSize: '11px' }}
                            >
                              Would Filter Out:
                            </Text>
                          </div>
                          {example.sample.filtered.map((item, idx) => (
                            <div 
                              key={idx}
                              className="text-xs p-2 rounded mb-1"
                              style={{ 
                                backgroundColor: 'var(--red-bg)', 
                                color: 'var(--red)',
                                fontFamily: 'monospace'
                              }}
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <Button
                  type="text"
                  size="small"
                  style={{ color: 'var(--muted)' }}
                >
                  {selectedExample === example.id ? 'Hide' : 'Show'} Details
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div 
          className="mt-4 p-3 rounded-lg text-center"
          style={{ backgroundColor: 'var(--bg-1)', border: '1px solid var(--line)' }}
        >
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            <strong>🎯 Next Steps:</strong> Use the Quick Filter Templates above to try these scenarios, 
            or create custom filters using the Filter Builder to match your specific trading strategy.
          </div>
        </div>
      </div>
    </Card>
  );
}

export default FilteringExamples;