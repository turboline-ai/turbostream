'use client';

import React, { useState } from 'react';
import { Card, Form, Input, Select, Button, Checkbox, InputNumber, Steps, Spin, Alert, App, Table, Space } from 'antd';
import { CheckCircleOutlined, LoadingOutlined, ExclamationCircleOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

const { Step } = Steps;

interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

interface TestResult {
  success: boolean;
  connectionTime?: number;
  dataReceived?: boolean;
  sampleData?: any;
  error?: string;
  handshakeDetails?: {
    url: string;
    protocol: string;
    headers: Record<string, string>;
    statusCode?: number;
  };
}

interface FormData {
  name: string;
  description: string;
  category: string;
  icon: string;
  url: string;
  queryParams: KeyValuePair[];
  headers: KeyValuePair[];
  connectionMessage: string;
  connectionMessageFormat: 'json' | 'xml' | 'text';
  eventName: string;
  dataFormat: string;
  isPublic: boolean;
  reconnectionEnabled: boolean;
  reconnectionDelay: number;
  reconnectionAttempts: number;
  tags: string;
  website: string;
  documentation: string;
}

const ImprovedRegisterFeedForm: React.FC = () => {
  const { user, token } = useAuth();
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: 'crypto',
    icon: '📊',
    url: '',
    queryParams: [],
    headers: [],
    connectionMessage: '',
    connectionMessageFormat: 'json',
    eventName: '',
    dataFormat: 'json',
    isPublic: true,
    reconnectionEnabled: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    tags: '',
    website: '',
    documentation: '',
  });

  if (!user) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <p className="text-gray-300 mb-4">You must be logged in to register a feed</p>
        <Button type="primary" onClick={() => router.push('/')}>
          Go to Home
        </Button>
      </Card>
    );
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'url' || field === 'eventName' || field === 'queryParams' || field === 'headers' || field === 'connectionMessage') {
      setTestResult(null); // Reset test result when connection details change
    }
  };

  // Query Parameters Management
  const addQueryParam = () => {
    setFormData(prev => ({
      ...prev,
      queryParams: [...prev.queryParams, { key: '', value: '', enabled: true }]
    }));
  };

  const updateQueryParam = (index: number, field: keyof KeyValuePair, value: any) => {
    const newParams = [...formData.queryParams];
    newParams[index] = { ...newParams[index], [field]: value };
    handleChange('queryParams', newParams);
  };

  const removeQueryParam = (index: number) => {
    const newParams = formData.queryParams.filter((_, i) => i !== index);
    handleChange('queryParams', newParams);
  };

  // Headers Management
  const addHeader = () => {
    setFormData(prev => ({
      ...prev,
      headers: [...prev.headers, { key: '', value: '', enabled: true }]
    }));
  };

  const updateHeader = (index: number, field: keyof KeyValuePair, value: any) => {
    const newHeaders = [...formData.headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    handleChange('headers', newHeaders);
  };

  const removeHeader = (index: number) => {
    const newHeaders = formData.headers.filter((_, i) => i !== index);
    handleChange('headers', newHeaders);
  };

  const testConnection = async () => {
    if (!formData.url) {
      message.error('Please enter WebSocket URL');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/marketplace/test-feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: formData.url,
          eventName: formData.eventName || undefined,
          queryParams: formData.queryParams.filter(p => p.enabled && p.key),
          headers: formData.headers.filter(h => h.enabled && h.key),
          connectionMessage: formData.connectionMessage || undefined,
          connectionMessageFormat: formData.connectionMessageFormat,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTestResult(result.data);
        message.success('Connection test successful!');
      } else {
        setTestResult({ success: false, error: result.message || 'Connection test failed' });
        message.error(result.message || 'Connection test failed');
      }
    } catch (error: any) {
      console.error('Test connection error:', error);
      setTestResult({ success: false, error: error.message });
      message.error('Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !testResult?.success) {
      message.error('Please test the connection successfully before proceeding');
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!testResult?.success) {
      message.error('Please test the connection successfully before registering');
      return;
    }

    setLoading(true);

    try {
      const tagsArray = formData.tags
        ? formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
        : [];

      const payload = {
        ...formData,
        tags: tagsArray,
        queryParams: formData.queryParams.filter(p => p.enabled && p.key),
        headers: formData.headers.filter(h => h.enabled && h.key),
      };

      const response = await fetch(`${BACKEND_URL}/api/marketplace/feeds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to register feed');
      }

      const result = await response.json();
      console.log('Feed registered successfully:', result);
      
      message.success('Feed registered successfully!');
      router.push('/marketplace');
    } catch (err: any) {
      console.error('Registration error:', err);
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Basic Info',
      description: 'Feed details',
    },
    {
      title: 'Connection',
      description: 'Test WebSocket',
    },
    {
      title: 'Settings',
      description: 'Configuration',
    },
    {
      title: 'Confirm',
      description: 'Review & submit',
    },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-4">Feed Information</h3>
            
            <div>
              <label className="block text-white font-medium mb-2">Feed Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="My Awesome Data Feed"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Description *</label>
              <Input.TextArea
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe what your feed provides..."
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-medium mb-2">Category *</label>
                <Select
                  value={formData.category}
                  onChange={(value) => handleChange('category', value)}
                  className="w-full"
                  options={[
                    { label: 'Crypto', value: 'crypto' },
                    { label: 'Stocks', value: 'stocks' },
                    { label: 'Forex', value: 'forex' },
                    { label: 'Commodities', value: 'commodities' },
                    { label: 'Custom', value: 'custom' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Icon (Emoji)</label>
                <Input
                  maxLength={2}
                  value={formData.icon}
                  onChange={(e) => handleChange('icon', e.target.value)}
                  placeholder="📊"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-4">Connection Details</h3>
            <p className="text-gray-400 text-sm mb-4">
              Configure your WebSocket connection. We'll test it to ensure it's working properly before registration.
            </p>
            
            {/* WebSocket URL */}
            <div>
              <label className="block text-white font-medium mb-2">WebSocket URL *</label>
              <Input
                type="url"
                value={formData.url}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="ws://localhost:3001 or http://localhost:3001"
                className="w-full"
              />
              <p className="text-gray-400 text-xs mt-1">
                Full URL of your websocket server (including protocol and port)
              </p>
            </div>

            {/* Query Parameters */}
            <div className="border-t border-gray-600 pt-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-white font-medium">Query Parameters</label>
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={addQueryParam}
                >
                  Add Parameter
                </Button>
              </div>
              {formData.queryParams.length > 0 ? (
                <div className="bg-gray-800 rounded p-3">
                  <Table
                    dataSource={formData.queryParams.map((param, index) => ({ ...param, index }))}
                    pagination={false}
                    size="small"
                    rowKey="index"
                    columns={[
                      {
                        title: 'Enabled',
                        dataIndex: 'enabled',
                        width: 70,
                        render: (enabled: boolean, record: any) => (
                          <Checkbox
                            checked={enabled}
                            onChange={(e) => updateQueryParam(record.index, 'enabled', e.target.checked)}
                          />
                        ),
                      },
                      {
                        title: 'Key',
                        dataIndex: 'key',
                        render: (key: string, record: any) => (
                          <Input
                            size="small"
                            value={key}
                            onChange={(e) => updateQueryParam(record.index, 'key', e.target.value)}
                            placeholder="param_name"
                          />
                        ),
                      },
                      {
                        title: 'Value',
                        dataIndex: 'value',
                        render: (value: string, record: any) => (
                          <Input
                            size="small"
                            value={value}
                            onChange={(e) => updateQueryParam(record.index, 'value', e.target.value)}
                            placeholder="param_value"
                          />
                        ),
                      },
                      {
                        title: '',
                        width: 50,
                        render: (_, record: any) => (
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => removeQueryParam(record.index)}
                          />
                        ),
                      },
                    ]}
                  />
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No query parameters added</p>
              )}
            </div>

            {/* Headers */}
            <div className="border-t border-gray-600 pt-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-white font-medium">Headers</label>
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={addHeader}
                >
                  Add Header
                </Button>
              </div>
              {formData.headers.length > 0 ? (
                <div className="bg-gray-800 rounded p-3">
                  <Table
                    dataSource={formData.headers.map((header, index) => ({ ...header, index }))}
                    pagination={false}
                    size="small"
                    rowKey="index"
                    columns={[
                      {
                        title: 'Enabled',
                        dataIndex: 'enabled',
                        width: 70,
                        render: (enabled: boolean, record: any) => (
                          <Checkbox
                            checked={enabled}
                            onChange={(e) => updateHeader(record.index, 'enabled', e.target.checked)}
                          />
                        ),
                      },
                      {
                        title: 'Key',
                        dataIndex: 'key',
                        render: (key: string, record: any) => (
                          <Input
                            size="small"
                            value={key}
                            onChange={(e) => updateHeader(record.index, 'key', e.target.value)}
                            placeholder="Authorization"
                          />
                        ),
                      },
                      {
                        title: 'Value',
                        dataIndex: 'value',
                        render: (value: string, record: any) => (
                          <Input
                            size="small"
                            value={value}
                            onChange={(e) => updateHeader(record.index, 'value', e.target.value)}
                            placeholder="Bearer token..."
                          />
                        ),
                      },
                      {
                        title: '',
                        width: 50,
                        render: (_, record: any) => (
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => removeHeader(record.index)}
                          />
                        ),
                      },
                    ]}
                  />
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No headers added</p>
              )}
            </div>

            {/* Test Connection Button */}
            <div className="border-t border-gray-600 pt-6">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  type="primary"
                  onClick={testConnection}
                  loading={testing}
                  disabled={!formData.url}
                  icon={testing ? <LoadingOutlined /> : undefined}
                  className="px-6 py-2 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3]"
                >
                  {testing ? 'Testing Connection...' : 'Test Connection'}
                </Button>
                
                {!formData.url ? (
                  <span className="text-yellow-500 text-sm">
                    ⚠️ Enter WebSocket URL to test connection
                  </span>
                ) : null}
              </div>

              {testResult && (
                <Alert
                  type={testResult.success ? 'success' : 'error'}
                  showIcon
                  icon={testResult.success ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                  message={testResult.success ? 'Connection Successful' : 'Connection Failed'}
                  description={
                    <div>
                      {testResult.success && (
                        <div className="text-sm space-y-3">
                          <div>
                            <p className="font-semibold mb-1">Connection Info:</p>
                            <p>• Connected in {testResult.connectionTime}ms</p>
                            <p>• Data received: {testResult.dataReceived ? 'Yes' : 'No'}</p>
                          </div>
                          
                          {testResult.handshakeDetails && (
                            <div className="bg-gray-900 p-3 rounded">
                              <p className="font-semibold mb-2">🤝 Handshake Details:</p>
                              <div className="space-y-1 font-mono text-xs">
                                <p>• Protocol: <span className="text-green-400">{testResult.handshakeDetails.protocol}</span></p>
                                <p>• URL: <span className="text-blue-400">{testResult.handshakeDetails.url}</span></p>
                                {testResult.handshakeDetails.statusCode && (
                                  <p>• Status Code: <span className="text-green-400">{testResult.handshakeDetails.statusCode} Switching Protocols</span></p>
                                )}
                                {Object.keys(testResult.handshakeDetails.headers).length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-gray-400">Headers:</p>
                                    {Object.entries(testResult.handshakeDetails.headers).map(([key, value]) => (
                                      <p key={key} className="ml-2">
                                        <span className="text-yellow-400">{key}</span>: {value}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {testResult.sampleData && (
                            <div>
                              <p className="font-semibold mb-1">Sample data:</p>
                              <pre className="text-xs bg-gray-100 text-gray-800 p-2 rounded mt-1 overflow-x-auto max-h-64">
                                {typeof testResult.sampleData === 'string' 
                                  ? testResult.sampleData 
                                  : JSON.stringify(testResult.sampleData, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                      {testResult.error && <p className="text-sm">{testResult.error}</p>}
                    </div>
                  }
                  className="mb-4"
                />
              )}
            </div>

            {/* Connection Message */}
            <div className="border-t border-gray-600 pt-6">
              <label className="block text-white font-medium mb-2">Connection Message (Optional)</label>
              <p className="text-gray-400 text-xs mb-3">
                Free-form message to send upon connection (JSON, XML, or plain text)
              </p>
              
              <div className="mb-3">
                <Select
                  value={formData.connectionMessageFormat}
                  onChange={(value) => handleChange('connectionMessageFormat', value)}
                  className="w-40"
                  options={[
                    { label: 'JSON', value: 'json' },
                    { label: 'XML', value: 'xml' },
                    { label: 'Text', value: 'text' },
                  ]}
                />
              </div>

              <Input.TextArea
                rows={6}
                value={formData.connectionMessage}
                onChange={(e) => handleChange('connectionMessage', e.target.value)}
                placeholder={
                  formData.connectionMessageFormat === 'json'
                    ? '{\n  "action": "subscribe",\n  "channel": "crypto-updates"\n}'
                    : formData.connectionMessageFormat === 'xml'
                    ? '<subscribe>\n  <channel>crypto-updates</channel>\n</subscribe>'
                    : 'Your custom connection message...'
                }
                className="font-mono"
              />
            </div>

            {/* Event Name and Data Format */}
            <div className="border-t border-gray-600 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-medium mb-2">Event Name (Optional)</label>
                <Input
                  value={formData.eventName}
                  onChange={(e) => handleChange('eventName', e.target.value)}
                  placeholder="data-update"
                  className="w-full"
                />
                <p className="text-gray-400 text-xs mt-1">Socket.IO event name to listen for</p>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Data Format (Optional)</label>
                <Select
                  value={formData.dataFormat}
                  onChange={(value) => handleChange('dataFormat', value)}
                  className="w-full"
                  options={[
                    { label: 'JSON', value: 'json' },
                    { label: 'Text', value: 'text' },
                  ]}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-4">Advanced Settings</h3>

            <div className="space-y-4">
              <Checkbox
                checked={formData.isPublic}
                onChange={(e) => handleChange('isPublic', e.target.checked)}
                className="text-white"
              >
                Make this feed public in the marketplace
              </Checkbox>

              <Checkbox
                checked={formData.reconnectionEnabled}
                onChange={(e) => handleChange('reconnectionEnabled', e.target.checked)}
                className="text-white"
              >
                Enable automatic reconnection
              </Checkbox>

              {formData.reconnectionEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                  <div>
                    <label className="block text-white font-medium mb-2">Reconnection Delay (ms)</label>
                    <InputNumber
                      min={100}
                      value={formData.reconnectionDelay}
                      onChange={(value) => handleChange('reconnectionDelay', value || 1000)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Max Reconnection Attempts</label>
                    <InputNumber
                      min={1}
                      max={20}
                      value={formData.reconnectionAttempts}
                      onChange={(value) => handleChange('reconnectionAttempts', value || 5)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-600 pt-6">
              <h4 className="text-lg font-bold text-white mb-4">Additional Information</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">Tags (comma-separated)</label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    placeholder="realtime, prices, market"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Website URL</label>
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Documentation URL</label>
                  <Input
                    type="url"
                    value={formData.documentation}
                    onChange={(e) => handleChange('documentation', e.target.value)}
                    placeholder="https://docs.example.com"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-4">Review Your Feed</h3>
            
            <div className="bg-gray-800 p-6 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-white font-medium">Feed Name</h4>
                  <p className="text-gray-300">{formData.name}</p>
                </div>
                <div>
                  <h4 className="text-white font-medium">Category</h4>
                  <p className="text-gray-300">{formData.category}</p>
                </div>
                <div>
                  <h4 className="text-white font-medium">WebSocket URL</h4>
                  <p className="text-gray-300 break-all">{formData.url}</p>
                </div>
                {formData.eventName && (
                  <div>
                    <h4 className="text-white font-medium">Event Name</h4>
                    <p className="text-gray-300">{formData.eventName}</p>
                  </div>
                )}
                {formData.dataFormat && (
                  <div>
                    <h4 className="text-white font-medium">Data Format</h4>
                    <p className="text-gray-300">{formData.dataFormat}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-white font-medium">Public</h4>
                  <p className="text-gray-300">{formData.isPublic ? 'Yes' : 'No'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-white font-medium">Description</h4>
                <p className="text-gray-300">{formData.description}</p>
              </div>

              {formData.queryParams.filter(p => p.enabled && p.key).length > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-2">Query Parameters</h4>
                  <div className="bg-gray-900 p-3 rounded">
                    {formData.queryParams
                      .filter(p => p.enabled && p.key)
                      .map((param, idx) => (
                        <div key={idx} className="text-gray-300 text-sm">
                          <code>{param.key}={param.value}</code>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {formData.headers.filter(h => h.enabled && h.key).length > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-2">Headers</h4>
                  <div className="bg-gray-900 p-3 rounded">
                    {formData.headers
                      .filter(h => h.enabled && h.key)
                      .map((header, idx) => (
                        <div key={idx} className="text-gray-300 text-sm">
                          <code>{header.key}: {header.value}</code>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {formData.connectionMessage && (
                <div>
                  <h4 className="text-white font-medium mb-2">Connection Message ({formData.connectionMessageFormat})</h4>
                  <pre className="bg-gray-900 p-3 rounded text-gray-300 text-sm overflow-x-auto">
                    {formData.connectionMessage}
                  </pre>
                </div>
              )}

              {testResult?.success && (
                <Alert
                  type="success"
                  showIcon
                  message="Connection Test Passed"
                  description={`Connection established in ${testResult.connectionTime}ms. Data received: ${testResult.dataReceived ? 'Yes' : 'No'}`}
                />
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w mx-auto">
      <Card>
        <h2 className="text-3xl font-bold text-white mb-2">Register WebSocket Feed</h2>
        <p className="text-gray-400 mb-8">Add your own real-time feed with step-by-step validation.</p>

        <Steps current={currentStep} className="mb-8">
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
            />
          ))}
        </Steps>

        <div className="mb-8">
          {renderStepContent()}
        </div>

        <div className="flex justify-between pt-6 border-t border-gray-700">
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            size="large"
          >
            Previous
          </Button>

          <div className="flex gap-4">
            <Button
              size="large"
              onClick={() => router.push('/')}
            >
              Cancel
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                type="primary"
                onClick={nextStep}
                disabled={
                  (currentStep === 0 && (!formData.name || !formData.description)) ||
                  (currentStep === 1 && (!testResult?.success))
                }
                size="large"
              >
                Next
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                disabled={!testResult?.success}
                size="large"
              >
                Register Feed
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ImprovedRegisterFeedForm;