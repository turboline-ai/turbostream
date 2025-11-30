'use client';

import React, { useMemo, useState, useEffect, memo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { WebSocketFeed } from '@/types/marketplace';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptions } from '@/contexts/SubscriptionContext';
import { useOptimizedNavigation } from '@/hooks/useOptimizedNavigation';
import { Eye, Lock } from 'lucide-react';

interface FeedsSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const FeedsSidebar: React.FC<FeedsSidebarProps> = ({ isOpen, onToggle }) => {
  const pathname = usePathname();
  const { navigate, preloadRoute } = useOptimizedNavigation();
  const { user, logout } = useAuth();
  const { subscriptions, myFeeds, isLoading: loading, refreshAll } = useSubscriptions();
  const [navigating, setNavigating] = useState<string | null>(null);

  // Load data only when sidebar is actually opened/visible and data is needed
  useEffect(() => {
    if (user && isOpen && subscriptions.length === 0 && myFeeds.length === 0 && !loading) {
      // Load data only when sidebar is visible to prevent blocking navigation
      const timer = setTimeout(() => {
        refreshAll().catch(error => {
          console.warn('Background data loading failed:', error);
        });
      }, 50); // Reduced delay for better UX when sidebar is opened
      
      return () => clearTimeout(timer);
    }
  }, [user, isOpen]); // Load only when sidebar is opened

  // Optimize combined feeds computation with early returns and shallow comparison
  const combinedFeeds = useMemo(() => {
    if (!myFeeds.length && !subscriptions.length) {
      return [];
    }

    const feedMap = new Map<string, { feed: WebSocketFeed; isOwner: boolean }>();

    // Process owned feeds first (more efficient)
    if (myFeeds.length > 0) {
      myFeeds.forEach((feed) => {
        if (feed?._id) {
          feedMap.set(feed._id, { feed, isOwner: true });
        }
      });
    }

    // Process subscriptions only if they exist
    if (subscriptions.length > 0) {
      subscriptions.forEach((sub) => {
        if (sub.feed?._id && !feedMap.has(sub.feed._id)) {
          feedMap.set(sub.feed._id, { feed: sub.feed, isOwner: false });
        }
      });
    }

    return Array.from(feedMap.values());
  }, [myFeeds, subscriptions]);

  const hasFeeds = combinedFeeds.length > 0;

  const handleNavigation = useCallback((path: string, key?: string) => {
    const navKey = key || path;
    setNavigating(navKey);
    
    // Use immediate navigation with no blocking or preloading
    navigate(path, { preload: false });
    
    // Clear navigating state immediately for instant feel
    requestAnimationFrame(() => {
      setNavigating(null);
    });
  }, [navigate]);

  // Remove preloading to prevent blocking - pages should load only when needed

  const navigateToFeed = useCallback((feedId: string) => {
    handleNavigation(`/feeds/${feedId}`, feedId);
  }, [handleNavigation]);

  const isActiveFeed = (feedId: string) => {
    return pathname === `/feeds/${feedId}`;
  };

