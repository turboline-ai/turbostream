'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface TopLoadingBarProps {
  isLoading: boolean;
}

const TopLoadingBar: React.FC<TopLoadingBarProps> = ({ isLoading }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setProgress(0);
      
      // Much faster progress animation for snappier feel
      const progressTimer = setInterval(() => {
        setProgress(prev => {
          if (prev < 50) return prev + Math.random() * 25; // Much faster initial progress
          if (prev < 80) return prev + Math.random() * 10;
          if (prev < 95) return prev + Math.random() * 3;
          return Math.min(prev + Math.random() * 0.5, 99);
        });
      }, 30); // Even faster update interval

      return () => clearInterval(progressTimer);
    } else {
      // Complete the loading bar immediately
      setProgress(100);
      
      // Hide much faster for better perceived performance
      const hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 100); // Reduced from 150ms to 100ms

      return () => clearTimeout(hideTimer);
    }
  }, [isLoading]);

  // Reset on route change
  useEffect(() => {
    if (!isLoading) {
      setVisible(false);
      setProgress(0);
    }
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1">
      <div 
        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 transition-all duration-200 ease-out shadow-lg"
        style={{ 
          width: `${Math.min(progress, 100)}%`,
          boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
        }}
      />
      
      {/* Animated glow effect */}
      <div 
        className="absolute top-0 h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"
        style={{ 
          width: '100px',
          left: `${Math.max(0, progress - 10)}%`,
          transition: 'left 0.2s ease-out'
        }}
      />
    </div>
  );
};

export default TopLoadingBar;