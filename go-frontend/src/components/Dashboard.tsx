'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Settings, 
  Eye,
  Wifi,
  Database,
  Rocket
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { WebSocketFeed } from '@/types/marketplace';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { Button, Card, Tag } from '@/components/ui';
import WelcomeBanner from './WelcomeBanner';
import OnboardingTour from './OnboardingTour';
import { useDashboardExtensions } from '@/proprietary/dashboard';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

export default function Dashboard() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [myFeeds, setMyFeeds] = useState<WebSocketFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const proprietary = useDashboardExtensions({
    backendUrl: BACKEND_URL,
    router,
    token,
  });

  // Check if user needs onboarding
  useEffect(() => {
    if (user) {
      const hasSeenOnboarding = localStorage.getItem('onboarding-completed');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const myFeedsResponse = await fetchWithTimeout(`${BACKEND_URL}/api/marketplace/my-feeds`, {
        timeout: 8000,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (myFeedsResponse.ok) {
        const result = await myFeedsResponse.json();
        setMyFeeds(result.data || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Create New Feed',
      description: 'Add your own real-time feed.',
      icon: <Plus className="w-5 h-5" />,
      action: () => router.push('/feeds/register'),
      color: '#5aa3ff' as const,
      hoverColor: '#4a94f0' as const
    },
    ...proprietary.quickActions,
  ];

  const activeFeedsCount = myFeeds.filter(feed => feed.isActive).length;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('onboarding-completed', 'true');
  };

  return (
    <div className="overflow-auto p-3">
      <div className="max-w mx-auto space-y-3">
        
        {/* Welcome Banner for New Users */}
        <WelcomeBanner />
        
        {/* Welcome Header */}
        <div className="flex items-center justify-between mb-1 min-w-0">
          <h2 className="text-xl font-semibold truncate pr-4" style={{ color: 'var(--ink)' }} title={`Welcome back, ${user?.name}`}>
            Welcome back, {user?.name}
          </h2>
          <div className="flex items-center gap-2">
            {proprietary.supportControls}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Card variant="default" className="text-center p-8 transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center justify-center mb-2">
              <Wifi className="w-5 h-5 text-blue mr-2" />
              <span className="text-sm text-muted font-medium">Active Feeds</span>
            </div>
            <div className="text-2xl font-bold text-blue">{activeFeedsCount}</div>
          </Card>
          <Card variant="default" className="text-center p-8 transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center justify-center mb-2">
              <Database className="w-5 h-5 text-amber mr-2" />
              <span className="text-sm text-muted font-medium">Total Feeds</span>
            </div>
            <div className="text-2xl font-bold text-amber">{myFeeds.length}</div>
          </Card>
          {proprietary.subscriptionStatsCard}
        </div>

        {/* Quick Actions */}
        <Card variant="default" className="transition-all duration-200 hover:shadow-lg p-8">
          <h3 className="text-lg font-bold text-ink mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {quickActions.map((action, index) => (
              <div
                key={index}
                className="p-3 border border-line cursor-pointer group transition-all duration-200 hover:shadow-md bg-bg-0 hover:border-blue hover:bg-blue/10"
                onClick={action.action}
                tabIndex={0}
                role="button"
                aria-label={action.title}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    action.action();
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="p-2 transition-transform duration-200 group-hover:scale-110 text-white"
                    style={{ 
                      backgroundColor: action.color,
                      borderRadius: '4px'
                    }}
                  >
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1 leading-tight text-ink">
                      {action.title}
                    </h4>
                    <p className="text-sm leading-tight text-muted">
                      {action.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          
          {/* My Active Feeds */}
          <div>
            <Card variant="default" className="transition-all duration-200 hover:shadow-lg p-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-ink">My Active Feeds</h3>
                {myFeeds.length > 0 && (
                  <Button 
                    variant="ghost"
                    size="small"
                    onClick={() => router.push('/feeds/my-feeds')}
                    className="text-blue hover:text-blue/80"
                  >
                    View All
                  </Button>
                )}
              </div>
              {myFeeds.length === 0 ? (
                <div className="text-center py-4">
                  <Wifi className="w-6 h-6 text-muted mx-auto mb-2" />
                  <p className="text-muted mb-3 text-sm">
                    No feeds created yet. Create your first feed to get started.
                  </p>
                  <Button 
                    variant="nebula"
                    size="small"
                    onClick={() => router.push('/feeds/register')}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create Feed
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {myFeeds.slice(0, 3).map((feed) => (
                    <div 
                      key={feed._id} 
                      className="flex items-center justify-between p-2 border cursor-pointer transition-all duration-200 hover:shadow-sm border-line bg-bg-0 hover:border-blue hover:bg-blue/10"
                      onClick={() => router.push(`/feeds/${feed._id}`)}
                      tabIndex={0}
                      role="button"
                      aria-label={`View feed ${feed.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
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
                          <div className="flex items-center gap-2">
                            <Tag variant={feed.isActive ? 'success' : 'warning'}>
                              {feed.isActive ? 'Active' : 'Inactive'}
                            </Tag>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/feeds/${feed._id}`);
                          }}
                          aria-label={`View feed ${feed.name}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push('/feeds/my-feeds');
                          }}
                          aria-label={`Settings for feed ${feed.name}`}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Proprietary Recent Subscriptions */}
          {proprietary.recentSubscriptionsSection}
        </div>

        {/* Getting Started Tip */}
        {myFeeds.length === 0 && !proprietary.hasSubscriptions && (
          <Card variant="spacepolaroid" className="p-4">
            <div className="text-center">
              <Rocket className="w-7 h-7 text-blue mx-auto mb-2" />
              <h3 className="text-sm font-bold mb-1 text-ink">
                Get Started with Real-time Data Feeds
              </h3>
              <p className="mb-3 max-w-2xl mx-auto text-xs text-muted">
                Create WebSocket feeds to share data with your users or community.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button 
                  variant="nebula"
                  onClick={() => router.push('/feeds/register')}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Your First Feed
                </Button>
                {proprietary.getStartedActions}
              </div>
            </div>
          </Card>
        )}
        
      </div>
      
      {/* Onboarding & Tutorial Modals */}
      <OnboardingTour 
        visible={showOnboarding} 
        onClose={handleOnboardingComplete}
      />
      {proprietary.modals}
    </div>
  );
}
