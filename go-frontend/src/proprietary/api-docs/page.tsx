'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const ApiDocumentationPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const endpoints = [
    {
      id: 'my-feeds',
      method: 'GET',
      path: '/api/feeds/my-feeds',
      title: 'List Your Feeds',
      description: 'Get all feeds you own or are subscribed to',
      parameters: [
        { name: 'include_subscribed', type: 'boolean', description: "Include feeds you're subscribed to", required: false }
      ],
      example: `curl -X GET ${BACKEND_URL}/api/feeds/my-feeds \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
      response: {
        success: true,
        data: {
          feeds: [
            {
              _id: 'feed123',
              name: 'Bitcoin Feed',
              category: 'crypto',
              isOwned: true,
              connectionStatus: {
                isConnected: true,
                subscriberCount: 5,
              },
            },
          ],
          count: 1,
          ownedCount: 1,
          subscribedCount: 0,
        },
      },
    },
    {
      id: 'feed-data',
      method: 'GET',
      path: '/api/feeds/:feedId/data',
      title: 'Get Feed Data',
      description: 'Retrieve data from a specific feed',
      parameters: [
        { name: 'limit', type: 'number', description: 'Number of records to return (1-100)', required: false },
        { name: 'format', type: 'string', description: 'Response format: json or csv', required: false },
      ],
      example: `curl -X GET ${BACKEND_URL}/api/feeds/feed123/data?limit=50 \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
      response: {
        success: true,
        data: {
          feed: {
            id: 'feed123',
            name: 'Bitcoin Feed',
            category: 'crypto',
          },
          items: [
            {
              timestamp: '2025-10-27T10:30:00Z',
              data: 'Sample feed data',
              value: 45.67,
            },
          ],
          count: 1,
        },
      },
    },
    {
      id: 'feed-stream',
      method: 'GET',
      path: '/api/feeds/:feedId/stream',
      title: 'Stream Feed Data',
      description: 'Get real-time feed data via Server-Sent Events',
      parameters: [],
      example: `curl -X GET ${BACKEND_URL}/api/feeds/feed123/stream \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Accept: text/event-stream"`,
      response: {
        note: 'Server-Sent Events stream',
        events: [
          'data: {"type":"connected","feed":{"id":"feed123"},"timestamp":"2025-10-27T10:30:00Z"}',
          'data: {"type":"data","payload":{...},"timestamp":"2025-10-27T10:30:05Z"}',
        ],
      },
    },
    {
      id: 'feed-history',
      method: 'GET',
      path: '/api/feeds/:feedId/history',
      title: 'Get Feed History',
      description: 'Retrieve historical data for a feed',
      parameters: [
        { name: 'from', type: 'string', description: 'Start date (ISO 8601)', required: false },
        { name: 'to', type: 'string', description: 'End date (ISO 8601)', required: false },
        { name: 'limit', type: 'number', description: 'Number of records (1-1000)', required: false },
      ],
      example: `curl -X GET "${BACKEND_URL}/api/feeds/feed123/history?from=2025-10-26T00:00:00Z&limit=100" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: {
        success: true,
        data: {
          feed: {
            id: 'feed123',
            name: 'Bitcoin Feed',
          },
          history: [
            {
              timestamp: '2025-10-26T23:59:00Z',
              data: 'Historical data point',
              value: 42.15,
            },
          ],
          count: 1,
        },
      },
    },
    {
      id: 'categories',
      method: 'GET',
      path: '/api/feeds/categories',
      title: 'Get Feed Categories',
      description: 'Get overview of your feeds grouped by category',
      parameters: [],
      example: `curl -X GET ${BACKEND_URL}/api/feeds/categories \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
      response: {
        success: true,
        data: {
          categories: [
            {
              category: 'crypto',
              ownedCount: 2,
              subscribedCount: 1,
              totalCount: 3,
              feeds: [
                { id: 'feed123', name: 'Bitcoin Feed', type: 'owned' },
              ],
            },
          ],
          totalFeeds: 3,
        },
      },
    },
  ];

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'text-emerald-400';
      case 'POST':
        return 'text-blue-400';
      case 'PUT':
        return 'text-amber-400';
      case 'DELETE':
        return 'text-red-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-sm font-medium">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/60 bg-gray-900/50">
              ⚡️
            </span>
            Real-time API Documentation
          </div>
          <h1 className="text-4xl font-bold text-white">Realtime Feed API Reference</h1>
          <p className="text-gray-300 text-lg max-w-3xl">
            Build real-time integrations with ease using authenticated endpoints. All requests must include your API key. Rate limits apply per token tier.
          </p>
        </header>

        {!user && (
          <div className="p-4 border border-yellow-500/40 bg-yellow-500/10 text-yellow-100 rounded-lg">
            <p className="font-medium">Authentication required</p>
            <p className="text-sm text-yellow-100/80">
              Sign in to view your API keys and interact with live endpoints.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-1 space-y-3">
            {endpoints.map((endpoint) => (
              <button
                key={endpoint.id}
                onClick={() => setSelectedEndpoint(endpoint.id)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedEndpoint === endpoint.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-gray-700 hover:border-emerald-500/60 hover:bg-emerald-500/5'
                }`}
              >
                <div className={`text-xs font-semibold uppercase tracking-wide ${getMethodColor(endpoint.method)}`}>
                  {endpoint.method}
                </div>
                <div className="text-base font-semibold text-white mt-1">
                  {endpoint.title}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {endpoint.path}
                </div>
              </button>
            ))}
          </aside>

          <main className="lg:col-span-2 bg-gray-900/60 border border-gray-700 rounded-xl p-6 space-y-6">
            {selectedEndpoint ? (
              (() => {
                const endpoint = endpoints.find((ep) => ep.id === selectedEndpoint)!;
                return (
                  <div className="space-y-5">
                    <div>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${getMethodColor(endpoint.method)} border-current`}> 
                        {endpoint.method}
                      </div>
                      <h2 className="text-2xl font-semibold text-white mt-3">{endpoint.title}</h2>
                      <p className="text-gray-300 mt-2">{endpoint.description}</p>
                      <div className="mt-3 font-mono text-emerald-300 bg-gray-950/60 border border-gray-800 rounded-lg p-3 text-sm">
                        {endpoint.path}
                      </div>
                    </div>

                    {endpoint.parameters.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Parameters</h3>
                        <div className="space-y-2">
                          {endpoint.parameters.map((param) => (
                            <div key={param.name} className="flex items-start gap-4 bg-gray-950/50 border border-gray-800 rounded-lg p-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-emerald-300">{param.name}</span>
                                  <span className="text-xs text-gray-400 uppercase tracking-wide">{param.type}</span>
                                  {param.required && (
                                    <span className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/40 px-2 py-0.5 rounded-full">
                                      Required
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-300 mt-1">{param.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Request Example</h3>
                        <button
                          onClick={() => handleCopyCode(endpoint.example)}
                          className="text-sm text-emerald-300 hover:text-emerald-200"
                        >
                          {copiedCode === endpoint.example ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <pre className="mt-2 p-4 bg-gray-950/70 border border-gray-800 rounded-lg overflow-x-auto text-sm leading-relaxed">
                        <code>{endpoint.example}</code>
                      </pre>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Response Example</h3>
                      <pre className="p-4 bg-gray-950/70 border border-gray-800 rounded-lg overflow-x-auto text-sm leading-relaxed">
                        <code>{JSON.stringify(endpoint.response, null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-950/40 border border-gray-800 rounded-xl">
                <span className="text-4xl mb-4">📘</span>
                <h2 className="text-2xl font-semibold text-white mb-2">Select an Endpoint</h2>
                <p className="text-gray-400 max-w-md">
                  Browse the available API endpoints to view request parameters, example payloads, and sample responses in real time.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ApiDocumentationPage;
