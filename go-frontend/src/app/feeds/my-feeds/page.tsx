'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WebSocketFeed } from '@/types/marketplace';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Card, Tag } from '@/components/ui';
import { 
  Plus, 
  Eye, 
  Lock,
  Settings, 
  Wifi,
  Database,
  Users,
  Activity,
  Trash2,
  MessageCircle,
  History,
  SlidersHorizontal
} from 'lucide-react';
import DynamicRegisterFeedForm from '@/components/DynamicRegisterFeedForm';
import { Modal } from 'antd';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

export default function MyFeedsPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { isConnected, registerUser } = useWebSocket();
  const [feeds, setFeeds] = useState<WebSocketFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [editConfigModal, setEditConfigModal] = useState<{
    isOpen: boolean;
    feed: WebSocketFeed | null;
  }>({
    isOpen: false,
    feed: null,
  });

  // Register user with WebSocket system
  useEffect(() => {
    if (user && isConnected) {
      //console.log(`🔑 Registering user ${user._id} on my-feeds page`);
      registerUser(user._id);
    }
  }, [user, isConnected, registerUser]);

  useEffect(() => {
    if (user) {
      loadFeeds();
    }
  }, [user]);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/marketplace/my-feeds`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setFeeds(result.data || []);
      }
    } catch (error) {
      console.error('Error loading feeds:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteFeed = async (feedId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/marketplace/feeds/${feedId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setFeeds(feeds.filter((f) => f._id !== feedId));
        alert('Feed deleted successfully');
      } else {
        alert('Failed to delete feed');
      }
    } catch (error) {
      console.error('Error deleting feed:', error);
      alert('Failed to delete feed');
    }
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
        loadFeeds();
        alert(`Feed ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        alert('Failed to update feed');
      }
    } catch (error) {
      console.error('Error updating feed:', error);
      alert('Failed to update feed');
    }
  };

  const handleEditConfig = (feed: WebSocketFeed) => {
    setEditConfigModal({
      isOpen: true,
      feed,
    });
  };

  const handleCloseEditModal = () => {
    setEditConfigModal({
      isOpen: false,
      feed: null,
    });
    loadFeeds(); // Reload feeds after editing
  };

  const handleStartConversation = (feedId?: string) => {
    if (!feedId) return;
    router.push(`/feeds/${feedId}?newConversation=1`);
  };

  const handleViewChatHistory = (feedId?: string) => {
    if (!feedId) return;
    router.push(`/chat-history?feedId=${feedId}`);
  };

  const handleConfigureAI = (feedId?: string) => {
    if (!feedId) return;
    router.push(`/feeds/${feedId}?configureAI=1`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="max-w mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">My Registered Feeds</h1>
              <p className="text-gray-400 mt-1">Manage your WebSocket feeds</p>
            </div>
            <Button
              variant="nebula"
              size="large"
              onClick={() => router.push('/feeds/register')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Register New Feed
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-gray-400 mt-4">Loading your feeds...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && feeds.length === 0 && (
            <Card className="text-center py-12">
              <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8M9 7h6m-7 4h8m-8 4h8" />
              </svg>
              <h2 className="text-2xl font-bold text-white mb-2">No Feeds Yet</h2>
              <p className="text-gray-400 mb-6">Register your first WebSocket feed to get started</p>
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
          {!loading && feeds.length > 0 && (
            <div className="space-y-4">
              {feeds.map((feed) => (
                <Card
                  key={feed._id}
                  className="hover:border-blue-500 transition-all"
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
                          <div className="flex gap-1">
                            {feed.isVerified && <Tag variant="success">✓ Verified</Tag>}
                            <div title={feed.isPublic ? 'Public Feed' : 'Private Feed'}>
                              <Tag variant={feed.isPublic ? 'info' : 'default'}>
                                {feed.isPublic ? (
                                  <><Eye className="w-3.5 h-3.5 inline mr-1" strokeWidth={2} />Public</>
                                ) : (
                                  <><Lock className="w-3.5 h-3.5 inline mr-1" strokeWidth={2} />Private</>
                                )}
                              </Tag>
                            </div>
                            <Tag variant={feed.isActive ? 'success' : 'warning'}>
                              {feed.isActive ? '● Active' : '○ Inactive'}
                            </Tag>
                          </div>
                        </div>
                        <p className="text-gray-300 mb-3">{feed.description}</p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Button
                            variant="default"
                            size="small"
                            onClick={() => handleStartConversation(feed._id)}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Start Conversation
                          </Button>
                          <Button
                            variant="default"
                            size="small"
                            onClick={() => handleViewChatHistory(feed._id)}
                          >
                            <History className="w-4 h-4 mr-2" />
                            View Chat History
                          </Button>
                          <Button
                            variant="default"
                            size="small"
                            onClick={() => handleConfigureAI(feed._id)}
                          >
                            <SlidersHorizontal className="w-4 h-4 mr-2" />
                            Configure AI
                          </Button>
                        </div>
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
                        <Eye className="w-4 h-4 mr-1" />
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
                        variant={feed.isActive ? 'ghost' : 'nebula'}
                        onClick={() => toggleFeedStatus(feed._id!, feed.isActive)}
                      >
                        <Activity className="w-4 h-4 mr-1" />
                        {feed.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this feed? This action cannot be undone.')) {
                            deleteFeed(feed._id!);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Config Modal */}
      <Modal
        title="Edit Feed Configuration"
        open={editConfigModal.isOpen}
        onCancel={handleCloseEditModal}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        {editConfigModal.feed && (
          <DynamicRegisterFeedForm
            initialData={editConfigModal.feed}
            isEditMode={true}
            onSuccess={handleCloseEditModal}
          />
        )}
      </Modal>
    </ProtectedRoute>
  );
}
