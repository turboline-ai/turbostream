'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context';
import { Eye, HelpCircle, ShoppingCart, Users, Wifi } from 'lucide-react';
import { UserSubscription } from '@/types/marketplace';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { Button, Card } from '@/components/ui';
import HelpWidget from '@/components/HelpWidget';
import InteractiveTutorial from '@/components/InteractiveTutorial';

type DashboardQuickAction = {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
  hoverColor: string;
};

interface UseDashboardExtensionsArgs {
  backendUrl: string;
  router: Pick<AppRouterInstance, 'push'>;
  token: string | null;
}

interface DashboardExtensions {
  quickActions: DashboardQuickAction[];
  subscriptionStatsCard: React.ReactNode;
  recentSubscriptionsSection: React.ReactNode;
  supportControls: React.ReactNode;
  hasSubscriptions: boolean;
  getStartedActions: React.ReactNode;
  modals: React.ReactNode;
}

export function useDashboardExtensions({
  backendUrl,
  router,
  token,
}: UseDashboardExtensionsArgs): DashboardExtensions {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const loadSubscriptions = useCallback(async () => {
    if (!token) {
      setSubscriptions([]);
      return;
    }

    try {
      setIsLoadingSubscriptions(true);
      const response = await fetchWithTimeout(`${backendUrl}/api/marketplace/subscriptions`, {
        timeout: 8000,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }

      const result = await response.json();
      setSubscriptions(result.data || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setSubscriptions([]);
    } finally {
      setIsLoadingSubscriptions(false);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const quickActions = useMemo<DashboardQuickAction[]>(() => {
    if (!token) {
      return [];
    }

    return [
      {
        title: 'Browse Marketplace',
        description: 'Discover and subscribe to real-time data feeds',
        icon: <ShoppingCart className="w-5 h-5" />,
        action: () => router.push('/marketplace'),
        color: '#62c2a0',
        hoverColor: '#52b290',
      },
    ];
  }, [router, token]);

  const subscriptionStatsCard = useMemo(() => {
    if (!token) {
      return null;
    }

    return (
      <Card variant="default" className="text-center p-8 transition-all duration-200 hover:shadow-lg">
        <div className="flex items-center justify-center mb-2">
          <Users className="w-5 h-5 text-green mr-2" />
          <span className="text-sm text-muted font-medium">Subscriptions</span>
        </div>
        <div className="text-2xl font-bold text-green">
          {isLoadingSubscriptions ? '—' : subscriptions.length}
        </div>
      </Card>
    );
  }, [isLoadingSubscriptions, subscriptions.length, token]);

  const recentSubscriptionsSection = useMemo(() => {
    if (!token) {
      return null;
    }

    return (
      <div>
        <Card variant="default" className="transition-all duration-200 hover:shadow-lg p-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-ink">Recent Subscriptions</h3>
            {subscriptions.length > 0 && (
              <Button 
                variant="ghost"
                size="small"
                onClick={() => router.push('/subscriptions')}
                className="text-blue hover:text-blue/80"
              >
                View All
              </Button>
            )}
          </div>
          {subscriptions.length === 0 ? (
            <div className="text-center py-4">
              <Users className="w-6 h-6 text-muted mx-auto mb-2" />
              <p className="text-muted mb-3 text-sm">
                {isLoadingSubscriptions
                  ? 'Loading your subscriptions...'
                  : 'No subscriptions yet. Browse the marketplace to find interesting feeds.'}
              </p>
              <Button 
                variant="nebula"
                size="small"
                onClick={() => router.push('/marketplace')}
                disabled={isLoadingSubscriptions}
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Browse Feeds
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {subscriptions.slice(0, 3).map((sub) => {
                const feed = sub.feed;
                if (!feed) return null;

                return (
                  <div 
                    key={sub._id} 
                    className="flex items-center justify-between p-2 border cursor-pointer transition-all duration-200 hover:shadow-sm border-line bg-bg-0 hover:border-green hover:bg-green/10"
                    onClick={() => feed._id && router.push(`/feeds/${feed._id}`)}
                    tabIndex={0}
                    role="button"
                    aria-label={`View subscription ${feed?.name ?? 'feed'}`}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && feed?._id) {
                        e.preventDefault();
                        router.push(`/feeds/${feed._id}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {feed.icon ? (
                        <span className="text-lg">{feed.icon}</span>
                      ) : (
                        <div className="w-6 h-6 flex items-center justify-center bg-line">
                          <Wifi className="w-3 h-3 text-ink" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-sm text-ink">{feed.name}</div>
                        <div className="text-xs text-muted">by {feed.ownerName}</div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        feed._id && router.push(`/feeds/${feed._id}`);
                      }}
                      aria-label={`View subscription ${feed.name}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    );
  }, [isLoadingSubscriptions, router, subscriptions, token]);

  const supportControls = useMemo(() => {
    if (!token) {
      return null;
    }

    return (
      <>
        <Button
          variant="ghost"
          size="small"
          onClick={() => setShowTutorial(true)}
          className="text-muted hover:text-ink"
          title="Interactive Tutorial"
        >
          <HelpCircle className="w-4 h-4 mr-1" />
          Tutorial
        </Button>
        <HelpWidget />
      </>
    );
  }, [token]);

  const getStartedActions = useMemo(() => {
    if (!token) {
      return null;
    }

    return (
      <Button 
        variant="ghost"
        onClick={() => router.push('/marketplace')}
        className="text-ink border-line bg-bg-1"
      >
        <ShoppingCart className="w-4 h-4 mr-1" />
        Explore Marketplace
      </Button>
    );
  }, [router, token]);

  const modals = useMemo(() => {
    if (!token) {
      return null;
    }

    return (
      <InteractiveTutorial
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    );
  }, [showTutorial, token]);

  return {
    quickActions,
    subscriptionStatsCard,
    recentSubscriptionsSection,
    supportControls,
    hasSubscriptions: subscriptions.length > 0,
    getStartedActions,
    modals,
  };
}
