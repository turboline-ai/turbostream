'use client';

import React, { useState } from 'react';
import { Button, Card, Input, Select, Checkbox, Alert, Table, InputNumber } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useAllCategories, useUserCategories } from '@/hooks/useSettings';
import { Info, Globe, Settings, Rocket, Link, Zap } from 'lucide-react';
import { WebSocketFeed } from '@/types/marketplace';
import { useRegisterFeedExtensions } from '@/proprietary/register-feed';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

interface DynamicRegisterFeedFormProps {
  initialData?: WebSocketFeed;
  isEditMode?: boolean;
  onSuccess?: () => void;
}

type ConnectionType = 'websocket' | 'http-polling' | 'protobuf';

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

interface BaseFormData {
  name: string;
  description: string;
  systemPrompt: string;
  category: string;
  icon: string;
  connectionType: ConnectionType;
  isPublic: boolean;
  tags: string;
  website: string;
  documentation: string;
}

interface WebSocketFormData extends BaseFormData {
  connectionType: 'websocket';
  url: string;
  queryParams: KeyValuePair[];
  headers: KeyValuePair[];
  connectionMessage: string;
  connectionMessages: string[];
  connectionMessageFormat: 'json' | 'xml' | 'text';
  eventName: string;
  dataFormat: string;
  reconnectionEnabled: boolean;
  reconnectionDelay: number;
  reconnectionAttempts: number;
}

interface HTTPFormData extends BaseFormData {
  connectionType: 'http-polling';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  pollingInterval: number;
  timeout: number;
  headers: { [key: string]: string };
  queryParams: { [key: string]: string };
  requestBody: string;
  dataPath: string;
  responseFormat: 'json' | 'xml' | 'csv' | 'text';
  
  // Authentication
  authType: 'none' | 'bearer' | 'api-key' | 'basic';
  authToken: string;
  apiKeyName: string;
  apiKeyValue: string;
  basicUsername: string;
  basicPassword: string;
  
  // Data transformation
  transformationEnabled: boolean;
  transformationScript: string;
}

interface ProtobufFormData extends BaseFormData {
  connectionType: 'protobuf';
  url: string;
  protobufType: string;
  queryParams: KeyValuePair[];
  headers: KeyValuePair[];
  eventName: string;
  reconnectionEnabled: boolean;
  reconnectionDelay: number;
  reconnectionAttempts: number;
}

type FormData = WebSocketFormData | HTTPFormData | ProtobufFormData;

