import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { NavigationProfiler } from '@/utils/performanceProfiler';

/**
 * Custom hook for optimized navigation
 * Provides fast, non-blocking navigation with performance monitoring
 */
export const useOptimizedNavigation = () => {
  const router = useRouter();

  const navigate = useCallback((path: string, options?: { replace?: boolean; preload?: boolean }) => {
    const { replace = false, preload = false } = options || {}; // Disabled preload by default

    NavigationProfiler.startNavigation(path);

    // Skip preloading to prevent any blocking behavior
    // Pages should load only when actually navigated to

    // Perform immediate navigation
    if (replace) {
      router.replace(path);
    } else {
      router.push(path);
    }

    // Mark navigation as complete after next tick
    setTimeout(() => {
      NavigationProfiler.endNavigation(path);
    }, 0);
  }, [router]);

  const preloadRoute = useCallback((path: string) => {
    // Disable preloading completely to prevent any performance impact
    console.log(`Skipping preload of ${path} for performance`);
  }, []);

  return {
    navigate,
    preloadRoute,
  };
};