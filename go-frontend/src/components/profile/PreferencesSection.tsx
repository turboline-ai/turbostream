'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

const PreferencesSection: React.FC = () => {
  const { user, token } = useAuth();
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    language: 'en',
    emailNotifications: true,
    pushNotifications: false,
    feedUpdateNotifications: true,
    marketplaceNotifications: true,
    autoConnect: true,
    compactView: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load saved preferences on mount
  useEffect(() => {
    if (user?.preferences) {
      setPreferences({
        theme: user.preferences.theme || 'dark',
        language: user.preferences.language || 'en',
        emailNotifications: user.preferences.emailNotifications !== undefined ? user.preferences.emailNotifications : true,
        pushNotifications: user.preferences.pushNotifications !== undefined ? user.preferences.pushNotifications : false,
        feedUpdateNotifications: user.preferences.feedUpdateNotifications !== undefined ? user.preferences.feedUpdateNotifications : true,
        marketplaceNotifications: user.preferences.marketplaceNotifications !== undefined ? user.preferences.marketplaceNotifications : true,
        autoConnect: user.preferences.autoConnect !== undefined ? user.preferences.autoConnect : true,
        compactView: user.preferences.compactView !== undefined ? user.preferences.compactView : false,
      });
    }
    setIsLoading(false);
  }, [user]);

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectChange = (key: keyof typeof preferences, value: string) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save preferences');
      }

      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save preferences. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
  <div className="flex items-center justify-center py-12">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#D7D9C4] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Preferences</h1>
        <p className="text-gray-400 mt-2">Customize your experience</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-900/30 border border-green-500'
              : 'bg-red-900/30 border border-red-500'
          }`}
        >
          <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>{message.text}</p>
        </div>
      )}

      {/* Appearance */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Appearance</h2>

        <div className="space-y-4">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Theme</label>
            <select
              value={preferences.theme}
              onChange={(e) => handleSelectChange('theme', e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C6C8AE] focus:outline-none"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>

          {/* Compact View */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Compact View</p>
              <p className="text-gray-400 text-sm">Show more content in less space</p>
            </div>
            <button
              onClick={() => handleToggle('compactView')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.compactView ? 'toggle-milkyway' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.compactView ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Localization */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Localization</h2>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Language</label>
          <select
            value={preferences.language}
            onChange={(e) => handleSelectChange('language', e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C6C8AE] focus:outline-none"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ja">日本語</option>
            <option value="zh">中文</option>
          </select>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Notifications</h2>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Email Notifications</p>
              <p className="text-gray-400 text-sm">Receive important updates via email</p>
            </div>
            <button
              onClick={() => handleToggle('emailNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.emailNotifications ? 'toggle-milkyway' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Push Notifications</p>
              <p className="text-gray-400 text-sm">Get browser push notifications</p>
            </div>
            <button
              onClick={() => handleToggle('pushNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.pushNotifications ? 'toggle-milkyway' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Feed Updates */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Feed Updates</p>
              <p className="text-gray-400 text-sm">Notify when feeds have new data</p>
            </div>
            <button
              onClick={() => handleToggle('feedUpdateNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.feedUpdateNotifications ? 'toggle-milkyway' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.feedUpdateNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Marketplace Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Marketplace Updates</p>
              <p className="text-gray-400 text-sm">New feeds and marketplace changes</p>
            </div>
            <button
              onClick={() => handleToggle('marketplaceNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.marketplaceNotifications ? 'toggle-milkyway' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.marketplaceNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Feed Behavior */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Feed Behavior</h2>

        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Auto-Connect to Feeds</p>
              <p className="text-gray-400 text-sm">Automatically connect to feeds when viewing them</p>
            </div>
            <button
              onClick={() => handleToggle('autoConnect')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.autoConnect ? 'toggle-milkyway' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.autoConnect ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default PreferencesSection;
