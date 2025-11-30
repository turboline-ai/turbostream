'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WebSocketFeed } from '@/types/marketplace';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptions } from '@/contexts/SubscriptionContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import ProtectedRoute from '@/components/ProtectedRoute';
import DynamicRegisterFeedForm from '@/components/DynamicRegisterFeedForm';
import { Button, Card, Tag } from '@/components/ui';
import { 
  Plus,
  Eye,
  Lock,
  Settings,
  Activity,
  Trash2
} from 'lucide-react';
import { useManageFeedsExtensions } from '@/proprietary/manage-feeds';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';
type ManageFeedsTabKey = 'subscriptions' | 'myfeeds';

export default function SubscriptionsPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { subscriptions, myFeeds, isLoading: subscriptionsLoading, refreshSubscriptions, refreshMyFeeds } = useSubscriptions();
  const { isConnected, registerUser } = useWebSocket();
  const proprietary = useManageFeedsExtensions({
    backendUrl: BACKEND_URL,
    router,
    token,
    subscriptions,
    subscriptionsLoading,
    refreshSubscriptions,
  });
  const [activeTab, setActiveTab] = useState<ManageFeedsTabKey>(proprietary.initialTab);
  const [myFeedsLoading, setMyFeedsLoading] = useState(false);

  // Keep tab selection in sync with available proprietary content
  useEffect(() => {
    if (activeTab === 'subscriptions' && !proprietary.subscriptionTab) {
      setActiveTab('myfeeds');
    }
  }, [activeTab, proprietary.subscriptionTab]);

  // Register user with WebSocket system
  useEffect(() => {
    if (user && isConnected) {
      registerUser(user._id);
    }
  }, [user, isConnected, registerUser]);

  // Load data when page mounts
  useEffect(() => {
    if (user && subscriptions.length === 0 && !subscriptionsLoading) {
      refreshSubscriptions();
    }
    if (user && myFeeds.length === 0) {
      refreshMyFeeds();
    }
  }, [user]);

  const [editConfigModal, setEditConfigModal] = useState<{
    isOpen: boolean;
    feed: WebSocketFeed | null;
  }>({
    isOpen: false,
    feed: null,
  });

  const deleteFeed = async (feedId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/marketplace/feeds/${feedId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await refreshMyFeeds();
        alert('Feed deleted successfully');
      } else {
        alert('Failed to delete feed');
      }
    } catch (error) {
      console.error('Error deleting feed:', error);
      alert('Failed to delete feed');
    }
  };

  const handleEditConfig = (feed: WebSocketFeed) => {
    setEditConfigModal({
      isOpen: true,
      feed,
    });
  };

  const handleCloseEditModal = async () => {
    setEditConfigModal({
      isOpen: false,
      feed: null,
    });
    // Refresh feeds to show updated data
    await refreshMyFeeds();
  };

  const toggleFeedStatus = async (feedId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/marketplace/feeds/${feedId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        await refreshMyFeeds();
        alert(`Feed ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        alert('Failed to update feed');
      }
    } catch (error) {
      console.error('Error updating feed:', error);
      alert('Failed to update feed');
    }
  };

  const tabs: Array<{ key: ManageFeedsTabKey; label: string; count: number }> = [
    ...(proprietary.subscriptionTab
      ? [{ key: 'subscriptions' as const, label: proprietary.subscriptionTab.label, count: proprietary.subscriptionTab.count }]
      : []),
    { key: 'myfeeds', label: 'My Registered Feeds', count: myFeeds.length },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w mx-auto">
          {/* Header */}
          <div className="flex items-center justify-end mb-8 gap-2">
            {proprietary.headerActions}
            <Button
              variant="nebula"
              size="large"
              onClick={() => router.push('/feeds/register')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Register New Feed
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-line mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue text-blue'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'subscriptions' && proprietary.subscriptionTab?.content}

          {/* My Registered Feeds Tab Content */}
          {activeTab === 'myfeeds' && (
            <>
              {/* Loading State */}
              {myFeedsLoading && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <p className="text-gray-400 mt-4">Loading your feeds...</p>
                </div>
              )}

              {/* Empty State */}
              {!myFeedsLoading && myFeeds.length === 0 && (
                <Card className="text-center py-12 panel">
                  <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8M9 7h6m-7 4h8m-8 4h8" />
                  </svg>
                  <h2 className="text-2xl font-bold text-white mb-2">No Feeds Yet</h2>
                  <p className="text-gray-400 mb-6 muted">Register your first WebSocket feed to get started</p>
                  <Button
                    variant="nebula"
                    size="large"
                    onClick={() => router.push('/feeds/register')}
                  >
                    Register Feed
                  </Button>
                </Card>
              )}

              {/* Feeds List */}
              {!myFeedsLoading && myFeeds.length > 0 && (
                <div className="space-y-4">
                  {myFeeds.map((feed) => (
                    <Card
                      key={feed._id}
                      className="hover:border-blue-500 transition-all panel"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {feed.icon ? (
                            <span className="text-4xl">{feed.icon}</span>
                          ) : (
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8M9 7h6m-7 4h8m-8 4h8" />
                            </svg>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-white">{feed.name}</h3>
                              <div className="flex gap-2">
                                {feed.isVerified && <Tag variant="nebula">✓ Verified</Tag>}
                                <div title={feed.isPublic ? 'Public Feed' : 'Private Feed'}>
                                  <Tag variant={feed.isPublic ? 'nebula' : 'default'}>
                                    {feed.isPublic ? (
                                      <><Eye className="w-3.5 h-3.5 inline mr-1" strokeWidth={2} />Public</>
                                    ) : (
                                      <><Lock className="w-3.5 h-3.5 inline mr-1" strokeWidth={2} />Private</>
                                    )}
                                  </Tag>
                                </div>
                                <Tag variant={feed.isActive ? 'nebula' : 'error'}>
                                  {feed.isActive ? '● Active' : '○ Inactive'}
                                </Tag>
                              </div>
                            </div>
                            <p className="text-gray-300 mb-3">{feed.description}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>📊 {feed.dataFormat}</span>
                              <span className="capitalize">🏷️ {feed.category}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="nebula"
                            onClick={() => router.push(`/feeds/${feed._id}`)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => handleEditConfig(feed)}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Edit Config
                          </Button>
                          <Button
                            variant={feed.isActive ? 'default' : 'nebula'}
                            className={feed.isActive ? '' : 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700'}
                            onClick={() => toggleFeedStatus(feed._id!, feed.isActive)}
                          >
                            {feed.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this feed? This action cannot be undone.')) {
                                deleteFeed(feed._id!);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {proprietary.modals}

      {/* Edit Config Modal */}
      {editConfigModal.isOpen && editConfigModal.feed && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="sticky top-0 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 p-6 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-white">Edit Feed Configuration</h2>
              <button
                onClick={handleCloseEditModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <DynamicRegisterFeedForm
                initialData={editConfigModal.feed}
                isEditMode={true}
                onSuccess={handleCloseEditModal}
              />
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
