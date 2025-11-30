'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface CollapsePanelProps {
  header: React.ReactNode;
  children: React.ReactNode;
  key?: string;
  defaultExpanded?: boolean;
  disabled?: boolean;
}

export interface CollapseProps {
  children: React.ReactNode;
  defaultActiveKey?: string[];
  expandIconPosition?: 'start' | 'end';
  ghost?: boolean;
  onChange?: (key: string[]) => void;
}

const CollapsePanel: React.FC<CollapsePanelProps & { isActive?: boolean; onToggle?: () => void }> = ({
  header,
  children,
  isActive = false,
  onToggle,
  disabled = false,
}) => {
  return (
    <div className="border-b border-gray-700 last:border-b-0">
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-gray-800/50 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={disabled ? undefined : onToggle}
      >
        <div className="flex items-center gap-3 flex-1">
          {isActive ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <div className="text-white font-medium">{header}</div>
        </div>
      </div>
      {isActive && (
        <div className="px-4 pb-4 text-gray-300">
          {children}
        </div>
      )}
    </div>
  );
};

const Collapse: React.FC<CollapseProps> = ({
  children,
  defaultActiveKey = [],
  expandIconPosition = 'start',
  ghost = false,
  onChange,
}) => {
  const [activeKeys, setActiveKeys] = useState<string[]>(defaultActiveKey);

  const handleToggle = (key: string) => {
    const newActiveKeys = activeKeys.includes(key)
      ? activeKeys.filter(k => k !== key)
      : [...activeKeys, key];

    setActiveKeys(newActiveKeys);
    onChange?.(newActiveKeys);
  };

  const containerClasses = ghost
    ? 'bg-transparent'
    : 'bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden';

  return (
    <div className={containerClasses}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child) && child.type === CollapsePanel) {
          const panelProps = child.props as CollapsePanelProps;
          const panelKey = panelProps.key || `panel-${index}`;
          const isActive = activeKeys.includes(panelKey);

          return React.cloneElement(child, {
            isActive,
            onToggle: () => handleToggle(panelKey),
          } as any);
        }
        return child;
      })}
    </div>
  );
};

export { CollapsePanel };
export default Collapse;