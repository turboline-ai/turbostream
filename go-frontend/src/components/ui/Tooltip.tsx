'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface TooltipProps {
  title: React.ReactNode;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  mouseEnterDelay?: number;
  mouseLeaveDelay?: number;
  className?: string;
  backgroundColor?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  title,
  children,
  placement = 'top',
  mouseEnterDelay = 0,
  mouseLeaveDelay = 0,
  className = '',
  backgroundColor,
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const enterTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top + scrollY - tooltipRect.height - 8;
        left = triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollY + 8;
        left = triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.left + scrollX - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.right + scrollX + 8;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 0) left = 8;
    if (left + tooltipRect.width > viewportWidth) left = viewportWidth - tooltipRect.width - 8;
    if (top < 0) top = 8;
    if (top + tooltipRect.height > viewportHeight + scrollY) top = viewportHeight + scrollY - tooltipRect.height - 8;

    setPosition({ top, left });
  };

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = undefined;
    }

    enterTimeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, mouseEnterDelay * 1000);
  };

  const handleMouseLeave = () => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = undefined;
    }

    leaveTimeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, mouseLeaveDelay * 1000);
  };

  useEffect(() => {
    if (visible) {
      calculatePosition();
    }
  }, [visible, placement]);

  useEffect(() => {
    const handleScroll = () => {
      if (visible) {
        calculatePosition();
      }
    };

    const handleResize = () => {
      if (visible) {
        calculatePosition();
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [visible]);

  useEffect(() => {
    return () => {
      if (enterTimeoutRef.current) {
        clearTimeout(enterTimeoutRef.current);
      }
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={className}
      >
        {children}
      </div>

      {visible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg border border-gray-700 pointer-events-none max-w-xs"
          style={{
            top: position.top,
            left: position.left,
            backgroundColor: backgroundColor || 'var(--bg-2)',
            color: 'var(--ink)',
            borderColor: 'var(--line)',
          }}
        >
          {title}
          <div
            className="absolute w-2 h-2 bg-gray-900 border-l border-t border-gray-700 transform rotate-45"
            style={{
              backgroundColor: backgroundColor || 'var(--bg-2)',
              borderColor: 'var(--line)',
              ...(placement === 'top' && { bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)' }),
              ...(placement === 'bottom' && { top: '-4px', left: '50%', transform: 'translateX(-50%) rotate(-135deg)' }),
              ...(placement === 'left' && { right: '-4px', top: '50%', transform: 'translateY(-50%) rotate(-45deg)' }),
              ...(placement === 'right' && { left: '-4px', top: '50%', transform: 'translateY(-50%) rotate(135deg)' }),
            }}
          />
        </div>
      )}
    </>
  );
};

export default Tooltip;