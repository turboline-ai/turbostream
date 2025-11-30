'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ApiKey {
  _id: string;
  keyId: string;
  name: string;
  prefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsed?: string;
  usageCount: number;
  rateLimit: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
  createdAt: string;
  description?: string;
  fullKey?: string; // Only available when creating
}

interface ApiKeyUsageStats {
  totalRequests: number;
  requestsInTimeframe: number;
  avgResponseTime: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}

const ApiKeysSection: React.FC = () => {
  const { token } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['feeds:read']);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedKeyStats, setSelectedKeyStats] = useState<{ keyId: string; stats: ApiKeyUsageStats } | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null); // Store the full key when created

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

  // Fetch API keys from backend
  const fetchApiKeys = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/api-keys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setApiKeys(result.data);
      } else {
        console.error('Failed to fetch API keys:', response.statusText);
        setMessage({ type: 'error', text: 'Failed to load API keys' });
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setMessage({ type: 'error', text: 'Failed to load API keys' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchApiKeys();
    }
  }, [token]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a name for the API key' });
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/user/api-keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newKeyName,
          description: newKeyDescription,
          permissions: newKeyPermissions,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCreatedKey(result.data.fullKey); // Store the full key to show user
        await fetchApiKeys(); // Refresh the list
        setMessage({ type: 'success', text: 'API key created successfully!' });
        setNewKeyName('');
        setNewKeyDescription('');
        setNewKeyPermissions(['feeds:read']);
        setIsCreating(false);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to create API key' });
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      setMessage({ type: 'error', text: 'Failed to create API key. Please try again.' });
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/user/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await fetchApiKeys(); // Refresh the list
        setMessage({ type: 'success', text: 'API key deleted successfully' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to delete API key' });
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      setMessage({ type: 'error', text: 'Failed to delete API key. Please try again.' });
    }
  };

  const fetchKeyUsage = async (keyId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/api-keys/${keyId}/usage?timeframe=day`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedKeyStats({ keyId, stats: result.data.stats });
      }
    } catch (error) {
      console.error('Error fetching key usage:', error);
    }
  };

  const maskKey = (prefix: string) => {
    return prefix + '•'.repeat(20);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">API Keys</h1>
          <p className="text-gray-400 mt-2">Loading your API keys...</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">API Keys</h1>
            <p className="text-gray-400 mt-2">Manage your API keys for programmatic access</p>
          </div>
          <a
            href="/api-docs"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View API Documentation
          </a>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-900/30 border border-green-500'
              : 'bg-red-900/30 border border-red-500'
          }`}
        >
          <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>{message.text}</p>
        </div>
      )}

      {/* API Keys List */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Your API Keys ({apiKeys.length})</h2>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create API Key
          </button>
        </div>

        {/* Create New Key Form */}
        {isCreating && (
          <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-600">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Key Name *</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production App, Development"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#C6C8AE] focus:outline-none text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCreateKey}
                  className="px-4 py-2 btn-milkyway rounded shadow-sm transition hover:opacity-90 text-sm font-medium"
                >
                  Generate Key
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewKeyName('');
                    setNewKeyDescription('');
                    setMessage(null);
                  }}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            <p className="text-gray-400 text-lg">No API keys yet</p>
            <p className="text-gray-500 text-sm mt-2">Create your first API key to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div key={key.keyId} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-white font-medium">{key.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${key.isActive ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-gray-300 bg-gray-800 px-3 py-1 rounded font-mono text-sm">
                        {maskKey(key.prefix)}
                      </code>
                      <button
                        onClick={() => handleCopyKey(createdKey || key.prefix)}
                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-sm"
                      >
                        {copiedKey === (createdKey || key.prefix) ? 'Copied!' : 'Copy'}
                      </button>
                      <span className="text-xs text-gray-500">
                        Created {new Date(key.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(key.keyId)}
                    className="text-red-400 hover:text-red-300 transition-colors p-2"
                    title="Delete API key"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Created Key Success Modal */}
      {createdKey && (
        <div className="bg-green-900/20 border border-green-500 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-400 mb-2">API Key Created Successfully!</h3>
              <p className="text-green-300 mb-4">Please copy and securely store your API key. It will not be shown again.</p>
              
              <div className="bg-gray-800 p-4 rounded-lg border border-green-500/30">
                <div className="flex items-center justify-between">
                  <code className="text-green-400 font-mono text-sm flex-1 mr-4 break-all">{createdKey}</code>
                  <button
                    onClick={() => handleCopyKey(createdKey)}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm flex items-center gap-1 flex-shrink-0"
                  >
                    {copiedKey === createdKey ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setCreatedKey(null)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-sm"
                >
                  I've saved it securely
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Key Usage Stats */}
      {selectedKeyStats && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Usage Statistics</h3>
            <button
              onClick={() => setSelectedKeyStats(null)}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-2xl font-bold text-white">{selectedKeyStats.stats.totalRequests.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Total Requests</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-2xl font-bold text-white">{selectedKeyStats.stats.requestsInTimeframe.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Requests Today</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-2xl font-bold text-white">{Math.round(selectedKeyStats.stats.avgResponseTime)}ms</div>
              <div className="text-sm text-gray-400">Avg Response Time</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-2xl font-bold text-white">{selectedKeyStats.stats.errorRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Error Rate</div>
            </div>
          </div>

          {selectedKeyStats.stats.topEndpoints.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-white mb-3">Top Endpoints</h4>
              <div className="space-y-2">
                {selectedKeyStats.stats.topEndpoints.map((endpoint, index) => (
                  <div key={endpoint.endpoint} className="flex items-center justify-between p-3 bg-gray-900 rounded">
                    <span className="text-gray-300">{endpoint.endpoint}</span>
                    <span className="text-white font-semibold">{endpoint.count} requests</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApiKeysSection;
