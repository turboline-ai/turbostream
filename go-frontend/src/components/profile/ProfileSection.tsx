'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const ProfileSection: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // TODO: Implement API call to update user profile
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
    });
    setIsEditing(false);
    setMessage(null);
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading user information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Profile</h1>
        <p className="text-gray-400 mt-2">Manage your personal information</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'
          }`}
        >
          <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>{message.text}</p>
        </div>
      )}

      {/* Avatar Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Avatar</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl avatar-milkyway">
            <span style={{ fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 500 }}>
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-gray-300 mb-2">Your avatar is generated from your initials</p>
            <button className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm">
              Upload Custom Avatar
            </button>
            <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF. Max size 2MB.</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Personal Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] text-sm"
              style={{ fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 500 }}
            >
              Edit Profile
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C6C8AE] focus:outline-none"
              />
            ) : (
              <p className="text-white break-words" title={user.name}>{user.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#C6C8AE] focus:outline-none"
              />
            ) : (
              <p className="text-white">{user.email}</p>
            )}
          </div>

          {/* User ID */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">User ID</label>
            <div className="flex items-center gap-2">
              <code className="text-gray-300 bg-gray-900 px-3 py-1 rounded font-mono text-sm">{user._id}</code>
              <button
                onClick={() => navigator.clipboard.writeText(user._id)}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-sm"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Account Created */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Member Since</label>
            <p className="text-white">{new Date(user.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Inter, ui-sans-serif, system-ui', fontWeight: 500 }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-900/20 rounded-lg p-6 border border-red-800">
        <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-gray-400 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
          Delete Account
        </button>
      </div>
    </div>
  );
};

export default ProfileSection;
