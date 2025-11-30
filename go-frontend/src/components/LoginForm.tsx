"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import nebulaImage from '@/images/nebula.png';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password, totpCode || undefined);
      
      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setError('');
      } else {
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row bg-gray-900/90 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden w-full">
      <div className="relative w-full md:w-1/2 h-48 md:h-auto">
        <Image
          src={nebulaImage}
          alt="Colorful galactic nebula"
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="w-full md:w-1/2 p-8 md:p-10 bg-gray-900/95">
        <div className="mb-6 text-center md:text-left">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {requiresTwoFactor && (
            <div>
              <label htmlFor="totpCode" className="block text-sm font-medium text-gray-300 mb-2">
                Two-Factor Authentication Code
              </label>
              <input
                id="totpCode"
                type="text"
                value={totpCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
                  // Allow either 6 digits (TOTP) or 9 characters with dash (backup code)
                  if (value.length <= 6 && /^\d*$/.test(value)) {
                    setTotpCode(value);
                  } else if (value.length <= 9 && /^[A-Z0-9]{0,4}-?[A-Z0-9]{0,4}$/.test(value)) {
                    setTotpCode(value);
                  }
                }}
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center font-mono text-lg"
                placeholder="000000 or XXXX-XXXX"
                maxLength={9}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the 6-digit code from your authenticator app or a backup code (XXXX-XXXX)
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || (requiresTwoFactor && totpCode.length < 6)}
            className="w-full px-4 py-3 btn-milkyway rounded-lg shadow-sm transition hover:opacity-90 focus:ring-2 focus:ring-[#F2F3E3] disabled:transform-none disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                {requiresTwoFactor ? 'Verifying...' : 'Signing in...'}
              </span>
            ) : (
              requiresTwoFactor ? 'Verify & Sign In' : 'Sign In'
            )}
          </button>
        </form>

        {onSwitchToRegister && (
          <div className="mt-6 text-center md:text-left">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                Create one
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
