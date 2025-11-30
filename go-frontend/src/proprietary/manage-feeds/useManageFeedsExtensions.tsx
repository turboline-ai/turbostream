'use client';

import React, { useCallback, useMemo, useState } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context';
import { ShoppingCart } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import UnifiedFeedCard from '@/components/UnifiedFeedCard';
import CustomPromptModal from '@/components/CustomPromptModal';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import type { UserSubscription } from '@/types/marketplace';

type ManageFeedsTabKey = 'subscriptions' | 'myfeeds';

interface UseManageFeedsExtensionsArgs {
  backendUrl: string;
  router: Pick<AppRouterInstance, 'push'>;
  token: string | null;
  subscriptions: UserSubscription[];
  subscriptionsLoading: boolean;
  refreshSubscriptions: () => Promise<void>;
}

interface SubscriptionTabConfig {
  label: string;
  count: number;
  content: React.ReactNode;
}

interface ManageFeedsExtensionsResult {
  headerActions: React.ReactNode;
  subscriptionTab: SubscriptionTabConfig | null;
  modals: React.ReactNode;
  initialTab: ManageFeedsTabKey;
}

export function useManageFeedsExtensions({
  backendUrl,
  router,
  token,
  subscriptions,
  subscriptionsLoading,
  refreshSubscriptions,
}: UseManageFeedsExtensionsArgs): ManageFeedsExtensionsResult {
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    feedId: string;
    feedName: string;
    currentPrompt?: string;
  }>({
    isOpen: false,
    feedId: '',
    feedName: '',
    currentPrompt: '',
  });

  const handleEditPrompt = useCallback((subscription: UserSubscription) => {
    setPromptModal({
      isOpen: true,
      feedId: subscription.feedId,
      feedName: subscription.feed?.name || 'Unknown Feed',
      currentPrompt: subscription.customPrompt || '',
    });
  }, []);

  const handleUpdatePrompt = useCallback(async (customPrompt: string) => {
    if (!token) {
      alert('Authentication token not found');
      return;
    }

    try {
      const response = await fetchWithTimeout(`${backendUrl}/api/marketplace/subscriptions/${promptModal.feedId}/settings`, {
        timeout: 10000,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ customPrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update custom prompt');
      }

      await refreshSubscriptions();
      setPromptModal({ isOpen: false, feedId: '', feedName: '', currentPrompt: '' });
    } catch (error: any) {
      console.error('Error updating custom prompt:', error);
      alert(`Failed to update custom prompt: ${error.message}`);
    }
  }, [backendUrl, promptModal.feedId, refreshSubscriptions, token]);

  const handleUnsubscribe = useCallback(async (subscriptionId: string, feedName: string) => {
    if (!token) {
      alert('Authentication token not found');
      return;
    }

    if (!confirm(`Are you sure you want to unsubscribe from "${feedName}"?`)) {
      return;
    }

    try {
      const response = await fetchWithTimeout(`${backendUrl}/api/marketplace/subscriptions/${subscriptionId}`, {
        timeout: 10000,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to unsubscribe');
      }

      await refreshSubscriptions();
    } catch (error: any) {
      console.error('Error unsubscribing:', error);
      alert(`Failed to unsubscribe: ${error.message}`);
    }
  }, [backendUrl, refreshSubscriptions, token]);

  const headerActions = useMemo(() => {
    if (!token) {
      return null;
    }

    return (
      <Button
        key="browse-marketplace"
        variant="ghost"
        size="large"
        onClick={() => router.push('/marketplace')}
      >
        <ShoppingCart className="w-4 h-4 mr-2" />
        Browse Marketplace
      </Button>
    );
  }, [router, token]);

  const subscriptionTab = useMemo<SubscriptionTabConfig | null>(() => {
    if (!token) {
      return null;
    }

    return {
      label: '📋 My Subscriptions',
      count: subscriptions.length,
      content: (
        <>
          {subscriptionsLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-gray-400 mt-4">Loading your subscriptions...</p>
            </div>
          )}

          {!subscriptionsLoading && subscriptions.length === 0 && (
            <Card className="text-center py-12 panel">
              <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8M9 7h6m-7 4h8m-8 4h8" />
              </svg>
              <h2 className="text-2xl font-bold text-white mb-2">No Subscriptions Yet</h2>
              <p className="text-gray-400 mb-6 muted">Subscribe to feeds in the marketplace to get started</p>
              <Button
                variant="nebula"
                size="large"
                onClick={() => router.push('/marketplace')}
              >
                Browse Marketplace
              </Button>
            </Card>
          )}

          {!subscriptionsLoading && subscriptions.length > 0 && (
            <div className="space-y-4">
              {subscriptions.map((subscription) => {
                const feed = subscription.feed;
                if (!feed) return null;

                return (
                  <div key={subscription._id} className="panel">
                    <UnifiedFeedCard
                      id={feed._id!}
                      title={feed.name}
                      description={feed.description}
                      provider={feed.ownerName}
                      icon={feed.icon ? <span className="text-3xl">{feed.icon}</span> : undefined}
                      verified={!!feed.isVerified}
                      live={!!feed.isActive}
                      tags={(feed.tags || []).slice(0, 4)}
                      isSubscribed={true}
                      subscribedAt={
                        typeof subscription.subscribedAt === 'string'
                          ? subscription.subscribedAt
                          : new Date(subscription.subscribedAt).toISOString()
                      }
                      hasCustomPrompt={!!subscription.customPrompt}
                      onView={() => router.push(`/feeds/${feed._id}`)}
                      onEditPrompt={() => handleEditPrompt(subscription)}
                      onUnsubscribe={() => handleUnsubscribe(subscription._id!, feed.name)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      ),
    };
  }, [handleEditPrompt, handleUnsubscribe, router, subscriptions, subscriptionsLoading, token]);

  const modals = useMemo(() => {
    if (!token) {
      return null;
    }

    return (
      <CustomPromptModal
        isOpen={promptModal.isOpen}
        feedName={promptModal.feedName}
        currentPrompt={promptModal.currentPrompt}
        onSave={handleUpdatePrompt}
        onClose={() => setPromptModal({
          isOpen: false,
          feedId: '',
          feedName: '',
          currentPrompt: '',
        })}
      />
    );
  }, [handleUpdatePrompt, promptModal, token]);

  return {
    headerActions,
    subscriptionTab,
    modals,
    initialTab: subscriptionTab ? 'subscriptions' : 'myfeeds',
  };
}