  if (!user) return null;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative left-0 top-0 h-screen bg-gray-900 border-r border-gray-700 transition-transform duration-300 z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } w-64 flex flex-col panel sidebar overflow-hidden`}
        style={{ maxHeight: "100vh" }}
      >
        {/* Navigation Items - Scrollable Area */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ maxHeight: "calc(100vh - 135px)" }}
        >
          {loading ? (
            <div className="flex items-center justify-center p-4 h-full">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {/* Home */}
                <button
                  onClick={() => handleNavigation("/", "home")}
                  disabled={navigating === "home"}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    pathname === "/"
                      ? "bg-gray-800 border-l-4 border-blue-500"
                      : ""
                  }`}
                >
                  {navigating === "home" ? (
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                  ) : (
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                  )}
                  <span className="text-white font-medium">Dashboard</span>
                </button>

                {/* Marketplace */}
                <button
                  onClick={() =>
                    handleNavigation("/marketplace", "marketplace")
                  }
                  disabled={navigating === "marketplace"}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    pathname === "/marketplace"
                      ? "bg-gray-800 border-l-4 border-blue-500"
                      : ""
                  }`}
                >
                  {navigating === "marketplace" ? (
                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                  ) : (
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  )}
                  <span className="text-white font-medium">Marketplace</span>
                </button>

                {/* My Feeds & Subscriptions */}
                {user && (
                  <button
                    onClick={() =>
                      handleNavigation("/subscriptions", "subscriptions")
                    }
                    disabled={navigating === "subscriptions"}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      pathname === "/subscriptions"
                        ? "bg-gray-800 border-l-4 border-blue-500"
                        : ""
                    }`}
                  >
                    {navigating === "subscriptions" ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    ) : (
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                        />
                      </svg>
                    )}
                    <span className="text-white font-medium">Manage Feeds</span>
                  </button>
                )}

                {/* Register Feed */}
                {user && (
                  <button
                    onClick={() =>
                      handleNavigation("/feeds/register", "register")
                    }
                    disabled={navigating === "register"}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      pathname === "/feeds/register"
                        ? "bg-gray-800 border-l-4 border-blue-500"
                        : ""
                    }`}
                  >
                    {navigating === "register" ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    ) : (
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    )}
                    <span className="text-white font-medium">
                      Register Feed
                    </span>
                  </button>
                )}

                {/* API Documentation */}
                {user && (
                  <button
                    onClick={() =>
                      handleNavigation("/api-docs", "api-docs")
                    }
                    disabled={navigating === "api-docs"}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      pathname === "/api-docs"
                        ? "bg-gray-800 border-l-4 border-blue-500"
                        : ""
                    }`}
                  >
                    {navigating === "api-docs" ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    ) : (
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    )}
                    <span className="text-white font-medium">
                      API Documentation
                    </span>
                  </button>
                )}


              </div>

              <div className="pb-4">
                {hasFeeds ? (
                  <div className="pb-2">
                    <div className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase">
                          My Feeds
                        </span>
                        <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                          {combinedFeeds.length}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {combinedFeeds.map(({ feed, isOwner }) => (
                        <button
                          key={feed._id}
                          onClick={() => feed._id && navigateToFeed(feed._id)}
                          disabled={!!(feed._id && navigating === feed._id)}
                          className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            feed._id && isActiveFeed(feed._id)
                              ? "bg-gray-800 border-l-4 border-blue-500"
                              : ""
                          }`}
                        >
                          {feed._id && navigating === feed._id ? (
                            <div className="w-5 h-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                          ) : feed.icon ? (
                            <span className="text-xl">{feed.icon}</span>
                          ) : (
                            <svg
                              className="w-5 h-5 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1 1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8M9 7h6m-7 4h8m-8 4h8"
                              />
                            </svg>
                          )}
                          <div className="flex-1 text-left">
                            <div className="text-white text-sm font-medium truncate">
                              {feed.name}
                            </div>
                            <div className="text-gray-400 text-xs flex items-center gap-1 muted">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  feed.isActive
                                    ? "bg-green-500 animate-pulse"
                                    : "bg-red-500"
                                }`}
                              />
                              {isOwner
                                ? "👤 Owner"
                                : feed.feedType === "company"
                                ? "🏢"
                                : "👤"}
                            </div>
                          </div>
                          {feed.isPublic && isOwner && (
                            <div title="Public Feed" className="flex items-center">
                              <Eye className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-gray-500 text-sm mb-3 muted">
                      No feeds yet
                    </p>
                    <button
                      onClick={() =>
                        handleNavigation("/marketplace", "marketplace-browse")
                      }
                      disabled={navigating === "marketplace-browse"}
                      className="text-blue-400 text-sm hover:underline btn disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Browse Marketplace
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User Info - Always at bottom */}
        <div
          className="p-4 border-t-2 border-blue-500 bg-gray-800 shrink-0 min-w-0"
          style={{ minHeight: "70px" }}
        >
          <div className="flex items-center justify-between min-w-0 gap-2">
            <button
              onClick={() => handleNavigation("/settings/profile", "profile")}
              disabled={navigating === "profile"}
              className="flex items-center gap-3 flex-1 min-w-0 hover:bg-gray-700 rounded-lg p-2 -m-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
              title={`View Profile - ${user.name}`}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm avatar-milkyway group-hover:ring-2 group-hover:ring-blue-400 transition-all flex-shrink-0">
                <span style={{ fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 500 }}>
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left overflow-hidden">
                <p className="text-white font-medium text-sm truncate leading-tight mb-0.5 group-hover:text-blue-400 transition-colors">
                  {user.name}
                </p>
                <p className="text-gray-400 text-xs truncate leading-tight">
                  {user.email}
                </p>
              </div>
            </button>
            <button
              onClick={() => logout()}
              className="text-gray-400 hover:text-red-400 transition-colors p-1 ml-2"
              title="Logout"
              aria-label="Logout"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(FeedsSidebar);
