"use client";

import React, { useState } from "react";
import { Card, Collapse, Tag, Typography, Space, Tooltip, Button } from "antd";
import { 
  InfoCircleOutlined, 
  DatabaseOutlined, 
  EyeOutlined,
  TableOutlined 
} from "@ant-design/icons";
import { useWebSocket } from "@/contexts/WebSocketContext";

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

interface DataStructureViewerProps {
  feedId?: string;
}

interface FieldInfo {
  name: string;
  type: string;
  description: string;
  sampleValues: any[];
  operators: string[];
}

export function DataStructureViewer({ feedId }: DataStructureViewerProps) {
  const { feedData } = useWebSocket();
  const [showSampleData, setShowSampleData] = useState(false);

  const getFieldsFromData = (data: any[]): FieldInfo[] => {
    if (!data || data.length === 0) return [];

    const sample = data[0];
    const fields: FieldInfo[] = [];

    Object.entries(sample).forEach(([key, value]) => {
      const fieldType = typeof value;
      const sampleValues = data.slice(0, 3).map(item => item[key]);

      let description = '';
      let operators = ['equals', 'not_equals'];

      switch (key) {
        case 'symbol':
          description = 'Trading symbol or ticker (e.g., BTC, AAPL)';
          operators = ['equals', 'not_equals', 'contains', 'starts_with', 'ends_with'];
          break;
        case 'name':
          description = 'Full name of the asset';
          operators = ['equals', 'not_equals', 'contains', 'starts_with', 'ends_with'];
          break;
        case 'price':
          description = 'Current market price';
          operators = ['equals', 'not_equals', 'greater_than', 'less_than', 'in_range'];
          break;
        case 'change24h':
          description = '24-hour price change in absolute value';
          operators = ['equals', 'not_equals', 'greater_than', 'less_than', 'in_range'];
          break;
        case 'changePercent24h':
          description = '24-hour price change as percentage';
          operators = ['equals', 'not_equals', 'greater_than', 'less_than', 'in_range'];
          break;
        case 'volume24h':
          description = '24-hour trading volume';
          operators = ['equals', 'not_equals', 'greater_than', 'less_than', 'in_range'];
          break;
        case 'marketCap':
          description = 'Market capitalization (total value)';
          operators = ['equals', 'not_equals', 'greater_than', 'less_than', 'in_range'];
          break;
        case 'high24h':
          description = 'Highest price in the last 24 hours';
          operators = ['equals', 'not_equals', 'greater_than', 'less_than', 'in_range'];
          break;
        case 'low24h':
          description = 'Lowest price in the last 24 hours';
          operators = ['equals', 'not_equals', 'greater_than', 'less_than', 'in_range'];
          break;
        case 'sector':
          description = 'Industry sector (for stocks)';
          operators = ['equals', 'not_equals', 'contains', 'starts_with', 'ends_with'];
          break;
        case 'timestamp':
          description = 'Data timestamp';
          operators = ['equals', 'not_equals', 'greater_than', 'less_than', 'in_range'];
          break;
        case 'basePrice':
          description = 'Base reference price';
          operators = ['equals', 'not_equals', 'greater_than', 'less_than', 'in_range'];
          break;
        case 'volatility':
          description = 'Price volatility measure';
          operators = ['equals', 'not_equals', 'greater_than', 'less_than', 'in_range'];
          break;
        default:
          description = `Data field: ${key}`;
          if (fieldType === 'number') {
            operators = ['equals', 'not_equals', 'greater_than', 'less_than', 'in_range'];
          }
      }

      fields.push({
        name: key,
        type: fieldType,
        description,
        sampleValues,
        operators
      });
    });

    return fields.sort((a, b) => a.name.localeCompare(b.name));
  };

  const getCurrentData = () => {
    if (!feedId) return null;
    const data = feedData.get(feedId);
    return data?.data || [];
  };

  const currentData = getCurrentData();
  const fields = currentData ? getFieldsFromData(currentData) : [];

  if (!feedId || !currentData || currentData.length === 0) {
    return (
      <Card
        size="small"
        title={
          <Space>
            <DatabaseOutlined style={{ color: 'var(--blue)' }} />
            Data Structure
          </Space>
        }
        style={{ 
          borderColor: 'var(--line)',
          backgroundColor: 'var(--bg-0)'
        }}
      >
        <div className="text-center py-4" style={{ color: 'var(--muted)' }}>
          <DatabaseOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
          <p>No data available</p>
          <p className="text-xs">Connect to a feed to see available fields for filtering</p>
        </div>
      </Card>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'blue';
      case 'number': return 'green';
      case 'boolean': return 'orange';
      case 'object': return 'purple';
      default: return 'default';
    }
  };

  const formatSampleValue = (value: any) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    return String(value);
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <DatabaseOutlined style={{ color: 'var(--blue)' }} />
          Data Structure Reference
          <Tag color="cyan" style={{ fontSize: '10px' }}>
            {fields.length} fields available
          </Tag>
        </Space>
      }
      extra={
        <Button
          size="small"
          type="text"
          icon={<EyeOutlined />}
          onClick={() => setShowSampleData(!showSampleData)}
        >
          {showSampleData ? 'Hide' : 'Show'} Sample Data
        </Button>
      }
      style={{ 
        borderColor: 'var(--line)',
        backgroundColor: 'var(--bg-0)'
      }}
    >
      <div className="space-y-3">
        <Paragraph style={{ color: 'var(--muted)', fontSize: '12px', margin: 0 }}>
          Understanding your data fields helps create effective filters. Each field supports different operators for filtering.
        </Paragraph>

        {showSampleData && (
          <Card 
            size="small" 
            title="Live Data Sample" 
            style={{ backgroundColor: 'var(--bg-1)' }}
          >
            <div className="text-xs font-mono" style={{ color: 'var(--ink)' }}>
              <pre>{JSON.stringify(currentData.slice(0, 2), null, 2)}</pre>
            </div>
          </Card>
        )}

        <Collapse 
          size="small" 
          ghost
          expandIconPosition="end"
          style={{ backgroundColor: 'transparent' }}
        >
          <Panel
            header={
              <Space>
                <TableOutlined style={{ color: 'var(--blue)' }} />
                <span style={{ color: 'var(--ink)' }}>Field Reference Guide</span>
              </Space>
            }
            key="fields"
          >
            <div className="grid gap-3">
              {fields.map((field) => (
                <div
                  key={field.name}
                  className="flex items-start justify-between p-3 rounded-lg"
                  style={{ 
                    backgroundColor: 'var(--bg-1)', 
                    border: '1px solid var(--line)' 
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code 
                        className="font-mono font-semibold" 
                        style={{ 
                          color: 'var(--blue)',
                          fontSize: '12px'
                        }}
                      >
                        {field.name}
                      </code>
                      <Tag 
                        color={getTypeColor(field.type)}
                        style={{ fontSize: '10px' }}
                      >
                        {field.type}
                      </Tag>
                    </div>
                    
                    <p 
                      className="text-xs mb-2" 
                      style={{ color: 'var(--muted)' }}
                    >
                      {field.description}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span style={{ color: 'var(--muted)' }}>Sample:</span>
                      {field.sampleValues.slice(0, 3).map((value, idx) => (
                        <code
                          key={idx}
                          className="px-1 py-0.5 rounded"
                          style={{ 
                            backgroundColor: 'var(--bg-0)',
                            color: 'var(--ink)',
                            fontSize: '11px'
                          }}
                        >
                          {formatSampleValue(value)}
                        </code>
                      ))}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <Tooltip
                      title={
                        <div>
                          <div className="font-semibold mb-1">Available Operators:</div>
                          {field.operators.map(op => (
                            <div key={op} className="text-xs">
                              • {op.replace('_', ' ')}
                            </div>
                          ))}
                        </div>
                      }
                    >
                      <Button 
                        size="small" 
                        type="text" 
                        icon={<InfoCircleOutlined />}
                        style={{ color: 'var(--muted)' }}
                      >
                        {field.operators.length} ops
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Collapse>

        <div 
          className="mt-4 p-2 rounded"
          style={{ backgroundColor: 'var(--bg-1)', border: '1px solid var(--line)' }}
        >
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            <strong>💡 Pro Tip:</strong> Use numeric fields like <code>price</code>, <code>volume24h</code>, and <code>changePercent24h</code> 
            with range operators for powerful market analysis. String fields like <code>symbol</code> and <code>sector</code> work great with equality and text matching.
          </div>
        </div>
      </div>
    </Card>
  );
}

export default DataStructureViewer;