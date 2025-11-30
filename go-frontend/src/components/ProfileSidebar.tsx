'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface ProfileSidebarProps {
  // Remove callback props since we'll use routing
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = () => {
  const pathname = usePathname();

  const sections = [
    {
      id: 'profile',
      name: 'Profile',
      href: '/settings/profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'billing',
      name: 'Billing & Usage',
      href: '/settings/billing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      id: 'preferences',
      name: 'Preferences',
      href: '/settings/preferences',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      id: 'security',
      name: 'Security',
      href: '/settings/security',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      id: 'api-keys',
      name: 'API Keys',
      href: '/settings/api-keys',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
    },
    {
      id: 'ai-provider',
      name: 'AI Provider',
      href: '/settings/ai-provider',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
  ];

  // Determine if a section is active based on current pathname
  const isActive = (href: string) => pathname === href;

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
     

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(section.href)
                  ? 'btn-milkyway text-[#0b132b]'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              style={
                isActive(section.href)
                  ? { fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 500 }
                  : undefined
              }
            >
              <span className="flex items-center justify-center" style={
                isActive(section.href)
                  ? { color: '#0b132b' }
                  : undefined
              }>
                {section.icon}
              </span>
              <span className="font-medium" style={
                isActive(section.href)
                  ? { fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 500, color: '#0b132b' }
                  : undefined
              }>{section.name}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Back to Dashboard */}
      <div className="p-4 border-t border-gray-700">
        <Link
          href="/"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

export default ProfileSidebar;