const DynamicRegisterFeedForm: React.FC<DynamicRegisterFeedFormProps> = ({ 
  initialData, 
  isEditMode = false,
  onSuccess 
}) => {
  const { user, token } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  
  // Settings hooks
  const { getAllOptions, loading: categoriesLoading, refetch: refetchCategories } = useAllCategories(token || undefined);
  const { createCategory } = useUserCategories(token || undefined);

  // Category creation state
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const getInitialFormData = (): FormData => {
    if (initialData && isEditMode) {
      // Convert WebSocketFeed to FormData format
      const feed = initialData;
      return {
        name: feed.name,
        description: feed.description,
        systemPrompt: feed.systemPrompt || '',
        category: feed.category,
        icon: feed.icon || '📊',
        connectionType: feed.connectionType || 'websocket',
        url: feed.url,
        queryParams: feed.queryParams || [],
        headers: feed.headers || [],
        connectionMessage: feed.connectionMessage || '',
        connectionMessages: feed.connectionMessages || [],
        connectionMessageFormat: feed.connectionMessageFormat || 'json',
        eventName: feed.eventName,
        dataFormat: feed.dataFormat || 'json',
        isPublic: feed.isPublic ?? true,
        reconnectionEnabled: feed.reconnectionEnabled ?? true,
        reconnectionDelay: feed.reconnectionDelay || 1000,
        reconnectionAttempts: feed.reconnectionAttempts || 5,
        tags: feed.tags?.join(', ') || '',
        website: feed.website || '',
        documentation: feed.documentation || '',
        httpConfig: feed.httpConfig,
      } as FormData;
    }
    return {
      name: '',
      description: '',
      systemPrompt: '',
      category: 'crypto',
      icon: '📊',
      connectionType: 'websocket',
      url: '',
      queryParams: [],
      headers: [],
      connectionMessage: '',
      connectionMessages: [],
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
    } as WebSocketFormData;
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  
  const [customIcon, setCustomIcon] = useState(false);
  const [iconInputValue, setIconInputValue] = useState('');

  if (!user) {
    return (
      <Card className="max-w mx-auto text-center">
        <p className="text-gray-300 mb-4">You must be logged in to register a feed</p>
        <Button variant="nebula" onClick={() => router.push('/')}>
          Go to Home
        </Button>
      </Card>
    );
  }

  const handleConnectionTypeChange = (connectionType: ConnectionType) => {
    // Reset form data when connection type changes
    const baseData = {
      name: formData.name,
      description: formData.description,
      systemPrompt: formData.systemPrompt,
      category: formData.category,
      icon: formData.icon,
      connectionType,
      isPublic: formData.isPublic,
      tags: formData.tags,
      website: formData.website,
      documentation: formData.documentation,
    };

    switch (connectionType) {
      case 'websocket':
        setFormData({
          ...baseData,
          connectionType: 'websocket',
          url: '',
          queryParams: [],
          headers: [],
          connectionMessage: '',
          connectionMessageFormat: 'json',
          eventName: '',
          dataFormat: 'json',
          reconnectionEnabled: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        } as WebSocketFormData);
        break;
      
      case 'http-polling':
        setFormData({
          ...baseData,
          connectionType: 'http-polling',
          url: '',
          method: 'GET',
          pollingInterval: 30000, // 30 seconds
          timeout: 10000, // 10 seconds
          headers: {},
          queryParams: {},
          requestBody: '',
          dataPath: '',
          responseFormat: 'json',
          authType: 'none',
          authToken: '',
          apiKeyName: '',
          apiKeyValue: '',
          basicUsername: '',
          basicPassword: '',
          transformationEnabled: false,
          transformationScript: '',
        } as HTTPFormData);
        break;
      
      case 'protobuf':
        setFormData({
          ...baseData,
          connectionType: 'protobuf',
          url: '',
          protobufType: 'yfinance',
          queryParams: [],
          headers: [],
          eventName: '',
          reconnectionEnabled: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        } as ProtobufFormData);
        break;
    }

    setTestResult(null); // Reset test result when connection type changes
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Reset test result when connection details change
    if (['url', 'method', 'authType', 'pollingInterval'].includes(field)) {
      setTestResult(null);
    }
  };

  const {
    metadataSection,
    visibilitySection,
    extendPayload,
    previewExtras,
  } = useRegisterFeedExtensions({
    formData,
    handleChange,
  });

  const testConnection = async () => {
    if (!formData.url) {
      alert('Please enter the URL');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      let testPayload: any = {
        connectionType: formData.connectionType,
        url: formData.url,
      };

      // Add connection-specific test parameters
      if (formData.connectionType === 'websocket') {
        const wsData = formData as WebSocketFormData;
        testPayload = {
          ...testPayload,
          eventName: wsData.eventName || undefined,
          queryParams: wsData.queryParams.filter(p => p.enabled && p.key),
          headers: wsData.headers.filter(h => h.enabled && h.key),
          connectionMessage: wsData.connectionMessage || undefined,
          connectionMessageFormat: wsData.connectionMessageFormat,
        };
      } else if (formData.connectionType === 'http-polling') {
        const httpData = formData as HTTPFormData;
        testPayload = {
          ...testPayload,
          method: httpData.method,
          headers: httpData.headers,
          queryParams: httpData.queryParams,
          authType: httpData.authType,
          authToken: httpData.authToken,
          apiKeyName: httpData.apiKeyName,
          apiKeyValue: httpData.apiKeyValue,
          basicUsername: httpData.basicUsername,
          basicPassword: httpData.basicPassword,
        };
      } else if (formData.connectionType === 'protobuf') {
        const protobufData = formData as ProtobufFormData;
        testPayload = {
          ...testPayload,
          protobufType: protobufData.protobufType,
          queryParams: protobufData.queryParams.filter(p => p.enabled && p.key),
          headers: protobufData.headers.filter(h => h.enabled && h.key),
        };
      }

      const response = await fetch(`${BACKEND_URL}/api/marketplace/test-feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(testPayload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTestResult(result.data);
        alert('Connection test successful!');
      } else {
        setTestResult({ success: false, error: result.message || 'Connection test failed' });
        alert(result.message || 'Connection test failed');
      }
    } catch (error: any) {
      console.error('Test connection error:', error);
      setTestResult({ success: false, error: error.message });
      alert('Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !testResult?.success) {
      alert('Please test the connection successfully before proceeding');
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    // Skip connection test requirement in edit mode
    if (!isEditMode && !testResult?.success) {
      alert('Please test the connection successfully before registering');
      return;
    }

    setLoading(true);

    try {
      let payload: any = {
        name: formData.name,
        description: formData.description,
        systemPrompt: formData.systemPrompt || undefined, // Only include if provided
        category: formData.category,
        icon: formData.icon,
        connectionType: formData.connectionType,
        url: formData.url,
      };

      payload = extendPayload(payload);

      // Add connection-specific payload data
      if (formData.connectionType === 'websocket') {
        const wsData = formData as WebSocketFormData;
        payload = {
          ...payload,
          queryParams: wsData.queryParams.filter(p => p.enabled && p.key),
          headers: wsData.headers.filter(h => h.enabled && h.key),
          connectionMessage: wsData.connectionMessage,
          connectionMessages: wsData.connectionMessages.filter(msg => msg.trim().length > 0),
          connectionMessageFormat: wsData.connectionMessageFormat,
          eventName: wsData.eventName,
          dataFormat: wsData.dataFormat,
          reconnectionEnabled: wsData.reconnectionEnabled,
          reconnectionDelay: wsData.reconnectionDelay,
          reconnectionAttempts: wsData.reconnectionAttempts,
        };
      } else if (formData.connectionType === 'http-polling') {
        const httpData = formData as HTTPFormData;
        payload = {
          ...payload,
          httpConfig: {
            method: httpData.method,
            pollingInterval: httpData.pollingInterval,
            timeout: httpData.timeout,
            requestHeaders: Object.entries(httpData.headers).map(([key, value]) => ({ key, value, enabled: true })),
            requestBody: httpData.requestBody,
            responseFormat: httpData.responseFormat,
            dataPath: httpData.dataPath,
            authentication: httpData.authType === 'none' ? undefined : {
              type: httpData.authType,
              config: httpData.authType === 'bearer' ? { token: httpData.authToken } :
                      httpData.authType === 'api-key' ? { apiKey: httpData.apiKeyValue, keyName: httpData.apiKeyName, keyLocation: 'header' } :
                      httpData.authType === 'basic' ? { username: httpData.basicUsername, password: httpData.basicPassword } : {}
            },
            transform: httpData.transformationEnabled ? {
              enabled: true,
              script: httpData.transformationScript
            } : undefined,
          }
        };
      } else if (formData.connectionType === 'protobuf') {
        const protobufData = formData as ProtobufFormData;
        payload = {
          ...payload,
          protobufType: protobufData.protobufType,
          queryParams: protobufData.queryParams.filter(p => p.enabled && p.key),
          headers: protobufData.headers.filter(h => h.enabled && h.key),
          eventName: protobufData.eventName,
          reconnectionEnabled: protobufData.reconnectionEnabled,
          reconnectionDelay: protobufData.reconnectionDelay,
          reconnectionAttempts: protobufData.reconnectionAttempts,
        };
      }

      const url = isEditMode && initialData?._id 
        ? `${BACKEND_URL}/api/marketplace/feeds/${initialData._id}`
        : `${BACKEND_URL}/api/marketplace/feeds`;
      
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let result;
        try {
          result = await response.json();
        } catch (parseError) {
          // If JSON parsing fails, try to get text
          const text = await response.text();
          console.error('Feed registration failed (non-JSON response):', {
            status: response.status,
            statusText: response.statusText,
            responseText: text
          });
          throw new Error(`Failed to register feed (${response.status}): ${text || response.statusText}`);
        }
        
        console.error('Feed registration failed:', {
          status: response.status,
          statusText: response.statusText,
          error: result,
          payload: payload // Log what we sent
        });
        
        // Extract error message from various possible formats
        const errorMsg = result.message || result.error || 
                        (result.errors && JSON.stringify(result.errors)) ||
                        JSON.stringify(result);
        throw new Error(errorMsg || `Failed to register feed (${response.status})`);
      }

      const result = await response.json();
      console.log(isEditMode ? 'Feed updated successfully:' : 'Feed registered successfully:', result);
      
      alert(isEditMode ? 'Feed updated successfully!' : 'Feed registered successfully!');
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Route to the feed view page after successful deployment
        const feedId = result.feed?._id || result._id;
        if (feedId) {
          router.push(`/feeds/${feedId}`);
        } else {
          router.push('/marketplace');
        }
      }
    } catch (err: any) {
      console.error(isEditMode ? 'Update error:' : 'Registration error:', err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryLabel) {
      alert('Please enter a category label');
      return;
    }

    try {
      setCreatingCategory(true);
      
      // Create the category
      const newCategory = await createCategory({
        label: newCategoryLabel
      });

      alert('Category created successfully!');
      setNewCategoryLabel('');
      setShowCreateCategory(false);
      
      // Set the newly created category as selected
      handleChange('category', newCategory.key);
      
      // Refresh categories list
      refetchCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      alert(error instanceof Error ? error.message : 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const steps = [
    {
      title: 'Details',
      description: 'Basic information',
      icon: <Info className="w-4 h-4 text-white" />,
    },
    {
      title: 'Connection',
      description: 'Setup & test',
      icon: <Globe className="w-4 h-4 text-white" />,
    },
    {
      title: 'Configure',
      description: 'Advanced settings',
      icon: <Settings className="w-4 h-4 text-white" />,
    },
    {
      title: 'Deploy',
      description: 'Review & launch',
      icon: <Rocket className="w-4 h-4 text-white" />,
    },
  ];

  const renderConnectionTypeSelector = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h5 className="text-white mb-0 text-lg font-semibold">Choose Connection Type</h5>
        <span className="text-red-400">*</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {[
          {
            type: 'websocket',
            title: 'WebSocket',
            description: 'Real-time connection',
            badge: 'Real-time'
          },
          {
            type: 'http-polling',
            title: 'HTTP Polling',
            description: 'REST API polling',
            badge: 'Reliable'
          },
          {
            type: 'protobuf',
            title: 'Protobuf',
            description: 'High-performance streams',
            badge: 'Fast'
          }
        ].map((option) => (
          <Card 
            key={option.type}
            className={`cursor-pointer transition-all duration-300 hover:scale-105 p-4 ${
              formData.connectionType === option.type
                ? 'border-cyan-400 bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 shadow-lg shadow-cyan-500/20' 
                : 'border-gray-600 bg-gray-800/50 hover:border-cyan-500/50 hover:bg-gray-700/50'
            }`}
            onClick={() => handleConnectionTypeChange(option.type as ConnectionType)}
          >
            <div className="text-center space-y-3 relative">
              <div className={`absolute -top-2 left-1/2 transform -translate-x-1/2 px-3 py-1 text-xs font-medium rounded ${
                formData.connectionType === option.type
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}>
                {option.badge}
              </div>
              <div className="pt-4">
                <h5 className={`text-lg font-semibold ${
                  formData.connectionType === option.type ? '!text-white' : '!text-gray-300'
                }`}>
                  {option.title}
                </h5>
                <span className={`text-xs block mt-2 ${
                  formData.connectionType === option.type ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {option.description}
                </span>
                <input
                  type="radio"
                  checked={formData.connectionType === option.type}
                  readOnly
                  className="mt-3 w-4 h-4 text-blue-600"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderWebSocketFields = () => {
    const wsData = formData as WebSocketFormData;

    // Query Parameters Management
    const addQueryParam = () => {
      handleChange('queryParams', [...wsData.queryParams, { key: '', value: '', enabled: true }]);
    };

    const updateQueryParam = (index: number, field: keyof KeyValuePair, value: any) => {
      const newParams = [...wsData.queryParams];
      newParams[index] = { ...newParams[index], [field]: value };
      handleChange('queryParams', newParams);
    };

    const removeQueryParam = (index: number) => {
      const newParams = wsData.queryParams.filter((_, i) => i !== index);
      handleChange('queryParams', newParams);
    };

    // Headers Management
    const addHeader = () => {
      handleChange('headers', [...wsData.headers, { key: '', value: '', enabled: true }]);
    };

    const updateHeader = (index: number, field: keyof KeyValuePair, value: any) => {
      const newHeaders = [...wsData.headers];
      newHeaders[index] = { ...newHeaders[index], [field]: value };
      handleChange('headers', newHeaders);
    };

    const removeHeader = (index: number) => {
      const newHeaders = wsData.headers.filter((_, i) => i !== index);
      handleChange('headers', newHeaders);
    };

    const addConnectionMessage = () => {
      handleChange('connectionMessages', [...(wsData.connectionMessages || []), '']);
    };

    const updateConnectionMessage = (index: number, value: string) => {
      const messages = [...(wsData.connectionMessages || [])];
      messages[index] = value;
      handleChange('connectionMessages', messages);
    };

    const removeConnectionMessage = (index: number) => {
      const messages = (wsData.connectionMessages || []).filter((_, i) => i !== index);
      handleChange('connectionMessages', messages);
    };

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white font-medium">WebSocket URL</span>
              <span className="text-red-400">*</span>
            </div>
            <Input
              type="url"
              value={wsData.url}
              onChange={(e) => handleChange('url', e.target.value)}
              placeholder="ws://localhost:3001 or http://localhost:3001"
            />
            <span className="text-gray-400 text-xs mt-1">
              Full URL of your websocket server (including protocol and port)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-white font-medium mb-2 block">Event Name</span>
              <Input
                value={wsData.eventName}
                onChange={(e) => handleChange('eventName', e.target.value)}
                placeholder="crypto-update"
              />
            </div>
            <div>
              <span className="text-white font-medium mb-2 block">Data Format</span>
              <Select
                value={wsData.dataFormat}
                onChange={(e) => handleChange('dataFormat', e.target.value)}
                className="w-full"
                options={[
                  { label: 'JSON', value: 'json' },
                  { label: 'Text', value: 'text' },
                  { label: 'Protobuf', value: 'protobuf' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Query Parameters */}
        <div className="border-t border-gray-600 pt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-white font-medium">Query Parameters</label>
            <Button
              variant="ghost"
              size="small"
              onClick={addQueryParam}
            >
              ➕ Add Parameter
            </Button>
          </div>
          {wsData.queryParams.length > 0 && (
            <div className="bg-gray-800 rounded p-3">
              <Table
                dataSource={wsData.queryParams.map((param, index) => ({ ...param, index }))}
                pagination={false}
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
                        value={key}
                        onChange={(e) => updateQueryParam(record.index, 'key', e.target.value)}
                        placeholder="param_name"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                      />
                    ),
                  },
                  {
                    title: 'Value',
                    dataIndex: 'value',
                    render: (value: string, record: any) => (
                      <Input
                        value={value}
                        onChange={(e) => updateQueryParam(record.index, 'value', e.target.value)}
                        placeholder="param_value"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                      />
                    ),
                  },
                  {
                    title: '',
                    width: 50,
                    render: (_, record: any) => (
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => removeQueryParam(record.index)}
                      >
                        🗑️
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>

        {/* Headers */}
        <div className="border-t border-gray-600 pt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-white font-medium">Headers</label>
            <Button
              variant="ghost"
              size="small"
              onClick={addHeader}
            >
              ➕ Add Header
            </Button>
          </div>
          {wsData.headers.length > 0 && (
            <div className="bg-gray-800 rounded p-3">
              <Table
                dataSource={wsData.headers.map((header, index) => ({ ...header, index }))}
                pagination={false}
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
                        value={key}
                        onChange={(e) => updateHeader(record.index, 'key', e.target.value)}
                        placeholder="Authorization"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                      />
                    ),
                  },
                  {
                    title: 'Value',
                    dataIndex: 'value',
                    render: (value: string, record: any) => (
                      <Input
                        value={value}
                        onChange={(e) => updateHeader(record.index, 'value', e.target.value)}
                        placeholder="Bearer token..."
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                      />
                    ),
                  },
                  {
                    title: '',
                    width: 50,
                    render: (_, record: any) => (
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => removeHeader(record.index)}
                      >
                        🗑️
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>

        {/* Connection Message */}
        <div className="border-t border-gray-600 pt-6 space-y-4">
          <div>
            <label className="block text-white font-medium mb-2">Connection Message (Optional)</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
              <Select
                value={wsData.connectionMessageFormat}
                onChange={(e) => handleChange('connectionMessageFormat', e.target.value)}
                className="w-full"
                options={[
                  { label: 'JSON', value: 'json' },
                  { label: 'XML', value: 'xml' },
                  { label: 'Text', value: 'text' },
                ]}
              />
            </div>
            <textarea
              rows={3}
              value={wsData.connectionMessage}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('connectionMessage', e.target.value)}
              placeholder='{"type": "subscribe", "channels": ["ticker:BTC-USD"]}'
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200 font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-2">
              Sent immediately after connecting. Useful for authentication or initial subscribe frames.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-white font-medium">Additional Subscribe Messages</label>
                <p className="text-xs text-gray-400">
                  Optional messages sent sequentially after the primary connection message.
                </p>
              </div>
              <Button variant="nebula" size="sm" onClick={addConnectionMessage}>
                + Add Message
              </Button>
            </div>
            {(wsData.connectionMessages || []).length === 0 && (
              <p className="text-sm text-gray-500">No additional messages defined.</p>
            )}
            {(wsData.connectionMessages || []).map((message, index) => (
              <div key={index} className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Message #{index + 1}</span>
                  <Button variant="outline" size="xs" onClick={() => removeConnectionMessage(index)}>
                    Remove
                  </Button>
                </div>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    updateConnectionMessage(index, e.target.value)
                  }
                  placeholder='{"type":"subscribe","channels":["heartbeat"]}'
                  className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-600 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderHTTPFields = () => {
    const httpData = formData as HTTPFormData;

    const addHeader = () => {
      const newHeaders = { ...httpData.headers };
      const key = `header_${Date.now()}`;
      newHeaders[key] = '';
      handleChange('headers', newHeaders);
    };

    const updateHeader = (oldKey: string, newKey: string, value: string) => {
      const newHeaders = { ...httpData.headers };
      if (oldKey !== newKey) {
        delete newHeaders[oldKey];
      }
      newHeaders[newKey] = value;
      handleChange('headers', newHeaders);
    };

    const removeHeader = (key: string) => {
      const newHeaders = { ...httpData.headers };
      delete newHeaders[key];
      handleChange('headers', newHeaders);
    };

    const addQueryParam = () => {
      const newParams = { ...httpData.queryParams };
      const key = `param_${Date.now()}`;
      newParams[key] = '';
      handleChange('queryParams', newParams);
    };

    const updateQueryParam = (oldKey: string, newKey: string, value: string) => {
      const newParams = { ...httpData.queryParams };
      if (oldKey !== newKey) {
        delete newParams[oldKey];
      }
      newParams[newKey] = value;
      handleChange('queryParams', newParams);
    };

    const removeQueryParam = (key: string) => {
      const newParams = { ...httpData.queryParams };
      delete newParams[key];
      handleChange('queryParams', newParams);
    };

    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white font-medium">API URL</span>
            <span className="text-red-400">*</span>
          </div>
          <Input
            type="url"
            value={httpData.url}
            onChange={(e) => handleChange('url', e.target.value)}
            placeholder="https://api.example.com/data"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-white font-medium mb-2 block">HTTP Method</span>
            <Select
              value={httpData.method}
              onChange={(e) => handleChange('method', e.target.value)}
              className="w-full"
              options={[
                { label: 'GET', value: 'GET' },
                { label: 'POST', value: 'POST' },
                { label: 'PUT', value: 'PUT' },
                { label: 'PATCH', value: 'PATCH' },
              ]}
            />
          </div>
          <div>
            <span className="text-white font-medium mb-2 block">Polling Interval</span>
            <InputNumber
              value={httpData.pollingInterval}
              onChange={(value) => handleChange('pollingInterval', value || 30000)}
              min={5000}
              max={300000}
              className="w-full"
              placeholder="30000"
              formatter={(value) => `${value}ms`}
            />
          </div>
          <div>
            <span className="text-white font-medium mb-2 block">Timeout</span>
            <InputNumber
              value={httpData.timeout}
              onChange={(value) => handleChange('timeout', value || 10000)}
              min={1000}
              max={60000}
              className="w-full"
              placeholder="10000"
              formatter={(value) => `${value}ms`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-white font-medium mb-2 block">Response Format</span>
            <Select
              value={httpData.responseFormat}
              onChange={(e) => handleChange('responseFormat', e.target.value)}
              className="w-full"
              options={[
                { label: 'JSON', value: 'json' },
                { label: 'XML', value: 'xml' },
                { label: 'CSV', value: 'csv' },
                { label: 'Text', value: 'text' },
              ]}
            />
          </div>
          <div>
            <span className="text-white font-medium mb-2 block">Data Path (Optional)</span>
            <Input
              value={httpData.dataPath}
              onChange={(e) => handleChange('dataPath', e.target.value)}
              placeholder="data.results"
            />
            <span className="text-gray-400 text-xs mt-1 block">
              JSON path to extract specific data (e.g., "data.results")
            </span>
          </div>
        </div>

        {/* Authentication Section */}
        <Card 
          className="bg-gray-700/20 border-gray-600 mt-6 p-5" 
          title="Authentication"
        >
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="none"
                checked={httpData.authType === 'none'}
                onChange={(e) => handleChange('authType', e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-white">None</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="bearer"
                checked={httpData.authType === 'bearer'}
                onChange={(e) => handleChange('authType', e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-white">Bearer Token</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="api-key"
                checked={httpData.authType === 'api-key'}
                onChange={(e) => handleChange('authType', e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-white">API Key</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="basic"
                checked={httpData.authType === 'basic'}
                onChange={(e) => handleChange('authType', e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-white">Basic Auth</span>
            </label>
          </div>

          {httpData.authType === 'bearer' && (
            <div>
              <label className="block text-white font-medium mb-2">Bearer Token</label>
              <Input
                type="password"
                value={httpData.authToken}
                onChange={(e) => handleChange('authToken', e.target.value)}
                placeholder="your-bearer-token"
                className="w-full"
              />
            </div>
          )}

          {httpData.authType === 'api-key' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-medium mb-2">API Key Header Name</label>
                <Input
                  value={httpData.apiKeyName}
                  onChange={(e) => handleChange('apiKeyName', e.target.value)}
                  placeholder="X-API-Key"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">API Key Value</label>
              <Input
                type="password"
                value={httpData.apiKeyValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('apiKeyValue', e.target.value)}
                placeholder="your-api-key"
                className="w-full"
              />
              </div>
            </div>
          )}

          {httpData.authType === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-medium mb-2">Username</label>
                <Input
                  value={httpData.basicUsername}
                  onChange={(e) => handleChange('basicUsername', e.target.value)}
                  placeholder="username"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Password</label>
                <Input
                  type="password"
                  value={httpData.basicPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('basicPassword', e.target.value)}
                  placeholder="password"
                  className="w-full"
                />
              </div>
            </div>
          )}
        </Card>

        {/* Headers Section */}
        <Card 
          className="bg-gray-700/20 border-gray-600 p-5" 
          title="Custom Headers"
        >
          <div className="flex items-center justify-between mb-3">
            <label className="block text-white font-medium">Custom Headers</label>
            <Button
              variant="ghost"
              size="small"
              onClick={addHeader}
            >
              ➕ Add Header
            </Button>
          </div>
          {Object.keys(httpData.headers).length > 0 && (
            <div className="space-y-2">
              {Object.entries(httpData.headers).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <Input
                    value={key}
                    onChange={(e) => updateHeader(key, e.target.value, value)}
                    placeholder="Header-Name"
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                  />
                  <Input
                    value={value}
                    onChange={(e) => updateHeader(key, key, e.target.value)}
                    placeholder="header-value"
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                  />
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => removeHeader(key)}
                  >
                    🗑️
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Query Parameters & Additional Settings */}
        <div className="space-y-4">
          {/* Query Parameters */}
          <Card 
            className="bg-gray-700/20 border-gray-600 p-5" 
            title="Query Parameters"
          >
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="small"
                onClick={addQueryParam}
              >
                ➕ Add Parameter
              </Button>
            </div>
            {Object.keys(httpData.queryParams).length > 0 && (
              <div className="space-y-2">
                {Object.entries(httpData.queryParams).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <Input
                      value={key}
                      onChange={(e) => updateQueryParam(key, e.target.value, value)}
                      placeholder="param-name"
                      className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                    />
                    <Input
                      value={value}
                      onChange={(e) => updateQueryParam(key, key, e.target.value)}
                      placeholder="param-value"
                      className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                    />
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => removeQueryParam(key)}
                    >
                      🗑️
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Request Body (for POST/PUT/PATCH) */}
          {['POST', 'PUT', 'PATCH'].includes(httpData.method) && (
            <Card 
              className="bg-gray-700/20 border-gray-600 p-5" 
              title="Request Body"
            >
              <textarea
                rows={4}
                value={httpData.requestBody}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('requestBody', e.target.value)}
                placeholder='{"key": "value"}'
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
              />
            </Card>
          )}

          {/* Data Transformation */}
          <Card 
            className="bg-gray-700/20 border-gray-600 p-5" 
            title="Data Transformation"
          >
            <div className="mb-4">
              <Checkbox
                checked={httpData.transformationEnabled}
                onChange={(e) => handleChange('transformationEnabled', e.target.checked)}
              />
              <span className="text-white ml-2">Enable Data Transformation</span>
            </div>
            {httpData.transformationEnabled && (
              <div>
                <label className="block text-white font-medium mb-2">Transformation Script (JavaScript)</label>
                <textarea
                  rows={4}
                  value={httpData.transformationScript}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('transformationScript', e.target.value)}
                  placeholder="return data.map(item => ({ id: item.id, value: item.price * 1.1 }));"
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                />
                <p className="text-gray-400 text-xs mt-2">
                  JavaScript code to transform the API response. Input is 'data', return the transformed result.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  };

  const renderProtobufFields = () => {
    const protobufData = formData as ProtobufFormData;

    // Query Parameters Management  
    const addQueryParam = () => {
      handleChange('queryParams', [...protobufData.queryParams, { key: '', value: '', enabled: true }]);
    };

    const updateQueryParam = (index: number, field: keyof KeyValuePair, value: any) => {
      const newParams = [...protobufData.queryParams];
      newParams[index] = { ...newParams[index], [field]: value };
      handleChange('queryParams', newParams);
    };

    const removeQueryParam = (index: number) => {
      const newParams = protobufData.queryParams.filter((_, i) => i !== index);
      handleChange('queryParams', newParams);
    };

    // Headers Management
    const addHeader = () => {
      handleChange('headers', [...protobufData.headers, { key: '', value: '', enabled: true }]);
    };

    const updateHeader = (index: number, field: keyof KeyValuePair, value: any) => {
      const newHeaders = [...protobufData.headers];
      newHeaders[index] = { ...newHeaders[index], [field]: value };
      handleChange('headers', newHeaders);
    };

    const removeHeader = (index: number) => {
      const newHeaders = protobufData.headers.filter((_, i) => i !== index);
      handleChange('headers', newHeaders);
    };

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-white font-medium mb-2">Protobuf Stream URL *</label>
          <Input
            type="url"
            value={protobufData.url}
            onChange={(e) => handleChange('url', e.target.value)}
            placeholder="ws://localhost:3001/protobuf-stream"
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-white font-medium mb-2">Protobuf Type</label>
            <Select
              value={protobufData.protobufType}
              onChange={(e) => handleChange('protobufType', e.target.value)}
              className="w-full"
              options={[
                { label: 'Yahoo Finance', value: 'yfinance' },
                { label: 'Custom', value: 'custom' },
              ]}
            />
          </div>
          <div>
            <label className="block text-white font-medium mb-2">Event Name</label>
            <Input
              value={protobufData.eventName}
              onChange={(e) => handleChange('eventName', e.target.value)}
              placeholder="data-stream"
              className="w-full"
            />
          </div>
        </div>

        {/* Query Parameters */}
        <div className="border-t border-gray-600 pt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-white font-medium">Query Parameters</label>
            <Button
              variant="ghost"
              size="small"
              onClick={addQueryParam}
            >
              ➕ Add Parameter
            </Button>
          </div>
          {protobufData.queryParams.length > 0 && (
            <div className="bg-gray-800 rounded p-3">
              <Table
                dataSource={protobufData.queryParams.map((param, index) => ({ ...param, index }))}
                pagination={false}
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
                        value={key}
                        onChange={(e) => updateQueryParam(record.index, 'key', e.target.value)}
                        placeholder="param_name"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                      />
                    ),
                  },
                  {
                    title: 'Value',
                    dataIndex: 'value',
                    render: (value: string, record: any) => (
                      <Input
                        value={value}
                        onChange={(e) => updateQueryParam(record.index, 'value', e.target.value)}
                        placeholder="param_value"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                      />
                    ),
                  },
                  {
                    title: '',
                    width: 50,
                    render: (_, record: any) => (
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => removeQueryParam(record.index)}
                      >
                        🗑️
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>

        {/* Headers */}
        <div className="border-t border-gray-600 pt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-white font-medium">Headers</label>
            <Button
              variant="ghost"
              size="small"
              onClick={addHeader}
            >
              ➕ Add Header
            </Button>
          </div>
          {protobufData.headers.length > 0 && (
            <div className="bg-gray-800 rounded p-3">
              <Table
                dataSource={protobufData.headers.map((header, index) => ({ ...header, index }))}
                pagination={false}
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
                        value={key}
                        onChange={(e) => updateHeader(record.index, 'key', e.target.value)}
                        placeholder="Authorization"
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                      />
                    ),
                  },
                  {
                    title: 'Value',
                    dataIndex: 'value',
                    render: (value: string, record: any) => (
                      <Input
                        value={value}
                        onChange={(e) => updateHeader(record.index, 'value', e.target.value)}
                        placeholder="Bearer token..."
                        className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                      />
                    ),
                  },
                  {
                    title: '',
                    width: 50,
                    render: (_, record: any) => (
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => removeHeader(record.index)}
                      >
                        🗑️
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-3">
             
            </div>
            
            {/* Connection Type Selector */}
            {renderConnectionTypeSelector()}

            {/* Form Fields */}
            <Card className="bg-gray-700/30 border-gray-600 p-5">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-medium">Feed Name</span>
                    <span className="text-red-400">*</span>
                  </div>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter a descriptive name for your feed"
                    className="w-full h-10"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-medium">Description</span>
                    <span className="text-red-400">*</span>
                  </div>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
                    placeholder="Describe what data this feed provides and its purpose..."
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-medium">AI System Prompt</span>
                    <span className="text-gray-400 text-xs">(Optional - custom AI analysis instructions)</span>
                  </div>
                  <textarea
                    rows={4}
                    value={formData.systemPrompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('systemPrompt', e.target.value)}
                    placeholder="You are an expert analyst for this data feed. Analyze the provided data and provide actionable insights about trends, patterns, and key metrics. Focus on highlighting important changes and potential opportunities..."
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                  />
                  <span className="text-gray-400 text-xs mt-1 block">
                    Define how AI should analyze this feed's data. Leave empty to use default analysis based on category.
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-medium">Category</span>
                      <span className="text-red-400">*</span>
                    </div>
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__create_new__') {
                          setShowCreateCategory(true);
                        } else {
                          handleChange('category', e.target.value);
                        }
                      }}
                      className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                      disabled={categoriesLoading}
                    >
                      {categoriesLoading ? (
                        <option>Loading categories...</option>
                      ) : (
                        <>
                          {getAllOptions().map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                          {user && (
                            <option value="__create_new__">Create New Category</option>
                          )}
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-medium">Icon</span>
                    </div>
                    
                    <div className="space-y-2">
                      {!customIcon ? (
                        <select
                          value={formData.icon}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setCustomIcon(true);
                              setIconInputValue(formData.icon);
                            } else {
                              handleChange('icon', e.target.value);
                            }
                          }}
                          className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                        >
                          <option value="">Select an icon</option>
                          <option value="📊">📊 Chart</option>
                          <option value="📈">📈 Trending Up</option>
                          <option value="📉">📉 Trending Down</option>
                          <option value="💰">💰 Money Bag</option>
                          <option value="💎">💎 Diamond</option>
                          <option value="🪙">🪙 Coin</option>
                          <option value="💱">💱 Currency Exchange</option>
                          <option value="🏦">🏦 Bank</option>
                          <option value="💳">💳 Credit Card</option>
                          <option value="🔥">🔥 Fire</option>
                          <option value="⚡">⚡ Lightning</option>
                          <option value="🚀">🚀 Rocket</option>
                          <option value="🌟">🌟 Star</option>
                          <option value="💫">💫 Dizzy</option>
                          <option value="🎯">🎯 Target</option>
                          <option value="📡">📡 Satellite</option>
                          <option value="🌐">🌐 Globe</option>
                          <option value="📺">📺 Television</option>
                          <option value="💻">💻 Laptop</option>
                          <option value="📱">📱 Mobile</option>
                          <option value="⚙️">⚙️ Gear</option>
                          <option value="🔧">🔧 Wrench</option>
                          <option value="🔌">🔌 Plug</option>
                          <option value="📋">📋 Clipboard</option>
                          <option value="🗂️">🗂️ File Folder</option>
                          <option value="🌊">🌊 Wave</option>
                          <option value="⭐">⭐ White Star</option>
                          <option value="🔮">🔮 Crystal Ball</option>
                          <option value="🎲">🎲 Dice</option>
                          <option value="custom">✏️ Use Custom Icon</option>
                        </select>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            value={iconInputValue}
                            onChange={(e) => setIconInputValue(e.target.value)}
                            placeholder="Enter emoji or text (e.g., 🚀 or API)"
                            className="flex-1 h-10"
                            maxLength={10}
                          />
                          <Button
                            variant="nebula"
                            onClick={() => {
                              if (iconInputValue.trim()) {
                                handleChange('icon', iconInputValue.trim());
                                setCustomIcon(false);
                              }
                            }}
                            disabled={!iconInputValue.trim()}
                            className="px-4"
                          >
                            ✅ Apply
                          </Button>
                          <Button
                            onClick={() => {
                              setCustomIcon(false);
                              setIconInputValue('');
                            }}
                            className="px-4"
                          >
                            ✕ Cancel
                          </Button>
                        </div>
                      )}
                      
                      {!customIcon && (
                        <div className="flex items-center justify-end">
                        </div>
                      )}
                      
                      {customIcon && (
                        <span className="text-gray-400 text-xs">
                          Enter any emoji, symbol, or short text (up to 10 characters)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-6">
              <h3 className="text-white mb-2 text-xl font-semibold">Connection Setup</h3>
              <span className="text-gray-400">Configure your {formData.connectionType} connection and test it</span>
            </div>

            {/* Connection Configuration */}
            <Card className="bg-gray-700/30 border-gray-600 p-6">
              {formData.connectionType === 'websocket' && renderWebSocketFields()}
              {formData.connectionType === 'http-polling' && renderHTTPFields()}
              {formData.connectionType === 'protobuf' && renderProtobufFields()}
            </Card>

            {/* Test Connection Section */}
            <Card className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-500/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-white mb-1 text-lg font-semibold">Connection Test</h4>
                  <span className="text-gray-400">Verify your connection is working properly</span>
                </div>
                <Button
                  variant="milkyway"
                  onClick={testConnection}
                  loading={testing}
                  disabled={!formData.url}
                  className="px-8 h-10"
                >
                  {testing ? 'Testing Connection...' : 'Test Connection'}
                </Button>
              </div>

              {testResult && (
                <Alert
                  type={testResult.success ? 'success' : 'error'}
                  message={testResult.success ? '✅ Connection Successful' : '❌ Connection Failed'}
                  description={
                    testResult.success 
                      ? `Connected successfully${testResult.connectionTime ? ` in ${testResult.connectionTime}ms` : ''}. Your feed is ready to proceed.`
                      : testResult.error || 'Unable to establish connection. Please check your configuration.'
                  }
                  showIcon
                  className="mt-4"
                />
              )}

              {!testResult && (
                <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">⚠️</span>
                    <span className="text-yellow-200">Please test your connection before proceeding to the next step</span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-6">
              <h3 className="text-white mb-2 text-xl font-semibold">Advanced Configuration</h3>
              <span className="text-gray-400">Configure additional settings and metadata</span>
            </div>

            {/* Reconnection Settings (for WebSocket and Protobuf) */}
            {(formData.connectionType === 'websocket' || formData.connectionType === 'protobuf') && (
              <Card 
                title={<div className="flex items-center gap-2"><Link className="w-4 h-4 text-white" /> Connection Settings</div>}
                className="bg-gray-700/30 border-gray-600 p-5"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={(formData as WebSocketFormData | ProtobufFormData).reconnectionEnabled}
                      onChange={(e) => handleChange('reconnectionEnabled', e.target.checked)}
                    />
                    <span className="text-white">Enable automatic reconnection</span>
                  </div>

                  {(formData as WebSocketFormData | ProtobufFormData).reconnectionEnabled && (
                    <div className="grid grid-cols-2 gap-4 ml-6 mt-4">
                      <div>
                        <span className="text-white font-medium mb-2 block">Reconnection Delay (ms)</span>
                        <InputNumber
                          value={(formData as WebSocketFormData | ProtobufFormData).reconnectionDelay}
                          onChange={(value) => handleChange('reconnectionDelay', value || 1000)}
                          min={500}
                          max={30000}
                          className="w-full h-10"
                          formatter={(value) => `${value}ms`}
                        />
                      </div>
                      <div>
                        <span className="text-white font-medium mb-2 block">Max Attempts</span>
                        <InputNumber
                          value={(formData as WebSocketFormData | ProtobufFormData).reconnectionAttempts}
                          onChange={(value) => handleChange('reconnectionAttempts', value || 5)}
                          min={1}
                          max={10}
                          className="w-full h-10"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {metadataSection}

            {visibilitySection}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-6">
              <h3 className="text-white mb-2 text-xl font-semibold">Ready to Deploy</h3>
              <span className="text-gray-400">Review your configuration and deploy your feed</span>
            </div>
            
            {/* Feed Preview */}
            <Card 
              title={`${formData.icon} ${formData.name || 'Untitled Feed'}`}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600 p-6"
            >
              <div className="space-y-4">
                <div className="text-gray-400 text-sm mb-2">{formData.category} • {formData.connectionType}</div>
                <p className="text-gray-300 mb-4">
                  {formData.description || 'No description provided'}
                </p>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Connection</span>
                      <div className="flex items-center gap-2 mt-1">
                        {formData.connectionType === 'websocket' && <Globe className="w-4 h-4 text-white" />}
                        {formData.connectionType === 'http-polling' && <Link className="w-4 h-4 text-white" />}
                        {formData.connectionType === 'protobuf' && <Zap className="w-4 h-4 text-white" />}
                        <span className="text-white capitalize">{formData.connectionType.replace('-', ' ')}</span>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-400 text-sm">Endpoint</span>
                      <div className="text-white text-sm font-mono bg-gray-700 px-2 py-1 rounded mt-1">
                        {formData.url || 'No URL configured'}
                      </div>
                    </div>
                  </div>

                  {previewExtras}
                </div>
              </div>
            </Card>

            {/* Connection Status */}
            <Card className="bg-gray-700/30 border-gray-600 p-5">
              {testResult?.success ? (
                <Alert
                  type="success"
                  message={
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✅</span>
                      <span>Connection Verified & Ready</span>
                    </div>
                  }
                  description="Your feed connection has been successfully tested and is ready for deployment."
                  showIcon={false}
                  className="border-0"
                />
              ) : (
                <Alert
                  type="warning"
                  message={
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">⚠️</span>
                      <span>Connection Test Required</span>
                    </div>
                  }
                  description="Please go back to step 2 and successfully test your connection before deployment."
                  showIcon={false}
                  className="border-0"
                />
              )}
            </Card>

            {/* Deployment Notice */}
            {(testResult?.success || isEditMode) && (
              <div className="text-center p-6 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-lg">
                <span className="text-3xl text-green-400 mb-3">🚀</span>
                <h4 className="text-white mb-2 text-lg font-semibold">{isEditMode ? 'Ready to Update' : 'Ready for Launch'}</h4>
                <span className="text-gray-300">
                  {isEditMode 
                    ? 'Your changes are ready. Click "Update Feed" to save them.'
                    : 'Your feed is configured and tested. Click "Deploy Feed" to make it live.'
                  }
                </span>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w mx-auto p-1">
   
      {/* Progress Steps */}
      <Card className="bg-gray-800/50 border-gray-600 mb-3 p-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index <= currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-400'
              }`}>
                {index < currentStep ? '✓' : index === currentStep ? step.icon : step.icon}
              </div>
              <div className="ml-3">
                <div className={`text-sm font-medium ${
                  index <= currentStep ? 'text-white' : 'text-gray-400'
                }`}>
                  {step.title}
                </div>
                <div className={`text-xs ${
                  index <= currentStep ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {step.description}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${
                  index < currentStep ? 'bg-blue-600' : 'bg-gray-600'
                }`} />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Main Content */}
      <Card 
        className="bg-gray-800/80 border-gray-600 backdrop-blur-sm p-4"
      >
        <div className="min-h-[500px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-600">
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-8 h-10"
          >
            Previous
          </Button>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/marketplace')}
              className="px-8 h-10"
            >
              Cancel
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                variant="nebula"
                onClick={nextStep}
                className="px-8 h-10"
              >
                Next Step
              </Button>
            ) : (
              <Button
                variant="nebula"
                onClick={handleSubmit}
                loading={loading}
                disabled={!isEditMode && !testResult?.success}
                className="px-8 h-10"
              >
                {loading ? (isEditMode ? 'Updating...' : 'Deploying...') : (isEditMode ? 'Update Feed' : 'Deploy Feed')}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Create Category Modal */}
      {showCreateCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card 
            className="w-96 bg-gray-800 border-gray-600 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-medium flex items-center gap-2">
                ➕ Create New Category
              </h3>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateCategory(false);
                  setNewCategoryLabel('');
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Category Name *</label>
                <p className="text-gray-400 text-sm mb-2">
                  Enter a descriptive name for your category (can include emojis and spaces)
                </p>
                <Input
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  placeholder="e.g., 🎯 My Custom Category"
                  className="w-full"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  onClick={() => {
                    setShowCreateCategory(false);
                    setNewCategoryLabel('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="nebula"
                  loading={creatingCategory}
                  disabled={!newCategoryLabel?.trim()}
                  onClick={handleCreateCategory}
                >
                  Create Category
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DynamicRegisterFeedForm;
