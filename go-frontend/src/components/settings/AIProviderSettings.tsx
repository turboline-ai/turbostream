'use client';

import React from 'react';
import { ProviderSelector } from '@/components/AIProvider';

const AIProviderSettings: React.FC = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>AI Provider Settings</h1>
      <ProviderSelector />
    </div>
  );
};

export default AIProviderSettings;
