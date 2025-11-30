"use client";

import { useAuth } from '@/contexts/AuthContext';

export default function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex items-center gap-4 bg-gray-800 rounded-lg px-4 py-2 border border-gray-700 min-w-0 max-w-xs">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm truncate" title={user.name}>{user.name}</p>
          <p className="text-gray-400 text-xs truncate" title={user.email}>{user.email}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="ml-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
