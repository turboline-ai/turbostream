'use client';

import React, { useState, useEffect, memo } from 'react';
import { usePathname } from 'next/navigation';
import FeedsSidebar from '@/components/FeedsSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useLoading } from '@/contexts/LoadingContext';
import { useRouteLoading } from '@/hooks/useRouteLoading';
import AnimatedLogo from '@/components/AnimatedLogo';
import TokenUsageDisplay from '@/components/TokenUsageDisplay';
import TopLoadingBar from '@/components/TopLoadingBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Memoize header component to prevent re-renders during navigation
const AppHeader = memo(() => {
  const { isConnected } = useWebSocket();
  
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 px-4 py-3 panel flex-shrink-0">
      <div className="flex items-center justify-between min-w-0 gap-4">
        {/* Left: Logo with Text */}
        <div className="flex-shrink-0">
          <AnimatedLogo width={32} height={32} />
        </div>
        
        {/* Right: Token Usage and Connection Status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:block">
            <TokenUsageDisplay />
          </div>
          <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-2 rounded">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              } animate-pulse`}
            />
           
          </div>
        </div>
      </div>
    </div>
  );
});

AppHeader.displayName = 'AppHeader';

function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const { isConnected } = useWebSocket();
  const { isLoading } = useLoading();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to open on desktop

  // Enable automatic route loading detection
  useRouteLoading();

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 768) { // Only close on mobile
      setSidebarOpen(false);
    }
  }, [pathname]);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gray-900">
      {/* Top Loading Bar */}
      <TopLoadingBar isLoading={isLoading} />

      {/* Memoized Header Component */}
      <AppHeader />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <FeedsSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main Content */}
        <main className="flex-1 bg-gray-900 overflow-y-auto h-full scrollbar-styled">
          {children}
        </main>
      </div>
    </div>
  );
}

export default memo(AppLayout);
