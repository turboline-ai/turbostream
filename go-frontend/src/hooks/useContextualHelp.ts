'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/components/ui';

interface ContextualTip {
  key: string;
  title: string;
  message: string;
  iconType: 'dashboard' | 'shopping' | 'api' | 'bulb' | 'setting' | 'rocket';
  action?: {
    text: string;
    onClick: () => void;
  };
}

interface PageContext {
  path: string;
  tips: ContextualTip[];
  showOnFirstVisit?: boolean;
}

export function useContextualHelp() {
  const pathname = usePathname();
  const [shownTips, setShownTips] = useState<string[]>([]);
  const { info, success, warning, error } = useToast();

  // Define contextual tips for different pages
  const pageContexts: PageContext[] = [
    {
      path: '/',
      showOnFirstVisit: false,
      tips: []
    },
    {
      path: '/marketplace',
      tips: [
        {
          key: 'marketplace-tip',
          title: 'Finding Quality Feeds',
          message: 'Look for feeds with recent updates and good descriptions. Start with free feeds to test the platform.',
          iconType: 'shopping'
        }
      ]
    },
    {
      path: '/feeds/register',
      tips: [
        {
          key: 'feed-creation-tip',
          title: 'Creating Your First Feed',
          message: 'Test your data source first! Use the connection test feature before saving your feed.',
          iconType: 'api'
        },
        {
          key: 'websocket-vs-http',
          title: 'WebSocket vs HTTP?',
          message: 'WebSocket for real-time streaming (crypto prices), HTTP for regular polling (weather updates).',
          iconType: 'bulb'
        }
      ]
    },
    {
      path: '/feeds',
      tips: [
        {
          key: 'custom-prompts',
          title: 'Try Custom AI Prompts',
          message: 'Click the "Custom Prompt" button on any feed to get specific insights tailored to your needs.',
          iconType: 'bulb'
        }
      ]
    },
    {
      path: '/profile',
      tips: [
        {
          key: 'api-keys-security',
          title: 'Keep API Keys Secure',
          message: 'Treat API keys like passwords. Never share them publicly and regenerate if compromised.',
          iconType: 'setting'
        }
      ]
    }
  ];

  // Load shown tips from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('contextual-tips-shown');
    if (stored) {
      setShownTips(JSON.parse(stored));
    }
  }, []);

  // Save shown tips to localStorage
  const markTipAsShown = (tipKey: string) => {
    const updated = [...shownTips, tipKey];
    setShownTips(updated);
    localStorage.setItem('contextual-tips-shown', JSON.stringify(updated));
  };

  // Show tips for current page
  useEffect(() => {
    const currentContext = pageContexts.find(ctx => 
      ctx.path === pathname || (ctx.path === '/' && pathname === '')
    );

    if (!currentContext) return;

    // Show tips after a short delay to let the page load
    const timer = setTimeout(() => {
      currentContext.tips.forEach(tip => {
        // Skip if already shown, unless it's a first-visit tip
        if (shownTips.includes(tip.key) && !currentContext.showOnFirstVisit) {
          return;
        }

        // Show notification
        info(tip.message, tip.title, 8000);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [pathname, shownTips]);

  // Manual tip functions
  const showTip = (tip: ContextualTip) => {
    info(tip.message, tip.title, 8000);
  };

  const resetAllTips = () => {
    setShownTips([]);
    localStorage.removeItem('contextual-tips-shown');
    success('All tips have been reset. You\'ll see them again on relevant pages.');
  };

  const showQuickTip = (messageText: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    switch (type) {
      case 'success':
        success(messageText);
        break;
      case 'warning':
        warning(messageText);
        break;
      case 'error':
        error(messageText);
        break;
      default:
        info(messageText);
        break;
    }
  };

  // Predefined helpful tips
  const quickTips = {
    feedConnection: () => showQuickTip('💡 Tip: Test your connection before creating the feed to avoid issues later!'),
    aiPrompt: () => showQuickTip('🤖 Pro tip: Be specific in your AI prompts. Mention your expertise level and desired output format.'),
    marketplace: () => showQuickTip('🛒 Start with free feeds to explore the platform before subscribing to premium ones.'),
    dashboard: () => showQuickTip('📊 Your dashboard shows real-time statistics. Numbers update as your feeds become active.'),
    apiKeys: () => showQuickTip('🔑 Remember: API keys are like passwords. Keep them secure and never share publicly!', 'warning'),
  };

  return {
    showTip,
    resetAllTips,
    showQuickTip,
    quickTips,
    shownTips
  };
}