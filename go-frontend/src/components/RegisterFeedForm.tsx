'use client';

import React, { useState } from 'react';
import { Card, Form, Input, Select, Button, Checkbox, InputNumber, App } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

const RegisterFeedForm: React.FC = () => {
  const { user, token } = useAuth();
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    if (!user) {
      message.error('You must be logged in to register a feed');
      return;
    }

    setLoading(true);

    try {
      // Parse tags
      const tagsArray = values.tags
        ? values.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
        : [];

      const payload = {
        ...values,
        tags: tagsArray,
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
      router.push('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <p className="text-gray-300 mb-4">You must be logged in to register a feed</p>
        <Button
          type="primary"
          onClick={() => router.push('/')}
        >
          Go to Home
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <h2 className="text-3xl font-bold text-white mb-2">Register WebSocket Feed</h2>
        <p className="text-gray-400 mb-6">Add your own real-time feed.</p>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            category: 'crypto',
            dataFormat: 'json',
            isPublic: true,
            reconnectionEnabled: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
          }}
        >
          {/* Basic Information */}
          <Form.Item
            label={<span className="text-white font-medium">Feed Name</span>}
            name="name"
            rules={[{ required: true, message: 'Please enter a feed name' }]}
          >
            <Input placeholder="My Awesome Data Feed" />
          </Form.Item>

          <Form.Item
            label={<span className="text-white font-medium">Description</span>}
            name="description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input.TextArea rows={3} placeholder="Describe what your feed provides..." />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label={<span className="text-white font-medium">Category</span>}
              name="category"
              rules={[{ required: true, message: 'Please select a category' }]}
            >
              <Select
                options={[
                  { label: 'Crypto', value: 'crypto' },
                  { label: 'Stocks', value: 'stocks' },
                  { label: 'Forex', value: 'forex' },
                  { label: 'Commodities', value: 'commodities' },
                  { label: 'Custom', value: 'custom' },
                ]}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-white font-medium">Icon (Emoji)</span>}
              name="icon"
            >
              <Input maxLength={2} placeholder="📊" />
            </Form.Item>
          </div>

          {/* Connection Details */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-xl font-bold text-white mb-4">Connection Details</h3>

            <Form.Item
              label={<span className="text-white font-medium">WebSocket URL</span>}
              name="url"
              rules={[
                { required: true, message: 'Please enter WebSocket URL' },
                { type: 'url', message: 'Please enter a valid URL' }
              ]}
            >
              <Input placeholder="http://localhost:3001" />
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Form.Item
                label={<span className="text-white font-medium">Event Name</span>}
                name="eventName"
                rules={[{ required: true, message: 'Please enter event name' }]}
                help="Socket.IO event name to listen for"
              >
                <Input placeholder="data-update" />
              </Form.Item>

              <Form.Item
                label={<span className="text-white font-medium">Data Format</span>}
                name="dataFormat"
                rules={[{ required: true, message: 'Please select data format' }]}
              >
                <Select
                  options={[
                    { label: 'JSON', value: 'json' },
                    { label: 'Text', value: 'text' },
                  ]}
                />
              </Form.Item>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-xl font-bold text-white mb-4">Advanced Settings</h3>

            <div className="space-y-4">
              <Form.Item
                name="isPublic"
                valuePropName="checked"
              >
                <Checkbox className="text-white">
                  Make this feed public in the marketplace
                </Checkbox>
              </Form.Item>

              <Form.Item
                name="reconnectionEnabled"
                valuePropName="checked"
              >
                <Checkbox className="text-white">
                  Enable automatic reconnection
                </Checkbox>
              </Form.Item>

              <Form.Item shouldUpdate={(prevValues, currentValues) => 
                prevValues.reconnectionEnabled !== currentValues.reconnectionEnabled
              }>
                {({ getFieldValue }) =>
                  getFieldValue('reconnectionEnabled') ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                      <Form.Item
                        label={<span className="text-white font-medium">Reconnection Delay (ms)</span>}
                        name="reconnectionDelay"
                      >
                        <InputNumber min={100} className="w-full" />
                      </Form.Item>

                      <Form.Item
                        label={<span className="text-white font-medium">Max Reconnection Attempts</span>}
                        name="reconnectionAttempts"
                      >
                        <InputNumber min={1} max={20} className="w-full" />
                      </Form.Item>
                    </div>
                  ) : null
                }
              </Form.Item>
            </div>
          </div>

          {/* AI Analysis Settings */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-xl font-bold text-white mb-4">AI Analysis Settings</h3>

            <div className="space-y-4">
              <Form.Item
                name="aiAnalysisEnabled"
                valuePropName="checked"
                initialValue={true}
              >
                <Checkbox className="text-white">
                  Enable AI analysis for this feed
                </Checkbox>
              </Form.Item>

              <Form.Item shouldUpdate={(prevValues, currentValues) => 
                prevValues.aiAnalysisEnabled !== currentValues.aiAnalysisEnabled
              }>
                {({ getFieldValue }) =>
                  getFieldValue('aiAnalysisEnabled') ? (
                    <Form.Item
                      label={<span className="text-white font-medium">Default AI Analysis Prompt</span>}
                      name="defaultAIPrompt"
                      help="This prompt will be used for AI analysis when users don't provide their own custom prompt"
                    >
                      <Input.TextArea 
                        rows={4} 
                        placeholder="You are an expert analyst for this data feed. Analyze the provided data and provide actionable insights about trends, patterns, and key metrics. Focus on highlighting important changes and potential opportunities."
                      />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </div>
          </div>

          {/* Metadata */}
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-xl font-bold text-white mb-4">Additional Information</h3>

            <div className="space-y-4">
              <Form.Item
                label={<span className="text-white font-medium">Tags (comma-separated)</span>}
                name="tags"
              >
                <Input placeholder="realtime, prices, market" />
              </Form.Item>

              <Form.Item
                label={<span className="text-white font-medium">Website URL</span>}
                name="website"
                rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
              >
                <Input placeholder="https://example.com" />
              </Form.Item>

              <Form.Item
                label={<span className="text-white font-medium">Documentation URL</span>}
                name="documentation"
                rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
              >
                <Input placeholder="https://docs.example.com" />
              </Form.Item>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-6">
            <Form.Item className="flex-1 mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
              >
                Register Feed
              </Button>
            </Form.Item>
            <Button
              type="default"
              size="large"
              onClick={() => router.push('/')}
            >
              Cancel
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterFeedForm;
