'use client';

import React from 'react';
import ProfileSidebar from '@/components/ProfileSidebar';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full flex bg-gray-900">
      {/* Profile Sidebar */}
      <ProfileSidebar />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}