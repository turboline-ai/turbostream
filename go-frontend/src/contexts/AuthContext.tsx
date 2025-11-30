"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

interface TokenUsage {
  currentMonth: string;
  tokensUsed: number;
  limit: number;
  lastResetDate: string;
}

interface UserPreferences {
  theme: 'dark' | 'light' | 'auto';
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  feedUpdateNotifications: boolean;
  marketplaceNotifications: boolean;
  autoConnect: boolean;
  compactView: boolean;
}

interface User {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
  lastLogin?: string;
  tokenUsage?: TokenUsage;
  preferences?: UserPreferences;
  twoFactorEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, totpToken?: string) => Promise<{ requiresTwoFactor?: boolean }>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateTokenUsage: (tokenUsage: TokenUsage) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:7210';

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Listen for token expiration events
  useEffect(() => {
    const handleTokenExpired = () => {
      //console.log('🔒 Token expired event received, clearing auth state');
      setToken(null);
      setUser(null);
      localStorage.removeItem('auth_token');
    };

    window.addEventListener('auth-token-expired', handleTokenExpired);

    return () => {
      window.removeEventListener('auth-token-expired', handleTokenExpired);
    };
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetchWithTimeout(`${backendUrl}/api/auth/me`, {
        timeout: 8000, // 8 second timeout
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        //console.log('👤 User data fetched:', data.user);
        //console.log('💰 Token usage from /me:', data.user.tokenUsage);
        setUser(data.user);
      } else {
        // Token is invalid
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, totpToken?: string): Promise<{ requiresTwoFactor?: boolean }> => {
    try {
      const requestBody: any = { email, password };
      if (totpToken) {
        requestBody.totpToken = totpToken;
      }

      const response = await fetchWithTimeout(`${backendUrl}/api/auth/login`, {
        timeout: 10000, // 10 second timeout
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.requiresTwoFactor) {
        return { requiresTwoFactor: true };
      }

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('auth_token', data.token);
      
      return {};
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await fetchWithTimeout(`${backendUrl}/api/auth/register`, {
        timeout: 10000, // 10 second timeout
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('auth_token', data.token);
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await fetchWithTimeout(`${backendUrl}/api/auth/logout`, {
        timeout: 5000, // 5 second timeout
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('auth_token');
    }
  };

  const refreshUser = async () => {
    if (token) {
      await fetchUser(token);
    }
  };

  const updateTokenUsage = (tokenUsage: TokenUsage) => {
    //console.log('💰 updateTokenUsage called with:', tokenUsage);
    setUser((prevUser) => {
      if (!prevUser) {
        console.warn('⚠️ updateTokenUsage: No user found, cannot update');
        return null;
      }
      //console.log('✅ Updating user token usage from', prevUser.tokenUsage, 'to', tokenUsage);
      return {
        ...prevUser,
        tokenUsage,
      };
    });
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    updateTokenUsage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
