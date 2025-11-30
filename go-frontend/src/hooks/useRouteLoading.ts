'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';

/**
 * Hook that automatically triggers loading state on route changes
 * Uses pathname and searchParams to detect navigation changes in Next.js App Router
 */
export const useRouteLoading = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startLoading, stopLoading } = useLoading();
  const previousPathRef = useRef<string>(pathname);
  const previousSearchRef = useRef<string>(searchParams.toString());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentPath = pathname;
    const currentSearch = searchParams.toString();
    const pathChanged = previousPathRef.current !== currentPath;
    const searchChanged = previousSearchRef.current !== currentSearch;

    if (pathChanged || searchChanged) {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Start loading when route changes
      startLoading();

      // Stop loading after a short delay (gives page time to render)
      timeoutRef.current = setTimeout(() => {
        stopLoading();
        timeoutRef.current = null;
      }, 300);

      // Update refs for next comparison
      previousPathRef.current = currentPath;
      previousSearchRef.current = currentSearch;
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname, searchParams, startLoading, stopLoading]);
};

