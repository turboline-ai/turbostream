'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import {
  Rocket,
  ShoppingCart,
  Plus,
  X,
  BookOpen,
  Lightbulb
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface WelcomeBannerProps {
  className?: string;
}

export default function WelcomeBanner({ className = "" }: WelcomeBannerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if user is new (account created recently)
  useEffect(() => {
    if (!user) return;

    // Check if banner was previously dismissed
    const bannerDismissed = localStorage.getItem('welcome-banner-dismissed');
    if (bannerDismissed) {
      setDismissed(true);
      return;
    }

    // Check if user is new (created account in last 24 hours)
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const is24HoursOld = accountAge < 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (is24HoursOld) {
      setVisible(true);
    }
  }, [user]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('welcome-banner-dismissed', 'true');
  };

  const quickStartActions = [
    {
      title: 'Browse Marketplace',
      description: 'Explore existing feeds',
      icon: <ShoppingCart size={20} />,
      color: '#52c41a',
      onClick: () => router.push('/marketplace')
    },
    {
      title: 'Create Feed',
      description: 'Add your own data source',
      icon: <Plus size={20} />,
      color: '#1890ff',
      onClick: () => router.push('/feeds/register')
    },
    {
      title: 'View Guide',
      description: 'Read getting started',
      icon: <BookOpen size={20} />,
      color: '#722ed1',
      onClick: () => {
        // Could open help modal or navigate to docs
        window.open('/api-docs', '_blank');
      }
    }
  ];

  if (!visible || dismissed || !user) {
    return null;
  }

  return (
    <Card
      className={`welcome-banner ${className}`}
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        borderRadius: '12px',
        color: 'white',
        marginBottom: '20px',
        padding: '20px'
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Rocket className="text-2xl text-white" size={24} />
            </div>
            <div>
              <h4 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: '600' }}>
                Welcome to Realtime Analyzer, {user.name}! 🎉
              </h4>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                Let's get you started with your first data feed and AI insights
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {quickStartActions.map((action, index) => (
              <div key={index}>
                <div
                  className="p-4 bg-white/10 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/20 hover:scale-105"
                  onClick={action.onClick}
                  style={{ backdropFilter: 'blur(10px)' }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: action.color }}
                    >
                      {action.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm">
                        {action.title}
                      </div>
                      <div className="text-xs text-white/70">
                        {action.description}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-white/10 rounded-lg" style={{ backdropFilter: 'blur(10px)' }}>
            <div className="flex items-start gap-2">
              <Lightbulb className="text-yellow-300 mt-1" size={16} />
              <div className="text-sm">
                <span style={{ color: 'white', fontWeight: '600' }}>Pro Tip:</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.9)', marginLeft: 8 }}>
                  Start with the marketplace to explore existing feeds, then create your own custom data source. 
                  Use specific AI prompts for better insights!
                </span>
              </div>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={handleDismiss}
          style={{ 
            color: 'rgba(255, 255, 255, 0.8)',
            borderColor: 'transparent'
          }}
          className="hover:bg-white/10"
          size="small"
        >
          <X size={16} />
        </Button>
      </div>
    </Card>
  );
}